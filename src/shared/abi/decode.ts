import { decodeFunctionData, slice, toFunctionSelector, type Abi, type AbiFunction } from 'viem';
import { findBuiltinFunction } from './builtin';
import { scanRisks } from './risk';
import type { CapturedCall } from '@shared/types';
import type { AbiSource, DecodedArg, DecodedCall, SignDecode } from './types';

const TX_DATA_METHODS = new Set([
  'eth_sendTransaction',
  'eth_signTransaction',
  'eth_call',
  'eth_estimateGas',
]);

export interface TxContext {
  /** Transaction calldata (the `data` field of params[0]) — present for the
   *  4 methods listed above when params[0] is a tx-shaped object. */
  data?: `0x${string}`;
  /** Target contract address (params[0].to). */
  to?: string;
  /** Native value attached, in wei. */
  value?: bigint;
}

/** Pull the tx-shaped fields out of a captured call. Returns null when the
 *  method doesn't carry calldata at all (e.g. eth_chainId, eth_blockNumber). */
export function extractTxContext(call: CapturedCall): TxContext | null {
  if (!TX_DATA_METHODS.has(call.method)) return null;
  const arr = Array.isArray(call.params) ? (call.params as unknown[]) : [];
  const p = arr[0];
  if (!p || typeof p !== 'object') return null;
  const obj = p as Record<string, unknown>;
  const data = typeof obj.data === 'string' && obj.data.startsWith('0x')
    ? (obj.data as `0x${string}`) : undefined;
  const to = typeof obj.to === 'string' ? obj.to : undefined;
  let value: bigint | undefined;
  if (typeof obj.value === 'string' && obj.value.startsWith('0x')) {
    try { value = BigInt(obj.value); } catch { /* malformed, ignore */ }
  }
  return { data, to, value };
}

/** Decode `data` against an ABI, tagging the result with its source. Returns
 *  null when the selector isn't in the ABI or viem can't decode the args.
 *
 *  `method` is the RPC method the calldata came from — passed through to
 *  the risk scanner so eth_call / eth_estimateGas (read-only) don't trip
 *  state-change warnings. */
export function decodeWithAbi(
  data: `0x${string}`,
  abi: Abi,
  source: AbiSource,
  txValue?: bigint,
  method?: string,
): DecodedCall | null {
  if (data.length < 10) return null;
  const selector = slice(data, 0, 4);
  // Locate the matching function by selector — handles overloads correctly
  // (same name, different parameter lists like the two safeTransferFroms).
  const fn = abi.find(
    (item) => item.type === 'function' && toFunctionSelector(item as AbiFunction) === selector,
  ) as AbiFunction | undefined;
  if (!fn || !fn.name) return null;
  let decoded: { functionName: string; args?: readonly unknown[] };
  try {
    decoded = decodeFunctionData({ abi: [fn], data });
  } catch {
    return null;
  }
  const args: DecodedArg[] = (decoded.args ?? []).map((value, i) => ({
    name: fn.inputs[i]?.name || undefined,
    type: fn.inputs[i]?.type ?? 'unknown',
    value,
  }));
  const signature = `${fn.name}(${fn.inputs.map((i) => i.type).join(',')})`;
  const risks = scanRisks({ functionName: fn.name, args, txValue, method });
  return { source, signature, functionName: fn.name, args, risks };
}

/** Decode against the bundled built-in ABI set (ERC-20/721/1155/Permit2).
 *  Synchronous, zero-network. */
export function decodeBuiltin(
  data: `0x${string}`,
  txValue?: bigint,
  method?: string,
): DecodedCall | null {
  if (data.length < 10) return null;
  const selector = slice(data, 0, 4);
  const fn = findBuiltinFunction(selector);
  if (!fn) return null;
  return decodeWithAbi(data, [fn], 'builtin', txValue, method);
}

const SIGN_METHODS = new Set([
  'eth_signTypedData',
  'eth_signTypedData_v3',
  'eth_signTypedData_v4',
  'personal_sign',
  'eth_sign',
]);

/** Build a non-ABI decoded view for the signing methods. typed-data
 *  parses the JSON; personal_sign / eth_sign attempt UTF-8 decode of
 *  the message bytes. Returns null when the method isn't a sign or
 *  the params don't match the expected shape. */
export function extractSignContext(call: CapturedCall): SignDecode | null {
  if (!SIGN_METHODS.has(call.method)) return null;
  const params = Array.isArray(call.params) ? (call.params as unknown[]) : [];

  if (call.method.startsWith('eth_signTypedData')) {
    // params[1] is the typed-data payload. Walked tools encode it either
    // as a JSON string (canonical) or a parsed object (some libraries).
    const raw = params[1];
    let parsed: { domain?: unknown; types?: unknown; primaryType?: string; message?: unknown } | null = null;
    let rawStr: string;
    if (typeof raw === 'string') {
      rawStr = raw;
      try { parsed = JSON.parse(raw); } catch { /* fall through */ }
    } else if (raw && typeof raw === 'object') {
      parsed = raw as NonNullable<typeof parsed>;
      try { rawStr = JSON.stringify(raw, null, 2); } catch { rawStr = String(raw); }
    } else {
      return null;
    }
    if (!parsed) return null;
    return {
      kind: 'typedData',
      domain: parsed.domain,
      types: parsed.types,
      primaryType: parsed.primaryType,
      message: parsed.message,
      raw: rawStr,
    };
  }

  // personal_sign / eth_sign — params order varies. The address is a
  // 42-char 0x-hex string; the other param is the message.
  const looksLikeAddress = (s: unknown): boolean =>
    typeof s === 'string' && /^0x[a-fA-F0-9]{40}$/.test(s);
  const candidates = [params[0], params[1]].filter((v) => typeof v === 'string') as string[];
  const message = candidates.find((v) => !looksLikeAddress(v));
  if (!message) return null;

  const decoded = hexToUtf8Best(message);
  return { kind: 'message', text: decoded.text, isUtf8: decoded.isUtf8, raw: message };
}

/** Best-effort hex bytes → UTF-8 conversion. Returns the original hex
 *  string with isUtf8=false when the bytes aren't valid UTF-8. */
function hexToUtf8Best(input: string): { text: string; isUtf8: boolean } {
  if (!input.startsWith('0x')) return { text: input, isUtf8: true };
  const clean = input.slice(2);
  if (clean.length === 0 || clean.length % 2 !== 0) return { text: input, isUtf8: false };
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(clean.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
  } catch {
    return { text: input, isUtf8: false };
  }
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { text, isUtf8: true };
  } catch {
    return { text: input, isUtf8: false };
  }
}

/** True iff the call carries something the Decoded tab can render —
 *  either eligible calldata or a signing-method payload. */
export function hasDecodableContent(call: CapturedCall): boolean {
  return Boolean(extractTxContext(call)?.data) || extractSignContext(call) !== null;
}
