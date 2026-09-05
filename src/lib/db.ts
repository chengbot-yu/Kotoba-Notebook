/* ============================================================
   ことばノート — IndexedDB persistence (DB name & shape = v1)
   ============================================================ */
import type { Word, ReviewRecord, StudyDay, AchievementRec, Settings } from './types';

const NAME = 'kotoba-notebook';
const VERSION = 1;
const STORES = ['words', 'reviews', 'studyDays', 'achievements', 'settings'] as const;
type StoreName = (typeof STORES)[number];

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) {
        if (!db.objectStoreNames.contains(s)) {
          db.createObjectStore(s, { keyPath: s === 'studyDays' ? 'date' : s === 'settings' ? 'key' : 'id' });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
    req.onblocked = () => reject(new Error('IndexedDB blocked by another tab'));
  });
  return dbPromise;
}

async function store(name: StoreName, mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await open();
  return db.transaction(name, mode).objectStore(name);
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB request failed'));
  });
}

export const DB = {
  async getAll<T = unknown>(name: StoreName): Promise<T[]> {
    return wrap((await store(name, 'readonly')).getAll()) as Promise<T[]>;
  },
  async get<T = unknown>(name: StoreName, key: IDBValidKey): Promise<T | undefined> {
    return wrap((await store(name, 'readonly')).get(key)) as Promise<T | undefined>;
  },
  async count(name: StoreName): Promise<number> {
    return wrap((await store(name, 'readonly')).count());
  },
  async put(name: StoreName, value: unknown): Promise<IDBValidKey> {
    return wrap((await store(name, 'readwrite')).put(value));
  },
  async delete(name: StoreName, key: IDBValidKey): Promise<undefined> {
    return wrap((await store(name, 'readwrite')).delete(key));
  },
  async clear(name: StoreName): Promise<undefined> {
    return wrap((await store(name, 'readwrite')).clear());
  },
  async putMany(name: StoreName, values: unknown[]): Promise<void> {
    const os = await store(name, 'readwrite');
    await Promise.all(values.map(v => wrap(os.put(v))));
  },
  async wipeAll(withSettings = false): Promise<void> {
    const list = withSettings ? STORES : STORES.filter(s => s !== 'settings');
    for (const s of list) await DB.clear(s);
  },
};

export type { Word, ReviewRecord, StudyDay, AchievementRec, Settings };
