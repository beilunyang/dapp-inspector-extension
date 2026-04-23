import {
  wrapProvider,
  createEmitter,
  type EmitFn,
  type PreRequestHook,
  type PreRequestAction,
  type MockRequestHook,
  type MockAction,
} from './wrap-provider';
import type { ProviderInfo } from '@shared/types';
import type { ControlMsg } from '@shared/messages';
import {
  findMatchingBlockRule,
  findMatchingMockRule,
  type BlockRule,
  type MockRule,
  DEFAULT_BLOCK_ERROR_CODE,
  DEFAULT_BLOCK_ERROR_MESSAGE,
  DEFAULT_THROTTLE_MS,
  DEFAULT_MOCK_ERROR_CODE,
  DEFAULT_MOCK_ERROR_MESSAGE,
} from '@shared/rules';

(() => {
  const emit: EmitFn = createEmitter();
  let monitoring = true;
  let ignored = new Set<string>();
  let blockRules: BlockRule[] = [];
  let mockRules: MockRule[] = [];
  let blockRulesLoaded = false;
  let mockRulesLoaded = false;

  const emitGated: EmitFn = (msg) => {
    if (!monitoring) return;
    if (msg.kind === 'call:start' && ignored.has(msg.payload.method)) return;
    emit(msg);
  };

  const preRequest: PreRequestHook = (ctx): PreRequestAction => {
    const rule = findMatchingBlockRule(blockRules, ctx.method, ctx.origin);
    if (!rule) return { kind: 'pass' };
    if (rule.mode === 'block') {
      return {
        kind: 'block',
        error: {
          code: rule.errorCode ?? DEFAULT_BLOCK_ERROR_CODE,
          message: rule.errorMessage ?? DEFAULT_BLOCK_ERROR_MESSAGE,
        },
      };
    }
    return { kind: 'delay', ms: rule.throttleMs ?? DEFAULT_THROTTLE_MS };
  };

  const mockRequest: MockRequestHook = (ctx): MockAction => {
    const rule = findMatchingMockRule(mockRules, ctx.method, ctx.origin);
    if (!rule) return { kind: 'pass' };
    const delayMs = rule.delayMs && rule.delayMs > 0 ? rule.delayMs : undefined;
    if (rule.responseType === 'error') {
      return {
        kind: 'mock-error',
        error: {
          code: rule.errorCode ?? DEFAULT_MOCK_ERROR_CODE,
          message: rule.errorMessage ?? DEFAULT_MOCK_ERROR_MESSAGE,
        },
        delayMs,
      };
    }
    try {
      const result = JSON.parse(rule.responseBody);
      return { kind: 'mock-result', result, delayMs };
    } catch {
      // Invalid JSON body — let the real provider handle it rather than
      // accidentally silencing the call.
      return { kind: 'pass' };
    }
  };

  function signalReady() {
    if (!blockRulesLoaded || !mockRulesLoaded) return;
    try {
      (window as unknown as { __dappInspectorRulesLoaded?: boolean }).__dappInspectorRulesLoaded = true;
      window.dispatchEvent(new Event('dappinspector:rules-loaded'));
    } catch { /* empty */ }
  }

  // Control channel from isolated world
  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    const d = e.data as ControlMsg | undefined;
    if (!d || d.source !== 'dappinsp-ctrl') return;
    if (d.kind === 'monitoring') monitoring = d.enabled;
    if (d.kind === 'ignored-methods') ignored = new Set(d.list);
    if (d.kind === 'block-rules') {
      blockRules = d.rules;
      blockRulesLoaded = true;
      signalReady();
    }
    if (d.kind === 'mock-rules') {
      mockRules = d.rules;
      mockRulesLoaded = true;
      signalReady();
    }
    if (d.kind === 'replay') {
      const eth = (window as unknown as { ethereum?: { request?: (args: { method: string; params: unknown }) => Promise<unknown> } }).ethereum;
      if (eth?.request) {
        eth.request({ method: d.method, params: d.params as never }).catch(() => { /* errors surface through call:error */ });
      }
    }
  });

  // EIP-1193: wrap existing or trap setter
  try {
    const desc = Object.getOwnPropertyDescriptor(window, 'ethereum');
    const current = (window as unknown as { ethereum?: unknown }).ethereum;
    if (current && typeof current === 'object') {
      wrapProvider(current as Parameters<typeof wrapProvider>[0], { name: 'window.ethereum' }, emitGated, preRequest, mockRequest);
    }
    if (!desc || desc.configurable !== false) {
      let stored = current;
      Object.defineProperty(window, 'ethereum', {
        configurable: true,
        get() { return stored; },
        set(v) {
          stored = v;
          if (v && typeof v === 'object') {
            try { wrapProvider(v, { name: 'window.ethereum' }, emitGated, preRequest, mockRequest); } catch {}
          }
        },
      });
    }
  } catch { /* some pages freeze window; skip silently */ }

  // EIP-6963 discovery
  window.addEventListener('eip6963:announceProvider', (e: Event) => {
    const detail = (e as CustomEvent<{ info: ProviderInfo; provider: unknown }>).detail;
    if (!detail?.provider || typeof detail.provider !== 'object') return;
    try { wrapProvider(detail.provider as Parameters<typeof wrapProvider>[0], detail.info, emitGated, preRequest, mockRequest); } catch {}
  });
  try { window.dispatchEvent(new Event('eip6963:requestProvider')); } catch {}
})();
