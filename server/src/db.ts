import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../wa-blast.db');

const db: InstanceType<typeof Database> = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS wa_auth (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS blast_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    template TEXT NOT NULL,
    total INTEGER NOT NULL DEFAULT 0,
    sent INTEGER NOT NULL DEFAULT 0,
    failed INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'running',
    started_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS blast_recipients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    blast_id INTEGER NOT NULL REFERENCES blast_history(id),
    number TEXT NOT NULL,
    variables TEXT NOT NULL DEFAULT '{}',
    rendered_message TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    error TEXT,
    sent_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_blast_history_user ON blast_history(user_id);
  CREATE INDEX IF NOT EXISTS idx_blast_recipients_blast ON blast_recipients(blast_id);
`);

console.log('[DB] SQLite initialized at', DB_PATH);

export default db;
