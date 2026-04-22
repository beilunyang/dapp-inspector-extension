import type { CapturedCall, TabProvenance } from './types';

const DB_NAME = 'dapp-inspector';
const DB_VERSION = 1;
const CALLS = 'calls';
const PROVENANCE = 'tab-provenance';

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    if (req.readyState === 'done') {
      if (req.result !== undefined || req.error) {
        if (req.error) reject(req.error);
        else resolve(req.result);
      }
    } else {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    }
  });
}

function tx<T>(db: IDBDatabase, store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => Promise<T> | T): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);

    t.oncomplete = () => {
      resolve(resultOrUndefined as T);
    };
    t.onerror = () => {
      reject(t.error || new Error('Transaction failed'));
    };

    let resultOrUndefined: T | undefined;
    Promise.resolve(fn(s)).then(
      (r) => { resultOrUndefined = r; },
      (e) => { reject(e); t.abort(); },
    ).catch((e) => {
      reject(e);
      t.abort();
    });
  });
}

export interface DappInspectorDb {
  putCall(call: CapturedCall): Promise<void>;
  patchCall(id: string, patch: Partial<CapturedCall>): Promise<void>;
  getCall(id: string): Promise<CapturedCall | undefined>;
  listCallsByTab(tabId: number): Promise<CapturedCall[]>;
  clearTab(tabId: number): Promise<void>;
  clearAll(): Promise<void>;
  countCalls(): Promise<number>;
  evictOldest(keepLastN: number): Promise<number>; // returns how many removed
  putProvenance(prov: TabProvenance): Promise<void>;
  getProvenance(tabId: number): Promise<TabProvenance | undefined>;
  close(): void;
}

export async function openDb(): Promise<DappInspectorDb> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(CALLS)) {
        const s = d.createObjectStore(CALLS, { keyPath: 'id' });
        s.createIndex('byTabId', 'tabId', { unique: false });
        s.createIndex('byStartedAt', 'startedAt', { unique: false });
        s.createIndex('byOrigin', 'origin', { unique: false });
      }
      if (!d.objectStoreNames.contains(PROVENANCE)) {
        d.createObjectStore(PROVENANCE, { keyPath: 'tabId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return {
    async putCall(call) {
      await tx(db, CALLS, 'readwrite', (s) => request(s.put(call)));
    },
    async patchCall(id, patch) {
      await tx(db, CALLS, 'readwrite', async (s) => {
        const cur = await request(s.get(id));
        if (!cur) return;
        await request(s.put({ ...cur, ...patch }));
      });
    },
    async getCall(id) {
      return tx(db, CALLS, 'readonly', (s) => request(s.get(id)) as Promise<CapturedCall | undefined>);
    },
    async listCallsByTab(tabId) {
      return tx(db, CALLS, 'readonly', async (s) => {
        const idx = s.index('byTabId');
        const calls = await request(idx.getAll(IDBKeyRange.only(tabId))) as CapturedCall[];
        return calls.sort((a, b) => b.startedAt - a.startedAt);
      });
    },
    async clearTab(tabId) {
      await tx(db, CALLS, 'readwrite', async (s) => {
        const idx = s.index('byTabId');
        const keys = await request(idx.getAllKeys(IDBKeyRange.only(tabId))) as IDBValidKey[];
        for (const k of keys) await request(s.delete(k));
      });
    },
    async clearAll() {
      await tx(db, CALLS, 'readwrite', (s) => request(s.clear()));
    },
    async countCalls() {
      return tx(db, CALLS, 'readonly', (s) => request(s.count()));
    },
    async evictOldest(keepLastN) {
      return tx(db, CALLS, 'readwrite', async (s) => {
        const total = await request(s.count());
        if (total <= keepLastN) return 0;
        const idx = s.index('byStartedAt');
        const toRemove = total - keepLastN;
        let removed = 0;
        await new Promise<void>((resolve, reject) => {
          const cursorReq = idx.openCursor(null, 'next');
          cursorReq.onsuccess = () => {
            const c = cursorReq.result;
            if (!c || removed >= toRemove) return resolve();
            c.delete();
            removed++;
            c.continue();
          };
          cursorReq.onerror = () => reject(cursorReq.error);
        });
        return removed;
      });
    },
    async putProvenance(prov) {
      await tx(db, PROVENANCE, 'readwrite', (s) => request(s.put(prov)));
    },
    async getProvenance(tabId) {
      return tx(db, PROVENANCE, 'readonly', (s) => request(s.get(tabId)) as Promise<TabProvenance | undefined>);
    },
    close() { db.close(); },
  };
}
