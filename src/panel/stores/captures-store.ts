import { create } from 'zustand';
import type { CapturedCall, TabProvenance } from '@shared/types';
import type { PanelPush } from '@shared/messages';

interface State {
  calls: CapturedCall[];
  provenance: TabProvenance | null;
  connected: boolean;
  apply(msg: PanelPush): void;
  setConnected(v: boolean): void;
  reset(): void;
}

export const useCapturesStore = create<State>((set) => ({
  calls: [],
  provenance: null,
  connected: false,
  apply(msg) {
    set((s) => {
      switch (msg.kind) {
        case 'snapshot':
          return { calls: [...msg.calls].sort((a, b) => b.startedAt - a.startedAt), provenance: msg.provenance };
        case 'append':
          return { calls: [msg.call, ...s.calls] };
        case 'update':
          return { calls: s.calls.map(c => c.id === msg.id ? { ...c, ...msg.patch } : c) };
        case 'clear':
          return { calls: [] };
        case 'provenance':
          return { provenance: msg.provenance };
      }
    });
  },
  setConnected(v) { set({ connected: v }); },
  reset() { set({ calls: [], provenance: null, connected: false }); },
}));
