import { describe, it, expect } from 'vitest';
import {
  methodMatches,
  originMatches,
  findMatchingBlockRule,
  type BlockRule,
} from '@shared/rules';

describe('methodMatches', () => {
  it('exact match', () => {
    expect(methodMatches({ method: 'eth_chainId', matchMode: 'exact' }, 'eth_chainId')).toBe(true);
    expect(methodMatches({ method: 'eth_chainId', matchMode: 'exact' }, 'eth_call')).toBe(false);
  });

  it('prefix match honors trailing wildcard', () => {
    expect(methodMatches({ method: 'wallet_*', matchMode: 'prefix' }, 'wallet_requestPermissions')).toBe(true);
    expect(methodMatches({ method: 'wallet', matchMode: 'prefix' }, 'wallet_requestPermissions')).toBe(true);
    expect(methodMatches({ method: 'eth_', matchMode: 'prefix' }, 'wallet_sign')).toBe(false);
  });

  it('glob matches with star', () => {
    expect(methodMatches({ method: 'eth_*Transaction', matchMode: 'glob' }, 'eth_sendTransaction')).toBe(true);
    expect(methodMatches({ method: 'eth_*Transaction', matchMode: 'glob' }, 'eth_call')).toBe(false);
    expect(methodMatches({ method: '*_sign*', matchMode: 'glob' }, 'personal_signTyped')).toBe(true);
  });

  it('empty pattern matches nothing', () => {
    expect(methodMatches({ method: '', matchMode: 'exact' }, 'eth_call')).toBe(false);
  });
});

describe('originMatches', () => {
  it('wildcard matches everything', () => {
    expect(originMatches({ origin: '*' }, 'https://foo.bar')).toBe(true);
    expect(originMatches({ origin: '' }, 'https://foo.bar')).toBe(true);
  });

  it('host-only rule matches URL origin', () => {
    expect(originMatches({ origin: 'polymarket.com' }, 'https://polymarket.com')).toBe(true);
    expect(originMatches({ origin: 'polymarket.com' }, 'https://uniswap.org')).toBe(false);
  });

  it('also accepts raw host string', () => {
    expect(originMatches({ origin: 'localhost:3000' }, 'localhost:3000')).toBe(true);
  });
});

describe('findMatchingBlockRule', () => {
  const base = (over: Partial<BlockRule> = {}): BlockRule => ({
    id: 'r1', enabled: true,
    method: 'eth_sendTransaction', matchMode: 'exact',
    origin: '*', mode: 'block',
    ...over,
  });

  it('returns the first enabled matching rule', () => {
    const rules: BlockRule[] = [
      base({ id: 'a', enabled: false }),
      base({ id: 'b' }),
      base({ id: 'c' }),
    ];
    expect(findMatchingBlockRule(rules, 'eth_sendTransaction', 'https://foo')?.id).toBe('b');
  });

  it('respects method + origin together', () => {
    const rules: BlockRule[] = [
      base({ id: 'x', origin: 'uniswap.org' }),
      base({ id: 'y', origin: 'polymarket.com' }),
    ];
    expect(findMatchingBlockRule(rules, 'eth_sendTransaction', 'https://polymarket.com')?.id).toBe('y');
  });

  it('returns undefined when nothing matches', () => {
    expect(findMatchingBlockRule([base({ method: 'foo' })], 'bar', 'https://x')).toBeUndefined();
  });
});
