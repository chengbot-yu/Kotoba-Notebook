/* ============================================================
   ことばノート — IndexedDB persistence layer
   All core data (words / reviews / studyDays / achievements)
   lives in IndexedDB. Only lightweight prefs go through here
   too (settings store) — nothing depends on volatile state.
   ============================================================ */
const DB = (() => {
  const NAME = 'kotoba-notebook';
  const VERSION = 1;
  const STORES = ['words', 'reviews', 'studyDays', 'achievements', 'settings'];
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        for (const s of STORES) {
          if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: s === 'studyDays' ? 'date' : (s === 'settings' ? 'key' : 'id') });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
      req.onblocked = () => reject(new Error('IndexedDB blocked by another tab'));
    });
    return dbPromise;
  }

  async function store(name, mode) {
    const db = await open();
    return db.transaction(name, mode).objectStore(name);
  }

  function wrap(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('IndexedDB request failed'));
    });
  }

  return {
    async getAll(name) { return wrap((await store(name, 'readonly')).getAll()); },
    async get(name, key) { return wrap((await store(name, 'readonly')).get(key)); },
    async count(name) { return wrap((await store(name, 'readonly')).count()); },
    async put(name, value) { return wrap((await store(name, 'readwrite')).put(value)); },
    async delete(name, key) { return wrap((await store(name, 'readwrite')).delete(key)); },
    async clear(name) { return wrap((await store(name, 'readwrite')).clear()); },
    async putMany(name, values) {
      const os = await store(name, 'readwrite');
      await Promise.all(values.map(v => wrap(os.put(v))));
    },
    /* wipe everything (used by clear-all / restore) */
    async wipeAll(withSettings = false) {
      const list = withSettings ? STORES : STORES.filter(s => s !== 'settings');
      for (const s of list) await this.clear(s);
    },
  };
})();
