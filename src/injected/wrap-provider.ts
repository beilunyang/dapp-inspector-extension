import { nanoid } from 'nanoid';
import type { PageMsg } from '@shared/messages';
import type { ProviderInfo } from '@shared/types';
import { classify } from '@shared/classify';
import { safeClone, serializeError } from '@shared/serialize';

interface EIP1193Provider {
  request(args: { method: string; params?: unknown }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
}

const WRAPPED = new WeakSet<EIP1193Provider>();

export type EmitFn = (msg: PageMsg) => void;

export interface RequestContext {
  method: string;
  params: unknown;
  origin: string;
}

export type PreRequestAction =
  | { kind: 'pass' }
  | { kind: 'block'; error: { code: number; message: string } }
  | { kind: 'delay'; ms: number };

export type PreRequestHook = (ctx: RequestContext) => Promise<PreRequestAction> | PreRequestAction;

export type MockAction =
  | { kind: 'pass' }
  | { kind: 'mock-result'; result: unknown; delayMs?: number }
  | { kind: 'mock-error'; error: { code: number; message: string; data?: unknown }; delayMs?: number };

export type MockRequestHook = (ctx: RequestContext) => Promise<MockAction> | MockAction;

export function createEmitter(): EmitFn {
  return (msg) => {
    try { (globalThis as { window?: Window }).window?.postMessage(msg, '*'); }
    catch { /* swallow: must not affect the DApp */ }
  };
}

export function wrapProvider(
  provider: EIP1193Provider,
  info: ProviderInfo,
  emit: EmitFn,
  preRequest?: PreRequestHook,
  mockRequest?: MockRequestHook,
): void {
  if (WRAPPED.has(provider)) return;
  WRAPPED.add(provider);

  try { emit({ source: 'dappinsp', kind: 'provider', payload: info }); } catch {}

  const original = provider.request.bind(provider);
  provider.request = async function wrappedRequest(args) {
    const id = nanoid();
    const method = args?.method ?? '<unknown>';
    const startedAt = Date.now();
    const startPerf = performance.now();
    try {
      emit({
        source: 'dappinsp', kind: 'call:start',
        payload: { id, method, params: safeClone(args?.params), providerInfo: info, startedAt },
      });
    } catch {}
    void classify; // referenced to avoid unused import under some tsconfigs

    // Apply pre-request rules (block / throttle) before hitting the real provider.
    if (preRequest) {
      let action: PreRequestAction = { kind: 'pass' };
      try {
        action = await preRequest({
          method,
          params: args?.params,
          origin: (globalThis as { location?: Location }).location?.origin ?? '',
        });
      } catch { /* fall through to pass */ }

      if (action.kind === 'block') {
        const endedAt = Date.now();
        try {
          emit({
            source: 'dappinsp', kind: 'call:error',
            payload: { id, endedAt, durationMs: performance.now() - startPerf, error: action.error },
          });
        } catch {}
        // Throw an EIP-1193 style error so the DApp sees a real rejection.
        const err: Error & { code?: number } = Object.assign(new Error(action.error.message), { code: action.error.code });
        throw err;
      }
      if (action.kind === 'delay' && action.ms > 0) {
        await new Promise<void>(r => setTimeout(r, action.ms));
      }
    }

    // Mock-request hook runs AFTER pre-request (so throttle delay applies
    // first). On match, short-circuit the real provider and emit a synthetic
    // call:end or call:error tagged with `mocked: true`.
    if (mockRequest) {
      let mockAction: MockAction = { kind: 'pass' };
      try {
        mockAction = await mockRequest({
          method,
          params: args?.params,
          origin: (globalThis as { location?: Location }).location?.origin ?? '',
        });
      } catch { /* fall through to real call */ }

      if (mockAction.kind === 'mock-result') {
        if (mockAction.delayMs && mockAction.delayMs > 0) {
          await new Promise<void>(r => setTimeout(r, mockAction.delayMs));
        }
        const endedAt = Date.now();
        try {
          emit({
            source: 'dappinsp', kind: 'call:end',
            payload: {
              id, endedAt,
              durationMs: performance.now() - startPerf,
              result: safeClone(mockAction.result),
              mocked: true,
            },
          });
        } catch {}
        return mockAction.result;
      }
      if (mockAction.kind === 'mock-error') {
        if (mockAction.delayMs && mockAction.delayMs > 0) {
          await new Promise<void>(r => setTimeout(r, mockAction.delayMs));
        }
        const endedAt = Date.now();
        try {
          emit({
            source: 'dappinsp', kind: 'call:error',
            payload: {
              id, endedAt,
              durationMs: performance.now() - startPerf,
              error: mockAction.error,
              mocked: true,
            },
          });
        } catch {}
        const err: Error & { code?: number; data?: unknown } = Object.assign(
          new Error(mockAction.error.message),
          { code: mockAction.error.code, data: mockAction.error.data },
        );
        throw err;
      }
    }

    try {
      const result = await original(args);
      const endedAt = Date.now();
      try {
        emit({
          source: 'dappinsp', kind: 'call:end',
          payload: { id, endedAt, durationMs: performance.now() - startPerf, result: safeClone(result) },
        });
      } catch {}
      return result;
    } catch (error) {
      const endedAt = Date.now();
      try {
        emit({
          source: 'dappinsp', kind: 'call:error',
          payload: { id, endedAt, durationMs: performance.now() - startPerf, error: serializeError(error) },
        });
      } catch {}
      throw error;
    }
  } as typeof provider.request;
}
