export const MAX_PAYLOAD_BYTES = 512 * 1024; // 512 KB

export function safeClone(input: unknown): unknown {
  const seen = new WeakSet<object>();
  function walk(v: unknown): unknown {
    if (v === null || v === undefined) return v;
    const t = typeof v;
    if (t === 'bigint') return (v as bigint).toString();
    if (t !== 'object') return v;
    if (seen.has(v as object)) return '[Circular]';
    seen.add(v as object);
    if (Array.isArray(v)) return v.map(walk);
    if (v instanceof Error) return { name: v.name, message: v.message };
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as object)) out[k] = walk(val);
    return out;
  }
  return walk(input);
}

export function safeStringify(input: unknown): { value: string; truncated: boolean } {
  let value: string;
  try {
    value = JSON.stringify(safeClone(input)) ?? 'null';
  } catch {
    value = '"[Unserializable]"';
  }
  if (value.length > MAX_PAYLOAD_BYTES) {
    return { value: value.slice(0, MAX_PAYLOAD_BYTES) + '…', truncated: true };
  }
  return { value, truncated: false };
}

export interface SerializedError {
  code: number;
  message: string;
  data?: unknown;
}
export function serializeError(err: unknown): SerializedError {
  if (err && typeof err === 'object') {
    const e = err as { code?: number; message?: string; data?: unknown };
    return {
      code: typeof e.code === 'number' ? e.code : -32000,
      message: typeof e.message === 'string' ? e.message : String(err),
      ...(e.data !== undefined ? { data: safeClone(e.data) } : {}),
    };
  }
  return { code: -32000, message: String(err) };
}
