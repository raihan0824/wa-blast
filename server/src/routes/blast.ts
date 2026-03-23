import { Router } from 'express';
import type { Server as SocketIOServer } from 'socket.io';
import { getSocket, getStatus } from '../whatsapp/session.js';
import { executeBlast } from '../whatsapp/sender.js';
import type { Contact } from '../types.js';

export function createBlastRouter(io: SocketIOServer): Router {
  const router = Router();

  router.post('/', (req, res) => {
    const { contacts, template } = req.body as {
      contacts: Contact[];
      template: string;
    };

    if (getStatus() !== 'connected') {
      res.status(400).json({ error: 'WhatsApp is not connected' });
      return;
    }

    const sock = getSocket();
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

    // Start blast asynchronously
    executeBlast(sock, contacts, template, io).catch((err) => {
      console.error('Blast execution error:', err);
      io.emit('blast:error', { number: '', error: 'Blast execution failed' });
    });

    res.json({ status: 'started', totalMessages: contacts.length });
  });

  return router;
}
