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

/**
 * Resolves a CapturedCall into a DecodedCall by walking the layered tier
 * chain: cache → built-in → (sourcify, 4byte added in later steps).
 *
 * Synchronous tiers (built-in) resolve instantly via useMemo-style logic
 * inside the effect; async tiers are awaited and may transition the state
 * from 'loading' → 'ready' as they complete.
 */
export function useDecoded(call: CapturedCall): DecodeState {
  const [state, setState] = useState<DecodeState>({ kind: 'none' });
  const autoFetchAbi = useSettingsStore((s) => s.autoFetchAbi);

  useEffect(() => {
    // Sign methods (eth_signTypedData_v4 / personal_sign / eth_sign) don't
    // carry calldata; resolve them synchronously through a different path.
    const sign = extractSignContext(call);
    if (sign) {
      setState({ kind: 'sign', sign });
      return;
    }

    const tx = extractTxContext(call);
    if (!tx?.data) {
      setState({ kind: 'none' });
      return;
    }

    // Synchronous tier: built-in selector index. 0ms, offline.
    const builtin = decodeBuiltin(tx.data, tx.value);
    if (builtin) {
      setState({ kind: 'call', decoded: builtin });
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
        const cached = await getCached(chainId, to);
        if (cancelled) return;
        if (cached) {
          const out = decodeWithAbi(data, cached.abi, 'cached', tx.value);
          if (out) { setState({ kind: 'call', decoded: out }); return; }
        }
      }

      // Tiers 3-4 require autoFetchAbi to be on (network fetches).
      if (!autoFetchAbi || !to) {
        setState({ kind: 'none' });
        return;
      }

      // Tier 3: Sourcify full-ABI lookup (single-flight, cached on success).
      const sourcify = await withSingleFlight(chainId, to, 'sourcify',
        () => fetchSourcifyAbi(chainId, to));
      if (cancelled) return;
      if (sourcify) {
        const out = decodeWithAbi(data, sourcify.abi, 'sourcify', tx.value);
        if (out) { setState({ kind: 'call', decoded: out }); return; }
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
        const out = decodeWithAbi(data, fourbyte, '4byte', tx.value);
        if (out) { setState({ kind: 'call', decoded: out }); return; }
      }

      setState({ kind: 'none' });
    })();
    return () => { cancelled = true; };
    // We track only the identifying fields of `call` rather than the
    // object reference — the snapshot replay rebuilds the object on
    // every push so a reference dep would re-run the effect needlessly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.id, call.chainId, call.method, call.params, autoFetchAbi]);

  return state;
}
