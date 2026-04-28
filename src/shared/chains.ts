import { useEffect, useState } from 'react';

// chainId → human-readable name resolution. Two tiers:
//   1. SEED — bundled mainstream EVM chains. Synchronous, offline.
//   2. Online — chainlist.org's chains_mini.json fetched once and cached
//      in chrome.storage.local. Covers the long tail.
//
// Unknown chainIds fall back to the raw hex string at the call site.

const SEED: Record<number, string> = {
  1:        'Ethereum',
  10:       'Optimism',
  56:       'BSC',
  100:      'Gnosis',
  137:      'Polygon',
  204:      'opBNB',
  250:      'Fantom',
  324:      'zkSync Era',
  1101:     'Polygon zkEVM',
  5000:     'Mantle',
  8453:     'Base',
  17000:    'Holesky',
  42161:    'Arbitrum One',
  42170:    'Arbitrum Nova',
  42220:    'Celo',
  43114:    'Avalanche',
  59144:    'Linea',
  80002:    'Polygon Amoy',
  81457:    'Blast',
  84532:    'Base Sepolia',
  421614:   'Arb Sepolia',
  534352:   'Scroll',
  11155111: 'Sepolia',
  11155420: 'OP Sepolia',
};

const STORAGE_KEY = 'dappinsp.chains.v1';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const CHAINLIST_URL = 'https://chainid.network/chains_mini.json';

interface StoredCache {
  entries: Array<[number, string]>;
  fetchedAt: number;
}

let online: Map<number, string> | null = null;
let onlineHydrating: Promise<void> | null = null;
const listeners: Array<() => void> = [];

function notify(): void { for (const l of listeners) l(); }

function subscribe(l: () => void): () => void {
  listeners.push(l);
  return () => {
    const i = listeners.indexOf(l);
    if (i >= 0) listeners.splice(i, 1);
  };
}

/** Convert "0x1" / "0x89" / "1" / "137" → numeric chainId. Returns null
 *  for malformed input. */
export function chainIdToNumber(input: string | undefined): number | null {
  if (!input) return null;
  if (input.startsWith('0x')) {
    try { return Number(BigInt(input)); } catch { return null; }
  }
  return /^\d+$/.test(input) ? Number(input) : null;
}

/** Synchronous lookup against the seed + already-loaded online cache.
 *  Returns null when neither tier has the id. */
export function lookupChainName(input: string | undefined): string | null {
  const id = chainIdToNumber(input);
  if (id === null) return null;
  if (SEED[id] !== undefined) return SEED[id];
  return online?.get(id) ?? null;
}

/** Format a chain for display:
 *  - 'name' → "Ethereum" (or raw hex when unknown)
 *  - 'name+hex' → "Ethereum · 0x1" (or raw hex alone when unknown) */
export function fmtChain(input: string | undefined, mode: 'name' | 'name+hex'): string {
  if (!input) return '—';
  const name = lookupChainName(input);
  if (!name) return input;
  return mode === 'name' ? name : `${name} · ${input}`;
}

/** Title-attribute friendly long form: "Ethereum · 0x1 (1)". */
export function chainTitle(input: string | undefined): string {
  if (!input) return '';
  const id = chainIdToNumber(input);
  const name = lookupChainName(input);
  const decimal = id !== null ? ` (${id})` : '';
  if (!name) return `${input}${decimal}`;
  return `${name} · ${input}${decimal}`;
}

async function loadFromStorage(): Promise<StoredCache | null> {
  try {
    const got = await chrome.storage.local.get(STORAGE_KEY);
    const raw = got?.[STORAGE_KEY] as StoredCache | undefined;
    if (!raw || !Array.isArray(raw.entries) || typeof raw.fetchedAt !== 'number') return null;
    if (Date.now() - raw.fetchedAt >= TTL_MS) return null;
    return raw;
  } catch { return null; }
}

async function fetchFromChainlist(): Promise<Map<number, string> | null> {
  try {
    const res = await fetch(CHAINLIST_URL, { method: 'GET' });
    if (!res.ok) return null;
    const json = await res.json() as Array<{ chainId?: number; name?: string }>;
    if (!Array.isArray(json)) return null;
    const m = new Map<number, string>();
    for (const c of json) {
      if (typeof c.chainId === 'number' && typeof c.name === 'string') {
        m.set(c.chainId, c.name);
      }
    }
    return m;
  } catch { return null; }
}

/** Single-flight: ensure the online cache is loaded (storage-warm or
 *  freshly fetched). Idempotent — concurrent callers share the work. */
export async function ensureChainCatalog(): Promise<void> {
  if (online) return;
  if (onlineHydrating) return onlineHydrating;
  onlineHydrating = (async () => {
    const stored = await loadFromStorage();
    if (stored) {
      online = new Map(stored.entries);
      notify();
      return;
    }
    const fetched = await fetchFromChainlist();
    if (fetched) {
      online = fetched;
      try {
        await chrome.storage.local.set({
          [STORAGE_KEY]: { entries: [...fetched.entries()], fetchedAt: Date.now() } satisfies StoredCache,
        });
      } catch { /* persistence is best-effort */ }
      notify();
      return;
    }
    // Network failed and nothing in storage — leave online as an empty
    // map so a successful next call doesn't keep re-hydrating, but
    // unknown chainIds will keep falling back to raw hex. The cache
    // entry expires in 30d, after which we'll try again.
    online = new Map();
    notify();
  })();
  return onlineHydrating;
}

/** React hook: returns the chain name for `input`, or null when unknown.
 *  On an initial miss it kicks off the chainlist catalog fetch and the
 *  hook re-renders when the catalog lands. */
export function useChainName(input: string | undefined): string | null {
  const [, bump] = useState(0);
  useEffect(() => {
    const unsub = subscribe(() => bump((x) => x + 1));
    if (input && lookupChainName(input) === null) {
      void ensureChainCatalog();
    }
    return unsub;
  }, [input]);
  return lookupChainName(input);
}

/** Test seam — drop the in-memory online cache + listeners. */
export function _resetForTests(): void {
  online = null;
  onlineHydrating = null;
  listeners.length = 0;
}

export const SEED_CHAINS = SEED;
