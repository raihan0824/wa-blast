import {
  makeWASocket,
  DisconnectReason,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import QRCode from 'qrcode';
import type { Server as SocketIOServer } from 'socket.io';
import type { WAStatus } from '../types.js';
import { useSQLiteAuthState, clearSQLiteAuthState } from './authState.js';
import { bufferContacts, clearContacts } from './contactStore.js';

const MAX_RETRIES = 3;
const WA_VERSION: [number, number, number] = [2, 3000, 1034195523];

interface UserSession {
  sock: ReturnType<typeof makeWASocket> | null;
  status: WAStatus;
  initializing: boolean;
  retryCount: number;
}

const sessions = new Map<number, UserSession>();

function getSession(userId: number): UserSession {
  let session = sessions.get(userId);
  if (!session) {
    session = { sock: null, status: 'disconnected', initializing: false, retryCount: 0 };
    sessions.set(userId, session);
  }
  return session;
}

function emitToUser(io: SocketIOServer, userId: number, event: string, ...args: unknown[]): void {
  io.to(`user:${userId}`).emit(event, ...args);
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function getSocket(userId: number): ReturnType<typeof makeWASocket> | null {
  return sessions.get(userId)?.sock ?? null;
}

export function getStatus(userId: number): WAStatus {
  return sessions.get(userId)?.status ?? 'disconnected';
}

/** Force Baileys to re-sync app state, which triggers contacts.upsert with saved names */
export async function syncContacts(userId: number): Promise<void> {
  const session = sessions.get(userId);
  if (!session?.sock) throw new Error('WhatsApp not connected');
  await session.sock.resyncAppState([
    'critical_block',
    'critical_unblock_low',
    'regular_high',
    'regular_low',
    'regular',
  ], false);
}

export async function initSession(userId: number, io: SocketIOServer): Promise<void> {
  const session = getSession(userId);

  if (session.initializing) {
    console.log(`[WA:${userId}] Already initializing, skipping`);
    return;
  }

  if (session.sock) {
    console.log(`[WA:${userId}] Closing existing socket before reinit`);
    session.sock.ev.removeAllListeners('connection.update');
    session.sock.ev.removeAllListeners('creds.update');
    session.sock.ev.removeAllListeners('messaging-history.set');
    session.sock.ev.removeAllListeners('contacts.upsert');
    session.sock.ev.removeAllListeners('contacts.update');
    session.sock.end(undefined);
    session.sock = null;
  }

  session.initializing = true;
  console.log(`[WA:${userId}] Initializing session... (attempt`, session.retryCount + 1, ')');

  try {
    const { state, saveCreds } = useSQLiteAuthState(userId);

    const sock = makeWASocket({
      auth: state,
      version: WA_VERSION,
      syncFullHistory: true,
    });

    session.sock = sock;

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;
      console.log(`[WA:${userId}] Connection update:`, { connection, qr: !!qr });

      if (qr) {
        session.status = 'qr_pending';
        session.retryCount = 0;
        const qrDataUrl = await QRCode.toDataURL(qr);
        emitToUser(io, userId, 'qr', qrDataUrl);
        emitToUser(io, userId, 'status', session.status);
        console.log(`[WA:${userId}] QR code emitted to client`);
      }

      if (connection === 'open') {
        session.status = 'connected';
        session.initializing = false;
        session.retryCount = 0;
        emitToUser(io, userId, 'status', session.status);
        console.log(`[WA:${userId}] Connected successfully`);
      }

      if (connection === 'close') {
        const reason = (lastDisconnect?.error as Boom)?.output?.statusCode;
        console.log(`[WA:${userId}] Connection closed, reason:`, reason);
        session.sock = null;
        session.initializing = false;

        const shouldClearAuth =
          reason === DisconnectReason.loggedOut ||
          reason === 401 ||
          reason === 405 ||
          reason === DisconnectReason.connectionReplaced;

        if (shouldClearAuth) {
          console.log(`[WA:${userId}] Got`, reason, '— clearing auth state and retrying fresh');
          clearSQLiteAuthState(userId);
        }

        session.retryCount++;
        if (session.retryCount <= MAX_RETRIES) {
          console.log(`[WA:${userId}] Retrying... (attempt`, session.retryCount + 1, ')');
          await initSession(userId, io);
        } else {
          console.log(`[WA:${userId}] Max retries reached, giving up`);
          session.status = 'error';
          session.retryCount = 0;
          emitToUser(io, userId, 'status', session.status);
          emitToUser(io, userId, 'wa:error', `Connection failed after ${MAX_RETRIES} attempts (code: ${reason}). Try again.`);
        }
      }
    });

    sock.ev.on('creds.update', saveCreds);

    // Initial contact sync comes via messaging-history.set in Baileys v6
    sock.ev.on('messaging-history.set', ({ contacts: historyContacts }) => {
      if (historyContacts && historyContacts.length > 0) {
        bufferContacts(userId, historyContacts as unknown as Record<string, unknown>[], io);
      }
    });

    sock.ev.on('contacts.upsert', (contacts) => {
      bufferContacts(userId, contacts as unknown as Record<string, unknown>[], io);
    });

    sock.ev.on('contacts.update', (contacts) => {
      bufferContacts(userId, contacts as unknown as Record<string, unknown>[], io);
    });
  } catch (err) {
    console.error(`[WA:${userId}] Init failed:`, err);
    session.initializing = false;
    session.status = 'disconnected';
    emitToUser(io, userId, 'status', session.status);
  }
}

export async function disconnect(userId: number, io: SocketIOServer): Promise<void> {
  const session = sessions.get(userId);
  if (session?.sock) {
    session.sock.ev.removeAllListeners('connection.update');
    session.sock.ev.removeAllListeners('creds.update');
    session.sock.ev.removeAllListeners('messaging-history.set');
    session.sock.ev.removeAllListeners('contacts.upsert');
    session.sock.ev.removeAllListeners('contacts.update');
    try {
      session.sock.end(undefined);
    } catch {
      // ignore — background tasks may throw on closed connection
    }
    session.sock = null;
  }
  clearSQLiteAuthState(userId);
  clearContacts(userId, io);
  if (session) {
    session.initializing = false;
    session.retryCount = 0;
    session.status = 'disconnected';
  }
  emitToUser(io, userId, 'status', 'disconnected');
}
