import { describe, it, expect, beforeEach } from 'vitest';
import { encodeFunctionData, parseAbi, type Abi } from 'viem';
import { installChromeStorageMock } from '../mocks/chrome-storage';
import {
  withSingleFlight,
  getCached,
  clearCache,
  _resetForTests,
} from '../../src/shared/abi/cache';
import { decodeWithAbi } from '../../src/shared/abi/decode';

const ABI: Abi = parseAbi(['function foo(uint256 x)']);
const CHAIN = '0x1';
const ADDR = '0xCcCCcCCcCCcCcCcCccCcCccCccCcCcCCcCcCcccc';

const data = encodeFunctionData({ abi: ABI, functionName: 'foo', args: [42n] });

describe('ABI cache hit flow (sourcify → cached)', () => {
  beforeEach(() => {
    installChromeStorageMock();
    _resetForTests();
  });

  it('first fetch tags as sourcify, second call tags as cached', async () => {
    let fetcherCalls = 0;
    const fetcher = async () => { fetcherCalls++; return ABI; };

    // First decode — populates the cache.
    const first = await withSingleFlight(CHAIN, ADDR, 'sourcify', fetcher);
    expect(first.status).toBe('ok');
    if (first.status !== 'ok') throw new Error('unreachable');
    const out1 = decodeWithAbi(data, first.entry.abi, 'sourcify');
    expect(out1?.source).toBe('sourcify');

    // Second decode against the same address — must skip the fetch and
    // return the entry from cache, runtime-tagged 'cached'.
    const cached = await getCached(CHAIN, ADDR);
    expect(cached).not.toBeNull();
    expect(fetcherCalls).toBe(1);
    const out2 = decodeWithAbi(data, cached!.abi, 'cached');
    expect(out2?.source).toBe('cached');
  });

  it('case-insensitive on address — checksummed and lowercase land on the same key', async () => {
    await withSingleFlight(CHAIN, ADDR, 'sourcify', async () => ABI);
    const lower = await getCached(CHAIN, ADDR.toLowerCase());
    const checksummed = await getCached(CHAIN, ADDR);
    expect(lower).not.toBeNull();
    expect(checksummed).not.toBeNull();
    expect(lower).toEqual(checksummed);
  });

  it('a different address misses cache and triggers a new fetch', async () => {
    let calls = 0;
    const fetcher = async () => { calls++; return ABI; };
    await withSingleFlight(CHAIN, ADDR, 'sourcify', fetcher);
    const other = await getCached(CHAIN, '0x000000000000000000000000000000000000dEaD');
    expect(other).toBeNull();

    await withSingleFlight(CHAIN, '0x000000000000000000000000000000000000dEaD', 'sourcify', fetcher);
    expect(calls).toBe(2);
  });

  it('a different chainId misses cache (Polygon vs Ethereum)', async () => {
    await withSingleFlight('0x1', ADDR, 'sourcify', async () => ABI);
    const polygon = await getCached('0x89', ADDR);
    expect(polygon).toBeNull();
  });

  it('clearCache wipes both memCache and storage so next read re-misses', async () => {
    await withSingleFlight(CHAIN, ADDR, 'sourcify', async () => ABI);
    expect(await getCached(CHAIN, ADDR)).not.toBeNull();
    await clearCache();
    expect(await getCached(CHAIN, ADDR)).toBeNull();
  });

  it('cross-context invalidation: storage.onChanged removal flushes memCache', async () => {
    // Populate memCache via a write.
    await withSingleFlight(CHAIN, ADDR, 'sourcify', async () => ABI);
    expect(await getCached(CHAIN, ADDR)).not.toBeNull();

    // Simulate Options-side clear: remove the storage entry. This fires
    // storage.onChanged in this test context too (the mock fires events
    // on remove). The cache.ts listener should null out memCache so the
    // next getCached re-hydrates from now-empty storage.
    await chrome.storage.local.remove('dappinsp.abi-cache.v1');

    // Tick the microtask queue so the listener fires.
    await Promise.resolve();
    await Promise.resolve();

    expect(await getCached(CHAIN, ADDR)).toBeNull();
  });

  it('storage.onChanged for an unrelated key does not flush memCache', async () => {
    await withSingleFlight(CHAIN, ADDR, 'sourcify', async () => ABI);
    expect(await getCached(CHAIN, ADDR)).not.toBeNull();

    await chrome.storage.local.set({ 'unrelated:setting': 'whatever' });
    await Promise.resolve();
    await Promise.resolve();

    // Still cached.
    expect(await getCached(CHAIN, ADDR)).not.toBeNull();
  });
});
