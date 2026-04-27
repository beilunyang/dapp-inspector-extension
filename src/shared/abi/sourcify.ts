import type { Abi } from 'viem';

// Sourcify Server API. The "any" match level returns either a "perfect"
// or "partial" verification, both of which carry the same metadata.json
// shape — we just need the ABI out of it.
const SOURCIFY_BASE = 'https://sourcify.dev/server/files/any';

interface SourcifyFile { name: string; path?: string; content: string }
interface SourcifyResponse { status?: string; files?: SourcifyFile[] }

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
 * Fetch a contract's ABI from Sourcify by (chainId, address). Returns null
 * on 404 (not verified), parse failure, or network error — caller decides
 * whether to fall through to the next tier.
 *
 * We deliberately keep this unauthenticated and untimed — Sourcify is
 * EF-supported and the request is per-contract (not per-call), so rate
 * limits aren't a concern for typical browsing.
 */
export async function fetchSourcifyAbi(
  chainIdHex: string | undefined,
  address: string,
): Promise<Abi | null> {
  const chainId = chainIdHexToDecimal(chainIdHex);
  if (!chainId) return null;
  const url = `${SOURCIFY_BASE}/${chainId}/${address}`;

  let res: Response;
  try {
    res = await fetch(url, { method: 'GET' });
  } catch {
    return null;
  }
  if (!res.ok) return null;

  let body: SourcifyResponse;
  try {
    body = await res.json() as SourcifyResponse;
  } catch {
    return null;
  }
  const metaFile = body?.files?.find((f) => f.name === 'metadata.json');
  if (!metaFile) return null;
  let meta: { output?: { abi?: Abi } };
  try {
    meta = JSON.parse(metaFile.content) as { output?: { abi?: Abi } };
  } catch {
    return null;
  }
  const abi = meta.output?.abi;
  if (!Array.isArray(abi) || abi.length === 0) return null;
  return abi as Abi;
}
