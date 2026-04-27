import { decodeFunctionData, slice, toFunctionSelector, type Abi, type AbiFunction } from 'viem';
import { findBuiltinFunction } from './builtin';
import { scanRisks } from './risk';
import type { CapturedCall } from '@shared/types';
import type { AbiSource, DecodedArg, DecodedCall } from './types';

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
 *  null when the selector isn't in the ABI or viem can't decode the args. */
export function decodeWithAbi(
  data: `0x${string}`,
  abi: Abi,
  source: AbiSource,
  txValue?: bigint,
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
  const risks = scanRisks({ functionName: fn.name, args, txValue });
  return { source, signature, functionName: fn.name, args, risks };
}

/** Decode against the bundled built-in ABI set (ERC-20/721/1155/Permit2).
 *  Synchronous, zero-network. */
export function decodeBuiltin(data: `0x${string}`, txValue?: bigint): DecodedCall | null {
  if (data.length < 10) return null;
  const selector = slice(data, 0, 4);
  const fn = findBuiltinFunction(selector);
  if (!fn) return null;
  return decodeWithAbi(data, [fn], 'builtin', txValue);
}
