import { describe, it, expect } from 'vitest';
import { toJsonRpcEnvelope, toEthersSnippet, toMarkdownRow } from '@shared/call-export';
import type { CapturedCall } from '@shared/types';

const base = (over: Partial<CapturedCall> = {}): CapturedCall => ({
  id: 'abc123', tabId: 1, origin: 'https://polymarket.com',
  providerInfo: { name: 'MetaMask' },
  method: 'eth_chainId', kind: 'read',
  params: [],
  startedAt: 1_000_000,
  endedAt: 1_000_012,
  durationMs: 12.3,
  status: 'ok',
  result: '0x1',
  ...over,
});

describe('toJsonRpcEnvelope', () => {
  it('wraps ok calls with request + result in one envelope', () => {
    const out = toJsonRpcEnvelope(base({ method: 'eth_call', params: [{ to: '0x1' }], result: '0xabc' }));
    const parsed = JSON.parse(out);
    expect(parsed).toEqual({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to: '0x1' }],
      result: '0xabc',
    });
  });

  it('wraps error calls with request + error in one envelope', () => {
    const out = toJsonRpcEnvelope(base({
      status: 'error',
      result: undefined,
      error: { code: 4001, message: 'user rejected' },
    }));
    const parsed = JSON.parse(out);
    expect(parsed.error).toEqual({ code: 4001, message: 'user rejected' });
    expect(parsed.result).toBeUndefined();
  });

  it('omits both result and error while pending', () => {
    const out = toJsonRpcEnvelope(base({ status: 'pending', result: undefined }));
    const parsed = JSON.parse(out);
    expect(parsed).toEqual({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_chainId',
      params: [],
    });
  });

  it('coerces non-array params into a single-element array', () => {
    const out = toJsonRpcEnvelope(base({ params: { foo: 'bar' } }));
    expect(JSON.parse(out).params).toEqual([{ foo: 'bar' }]);
  });

  it('uses [] when params is null/undefined', () => {
    const out = toJsonRpcEnvelope(base({ params: null }));
    expect(JSON.parse(out).params).toEqual([]);
  });
});

describe('toEthersSnippet', () => {
  it('emits a provider.send call with JSON-encoded params', () => {
    const snippet = toEthersSnippet(base({ method: 'personal_sign', params: ['hi', '0x1'] }));
    expect(snippet).toContain('new ethers.JsonRpcProvider(RPC_URL)');
    expect(snippet).toContain('provider.send("personal_sign", ["hi","0x1"])');
    expect(snippet).toContain('console.log(result)');
  });

  it('includes a comment with the origin when present', () => {
    const snippet = toEthersSnippet(base({ origin: 'https://app.foo' }));
    expect(snippet).toMatch(/captured from https:\/\/app\.foo/);
  });
});

describe('toMarkdownRow', () => {
  it('produces a 3-line markdown table', () => {
    const md = toMarkdownRow(base());
    const lines = md.split('\n');
    expect(lines.length).toBe(3);
    expect(lines[0]).toBe('| Method | Origin | Time | Status | Result |');
    expect(lines[2]).toContain('eth_chainId');
    expect(lines[2]).toContain('polymarket.com');
    expect(lines[2]).toContain('OK');
    expect(lines[2]).toContain('12.3ms');
  });

  it('shows MOCKED for mocked calls', () => {
    const md = toMarkdownRow(base({ mocked: true }));
    expect(md).toContain('MOCKED');
  });

  it('truncates long result values', () => {
    const md = toMarkdownRow(base({ result: 'x'.repeat(200) }));
    expect(md).toMatch(/…/);
    // No full 200-char token in the row
    expect(md.includes('x'.repeat(200))).toBe(false);
  });

  it('shows error on failed calls', () => {
    const md = toMarkdownRow(base({ status: 'error', error: { code: 4001, message: 'rejected' } }));
    expect(md).toContain('ERROR');
    expect(md).toContain('rejected');
  });
});
