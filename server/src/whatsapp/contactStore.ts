import type { Server as SocketIOServer } from 'socket.io';
import db from '../db.js';

export interface WAContact {
  jid: string;
  name: string;
  number: string;
}

const upsertStmt = db.prepare(
  `INSERT INTO wa_contacts (user_id, jid, number, name, synced) VALUES (?, ?, ?, ?, 0)
   ON CONFLICT(user_id, jid) DO UPDATE SET
     number = excluded.number,
     name = CASE WHEN excluded.name != '' THEN excluded.name ELSE wa_contacts.name END`
);

const upsertMany = db.transaction((userId: number, items: WAContact[]) => {
  for (const item of items) {
    upsertStmt.run(userId, item.jid, item.number, item.name);
  }
});

function getCounts(userId: number): { synced: number; buffered: number } {
  const row = db.prepare(
    `SELECT
       COUNT(CASE WHEN synced = 1 THEN 1 END) as synced,
       COUNT(CASE WHEN synced = 0 THEN 1 END) as buffered
     FROM wa_contacts WHERE user_id = ?`
  ).get(userId) as { synced: number; buffered: number };
  return row;
}

function emitCount(userId: number, io: SocketIOServer): void {
  io.to(`user:${userId}`).emit('contacts:count', getCounts(userId));
}

/** Buffer contacts from Baileys events (stored but not yet searchable) */
export function bufferContacts(
  userId: number,
  items: Record<string, unknown>[],
  io: SocketIOServer
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
    upsertMany(userId, toInsert);
  }
  emitCount(userId, io);
}

/** Flush buffer: mark all unsynced contacts as synced (makes them searchable) */
export function flushBufferToStore(userId: number, io: SocketIOServer): { synced: number; buffered: number } {
  db.prepare(`UPDATE wa_contacts SET synced = 1 WHERE user_id = ? AND synced = 0`).run(userId);
  const counts = getCounts(userId);
  emitCount(userId, io);
  return counts;
}

export function searchContacts(userId: number, query: string, limit = 20): WAContact[] {
  if (!query || query.length < 2) return [];
  const q = `%${query.toLowerCase()}%`;
  return db.prepare(
    `SELECT jid, name, number FROM wa_contacts
     WHERE user_id = ? AND synced = 1 AND (LOWER(name) LIKE ? OR number LIKE ?)
     LIMIT ?`
  ).all(userId, q, q, limit) as WAContact[];
}

export function clearContacts(userId: number, io: SocketIOServer): void {
  db.prepare(`DELETE FROM wa_contacts WHERE user_id = ?`).run(userId);
  emitCount(userId, io);
}

export function getContactCount(userId: number): number {
  return (db.prepare(`SELECT COUNT(*) as c FROM wa_contacts WHERE user_id = ? AND synced = 1`).get(userId) as { c: number }).c;
}

export function getBufferCount(userId: number): number {
  return (db.prepare(`SELECT COUNT(*) as c FROM wa_contacts WHERE user_id = ? AND synced = 0`).get(userId) as { c: number }).c;
}
