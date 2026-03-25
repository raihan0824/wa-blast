import { makeWASocket } from '@whiskeysockets/baileys';
import type { Server as SocketIOServer } from 'socket.io';
import type { Contact } from '../types.js';
import { BLAST_CONFIG } from '../config.js';
import { renderTemplate } from '../utils/templateEngine.js';
import db from '../db.js';

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
  io: SocketIOServer,
  blastId: number,
  userId: number
): Promise<void> {
  let sent = 0;
  let failed = 0;
  const total = contacts.length;
  const room = `user:${userId}`;

  const updateRecipient = db.prepare(
    "UPDATE blast_recipients SET status = ?, error = ?, rendered_message = ?, sent_at = datetime('now') WHERE id = (SELECT id FROM blast_recipients WHERE blast_id = ? AND number = ? AND status = 'pending' LIMIT 1)"
  );
  const updateHistory = db.prepare(
    "UPDATE blast_history SET sent = ?, failed = ?, status = ?, completed_at = datetime('now') WHERE id = ?"
  );

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const { number, ...variables } = contact;
    const message = renderTemplate(template, variables);
    const jid = `${number}@s.whatsapp.net`;

    try {
      await sock.sendMessage(jid, { text: message });
      sent++;
      updateRecipient.run('sent', null, message, blastId, number);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';

      if (BLAST_CONFIG.retryOnFail) {
        await sleep(BLAST_CONFIG.retryDelay);
        try {
          await sock.sendMessage(jid, { text: message });
          sent++;
          updateRecipient.run('sent', null, message, blastId, number);
        } catch {
          failed++;
          updateRecipient.run('failed', errorMsg, message, blastId, number);
          io.to(room).emit('blast:error', { number, name: variables.name || '', error: errorMsg });
        }
      } else {
        failed++;
        updateRecipient.run('failed', errorMsg, message, blastId, number);
        io.to(room).emit('blast:error', { number, name: variables.name || '', error: errorMsg });
      }
    }

    io.to(room).emit('blast:progress', { sent, failed, total });

    // Rate limiting
    if ((i + 1) % BLAST_CONFIG.batchSize === 0 && i < contacts.length - 1) {
      await sleep(BLAST_CONFIG.batchCooldown);
    } else if (i < contacts.length - 1) {
      await sleep(randomDelay());
    }
  }

  updateHistory.run(sent, failed, 'completed', blastId);
  io.to(room).emit('blast:complete', { sent, failed, total });
}
