import { wrapProvider, createEmitter, type EmitFn } from './wrap-provider';
import type { ProviderInfo } from '@shared/types';
import type { ControlMsg } from '@shared/messages';

(() => {
  const emit: EmitFn = createEmitter();
  let monitoring = true;
  let ignored = new Set<string>();

  const emitGated: EmitFn = (msg) => {
    if (!monitoring) return;
    if (msg.kind === 'call:start' && ignored.has(msg.payload.method)) return;
    emit(msg);
  };

  // Control channel from isolated world
  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    const d = e.data as ControlMsg | undefined;
    if (!d || d.source !== 'dappinsp-ctrl') return;
    if (d.kind === 'monitoring') monitoring = d.enabled;
    if (d.kind === 'ignored-methods') ignored = new Set(d.list);
    if (d.kind === 'replay') {
      // Re-fire the request against the (already wrapped) provider. The wrap
      // will capture it as a new call in the usual pipeline.
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
      wrapProvider(current as Parameters<typeof wrapProvider>[0], { name: 'window.ethereum' }, emitGated);
    }
    if (!desc || desc.configurable !== false) {
      let stored = current;
      Object.defineProperty(window, 'ethereum', {
        configurable: true,
        get() { return stored; },
        set(v) {
          stored = v;
          if (v && typeof v === 'object') {
            try { wrapProvider(v, { name: 'window.ethereum' }, emitGated); } catch {}
          }
        },
      });
    }
  } catch { /* some pages freeze window; skip silently */ }

  // EIP-6963 discovery
  window.addEventListener('eip6963:announceProvider', (e: Event) => {
    const detail = (e as CustomEvent<{ info: ProviderInfo; provider: unknown }>).detail;
    if (!detail?.provider || typeof detail.provider !== 'object') return;
    try { wrapProvider(detail.provider as Parameters<typeof wrapProvider>[0], detail.info, emitGated); } catch {}
  });
  try { window.dispatchEvent(new Event('eip6963:requestProvider')); } catch {}
})();
