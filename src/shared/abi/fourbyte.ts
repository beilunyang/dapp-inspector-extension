import { parseAbiItem, type Abi } from 'viem';
import type { AbiFetchOutcome } from './sourcify';

// Sourcify-stewarded selector → text-signature DB. Drop-in successor to
// the legacy openchain.xyz API; same shape, more reliable host.
const FOURBYTE_BASE = 'https://api.4byte.sourcify.dev/signature-database/v1/lookup';

interface FourbyteCandidate {
  name: string;            // e.g. "transfer(address,uint256)"
  filtered?: boolean;      // spam / collision flag from upstream
  hasVerifiedContract?: boolean;
}

interface FourbyteResponse {
  ok?: boolean;
  result?: {
    function?: Record<string, FourbyteCandidate[] | undefined>;
  };
}

/**
 * Look up a 4-byte selector and return a single-fragment Abi for the most
 * trustworthy candidate. Selector collisions are real, so we apply a
 * filter chain:
 *   1. Drop entries flagged `filtered: true` (upstream-curated spam).
 *   2. Prefer entries with `hasVerifiedContract: true` — at least one
 *      verified deployment uses this signature, so it's not a junk
 *      submission.
 *   3. Fall back to first non-filtered if none of the above match.
 *
 * Returns 'miss' for definitive negatives (no candidate / all filtered),
 * 'error' for transient failures (network, 5xx, parse error).
 */
export async function fetchFourbyteAbi(selector: `0x${string}`): Promise<AbiFetchOutcome> {
  if (!/^0x[0-9a-fA-F]{8}$/.test(selector)) return 'miss';
  const url = `${FOURBYTE_BASE}?function=${selector.toLowerCase()}`;

  let res: Response;
  try {
    res = await fetch(url, { method: 'GET' });
  } catch {
    return 'error';
  }
  if (!res.ok) return 'error';

  let body: FourbyteResponse;
  try {
    body = await res.json() as FourbyteResponse;
  } catch {
    return 'error';
  }
  if (!body?.ok) return 'miss';  // upstream said "no result"
  const candidates = body.result?.function?.[selector.toLowerCase()];
  if (!candidates || candidates.length === 0) return 'miss';

  const usable = candidates.filter((c) => !c.filtered && typeof c.name === 'string');
  if (usable.length === 0) return 'miss';
  // Pick the highest-confidence candidate. We don't surface multiple
  // matches in the UI — for "audit before signing" a single confident
  // guess is more useful than ambiguous options.
  const verified = usable.find((c) => c.hasVerifiedContract);
  const pick = verified ?? usable[0];

  try {
    // Param names are unknown at the 4byte tier so they'll come back as
    // undefined, which the Decoded UI already handles by showing
    // "arg0", "arg1", ... viem's parseAbiItem types validate the
    // signature literal at compile time; we cast through unknown because
    // our string is runtime-only.
    const item = (parseAbiItem as unknown as (s: string) => Abi[number])(`function ${pick.name}`);
    return [item] as Abi;
  } catch {
    return 'miss';  // signature unparseable — won't get better
  }
}
