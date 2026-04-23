import { create } from 'zustand';
import type { CapturedCall, TabProvenance } from '@shared/types';
import type { PanelPush } from '@shared/messages';

interface State {
  calls: CapturedCall[];
  provenance: TabProvenance | null;
  connected: boolean;
  /** Updates that arrived before their append — replayed when the matching call lands. */
  pendingPatches: Record<string, Partial<CapturedCall>>;
  apply(msg: PanelPush): void;
  setConnected(v: boolean): void;
  reset(): void;
}

export const useCapturesStore = create<State>((set) => ({
  calls: [],
  provenance: null,
  connected: false,
  pendingPatches: {},
  apply(msg) {
    set((s) => {
      switch (msg.kind) {
        case 'snapshot':
          return {
            calls: [...msg.calls].sort((a, b) => b.startedAt - a.startedAt),
            provenance: msg.provenance,
            pendingPatches: {},
          };
        case 'append': {
          const pending = s.pendingPatches[msg.call.id];
          const call = pending ? { ...msg.call, ...pending } : msg.call;
          const nextPending = { ...s.pendingPatches };
          delete nextPending[msg.call.id];
          return { calls: [call, ...s.calls], pendingPatches: nextPending };
        }
        case 'update': {
          let matched = false;
          const calls = s.calls.map(c => {
            if (c.id !== msg.id) return c;
            matched = true;
            return { ...c, ...msg.patch };
          });
          if (matched) return { calls };
          // Buffer the patch until the append for this id arrives.
          return {
            pendingPatches: {
              ...s.pendingPatches,
              [msg.id]: { ...(s.pendingPatches[msg.id] ?? {}), ...msg.patch },
            },
          };
        }
        case 'clear':
          return { calls: [], pendingPatches: {} };
        case 'provenance':
          return { provenance: msg.provenance };
      }
    });
  },
  setConnected(v) { set({ connected: v }); },
  reset() { set({ calls: [], provenance: null, connected: false, pendingPatches: {} }); },
}));
