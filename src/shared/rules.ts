// Rule types shared between Block/Throttle (P1) and Mock (P1) features,
// plus pure matching helpers that run both in the panel UI (for previews)
// and in the injected page-world script (at request time).

export type MatchMode = 'exact' | 'prefix' | 'glob';
export type BlockMode = 'block' | 'throttle';

export interface BlockRule {
  id: string;
  enabled: boolean;
  method: string;        // e.g. "eth_sendTransaction" or "wallet_*"
  matchMode: MatchMode;
  origin: string;        // "*" or a host like "polymarket.com"
  mode: BlockMode;
  throttleMs?: number;   // used when mode === 'throttle', default 1000
  errorCode?: number;    // used when mode === 'block', default 4001
  errorMessage?: string; // used when mode === 'block', default "Blocked by DApp Inspector"
}

export function methodMatches(
  rule: { method: string; matchMode: MatchMode },
  actualMethod: string,
): boolean {
  const pattern = rule.method ?? '';
  if (!pattern) return false;
  if (rule.matchMode === 'exact') return pattern === actualMethod;
  if (rule.matchMode === 'prefix') {
    const needle = pattern.replace(/\*$/, '');
    return actualMethod.startsWith(needle);
  }
  // glob: '*' → '.*', escape the rest
  const regexStr = '^' + pattern
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*') + '$';
  try {
    return new RegExp(regexStr).test(actualMethod);
  } catch {
    return false;
  }
}

export function originMatches(rule: { origin: string }, actualOrigin: string): boolean {
  const ruleOrigin = rule.origin?.trim() ?? '';
  if (!ruleOrigin || ruleOrigin === '*') return true;
  // Try to extract the host when `actualOrigin` looks like a full URL. `URL`
  // accepts things like "localhost:3000" by treating "localhost:" as the
  // protocol and leaving host empty, so only use the parsed host if it's
  // non-empty; otherwise fall back to raw string comparison.
  let actualHost = actualOrigin;
  try {
    const parsed = new URL(actualOrigin);
    if (parsed.host) actualHost = parsed.host;
  } catch { /* keep raw */ }
  return actualHost === ruleOrigin;
}

export function findMatchingBlockRule(
  rules: BlockRule[],
  method: string,
  origin: string,
): BlockRule | undefined {
  for (const r of rules) {
    if (!r.enabled) continue;
    if (!methodMatches(r, method)) continue;
    if (!originMatches(r, origin)) continue;
    return r;
  }
  return undefined;
}

export const DEFAULT_BLOCK_ERROR_CODE = 4001;
export const DEFAULT_BLOCK_ERROR_MESSAGE = 'Blocked by DApp Inspector';
export const DEFAULT_THROTTLE_MS = 1000;

// ─── Mock rules ──────────────────────────────────────────────────────────

export type MockResponseType = 'result' | 'error';

export interface MockRule {
  id: string;
  enabled: boolean;
  method: string;
  matchMode: MatchMode;
  origin: string;
  responseType: MockResponseType;
  /** JSON text — parsed at request time. Used when responseType === 'result'. */
  responseBody: string;
  delayMs?: number;            // optional artificial latency
  errorCode?: number;          // used when responseType === 'error'
  errorMessage?: string;
}

export function findMatchingMockRule(
  rules: MockRule[],
  method: string,
  origin: string,
): MockRule | undefined {
  for (const r of rules) {
    if (!r.enabled) continue;
    if (!methodMatches(r, method)) continue;
    if (!originMatches(r, origin)) continue;
    return r;
  }
  return undefined;
}

export const DEFAULT_MOCK_ERROR_CODE = -32000;
export const DEFAULT_MOCK_ERROR_MESSAGE = 'Mocked error';
export const DEFAULT_MOCK_DELAY_MS = 0;
