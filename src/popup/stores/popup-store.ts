import { create } from 'zustand';
import type { CapturedCall, TabProvenance } from '@shared/types';
import type { PopupPush } from '@shared/messages';

interface State {
  provenance: TabProvenance | null;
  recent: CapturedCall[];
  monitoring: boolean;
  apply(m: PopupPush): void;
}

export const usePopupStore = create<State>((set) => ({
  provenance: null, recent: [], monitoring: true,
  apply(m) {
    if (m.kind === 'status') set({ provenance: m.provenance, recent: m.recent, monitoring: m.monitoring });
  },
}));
