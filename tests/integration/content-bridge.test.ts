import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('content bridge', () => {
  beforeEach(() => {
    vi.resetModules();
    // Set up chrome API BEFORE importing the content script
    (globalThis as any).chrome = {
      runtime: {
        sendMessage: vi.fn().mockResolvedValue(undefined),
        onMessage: { addListener: vi.fn() },
      },
    };
  });

  it('forwards dappinsp messages from page to runtime', async () => {
    await import('../../src/content/index');
    // Give the event listener a chance to register
    await new Promise(r => setTimeout(r, 0));

    // Manually dispatch a MessageEvent with source set to window
    const event = new MessageEvent('message', {
      data: { source: 'dappinsp', kind: 'provider', payload: { name: 'X' } },
      origin: window.location.origin,
    });
    Object.defineProperty(event, 'source', {
      value: window,
      enumerable: true,
      writable: false,
    });
    window.dispatchEvent(event);

    await new Promise(r => setTimeout(r, 0));
    expect((chrome.runtime.sendMessage as any).mock.calls.length).toBe(1);
    expect((chrome.runtime.sendMessage as any).mock.calls[0][0].kind).toBe('provider');
  });

  it('ignores messages from other sources', async () => {
    await import('../../src/content/index');
    // Give the event listener a chance to register
    await new Promise(r => setTimeout(r, 0));

    // Dispatch a message event with a different source
    const event = new MessageEvent('message', {
      data: { hello: 'world' },
      origin: window.location.origin,
    });
    Object.defineProperty(event, 'source', {
      value: null, // Not from window
      enumerable: true,
      writable: false,
    });
    window.dispatchEvent(event);

    await new Promise(r => setTimeout(r, 0));
    expect((chrome.runtime.sendMessage as any).mock.calls.length).toBe(0);
  });
});
