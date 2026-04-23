// Pure serializers for "Copy this call as ..." actions in the DevTools panel.
// Each returns a string ready to paste into a bug report, snippet, or issue.

import type { CapturedCall } from './types';

/**
 * JSON-RPC 2.0 envelope, pretty-printed, with a numeric id that mirrors the
 * standard wallet-provider behavior. We don't preserve our nanoid call id
 * because consumers (web3 libs, RPC proxies) expect integer ids.
 */
export function toJsonRpcEnvelope(call: CapturedCall): string {
  return JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: call.method,
    params: normalizeParams(call.params),
  }, null, 2);
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
