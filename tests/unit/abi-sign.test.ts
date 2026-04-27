import { describe, it, expect } from 'vitest';
import { extractSignContext, hasDecodableContent } from '../../src/shared/abi/decode';
import type { CapturedCall } from '@shared/types';

const base: Omit<CapturedCall, 'method' | 'params'> = {
  id: 'x', tabId: 1, origin: 'https://x.test',
  providerInfo: { name: 'M' },
  kind: 'sign',
  startedAt: 0,
  status: 'pending',
};

describe('extractSignContext', () => {
  it('parses eth_signTypedData_v4 JSON-string payload', () => {
    const payload = {
      domain: { name: 'USDC', chainId: 1 },
      types: { Permit: [{ name: 'owner', type: 'address' }] },
      primaryType: 'Permit',
      message: { owner: '0x000000000000000000000000000000000000dEaD' },
    };
    const sig = extractSignContext({
      ...base, method: 'eth_signTypedData_v4',
      params: ['0xsigner', JSON.stringify(payload)],
    } as CapturedCall);
    expect(sig?.kind).toBe('typedData');
    if (sig?.kind !== 'typedData') return;
    expect(sig.primaryType).toBe('Permit');
    expect((sig.message as { owner: string }).owner).toBe('0x000000000000000000000000000000000000dEaD');
  });

  it('parses eth_signTypedData_v4 object payload (already-parsed)', () => {
    const payload = { domain: {}, types: {}, primaryType: 'Foo', message: { x: 1 } };
    const sig = extractSignContext({
      ...base, method: 'eth_signTypedData_v4',
      params: ['0xsigner', payload],
    } as CapturedCall);
    expect(sig?.kind).toBe('typedData');
  });

  it('decodes personal_sign UTF-8 hex message', () => {
    // "hello" in hex
    const sig = extractSignContext({
      ...base, method: 'personal_sign',
      params: ['0x68656c6c6f', '0x000000000000000000000000000000000000dEaD'],
    } as CapturedCall);
    expect(sig?.kind).toBe('message');
    if (sig?.kind !== 'message') return;
    expect(sig.text).toBe('hello');
    expect(sig.isUtf8).toBe(true);
  });

  it('handles eth_sign argument order (address first)', () => {
    const sig = extractSignContext({
      ...base, method: 'eth_sign',
      params: ['0x000000000000000000000000000000000000dEaD', '0x68656c6c6f'],
    } as CapturedCall);
    expect(sig?.kind).toBe('message');
    if (sig?.kind !== 'message') return;
    expect(sig.text).toBe('hello');
  });

  it('flags non-UTF-8 bytes as binary', () => {
    // 0xff is not valid as standalone UTF-8
    const sig = extractSignContext({
      ...base, method: 'personal_sign',
      params: ['0xff', '0x000000000000000000000000000000000000dEaD'],
    } as CapturedCall);
    expect(sig?.kind).toBe('message');
    if (sig?.kind !== 'message') return;
    expect(sig.isUtf8).toBe(false);
  });

  it('returns null for non-sign methods', () => {
    expect(extractSignContext({
      ...base, method: 'eth_chainId', params: [],
    } as CapturedCall)).toBeNull();
  });
});

describe('hasDecodableContent', () => {
  it('true for tx with calldata', () => {
    expect(hasDecodableContent({
      ...base, method: 'eth_sendTransaction',
      params: [{ to: '0xabc', data: '0xa9059cbb' }],
    } as CapturedCall)).toBe(true);
  });

  it('true for personal_sign', () => {
    expect(hasDecodableContent({
      ...base, method: 'personal_sign',
      params: ['0x68656c6c6f', '0x000000000000000000000000000000000000dEaD'],
    } as CapturedCall)).toBe(true);
  });

  it('false for eth_chainId', () => {
    expect(hasDecodableContent({
      ...base, method: 'eth_chainId', params: [],
    } as CapturedCall)).toBe(false);
  });
});
