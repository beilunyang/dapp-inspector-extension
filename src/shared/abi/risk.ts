import type { DecodedArg, RiskFlag } from './types';

// Threshold for "effectively unlimited" — picks up MaxUint256, MaxUint128
// proxies, and any value large enough that it can't represent a real
// token quantity (catches the typical wallet-drainer footprint).
const UNLIMITED_UINT256 = 1n << 200n;
// Permit2 amount is uint160 — bar is lower.
const UNLIMITED_UINT160 = 1n << 159n;
// Native value bar above which we surface a warning. 1 ETH equivalent.
// Risk is severity-tagged not blocking; user audits the actual amount.
const LARGE_NATIVE_VALUE = 1_000_000_000_000_000_000n;

export interface RiskScanContext {
  functionName: string;
  args: DecodedArg[];
  /** Native (msg.value) value attached to the tx, in wei. Only present for
   *  eth_sendTransaction / eth_signTransaction. */
  txValue?: bigint;
}

export function scanRisks(ctx: RiskScanContext): RiskFlag[] {
  const flags: RiskFlag[] = [];

  // ERC-20 approve(address spender, uint256 amount) — 2 args
  if (ctx.functionName === 'approve' && ctx.args.length === 2) {
    const amount = ctx.args[1].value;
    if (typeof amount === 'bigint' && amount >= UNLIMITED_UINT256) {
      flags.push({
        severity: 'warning',
        label: 'UNLIMITED APPROVAL',
        message: 'This grants the spender permission to move an effectively unlimited amount of this token.',
        argIndex: 1,
      });
    }
  }

  // Permit2 approve(address token, address spender, uint160 amount, uint48 expiration) — 4 args
  if (ctx.functionName === 'approve' && ctx.args.length === 4) {
    const amount = ctx.args[2].value;
    if (typeof amount === 'bigint' && amount >= UNLIMITED_UINT160) {
      flags.push({
        severity: 'warning',
        label: 'UNLIMITED PERMIT2 APPROVAL',
        message: 'Grants the Permit2 spender an effectively unlimited allowance for this token.',
        argIndex: 2,
      });
    }
  }

  // ERC-721 / ERC-1155 setApprovalForAll(operator, approved=true)
  if (
    ctx.functionName === 'setApprovalForAll' &&
    ctx.args.length >= 2 &&
    ctx.args[1].value === true
  ) {
    flags.push({
      severity: 'warning',
      label: 'ALL TOKENS APPROVAL',
      message: 'Grants the operator permission to transfer ANY of your tokens in this collection.',
      argIndex: 1,
    });
  }

  // Tx-level large native transfer.
  if (ctx.txValue !== undefined && ctx.txValue >= LARGE_NATIVE_VALUE) {
    flags.push({
      severity: 'danger',
      label: 'LARGE VALUE',
      message: `Transaction sends ${formatEther(ctx.txValue)} native tokens.`,
    });
  }

  return flags;
}

function formatEther(wei: bigint): string {
  const whole = wei / 10n ** 18n;
  const frac = wei % 10n ** 18n;
  // 4 dp is enough for a UI hint.
  const fracStr = frac.toString().padStart(18, '0').slice(0, 4);
  return `${whole.toString()}.${fracStr}`;
}
