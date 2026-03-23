import { Router } from 'express';
import db from '../db.js';
import type { AuthRequest } from '../middleware/auth.js';

const router = Router();

// List all templates for the authenticated user
router.get('/', (req, res) => {
  const { user } = req as AuthRequest;
  const templates = db.prepare('SELECT id, name, body, created_at, updated_at FROM templates WHERE user_id = ? ORDER BY updated_at DESC').all(user!.id);
  res.json(templates);
});

// Create a new template
router.post('/', (req, res) => {
  const { user } = req as AuthRequest;
  const { name, body } = req.body;

  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Template name is required' });
    return;
  }
  if (!body || typeof body !== 'string') {
    res.status(400).json({ error: 'Template body is required' });
    return;
  }

  const result = db.prepare('INSERT INTO templates (user_id, name, body) VALUES (?, ?, ?)').run(user!.id, name.trim(), body);
  const template = db.prepare('SELECT id, name, body, created_at, updated_at FROM templates WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(template);
});

// Update a template
router.put('/:id', (req, res) => {
  const { user } = req as AuthRequest;
  const { id } = req.params;
  const { name, body } = req.body;

  const existing = db.prepare('SELECT id FROM templates WHERE id = ? AND user_id = ?').get(id, user!.id);
  if (!existing) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }

  db.prepare("UPDATE templates SET name = COALESCE(?, name), body = COALESCE(?, body), updated_at = datetime('now') WHERE id = ?").run(name || null, body || null, id);
  const template = db.prepare('SELECT id, name, body, created_at, updated_at FROM templates WHERE id = ?').get(id);
  res.json(template);
});

// Delete a template
router.delete('/:id', (req, res) => {
  const { user } = req as AuthRequest;
  const { id } = req.params;

  const result = db.prepare('DELETE FROM templates WHERE id = ? AND user_id = ?').run(id, user!.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Template not found' });
    return;
  }
  res.json({ success: true });
});

export default router;
