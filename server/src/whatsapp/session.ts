import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { rm } from 'fs/promises';
import QRCode from 'qrcode';
import type { Server as SocketIOServer } from 'socket.io';
import type { WAStatus } from '../types.js';

const AUTH_DIR = './auth_info';
const MAX_RETRIES = 3;
const WA_VERSION: [number, number, number] = [2, 3000, 1034195523];

let sock: ReturnType<typeof makeWASocket> | null = null;
let status: WAStatus = 'disconnected';
let initializing = false;
let retryCount = 0;

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function getSocket(): typeof sock {
  return sock;
}

export function getStatus(): WAStatus {
  return status;
}

async function clearAuthState(): Promise<void> {
  try {
    await rm(AUTH_DIR, { recursive: true, force: true });
    console.log('[WA] Cleared auth state');
  } catch {
    // ignore
  }
}

export async function initSession(io: SocketIOServer): Promise<void> {
  if (initializing) {
    console.log('[WA] Already initializing, skipping');
    return;
  }

  if (sock) {
    console.log('[WA] Closing existing socket before reinit');
    sock.ev.removeAllListeners('connection.update');
    sock.ev.removeAllListeners('creds.update');
    sock.end(undefined);
    sock = null;
  }

  initializing = true;
  console.log('[WA] Initializing session... (attempt', retryCount + 1, ')');

  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    sock = makeWASocket({
      auth: state,
      version: WA_VERSION,
    });

    const currentSock = sock;

    currentSock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      console.log('[WA] Connection update:', { connection, qr: !!qr });

      if (qr) {
        status = 'qr_pending';
        retryCount = 0;
        const qrDataUrl = await QRCode.toDataURL(qr);
        io.emit('qr', qrDataUrl);
        io.emit('status', status);
        console.log('[WA] QR code emitted to client');
      }

      if (connection === 'open') {
        status = 'connected';
        initializing = false;
        retryCount = 0;
        io.emit('status', status);
        console.log('[WA] Connected successfully');
      }

      if (connection === 'close') {
        const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
        console.log('[WA] Connection closed, reason:', reason);
        sock = null;
        initializing = false;

        if (reason === DisconnectReason.loggedOut) {
          await clearAuthState();
          status = 'disconnected';
          io.emit('status', status);
        } else if (reason === 405 || reason === DisconnectReason.connectionReplaced) {
          console.log('[WA] Got', reason, '— clearing auth state and retrying fresh');
          await clearAuthState();
          retryCount++;
          if (retryCount <= MAX_RETRIES) {
            await initSession(io);
          } else {
            console.log('[WA] Max retries reached, giving up');
            status = 'disconnected';
            retryCount = 0;
            io.emit('status', status);
          }
        } else {
          retryCount++;
          if (retryCount <= MAX_RETRIES) {
            console.log('[WA] Reconnecting...');
            await initSession(io);
          } else {
            console.log('[WA] Max retries reached, giving up');
            status = 'disconnected';
            retryCount = 0;
            io.emit('status', status);
          }
        }
      }
    });

    currentSock.ev.on('creds.update', saveCreds);
  } catch (err) {
    console.error('[WA] Init failed:', err);
    initializing = false;
    status = 'disconnected';
    io.emit('status', status);
  }
}

export async function logout(io: SocketIOServer): Promise<void> {
  if (sock) {
    await sock.logout();
    sock = null;
  }
  await clearAuthState();
  initializing = false;
  retryCount = 0;
  status = 'disconnected';
  io.emit('status', status);
}
