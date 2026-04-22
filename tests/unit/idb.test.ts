import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, type DappInspectorDb } from '@shared/idb';
import type { CapturedCall, TabProvenance } from '@shared/types';

const fakeCall = (over: Partial<CapturedCall> = {}): CapturedCall => ({
  id: 'c1', tabId: 1, origin: 'https://app.test',
  providerInfo: { name: 'MetaMask' },
  method: 'eth_chainId', kind: 'read', params: [],
  startedAt: Date.now(), status: 'ok', result: '0x1',
  ...over,
});

describe('idb', () => {
  let db: DappInspectorDb;
  beforeEach(async () => {
    db = await openDb();
    // Clean up any previous test data
    await db.clearAll();
  });

  it('puts and gets a call', async () => {
    await db.putCall(fakeCall());
    const got = await db.getCall('c1');
    expect(got?.method).toBe('eth_chainId');
  });

  it('lists calls for a tab, newest first', async () => {
    await db.putCall(fakeCall({ id: 'a', startedAt: 100 }));
    await db.putCall(fakeCall({ id: 'b', startedAt: 200 }));
    await db.putCall(fakeCall({ id: 'c', startedAt: 150, tabId: 2 }));
    const list = await db.listCallsByTab(1);
    expect(list.map(c => c.id)).toEqual(['b', 'a']);
  });

  it('clears calls for a tab', async () => {
    await db.putCall(fakeCall({ id: 'a', tabId: 1 }));
    await db.putCall(fakeCall({ id: 'b', tabId: 2 }));
    await db.clearTab(1);
    const t1 = await db.listCallsByTab(1);
    const t2 = await db.listCallsByTab(2);
    expect(t1).toHaveLength(0);
    expect(t2).toHaveLength(1);
  });

  it('evicts oldest calls when over cap', async () => {
    for (let i = 0; i < 10; i++) {
      await db.putCall(fakeCall({ id: `x${i}`, startedAt: i }));
    }
    await db.evictOldest(4);
    const remaining = await db.countCalls();
    expect(remaining).toBe(4);
    const all = await db.listCallsByTab(1);
    expect(all.map(c => c.id)).toEqual(['x9', 'x8', 'x7', 'x6']);
  });

  it('puts and gets tab provenance', async () => {
    const prov: TabProvenance = { tabId: 7, origin: 'https://app.test', url: 'https://app.test/x', wallets: [], hasDapp: true };
    await db.putProvenance(prov);
    const got = await db.getProvenance(7);
    expect(got?.origin).toBe('https://app.test');
  });

  it('patches call in place', async () => {
    await db.putCall(fakeCall({ id: 'p', status: 'pending' }));
    await db.patchCall('p', { status: 'ok', durationMs: 42, endedAt: 100 });
    const got = await db.getCall('p');
    expect(got?.status).toBe('ok');
    expect(got?.durationMs).toBe(42);
  });
});
