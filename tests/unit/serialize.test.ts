import { describe, it, expect } from 'vitest';
import { safeClone, safeStringify, serializeError, MAX_PAYLOAD_BYTES } from '@shared/serialize';

describe('serialize', () => {
  it('clones plain objects unchanged', () => {
    expect(safeClone({ a: 1, b: [2, 3] })).toEqual({ a: 1, b: [2, 3] });
  });
  it('converts BigInt to string', () => {
    expect(safeClone({ amount: 123n })).toEqual({ amount: '123' });
  });
  it('replaces circular references with [Circular]', () => {
    const a: any = { name: 'a' };
    a.self = a;
    const cloned = safeClone(a) as any;
    expect(cloned.name).toBe('a');
    expect(cloned.self).toBe('[Circular]');
  });
  it('preserves Error shape', () => {
    const err = new Error('boom');
    const s = serializeError(err);
    expect(s.message).toBe('boom');
    expect(s.code).toBe(-32000);
  });
  it('preserves Error code when present', () => {
    const err: any = new Error('rejected');
    err.code = 4001;
    err.data = { foo: 'bar' };
    expect(serializeError(err)).toEqual({ code: 4001, message: 'rejected', data: { foo: 'bar' } });
  });
  it('flags truncation when payload exceeds max bytes', () => {
    const big = 'x'.repeat(MAX_PAYLOAD_BYTES + 100);
    const { value, truncated } = safeStringify(big);
    expect(truncated).toBe(true);
    expect(value.length).toBeLessThanOrEqual(MAX_PAYLOAD_BYTES + 50);
  });
  it('does not truncate small payloads', () => {
    const { truncated } = safeStringify({ a: 1 });
    expect(truncated).toBe(false);
  });
});
