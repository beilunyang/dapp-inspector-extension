import { describe, it, expect, beforeEach } from 'vitest';
import { parseAbi } from 'viem';
import { installChromeStorageMock } from '../mocks/chrome-storage';
import {
  getCached,
  putCached,
  withSingleFlight,
  clearCache,
  _resetForTests,
} from '../../src/shared/abi/cache';

const TEST_ABI = parseAbi(['function foo(uint256 x)']);

describe('abi cache', () => {
  beforeEach(() => {
    installChromeStorageMock();
    _resetForTests();
  });

  it('round-trips put + get', async () => {
    await putCached('0x1', '0xABC123', TEST_ABI, 'sourcify');
    const got = await getCached('0x1', '0xabc123');
    expect(got?.source).toBe('sourcify');
    expect(got?.abi).toEqual(TEST_ABI);
  });

  it('lookup is case-insensitive on address', async () => {
    await putCached('0x1', '0xABC123', TEST_ABI, 'sourcify');
    expect(await getCached('0x1', '0xabc123')).not.toBeNull();
    expect(await getCached('0x1', '0xAbC123')).not.toBeNull();
  });

  it('returns null when address is missing', async () => {
    expect(await getCached('0x1', undefined)).toBeNull();
  });

  it('expires entries past TTL', async () => {
    await putCached('0x1', '0xabc', TEST_ABI, 'sourcify');
    // Backdate the entry by 8 days via raw storage write.
    const got = await chrome.storage.local.get('dappinsp.abi-cache.v1');
    const map = got['dappinsp.abi-cache.v1'] as Record<string, { fetchedAt: number }>;
    map['0x1/0xabc'].fetchedAt = Date.now() - 8 * 24 * 60 * 60 * 1000;
    await chrome.storage.local.set({ 'dappinsp.abi-cache.v1': map });
    _resetForTests();
    expect(await getCached('0x1', '0xabc')).toBeNull();
  });

  it('clearCache wipes everything', async () => {
    await putCached('0x1', '0xabc', TEST_ABI, 'sourcify');
    await clearCache();
    expect(await getCached('0x1', '0xabc')).toBeNull();
  });

  it('withSingleFlight dedupes concurrent fetches', async () => {
    let calls = 0;
    const fetcher = async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 5));
      return TEST_ABI;
    };
    const [a, b, c] = await Promise.all([
      withSingleFlight('0x1', '0xdef', 'sourcify', fetcher),
      withSingleFlight('0x1', '0xdef', 'sourcify', fetcher),
      withSingleFlight('0x1', '0xdef', 'sourcify', fetcher),
    ]);
    expect(calls).toBe(1);
    expect(a?.source).toBe('sourcify');
    expect(b?.source).toBe('sourcify');
    expect(c?.source).toBe('sourcify');
  });

  it('withSingleFlight does not cache null results', async () => {
    const result = await withSingleFlight('0x1', '0xnope', 'sourcify', async () => null);
    expect(result).toBeNull();
    expect(await getCached('0x1', '0xnope')).toBeNull();
  });
});
