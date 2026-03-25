import { Router } from 'express';
import type { Server as SocketIOServer } from 'socket.io';
import { getSocket, getStatus } from '../whatsapp/session.js';
import { executeBlast } from '../whatsapp/sender.js';
import type { Contact } from '../types.js';
import type { AuthRequest } from '../middleware/auth.js';
import db from '../db.js';

export function createBlastRouter(io: SocketIOServer): Router {
  const router = Router();

  router.post('/', (req, res) => {
    const { user } = req as AuthRequest;
    const userId = user!.id;
    const { contacts, template } = req.body as {
      contacts: Contact[];
      template: string;
    };

    if (getStatus(userId) !== 'connected') {
      res.status(400).json({ error: 'WhatsApp is not connected' });
      return;
    }

    const sock = getSocket(userId);
    if (!sock) {
      res.status(500).json({ error: 'WhatsApp socket not available' });
      return;
    }

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      res.status(400).json({ error: 'Contacts list is empty' });
      return;
    }

    if (!template || typeof template !== 'string') {
      res.status(400).json({ error: 'Template is required' });
      return;
    }

    // Create blast history record
    const historyResult = db.prepare(
      'INSERT INTO blast_history (user_id, template, total) VALUES (?, ?, ?)'
    ).run(userId, template, contacts.length);
    const blastId = Number(historyResult.lastInsertRowid);

    // Insert all recipients
    const insertRecipient = db.prepare(
      'INSERT INTO blast_recipients (blast_id, number, variables) VALUES (?, ?, ?)'
    );
    const insertMany = db.transaction((items: Contact[]) => {
      for (const c of items) {
        const { number, ...variables } = c;
        insertRecipient.run(blastId, number, JSON.stringify(variables));
      }
    });
    insertMany(contacts);

    // Start blast asynchronously
    executeBlast(sock, contacts, template, io, blastId, userId).catch((err) => {
      console.error('Blast execution error:', err);
      db.prepare("UPDATE blast_history SET status = 'error', completed_at = datetime('now') WHERE id = ?").run(blastId);
      io.to(`user:${userId}`).emit('blast:error', { number: '', error: 'Blast execution failed' });
    });

    res.json({ status: 'started', totalMessages: contacts.length, blastId });
  });

  return router;
}
