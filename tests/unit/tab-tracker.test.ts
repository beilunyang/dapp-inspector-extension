import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from '../../src/background/store';
import { createTabTracker } from '../../src/background/tabs';
import type { CapturedCall } from '@shared/types';

const mkCall = (over: Partial<CapturedCall> = {}): CapturedCall => ({
  id: 'c1', tabId: 1, origin: 'https://polymarket.com',
  providerInfo: { name: 'MetaMask', rdns: 'io.metamask' },
  method: 'eth_accounts', kind: 'read', params: [],
  startedAt: Date.now(), status: 'pending',
  ...over,
});

describe('tab tracker origin refresh', () => {
  let store: Awaited<ReturnType<typeof createStore>>;
  let tracker: ReturnType<typeof createTabTracker>;

  beforeEach(async () => {
    store = await createStore();
    await store.clearAll();
    tracker = createTabTracker(store);
  });

  it('updates origin on subsequent call after a stale value was set', async () => {
    // Simulate a stale initial capture (e.g. pre-fix race leaving chrome://newtab).
    await tracker.onCallStart(1, mkCall({ origin: 'chrome://newtab' }));
    let snap = await store.snapshot(1);
    expect(snap.provenance.origin).toBe('chrome://newtab');

    // Next call reports the real origin.
    await tracker.onCallStart(1, mkCall({ id: 'c2', origin: 'https://polymarket.com' }));
    snap = await store.snapshot(1);
    expect(snap.provenance.origin).toBe('https://polymarket.com');
  });

  it('clears stale chainId on cross-origin navigation', async () => {
    await tracker.onCallStart(1, mkCall({
      origin: 'https://polymarket.com',
      method: 'eth_chainId',
      status: 'ok',
      result: '0x89', // Polygon
    }));
    // Simulate the eth_chainId end that stores chainId on provenance.
    const prov1 = (await store.snapshot(1)).provenance;
    prov1.chainId = '0x89';
    await store.putProvenance(prov1);

    // Navigate same tab to a different origin.
    await tracker.onCallStart(1, mkCall({ id: 'c2', origin: 'https://app.uniswap.org' }));
    const prov2 = (await store.snapshot(1)).provenance;
    expect(prov2.origin).toBe('https://app.uniswap.org');
    expect(prov2.chainId).toBeUndefined();
  });

  it('keeps chainId when origin is unchanged', async () => {
    await tracker.onCallStart(1, mkCall({ origin: 'https://polymarket.com' }));
    const prov1 = (await store.snapshot(1)).provenance;
    prov1.chainId = '0x89';
    await store.putProvenance(prov1);

    await tracker.onCallStart(1, mkCall({ id: 'c2', origin: 'https://polymarket.com' }));
    const prov2 = (await store.snapshot(1)).provenance;
    expect(prov2.chainId).toBe('0x89');
  });
});
