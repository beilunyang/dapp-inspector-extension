// Shared types for the ABI decode subsystem. Pure types — no viem / chrome
// imports here, so this module can be referenced by tests, panel UI, and
// shared utilities without dragging in heavier deps.

export type AbiSource = 'builtin' | 'sourcify' | '4byte' | 'cached';

export interface DecodedArg {
  /** Param name from the ABI. Undefined when sourced from 4byte (text-sig only). */
  name?: string;
  /** Solidity type string, e.g. "address", "uint256", "address[]", "tuple(address,uint256)". */
  type: string;
  /** viem-decoded value (string for address, bigint for uint, boolean for bool, ...). */
  value: unknown;
}

export type RiskSeverity = 'info' | 'warning' | 'danger';

export interface RiskFlag {
  severity: RiskSeverity;
  /** Short uppercase tag shown next to the affected arg (e.g. "UNLIMITED APPROVAL"). */
  label: string;
  /** Longer explanation for tooltip / detail. */
  message: string;
  /** Index into DecodedCall.args this flag applies to. Tx-level flags omit this. */
  argIndex?: number;
}

export interface DecodedCall {
  source: AbiSource;
  /** Canonical function signature, e.g. "transfer(address,uint256)". */
  signature: string;
  /** Function name only, e.g. "transfer". */
  functionName: string;
  args: DecodedArg[];
  risks: RiskFlag[];
}

/**
 * A non-ABI decoded view used for `eth_signTypedData_v4` and
 * `personal_sign` / `eth_sign` — these don't have calldata, so we surface
 * a different shape rather than forcing them through the ABI pipeline.
 */
export type SignDecode =
  | { kind: 'typedData'; domain: unknown; types: unknown; primaryType?: string; message: unknown; raw: string }
  | { kind: 'message'; text: string; isUtf8: boolean; raw: string };

export type DecodeResult =
  | { kind: 'call'; call: DecodedCall }
  | { kind: 'sign'; sign: SignDecode }
  | { kind: 'none' };
