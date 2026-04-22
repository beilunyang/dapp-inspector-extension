import { describe, it, expect, beforeEach } from 'vitest';
import { useCapturesStore } from '../../src/panel/stores/captures-store';

const mk = (id: string, startedAt: number, method = 'eth_chainId') => ({
  id, tabId: 1, origin: 'https://a', providerInfo: { name: 'x' },
  method, kind: 'read' as const, params: [], startedAt, status: 'ok' as const,
});

describe('captures-store', () => {
  beforeEach(() => useCapturesStore.getState().reset());

  it('appends with newest first', () => {
    useCapturesStore.getState().apply({ kind: 'append', call: mk('a', 100) });
    useCapturesStore.getState().apply({ kind: 'append', call: mk('b', 200) });
    expect(useCapturesStore.getState().calls.map(c => c.id)).toEqual(['b', 'a']);
  });

  it('patches existing', () => {
    useCapturesStore.getState().apply({ kind: 'append', call: mk('a', 100) });
    useCapturesStore.getState().apply({ kind: 'update', id: 'a', patch: { status: 'error' } });
    expect(useCapturesStore.getState().calls[0].status).toBe('error');
  });

  it('replaces on snapshot', () => {
    useCapturesStore.getState().apply({ kind: 'append', call: mk('a', 1) });
    useCapturesStore.getState().apply({ kind: 'snapshot', calls: [mk('b', 2)], provenance: { tabId: 1, origin: '', url: '', wallets: [], hasDapp: false } });
    expect(useCapturesStore.getState().calls.map(c => c.id)).toEqual(['b']);
  });

  it('clears', () => {
    useCapturesStore.getState().apply({ kind: 'append', call: mk('a', 1) });
    useCapturesStore.getState().apply({ kind: 'clear' });
    expect(useCapturesStore.getState().calls).toHaveLength(0);
  });
});
