import type { Abi } from 'viem';
import type { AbiSource } from './types';
import type { AbiFetchOutcome } from './sourcify';

const STORAGE_KEY = 'dappinsp.abi-cache.v1';
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CacheEntry {
  /** ABI as stored on disk — viem accepts the loose readonly array shape. */
  abi: Abi;
  source: AbiSource;
  fetchedAt: number;
}

/** chrome.storage payload shape (also held in memory after first read). */
type CacheMap = Record<string, CacheEntry>;

let memCache: CacheMap | null = null;
let hydrating: Promise<CacheMap> | null = null;

/** Outcome of withSingleFlight — surfaces the underlying fetcher's
 *  miss-vs-error distinction so the caller can decide whether to memoise
 *  the negative result or leave it open for retry. */
export type SingleFlightResult =
  | { status: 'ok'; entry: CacheEntry }
  | { status: 'miss' }
  | { status: 'error' };

// In-flight Promise dedup: concurrent decode requests for the same key
// share a single underlying fetch.
const inflight = new Map<string, Promise<SingleFlightResult>>();

function key(chainId: string | undefined, address: string | undefined): string | null {
  if (!address) return null;
  // chainId may be undefined when the wallet hasn't called eth_chainId yet —
  // we still cache against a "0" sentinel so the user gets a hit on later
  // calls in the same tab; mismatch risk is low because contract addresses
  // are practically chain-unique in active deployments.
  const chain = (chainId ?? '0').toLowerCase();
  return `${chain}/${address.toLowerCase()}`;
}

async function hydrate(): Promise<CacheMap> {
  if (memCache) return memCache;
  if (hydrating) return hydrating;
  hydrating = (async () => {
    try {
      const got = await chrome.storage.local.get(STORAGE_KEY);
      const raw = got?.[STORAGE_KEY] as CacheMap | undefined;
      memCache = raw && typeof raw === 'object' ? raw : {};
    } catch {
      memCache = {};
    }
    return memCache;
  })();
  return hydrating;
}

async function persist(): Promise<void> {
  if (!memCache) return;
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: memCache });
  } catch {
    /* storage write failures are non-fatal — we still serve from memCache */
  }
}

function isFresh(e: CacheEntry): boolean {
  return Date.now() - e.fetchedAt < TTL_MS;
}

export async function getCached(
  chainId: string | undefined,
  address: string | undefined,
): Promise<CacheEntry | null> {
  const k = key(chainId, address);
  if (!k) return null;
  const map = await hydrate();
  const entry = map[k];
  if (!entry) return null;
  if (!isFresh(entry)) {
    delete map[k];
    void persist();
    return null;
  }
  return entry;
}

export async function putCached(
  chainId: string | undefined,
  address: string,
  abi: Abi,
  source: AbiSource,
): Promise<void> {
  const k = key(chainId, address);
  if (!k) return;
  const map = await hydrate();
  map[k] = { abi, source, fetchedAt: Date.now() };
  await persist();
}

/**
 * Single-flight wrapper. Concurrent calls with the same (chainId, address)
 * share one underlying fetcher Promise. Successful results are cached;
 * 'miss' and 'error' are surfaced to the caller without storage writes.
 */
export async function withSingleFlight(
  chainId: string | undefined,
  address: string,
  source: AbiSource,
  fetcher: () => Promise<AbiFetchOutcome>,
): Promise<SingleFlightResult> {
  const k = key(chainId, address);
  if (!k) return { status: 'miss' };
  const existing = inflight.get(k);
  if (existing) return existing;

  const p = (async (): Promise<SingleFlightResult> => {
    try {
      const out = await fetcher();
      if (out === 'miss') return { status: 'miss' };
      if (out === 'error') return { status: 'error' };
      const entry: CacheEntry = { abi: out, source, fetchedAt: Date.now() };
      const map = await hydrate();
      map[k] = entry;
      void persist();
      return { status: 'ok', entry };
    } catch {
      return { status: 'error' };
    } finally {
      inflight.delete(k);
    }
  })();
  inflight.set(k, p);
  return p;
}

export async function clearCache(): Promise<void> {
  memCache = {};
  inflight.clear();
  try {
    await chrome.storage.local.remove(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Test seam — drop in-memory state without touching chrome.storage. */
export function _resetForTests(): void {
  memCache = null;
  hydrating = null;
  inflight.clear();
}

export type { CacheEntry };
