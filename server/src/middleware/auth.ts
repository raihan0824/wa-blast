import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config.js';
import db from '../db.js';

export interface AuthRequest extends Request {
  user?: { id: number; username: string };
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET) as { id: number; username: string };
    // Verify user still exists in DB (handles DB recreation with stale tokens)
    const exists = db.prepare('SELECT id FROM users WHERE id = ?').get(payload.id);
    if (!exists) {
      res.status(401).json({ error: 'User no longer exists. Please log in again.' });
      return;
    }
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function verifySocketToken(token: string): { id: number; username: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: number; username: string };
  } catch {
    return null;
  }
}
