import { makeWASocket } from '@whiskeysockets/baileys';
import type { Server as SocketIOServer } from 'socket.io';
import type { Contact } from '../types.js';
import { BLAST_CONFIG } from '../config.js';
import { renderTemplate } from '../utils/templateEngine.js';

function randomDelay(): number {
  return BLAST_CONFIG.minDelay + Math.random() * (BLAST_CONFIG.maxDelay - BLAST_CONFIG.minDelay);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function executeBlast(
  sock: ReturnType<typeof makeWASocket>,
  contacts: Contact[],
  template: string,
  io: SocketIOServer
): Promise<void> {
  let sent = 0;
  let failed = 0;
  const total = contacts.length;

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const message = renderTemplate(template, { name: contact.name });
    const jid = `${contact.number}@s.whatsapp.net`;

    try {
      await sock.sendMessage(jid, { text: message });
      sent++;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';

      // Retry once if configured
      if (BLAST_CONFIG.retryOnFail) {
        await sleep(BLAST_CONFIG.retryDelay);
        try {
          await sock.sendMessage(jid, { text: message });
          sent++;
        } catch {
          failed++;
          io.emit('blast:error', { number: contact.number, name: contact.name, error: errorMsg });
        }
      } else {
        failed++;
        io.emit('blast:error', { number: contact.number, name: contact.name, error: errorMsg });
      }
    }

    io.emit('blast:progress', { sent, failed, total });

    // Rate limiting
    if ((i + 1) % BLAST_CONFIG.batchSize === 0 && i < contacts.length - 1) {
      await sleep(BLAST_CONFIG.batchCooldown);
    } else if (i < contacts.length - 1) {
      await sleep(randomDelay());
    }
  }

  io.emit('blast:complete', { sent, failed, total });
}
