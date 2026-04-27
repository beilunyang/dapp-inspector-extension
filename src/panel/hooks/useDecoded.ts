import { useEffect, useState } from 'react';
import type { CapturedCall } from '@shared/types';
import { decodeBuiltin, decodeWithAbi, extractSignContext, extractTxContext } from '@shared/abi/decode';
import { getCached, withSingleFlight } from '@shared/abi/cache';
import { fetchSourcifyAbi } from '@shared/abi/sourcify';
import { fetchFourbyteAbi } from '@shared/abi/fourbyte';
import { slice } from 'viem';
import { useSettingsStore } from '@shared/stores/settings-store';
import type { DecodedCall, SignDecode } from '@shared/abi/types';

export type DecodeState =
  | { kind: 'none' }
  | { kind: 'loading' }
  | { kind: 'call'; decoded: DecodedCall }
  | { kind: 'sign'; sign: SignDecode };

// Per-call memo of resolved DecodeStates. The Detail tab strip mounts and
// unmounts <DecodedView> as the user toggles between Decoded/Params/Raw,
// so without this we'd re-run the entire resolve effect (and flash a
// "Resolving ABI…" frame) on every tab switch. Only terminal states get
// cached — 'loading' is intentionally not memoised so an in-flight resolve
// won't get pinned for a closed panel.
const memo = new Map<string, DecodeState>();

/** Drop the in-memory per-call memo. Call this whenever the underlying
 *  ABI cache is invalidated (Options → Clear ABI cache) so the next
 *  Decoded view re-resolves against the now-empty storage. */
export function clearDecodedMemo(): void {
  memo.clear();
}

// Cross-context invalidation: when Options clears the persistent ABI
// cache via chrome.storage.local.remove(), the storage.onChanged event
// fires in every extension context (including this panel). React to it
// by dropping the panel-local memo so the next Decoded tab open
// re-resolves against the now-empty storage instead of serving stale
// in-memory results.
const ABI_CACHE_KEY = 'dappinsp.abi-cache.v1';
try {
  chrome.storage?.onChanged?.addListener((changes, area) => {
    if (area !== 'local') return;
    const change = changes[ABI_CACHE_KEY];
    if (!change) return;
    // Only clear on removal — overwrites (a fresh fetch repopulating one
    // entry) shouldn't invalidate the entire panel memo.
    if (change.newValue === undefined) memo.clear();
  });
} catch {
  /* not in extension context (tests / SSR) — ignore */
}

/**
 * Resolves a CapturedCall into a DecodedCall by walking the layered tier
 * chain: cache → built-in → (sourcify, 4byte added in later steps).
 *
 * Synchronous tiers (built-in) resolve instantly via useMemo-style logic
 * inside the effect; async tiers are awaited and may transition the state
 * from 'loading' → 'ready' as they complete.
 */
export function useDecoded(call: CapturedCall): DecodeState {
  // Seed from the per-call memo so a tab-switch back to Decoded doesn't
  // flash through 'loading' on its way to the (already known) result.
  const [state, setState] = useState<DecodeState>(() => memo.get(call.id) ?? { kind: 'none' });
  const autoFetchAbi = useSettingsStore((s) => s.autoFetchAbi);

  useEffect(() => {
    const settle = (next: DecodeState) => {
      // Only memoise terminal states — 'loading' is by design ephemeral.
      if (next.kind !== 'loading') memo.set(call.id, next);
      setState(next);
    };

    // Hot path: previously-resolved call. Don't even enter the effect's
    // async work — just hand back the memoised state.
    const cached = memo.get(call.id);
    if (cached) {
      setState(cached);
      return;
    }

    // Sign methods (eth_signTypedData_v4 / personal_sign / eth_sign) don't
    // carry calldata; resolve them synchronously through a different path.
    const sign = extractSignContext(call);
    if (sign) {
      settle({ kind: 'sign', sign });
      return;
    }

    const tx = extractTxContext(call);
    if (!tx?.data) {
      settle({ kind: 'none' });
      return;
    }

    // Synchronous tier: built-in selector index. 0ms, offline.
    const builtin = decodeBuiltin(tx.data, tx.value, call.method);
    if (builtin) {
      settle({ kind: 'call', decoded: builtin });
      return;
    }

    // Async tier chain. Cancellation via a flag so a new call.id arriving
    // while we're awaiting doesn't race-overwrite the next state.
    let cancelled = false;
    setState({ kind: 'loading' });
    void (async () => {
      const chainId = call.chainId;
      const data = tx.data!;
      const to = tx.to;

      // Tier 2: cache.
      if (to) {
        const cachedAbi = await getCached(chainId, to);
        if (cancelled) return;
        if (cachedAbi) {
          const out = decodeWithAbi(data, cachedAbi.abi, 'cached', tx.value, call.method);
          if (out) { settle({ kind: 'call', decoded: out }); return; }
        }
      }

      // Tiers 3-4 require autoFetchAbi to be on (network fetches).
      if (!autoFetchAbi || !to) {
        settle({ kind: 'none' });
        return;
      }

      // Tier 3: Sourcify full-ABI lookup (single-flight, cached on success).
      const sourcify = await withSingleFlight(chainId, to, 'sourcify',
        () => fetchSourcifyAbi(chainId, to));
      if (cancelled) return;
      if (sourcify) {
        const out = decodeWithAbi(data, sourcify.abi, 'sourcify', tx.value, call.method);
        if (out) { settle({ kind: 'call', decoded: out }); return; }
      }

      // Tier 4: 4byte.sourcify.dev — selector-only fallback for unverified
      // contracts. Param names are lost (decoder shows arg0/arg1), source
      // tagged '4byte' so the UI can flag low-confidence in the badge color.
      // Not address-keyed, so we cache against the selector instead — same
      // selector resolves identically across any contract.
      const selector = slice(data, 0, 4);
      const fourbyte = await fetchFourbyteAbi(selector);
      if (cancelled) return;
      if (fourbyte) {
        const out = decodeWithAbi(data, fourbyte, '4byte', tx.value, call.method);
        if (out) { settle({ kind: 'call', decoded: out }); return; }
      }

      settle({ kind: 'none' });
    })();
    return () => { cancelled = true; };
    // We track only the identifying fields of `call` rather than the
    // object reference — the snapshot replay rebuilds the object on
    // every push so a reference dep would re-run the effect needlessly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.id, call.chainId, call.method, call.params, autoFetchAbi]);

  return state;
}
