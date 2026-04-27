import { describe, it, expect } from 'vitest';
import { maxUint256 } from 'viem';
import { scanRisks } from '../../src/shared/abi/risk';

describe('scanRisks', () => {
  it('flags ERC-20 approve with MaxUint256', () => {
    const flags = scanRisks({
      functionName: 'approve',
      args: [
        { type: 'address', value: '0x...' },
        { type: 'uint256', value: maxUint256 },
      ],
    });
    expect(flags.some((f) => f.label === 'UNLIMITED APPROVAL' && f.argIndex === 1)).toBe(true);
  });

  it('flags ERC-20 approve with 2^200 (boundary)', () => {
    const flags = scanRisks({
      functionName: 'approve',
      args: [
        { type: 'address', value: '0x...' },
        { type: 'uint256', value: 1n << 200n },
      ],
    });
    expect(flags.some((f) => f.label === 'UNLIMITED APPROVAL')).toBe(true);
  });

  it('does not flag ERC-20 approve with a normal amount', () => {
    const flags = scanRisks({
      functionName: 'approve',
      args: [
        { type: 'address', value: '0x...' },
        { type: 'uint256', value: 1_000_000n * 10n ** 18n },
      ],
    });
    expect(flags.some((f) => f.label === 'UNLIMITED APPROVAL')).toBe(false);
  });

  it('flags Permit2 approve (4 args) with large amount', () => {
    const flags = scanRisks({
      functionName: 'approve',
      args: [
        { type: 'address', value: '0xtoken' },
        { type: 'address', value: '0xspender' },
        { type: 'uint160', value: (1n << 159n) + 1n },
        { type: 'uint48', value: 123n },
      ],
    });
    expect(flags.some((f) => f.label === 'UNLIMITED PERMIT2 APPROVAL')).toBe(true);
  });

  it('flags setApprovalForAll(_, true)', () => {
    const flags = scanRisks({
      functionName: 'setApprovalForAll',
      args: [
        { type: 'address', value: '0xop' },
        { type: 'bool', value: true },
      ],
    });
    expect(flags.some((f) => f.label === 'ALL TOKENS APPROVAL')).toBe(true);
  });

  it('does not flag setApprovalForAll(_, false) — that is a revoke', () => {
    const flags = scanRisks({
      functionName: 'setApprovalForAll',
      args: [
        { type: 'address', value: '0xop' },
        { type: 'bool', value: false },
      ],
    });
    expect(flags.length).toBe(0);
  });

  it('flags large native value', () => {
    const flags = scanRisks({
      functionName: 'transfer',
      args: [],
      txValue: 5n * 10n ** 18n,
    });
    expect(flags.some((f) => f.label === 'LARGE VALUE' && f.severity === 'danger')).toBe(true);
  });

  it('does not flag small native value', () => {
    const flags = scanRisks({
      functionName: 'transfer',
      args: [],
      txValue: 1n * 10n ** 17n, // 0.1 ETH
    });
    expect(flags.length).toBe(0);
  });
});
