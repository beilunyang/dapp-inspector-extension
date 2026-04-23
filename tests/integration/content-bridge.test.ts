import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('content bridge', () => {
  beforeEach(() => {
    vi.resetModules();
    (globalThis as any).chrome = {
      runtime: {
        sendMessage: vi.fn().mockResolvedValue(undefined),
        onMessage: { addListener: vi.fn() },
      },
      storage: {
        local: { get: vi.fn().mockResolvedValue({}) },
        onChanged: { addListener: vi.fn() },
      },
    };
  });

  function dappinspCalls() {
    return (chrome.runtime.sendMessage as any).mock.calls.filter(
      (c: unknown[]) => (c[0] as { source?: string })?.source === 'dappinsp',
    );
  }

  it('forwards dappinsp messages from page to runtime', async () => {
    await import('../../src/content/index');
    await new Promise(r => setTimeout(r, 0));

    const event = new MessageEvent('message', {
      data: { source: 'dappinsp', kind: 'provider', payload: { name: 'X' } },
      origin: window.location.origin,
    });
    Object.defineProperty(event, 'source', { value: window, enumerable: true });
    window.dispatchEvent(event);

    await new Promise(r => setTimeout(r, 0));
    const calls = dappinspCalls();
    expect(calls.length).toBe(1);
    expect(calls[0][0].kind).toBe('provider');
  });

  it('ignores messages from other sources', async () => {
    await import('../../src/content/index');
    await new Promise(r => setTimeout(r, 0));

    const event = new MessageEvent('message', {
      data: { hello: 'world' },
      origin: window.location.origin,
    });
    Object.defineProperty(event, 'source', { value: null, enumerable: true });
    window.dispatchEvent(event);

    await new Promise(r => setTimeout(r, 0));
    expect(dappinspCalls().length).toBe(0);
  });

  it('bootstraps by reading storage directly', async () => {
    await import('../../src/content/index');
    await new Promise(r => setTimeout(r, 0));
    expect((chrome.storage.local.get as any).mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
