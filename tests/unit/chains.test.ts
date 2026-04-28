import { describe, it, expect, beforeEach } from 'vitest';
import { installChromeStorageMock } from '../mocks/chrome-storage';
import {
  chainIdToNumber,
  lookupChainName,
  fmtChain,
  chainTitle,
  ensureChainCatalog,
  _resetForTests,
  SEED_CHAINS,
} from '../../src/shared/chains';

describe('chainIdToNumber', () => {
  it('parses hex with 0x prefix', () => {
    expect(chainIdToNumber('0x1')).toBe(1);
    expect(chainIdToNumber('0x89')).toBe(137);
    expect(chainIdToNumber('0xa4b1')).toBe(42161);
  });

  it('parses decimal strings', () => {
    expect(chainIdToNumber('1')).toBe(1);
    expect(chainIdToNumber('137')).toBe(137);
  });

  it('returns null for malformed input', () => {
    expect(chainIdToNumber('')).toBeNull();
    expect(chainIdToNumber(undefined)).toBeNull();
    expect(chainIdToNumber('0xnothex')).toBeNull();
    expect(chainIdToNumber('not a number')).toBeNull();
  });
});

describe('lookupChainName (seed)', () => {
  beforeEach(() => {
    installChromeStorageMock();
    _resetForTests();
  });

  it('resolves Ethereum mainnet', () => {
    expect(lookupChainName('0x1')).toBe('Ethereum');
    expect(lookupChainName('1')).toBe('Ethereum');
  });

  it('resolves common L2s', () => {
    expect(lookupChainName('0xa4b1')).toBe('Arbitrum One');
    expect(lookupChainName('0x2105')).toBe('Base');
    expect(lookupChainName('0x89')).toBe('Polygon');
  });

  it('returns null for unknown ids', () => {
    expect(lookupChainName('0xdead')).toBeNull();
  });

  it('seed contains both mainnets and key testnets', () => {
    expect(SEED_CHAINS[1]).toBe('Ethereum');
    expect(SEED_CHAINS[11155111]).toBe('Sepolia');
    expect(SEED_CHAINS[17000]).toBe('Holesky');
  });
});

describe('fmtChain', () => {
  beforeEach(() => {
    installChromeStorageMock();
    _resetForTests();
  });

  it('"name" mode returns just the name when known', () => {
    expect(fmtChain('0x1', 'name')).toBe('Ethereum');
  });

  it('"name+hex" mode appends the hex id', () => {
    expect(fmtChain('0x1', 'name+hex')).toBe('Ethereum · 0x1');
  });

  it('falls back to raw input when chain is unknown', () => {
    expect(fmtChain('0xdead', 'name')).toBe('0xdead');
    expect(fmtChain('0xdead', 'name+hex')).toBe('0xdead');
  });

  it('returns em-dash for empty input', () => {
    expect(fmtChain(undefined, 'name')).toBe('—');
  });
});

describe('chainTitle (tooltip)', () => {
  beforeEach(() => {
    installChromeStorageMock();
    _resetForTests();
  });

  it('combines name + hex + decimal for known chain', () => {
    expect(chainTitle('0x1')).toBe('Ethereum · 0x1 (1)');
  });

  it('hex + decimal for unknown chain', () => {
    expect(chainTitle('0xdead')).toBe('0xdead (57005)');
  });

  it('empty string for nullish input', () => {
    expect(chainTitle(undefined)).toBe('');
  });
});

describe('ensureChainCatalog (online fallback)', () => {
  beforeEach(() => {
    installChromeStorageMock();
    _resetForTests();
  });

  it('hydrates from chrome.storage when fresh entry is present', async () => {
    await chrome.storage.local.set({
      'dappinsp.chains.v1': {
        entries: [[57005, 'DeadChain']],
        fetchedAt: Date.now(),
      },
    });
    await ensureChainCatalog();
    expect(lookupChainName('0xdead')).toBe('DeadChain');
  });

  it('ignores expired storage entries (>30d old)', async () => {
    await chrome.storage.local.set({
      'dappinsp.chains.v1': {
        entries: [[57005, 'StaleChain']],
        fetchedAt: Date.now() - 31 * 24 * 60 * 60 * 1000,
      },
    });
    // Stub fetch to refuse so we can confirm storage is bypassed.
    const origFetch = globalThis.fetch;
    (globalThis as { fetch: typeof fetch }).fetch = async () => ({
      ok: false, status: 500, json: async () => [],
    } as unknown as Response);
    try {
      await ensureChainCatalog();
      expect(lookupChainName('0xdead')).toBeNull();
    } finally {
      (globalThis as { fetch: typeof fetch }).fetch = origFetch;
    }
  });
});
