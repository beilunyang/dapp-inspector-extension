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

export function createEmitter(): EmitFn {
  return (msg) => {
    try { (globalThis as { window?: Window }).window?.postMessage(msg, '*'); }
    catch { /* swallow: must not affect the DApp */ }
  };
}

export function wrapProvider(provider: EIP1193Provider, info: ProviderInfo, emit: EmitFn): void {
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
