import { Router } from 'express';

const router = Router();

let currentTemplate = '';

router.get('/', (_req, res) => {
  res.json({ template: currentTemplate });
});

router.post('/', (req, res) => {
  const { template } = req.body;
  if (typeof template !== 'string') {
    res.status(400).json({ error: 'Template must be a string' });
    return;
  }
  currentTemplate = template;
  res.json({ template: currentTemplate });
});

export default router;
