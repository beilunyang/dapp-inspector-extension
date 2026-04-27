import { openDb, type DappInspectorDb } from '@shared/idb';
import type { CapturedCall, TabProvenance } from '@shared/types';

export interface BgStore {
  append(call: CapturedCall): Promise<void>;
  patch(id: string, patch: Partial<CapturedCall>): Promise<CapturedCall | undefined>;
  clear(tabId: number): Promise<void>;
  clearAll(): Promise<void>;
  snapshot(tabId: number): Promise<{ calls: CapturedCall[]; provenance: TabProvenance }>;
  getProvenance(tabId: number): Promise<TabProvenance>;
  putProvenance(prov: TabProvenance): Promise<void>;
  totalCount(): Promise<number>;
  enforceRetention(max: number): Promise<number>;
  close(): void;
}

const DEFAULT_PROVENANCE = (tabId: number): TabProvenance => ({
  tabId, origin: '', url: '', wallets: [], hasDapp: false,
});

export async function createStore(): Promise<BgStore> {
  const db: DappInspectorDb = await openDb();

  return {
    async append(call) { await db.putCall(call); },
    async patch(id, patch) {
      await db.patchCall(id, patch);
      return db.getCall(id);
    },
    async clear(tabId) { await db.clearTab(tabId); },
    async clearAll() { await db.clearAll(); },
    async snapshot(tabId) {
      const [calls, prov] = await Promise.all([
        db.listCallsByTab(tabId),
        db.getProvenance(tabId),
      ]);
      return { calls, provenance: prov ?? DEFAULT_PROVENANCE(tabId) };
    },
    async getProvenance(tabId) {
      return (await db.getProvenance(tabId)) ?? DEFAULT_PROVENANCE(tabId);
    },
    async putProvenance(prov) { await db.putProvenance(prov); },
    async totalCount() { return db.countCalls(); },
    async enforceRetention(max) { return db.evictOldest(max); },
    close() { db.close(); },
  };
}
