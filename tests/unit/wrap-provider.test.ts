import { describe, it, expect, vi, beforeEach } from 'vitest';
import { wrapProvider, createEmitter, markNextRequestAsReplay } from '../../src/injected/wrap-provider';
import type { ProviderInfo } from '@shared/types';

const info: ProviderInfo = { name: 'Test', rdns: 'test.wallet' };

describe('wrapProvider', () => {
  let emit: ReturnType<typeof vi.fn>;
  beforeEach(() => { emit = vi.fn(); });

  it('forwards request and emits call:start + call:end on success', async () => {
    const provider = { request: vi.fn().mockResolvedValue('0x1') };
    wrapProvider(provider as any, info, emit);
    const result = await provider.request({ method: 'eth_chainId', params: [] });
    expect(result).toBe('0x1');
    const kinds = emit.mock.calls.map(c => c[0].kind);
    expect(kinds).toEqual(['provider', 'call:start', 'call:end']);
  });

  it('emits call:error and rethrows when request rejects', async () => {
    const err = Object.assign(new Error('rejected'), { code: 4001 });
    const provider = { request: vi.fn().mockRejectedValue(err) };
    wrapProvider(provider as any, info, emit);
    await expect(provider.request({ method: 'personal_sign', params: [] })).rejects.toBe(err);
    const kinds = emit.mock.calls.map(c => c[0].kind);
    expect(kinds).toEqual(['provider', 'call:start', 'call:error']);
    expect(emit.mock.calls[2][0].payload.error.code).toBe(4001);
  });

  it('does not double-wrap the same provider', () => {
    const provider = { request: vi.fn().mockResolvedValue(0) };
    const original = provider.request;
    wrapProvider(provider as any, info, emit);
    const firstWrap = provider.request;
    wrapProvider(provider as any, info, emit);
    expect(provider.request).toBe(firstWrap);
    expect(firstWrap).not.toBe(original);
  });

  it('emits provider info on wrap', () => {
    const provider = { request: vi.fn() };
    wrapProvider(provider as any, info, emit);
    expect(emit).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'dappinsp', kind: 'provider', payload: info }),
    );
    // And it tags the emitted envelope with the page origin.
    const providerCall = emit.mock.calls.find(c => c[0].kind === 'provider');
    expect(typeof providerCall?.[0].origin).toBe('string');
  });

  it('records the applied throttle delay on call:end', async () => {
    const provider = { request: vi.fn().mockResolvedValue('ok') };
    const preRequest = vi.fn().mockResolvedValue({ kind: 'delay', ms: 5 });
    wrapProvider(provider as any, info, emit, preRequest);
    await provider.request({ method: 'eth_call', params: [] });
    const endMsg = emit.mock.calls.map(c => c[0]).find(m => m.kind === 'call:end');
    expect(endMsg?.payload.throttleMs).toBe(5);
  });

  it('omits throttleMs when no delay was applied', async () => {
    const provider = { request: vi.fn().mockResolvedValue('ok') };
    wrapProvider(provider as any, info, emit);
    await provider.request({ method: 'eth_call', params: [] });
    const endMsg = emit.mock.calls.map(c => c[0]).find(m => m.kind === 'call:end');
    expect(endMsg?.payload.throttleMs).toBeUndefined();
  });

  it('tags the next call:start with replayed after markNextRequestAsReplay', async () => {
    const provider = { request: vi.fn().mockResolvedValue('ok') };
    wrapProvider(provider as any, info, emit);
    markNextRequestAsReplay();
    await provider.request({ method: 'eth_call', params: [] });
    await provider.request({ method: 'eth_call', params: [] });

    const starts = emit.mock.calls
      .map(c => c[0])
      .filter(m => m.kind === 'call:start');
    expect(starts).toHaveLength(2);
    expect(starts[0].payload.replayed).toBe(true);
    // Flag is single-shot: second call isn't tagged.
    expect(starts[1].payload.replayed).toBeUndefined();
  });
});

describe('createEmitter', () => {
  it('posts to window', () => {
    const post = vi.fn();
    (globalThis as any).window = { postMessage: post };
    const emit = createEmitter();
    emit({ source: 'dappinsp', kind: 'provider', payload: info, origin: 'https://example.com' });
    expect(post).toHaveBeenCalled();
  });
});
