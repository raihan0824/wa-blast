import { WAProto, initAuthCreds, BufferJSON } from '@whiskeysockets/baileys';
import type { AuthenticationCreds, AuthenticationState, SignalDataTypeMap } from '@whiskeysockets/baileys';
import db from '../db.js';

const getStmt = db.prepare('SELECT value FROM wa_auth WHERE key = ?');
const setStmt = db.prepare('INSERT OR REPLACE INTO wa_auth (key, value) VALUES (?, ?)');
const delStmt = db.prepare('DELETE FROM wa_auth WHERE key = ?');
const delPrefixStmt = db.prepare('DELETE FROM wa_auth WHERE key LIKE ?');

function readData(key: string): unknown | null {
  const row = getStmt.get(key) as { value: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.value, BufferJSON.reviver);
}

function writeData(key: string, data: unknown): void {
  const value = JSON.stringify(data, BufferJSON.replacer);
  setStmt.run(key, value);
}

function removeData(key: string): void {
  delStmt.run(key);
}

export function useSQLiteAuthState(): { state: AuthenticationState; saveCreds: () => void } {
  const creds: AuthenticationCreds = (readData('creds') as AuthenticationCreds) || initAuthCreds();

  const state: AuthenticationState = {
    creds,
    keys: {
      get: <T extends keyof SignalDataTypeMap>(type: T, ids: string[]) => {
        const data: { [id: string]: SignalDataTypeMap[T] } = {};
        for (const id of ids) {
          const value = readData(`${type}-${id}`);
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
                writeData(key, value);
              } else {
                removeData(key);
              }
            }
          }
        });
        transaction();
      },
    },
  };

  const saveCreds = (): void => {
    writeData('creds', state.creds);
  };

  return { state, saveCreds };
}

export function clearSQLiteAuthState(): void {
  delPrefixStmt.run('%');
  console.log('[WA] Cleared SQLite auth state');
}
