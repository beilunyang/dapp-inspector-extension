import type { Abi } from 'viem';

// Sourcify Server API. The "any" match level returns either a "perfect"
// or "partial" verification, both of which carry the same metadata.json
// shape — we just need the ABI out of it.
const SOURCIFY_BASE = 'https://sourcify.dev/server/files/any';

interface SourcifyFile { name: string; path?: string; content: string }
interface SourcifyResponse { status?: string; files?: SourcifyFile[] }

/** Tri-state outcome for ABI fetchers. The caller distinguishes:
 *  - Abi: success, decode and cache;
 *  - 'miss': definitive negative (e.g. 404 not verified) — won't get better
 *    with retry, so callers can memoise 'no decode' on this signal;
 *  - 'error': transient (network failure, 5xx, malformed body) — caller
 *    should NOT pin a negative result; next tab switch should retry. */
export type AbiFetchOutcome = Abi | 'miss' | 'error';

export function chainIdHexToDecimal(hex: string | undefined): string | null {
  if (!hex) return null;
  if (!hex.startsWith('0x')) return /^\d+$/.test(hex) ? hex : null;
  try {
    return BigInt(hex).toString(10);
  } catch {
    return null;
  }
}

/**
 * Fetch a contract's ABI from Sourcify by (chainId, address). Returns
 * 'miss' when Sourcify confirms the contract isn't verified, 'error' on
 * any transient failure (network down, 5xx, unparseable body) so the
 * caller can decide whether to memoise the negative result.
 */
export async function fetchSourcifyAbi(
  chainIdHex: string | undefined,
  address: string,
): Promise<AbiFetchOutcome> {
  const chainId = chainIdHexToDecimal(chainIdHex);
  if (!chainId) return 'miss';  // unrecoverable input — won't retry
  const url = `${SOURCIFY_BASE}/${chainId}/${address}`;

  let res: Response;
  try {
    res = await fetch(url, { method: 'GET' });
  } catch {
    return 'error';  // network down / DNS / CORS / aborted
  }
  if (res.status === 404) return 'miss';
  if (!res.ok) return 'error';  // 5xx or unexpected non-200/404

  let body: SourcifyResponse;
  try {
    body = await res.json() as SourcifyResponse;
  } catch {
    return 'error';  // server returned 200 with non-JSON — treat as transient
  }
  const metaFile = body?.files?.find((f) => f.name === 'metadata.json');
  if (!metaFile) return 'miss';
  let meta: { output?: { abi?: Abi } };
  try {
    meta = JSON.parse(metaFile.content) as { output?: { abi?: Abi } };
  } catch {
    return 'miss';  // verified record exists but metadata is malformed
  }
  const abi = meta.output?.abi;
  if (!Array.isArray(abi) || abi.length === 0) return 'miss';
  return abi as Abi;
}
