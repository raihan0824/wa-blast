import { Router } from 'express';
import { searchContacts, getContactCount } from '../whatsapp/contactStore.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', (req, res) => {
  const { user } = req as AuthRequest;
  const userId = user!.id;
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const total = getContactCount(userId);
  const results = searchContacts(userId, q, 20);
  res.json({ results, totalSynced: total });
});

export default router;
