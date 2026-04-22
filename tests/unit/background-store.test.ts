import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from '../../src/background/store';
import type { CapturedCall } from '@shared/types';

const mk = (over: Partial<CapturedCall> = {}): CapturedCall => ({
  id: 'x', tabId: 1, origin: 'https://a.test',
  providerInfo: { name: 'M' },
  method: 'eth_chainId', kind: 'read', params: [],
  startedAt: Date.now(), status: 'ok',
  ...over,
});

describe('background store', () => {
  let s: Awaited<ReturnType<typeof createStore>> | null = null;

  beforeEach(async () => {
    if (s) {
      await s.clearAll();
      s.close();
    }
    s = await createStore();
  });

  it('appends and returns via snapshot', async () => {
    await s!.append(mk({ id: 'a' }));
    const snap = await s!.snapshot(1);
    expect(snap.calls.map(c => c.id)).toEqual(['a']);
  });

  it('patches pending → ok', async () => {
    await s!.append(mk({ id: 'p', status: 'pending' }));
    await s!.patch('p', { status: 'ok', durationMs: 10 });
    const snap = await s!.snapshot(1);
    expect(snap.calls[0].status).toBe('ok');
  });

  it('clears a tab', async () => {
    await s!.append(mk({ id: 'a', tabId: 1 }));
    await s!.append(mk({ id: 'b', tabId: 2 }));
    await s!.clear(1);
    expect((await s!.snapshot(1)).calls).toHaveLength(0);
    expect((await s!.snapshot(2)).calls).toHaveLength(1);
  });

  it('evicts when over retention cap', async () => {
    for (let i = 0; i < 20; i++) await s!.append(mk({ id: `i${i}`, startedAt: i }));
    await s!.enforceRetention(5);
    expect(await s!.totalCount()).toBe(5);
  });
});
