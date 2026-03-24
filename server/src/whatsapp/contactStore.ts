import type { Server as SocketIOServer } from 'socket.io';
import db from '../db.js';

export interface WAContact {
  jid: string;
  name: string;
  number: string;
}

let ioRef: SocketIOServer | null = null;

// Only overwrite name if the new value is non-empty
const upsertStmt = db.prepare(
  `INSERT INTO wa_contacts (jid, number, name, synced) VALUES (?, ?, ?, 0)
   ON CONFLICT(jid) DO UPDATE SET
     number = excluded.number,
     name = CASE WHEN excluded.name != '' THEN excluded.name ELSE wa_contacts.name END`
);

const upsertMany = db.transaction((items: WAContact[]) => {
  for (const item of items) {
    upsertStmt.run(item.jid, item.number, item.name);
  }
});

export function setIO(io: SocketIOServer): void {
  ioRef = io;
}

function getCounts(): { synced: number; buffered: number } {
  const row = db.prepare(
    `SELECT
       COUNT(CASE WHEN synced = 1 THEN 1 END) as synced,
       COUNT(CASE WHEN synced = 0 THEN 1 END) as buffered
     FROM wa_contacts`
  ).get() as { synced: number; buffered: number };
  return row;
}

function emitCount(): void {
  if (ioRef) {
    ioRef.emit('contacts:count', getCounts());
  }
}

/** Buffer contacts from Baileys events (stored but not yet searchable) */
export function bufferContacts(
  items: Record<string, unknown>[]
): void {
  const toInsert: WAContact[] = [];
  for (const item of items) {
    const jid = (item.id || item.jid) as string | undefined;
    if (!jid || !jid.endsWith('@s.whatsapp.net')) continue;
    const number = jid.replace('@s.whatsapp.net', '');
    const name = ((item.notify || item.name || '') as string);
    toInsert.push({ jid, name, number });
  }
  if (toInsert.length > 0) {
    upsertMany(toInsert);
  }
  emitCount();
}

/** Flush buffer: mark all unsynced contacts as synced (makes them searchable) */
export function flushBufferToStore(): { synced: number; buffered: number } {
  db.prepare(`UPDATE wa_contacts SET synced = 1 WHERE synced = 0`).run();
  const counts = getCounts();
  emitCount();
  return counts;
}

export function searchContacts(query: string, limit = 20): WAContact[] {
  if (!query || query.length < 2) return [];
  const q = `%${query.toLowerCase()}%`;
  return db.prepare(
    `SELECT jid, name, number FROM wa_contacts
     WHERE synced = 1 AND (LOWER(name) LIKE ? OR number LIKE ?)
     LIMIT ?`
  ).all(q, q, limit) as WAContact[];
}

export function clearContacts(): void {
  db.prepare(`DELETE FROM wa_contacts`).run();
  emitCount();
}

export function getContactCount(): number {
  return (db.prepare(`SELECT COUNT(*) as c FROM wa_contacts WHERE synced = 1`).get() as { c: number }).c;
}

export function getBufferCount(): number {
  return (db.prepare(`SELECT COUNT(*) as c FROM wa_contacts WHERE synced = 0`).get() as { c: number }).c;
}
