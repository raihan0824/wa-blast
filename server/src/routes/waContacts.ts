import { Router } from 'express';
import { searchContacts, getContactCount } from '../whatsapp/contactStore.js';

const router = Router();

router.get('/', (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q : '';
  const results = searchContacts(q, 20);
  res.json({ results, totalSynced: getContactCount() });
});

export default router;
