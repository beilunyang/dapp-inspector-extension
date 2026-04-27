import { describe, it, expect } from 'vitest';
import { encodeFunctionData, parseAbi, maxUint256 } from 'viem';
import { decodeBuiltin, decodeWithAbi, extractTxContext } from '../../src/shared/abi/decode';
import type { CapturedCall } from '@shared/types';

const ERC20 = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
]);

describe('decodeBuiltin', () => {
  it('decodes ERC-20 transfer', () => {
    const data = encodeFunctionData({
      abi: ERC20,
      functionName: 'transfer',
      args: ['0x000000000000000000000000000000000000dEaD', 1234n],
    });
    const out = decodeBuiltin(data);
    expect(out?.functionName).toBe('transfer');
    expect(out?.signature).toBe('transfer(address,uint256)');
    expect(out?.source).toBe('builtin');
    expect(out?.args[0].type).toBe('address');
    expect((out?.args[1].value as bigint)).toBe(1234n);
  });

  it('returns null for unknown selectors', () => {
    expect(decodeBuiltin('0xdeadbeef00000000')).toBeNull();
  });

  it('returns null for too-short calldata', () => {
    expect(decodeBuiltin('0x12')).toBeNull();
  });

  it('flags unlimited approval as a risk', () => {
    const data = encodeFunctionData({
      abi: ERC20,
      functionName: 'approve',
      args: ['0x000000000000000000000000000000000000dEaD', maxUint256],
    });
    const out = decodeBuiltin(data);
    expect(out?.risks.some((r) => r.label === 'UNLIMITED APPROVAL')).toBe(true);
  });

  it('does not flag a small approval as unlimited', () => {
    const data = encodeFunctionData({
      abi: ERC20,
      functionName: 'approve',
      args: ['0x000000000000000000000000000000000000dEaD', 1000n],
    });
    const out = decodeBuiltin(data);
    expect(out?.risks.some((r) => r.label === 'UNLIMITED APPROVAL')).toBe(false);
  });
});

describe('decodeWithAbi (external ABI path)', () => {
  it('decodes against a custom ABI and tags the source', () => {
    const customAbi = parseAbi(['function setX(uint256 newX)']);
    const data = encodeFunctionData({ abi: customAbi, functionName: 'setX', args: [42n] });
    const out = decodeWithAbi(data, customAbi, 'sourcify');
    expect(out?.source).toBe('sourcify');
    expect(out?.functionName).toBe('setX');
    expect(out?.args[0].name).toBe('newX');
    expect((out?.args[0].value as bigint)).toBe(42n);
  });

  it('returns null when the ABI does not match the selector', () => {
    const a = parseAbi(['function setX(uint256)']);
    const b = parseAbi(['function setY(uint256)']);
    const data = encodeFunctionData({ abi: a, functionName: 'setX', args: [1n] });
    expect(decodeWithAbi(data, b, 'sourcify')).toBeNull();
  });
});

describe('extractTxContext', () => {
  const baseCall: CapturedCall = {
    id: 't', tabId: 1, origin: 'https://x.test',
    providerInfo: { name: 'M' },
    method: 'eth_sendTransaction', kind: 'write',
    params: [{ to: '0xabc', data: '0xa9059cbb', value: '0xde0b6b3a7640000' }],
    startedAt: 0, status: 'pending',
  };

  it('extracts data + to + value from eth_sendTransaction', () => {
    const ctx = extractTxContext(baseCall);
    expect(ctx?.data).toBe('0xa9059cbb');
    expect(ctx?.to).toBe('0xabc');
    expect(ctx?.value).toBe(1_000_000_000_000_000_000n);
  });

  it('returns null for non-tx methods', () => {
    expect(extractTxContext({ ...baseCall, method: 'eth_chainId', params: [] })).toBeNull();
  });

  it('handles missing optional fields gracefully', () => {
    const ctx = extractTxContext({ ...baseCall, params: [{ to: '0xabc' }] });
    expect(ctx?.data).toBeUndefined();
    expect(ctx?.value).toBeUndefined();
  });
});
