import type { BgStore } from './store';
import type { CapturedCall, ProviderInfo, TabProvenance } from '@shared/types';

export function createTabTracker(store: BgStore) {
  async function getOrInit(tabId: number, hints?: { origin?: string; url?: string }): Promise<TabProvenance> {
    const snap = await store.snapshot(tabId);
    const base = snap.provenance;
    if (hints?.origin && !base.origin) base.origin = hints.origin;
    if (hints?.url && !base.url) base.url = hints.url;
    return base;
  }

  return {
    async onCallStart(tabId: number, call: CapturedCall): Promise<TabProvenance> {
      const prov = await getOrInit(tabId, { origin: call.origin });
      prov.hasDapp = true;
      if (call.providerInfo && !prov.wallets.some(w => w.rdns === call.providerInfo.rdns && w.name === call.providerInfo.name)) {
        prov.wallets.push(call.providerInfo);
      }
      if (call.method === 'eth_chainId' && typeof call.result === 'string') {
        prov.chainId = call.result;
      }
      await store.putProvenance(prov);
      return prov;
    },
    async onCallEnd(tabId: number, id: string, result: unknown): Promise<TabProvenance | null> {
      if (typeof result !== 'string') return null;
      const prov = await getOrInit(tabId);
      const patched = await store.patch(id, {});
      if (patched?.method === 'eth_chainId') {
        prov.chainId = result;
        await store.putProvenance(prov);
        return prov;
      }
      return null;
    },
    async onProvider(tabId: number, info: ProviderInfo, origin: string): Promise<TabProvenance> {
      const prov = await getOrInit(tabId, { origin });
      prov.hasDapp = true;
      if (!prov.wallets.some(w => w.rdns === info.rdns && w.name === info.name)) {
        prov.wallets.push(info);
      }
      await store.putProvenance(prov);
      return prov;
    },
    async onTabRemoved(tabId: number): Promise<void> {
      await store.clear(tabId);
    },
  };
}
