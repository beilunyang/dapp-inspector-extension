import { describe, it, expect } from 'vitest';
import { findBuiltinFunction, builtinSelectorCount } from '../../src/shared/abi/builtin';

describe('built-in selector index', () => {
  it('covers all four standards', () => {
    // ERC-20 + ERC-721 + ERC-1155 + Permit2 contribute distinct selectors;
    // some ERC-721 methods collide with ERC-20 (transferFrom / approve)
    // so the count is < total fragments — guard against accidental drops.
    expect(builtinSelectorCount()).toBeGreaterThanOrEqual(10);
  });

  it('resolves ERC-20 transfer selector', () => {
    // 0xa9059cbb = transfer(address,uint256)
    const fn = findBuiltinFunction('0xa9059cbb');
    expect(fn?.name).toBe('transfer');
    expect(fn?.inputs.map((i) => i.type)).toEqual(['address', 'uint256']);
  });

  it('resolves setApprovalForAll selector', () => {
    // 0xa22cb465 = setApprovalForAll(address,bool)
    const fn = findBuiltinFunction('0xa22cb465');
    expect(fn?.name).toBe('setApprovalForAll');
    expect(fn?.inputs.map((i) => i.type)).toEqual(['address', 'bool']);
  });

  it('returns undefined for unknown selectors', () => {
    expect(findBuiltinFunction('0xdeadbeef')).toBeUndefined();
  });

  it('is case-insensitive on selector input', () => {
    expect(findBuiltinFunction('0xA9059CBB')?.name).toBe('transfer');
  });
});
