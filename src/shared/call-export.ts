// Pure serializers for "Copy this call as ..." actions in the DevTools panel.
// Each returns a string ready to paste into a bug report, snippet, or issue.

import type { CapturedCall } from './types';

/**
 * JSON-RPC envelope, pretty-printed, with a numeric id=1 that mirrors the
 * standard wallet-provider behavior. In JSON-RPC 2.0 strict terms the
 * request and response travel as separate messages, but for debugging it
 * is overwhelmingly more useful to have both sides in one object. So:
 *
 * - status=ok     → envelope gains `result` alongside method/params
 * - status=error  → envelope gains `error` alongside method/params
 * - status=pending → response fields omitted
 *
 * The structure still parses as JSON and every well-formed JSON-RPC tool
 * will ignore unknown fields on the request side and accept the standard
 * response shape.
 */
export function toJsonRpcEnvelope(call: CapturedCall): string {
  const envelope: Record<string, unknown> = {
    jsonrpc: '2.0',
    id: 1,
    method: call.method,
    params: normalizeParams(call.params),
  };
  if (call.status === 'ok' && call.result !== undefined) {
    envelope.result = call.result;
  } else if (call.status === 'error' && call.error) {
    envelope.error = call.error;
  }
  return JSON.stringify(envelope, null, 2);
}

/**
 * ethers.js v6+ snippet. We can't actually cURL a wallet-injected provider,
 * so this is more honest: it's what you'd paste into a Node script + ethers
 * to re-issue the same request against a raw RPC endpoint.
 */
export function toEthersSnippet(call: CapturedCall): string {
  const params = JSON.stringify(normalizeParams(call.params));
  return [
    `// ${call.method}${call.origin ? ` · captured from ${call.origin}` : ''}`,
    `const provider = new ethers.JsonRpcProvider(RPC_URL);`,
    `const result = await provider.send(${JSON.stringify(call.method)}, ${params});`,
    `console.log(result);`,
  ].join('\n');
}

/**
 * Markdown table row with a header, ready to paste into a GitHub issue.
 * Status cell shows MOCKED for mocked calls to make reports accurate.
 */
export function toMarkdownRow(call: CapturedCall): string {
  const host = safeHost(call.origin) || '—';
  const duration = call.durationMs != null ? `${call.durationMs.toFixed(1)}ms` : '—';
  const status = call.mocked ? 'MOCKED' : call.status.toUpperCase();
  const result = compactValue(call.status === 'error' ? call.error : call.result);
  return [
    '| Method | Origin | Time | Status | Result |',
    '|---|---|---|---|---|',
    `| \`${call.method}\` | \`${host}\` | ${duration} | ${status} | \`${result}\` |`,
  ].join('\n');
}

// ── helpers ────────────────────────────────────────────────────────────────

function normalizeParams(params: unknown): unknown[] {
  if (params == null) return [];
  if (Array.isArray(params)) return params;
  return [params];
}

function safeHost(url: string): string {
  try { return new URL(url).host; } catch { return url; }
}

function compactValue(v: unknown): string {
  if (v == null) return '—';
  try {
    const s = JSON.stringify(v);
    return s.length > 80 ? s.slice(0, 77) + '…' : s;
  } catch {
    return String(v);
  }
}
