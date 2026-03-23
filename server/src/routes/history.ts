import { Router } from 'express';
import db from '../db.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

// List all blast history for the authenticated user
router.get('/', (req, res) => {
  const { user } = req as AuthRequest;
  const history = db.prepare(
    'SELECT id, template, total, sent, failed, status, started_at, completed_at FROM blast_history WHERE user_id = ? ORDER BY started_at DESC'
  ).all(user!.id);
  res.json(history);
});

// Get blast detail with recipients
router.get('/:id', (req, res) => {
  const { user } = req as AuthRequest;
  const { id } = req.params;

  const blast = db.prepare(
    'SELECT id, template, total, sent, failed, status, started_at, completed_at FROM blast_history WHERE id = ? AND user_id = ?'
  ).get(id, user!.id);

  if (!blast) {
    res.status(404).json({ error: 'Blast not found' });
    return;
  }

  const recipients = db.prepare(
    'SELECT id, number, variables, rendered_message, status, error, sent_at FROM blast_recipients WHERE blast_id = ? ORDER BY id'
  ).all(id);

  // Parse variables JSON for each recipient
  const parsed = (recipients as Array<{ variables: string; [key: string]: unknown }>).map((r) => ({
    ...r,
    variables: JSON.parse(r.variables as string),
  }));

  res.json({ blast, recipients: parsed });
});

export default router;
