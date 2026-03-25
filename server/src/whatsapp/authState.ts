import { WAProto, initAuthCreds, BufferJSON } from '@whiskeysockets/baileys';
import type { AuthenticationCreds, AuthenticationState, SignalDataTypeMap } from '@whiskeysockets/baileys';
import db from '../db.js';

const getStmt = db.prepare('SELECT value FROM wa_auth WHERE user_id = ? AND key = ?');
const setStmt = db.prepare('INSERT OR REPLACE INTO wa_auth (user_id, key, value) VALUES (?, ?, ?)');
const delStmt = db.prepare('DELETE FROM wa_auth WHERE user_id = ? AND key = ?');
const delAllStmt = db.prepare('DELETE FROM wa_auth WHERE user_id = ?');

function readData(userId: number, key: string): unknown | null {
  const row = getStmt.get(userId, key) as { value: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.value, BufferJSON.reviver);
}

function writeData(userId: number, key: string, data: unknown): void {
  const value = JSON.stringify(data, BufferJSON.replacer);
  setStmt.run(userId, key, value);
}

function removeData(userId: number, key: string): void {
  delStmt.run(userId, key);
}

export function useSQLiteAuthState(userId: number): { state: AuthenticationState; saveCreds: () => void } {
  const creds: AuthenticationCreds = (readData(userId, 'creds') as AuthenticationCreds) || initAuthCreds();

  const state: AuthenticationState = {
    creds,
    keys: {
      get: <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
        const data: { [id: string]: SignalDataTypeMap[T] } = {};
        for (const id of ids) {
          const value = readData(userId, `${type}-${id}`);
          if (value) {
            if (type === 'app-state-sync-key') {
              data[id] = WAProto.Message.AppStateSyncKeyData.fromObject(value) as unknown as SignalDataTypeMap[T];
            } else {
              data[id] = value as SignalDataTypeMap[T];
            }
          }
        }
        return data;
      },
      set: (data) => {
        const transaction = db.transaction(() => {
          for (const category in data) {
            for (const id in data[category as keyof SignalDataTypeMap]) {
              const value = data[category as keyof SignalDataTypeMap]![id];
              const key = `${category}-${id}`;
              if (value) {
                writeData(userId, key, value);
              } else {
                removeData(userId, key);
              }
            }
          }
        });
        transaction();
      },
    },
  };

  const saveCreds = (): void => {
    writeData(userId, 'creds', state.creds);
  };

  return { state, saveCreds };
}

export function clearSQLiteAuthState(userId: number): void {
  delAllStmt.run(userId);
  console.log(`[WA] Cleared SQLite auth state for user ${userId}`);
}
