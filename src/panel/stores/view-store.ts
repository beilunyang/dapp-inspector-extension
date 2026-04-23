import { create } from 'zustand';
import type { Kind } from '@shared/types';

type Tab = 'params' | 'result' | 'timing' | 'raw';

interface ViewState {
  selectedCallId: string | null;
  activeTab: Tab;
  search: string;
  kinds: Set<Kind>;
  origins: Set<string>;
  errorsOnly: boolean;
  mockedOnly: boolean;
  select(id: string | null): void;
  setTab(t: Tab): void;
  setSearch(s: string): void;
  toggleKind(k: Kind): void;
  toggleOrigin(o: string): void;
  toggleErrorsOnly(): void;
  toggleMockedOnly(): void;
  resetChips(): void;
  clearFilters(): void;
}

export const useViewStore = create<ViewState>((set) => ({
  selectedCallId: null,
  activeTab: 'params',
  search: '',
  kinds: new Set(),
  origins: new Set(),
  errorsOnly: false,
  mockedOnly: false,
  select(id) { set({ selectedCallId: id }); },
  setTab(t) { set({ activeTab: t }); },
  setSearch(s) { set({ search: s }); },
  toggleKind(k) { set((s) => { const n = new Set(s.kinds); n.has(k) ? n.delete(k) : n.add(k); return { kinds: n }; }); },
  toggleOrigin(o) { set((s) => { const n = new Set(s.origins); n.has(o) ? n.delete(o) : n.add(o); return { origins: n }; }); },
  toggleErrorsOnly() { set((s) => ({ errorsOnly: !s.errorsOnly })); },
  toggleMockedOnly() { set((s) => ({ mockedOnly: !s.mockedOnly })); },
  resetChips() { set({ kinds: new Set(), errorsOnly: false, mockedOnly: false }); },
  clearFilters() { set({ kinds: new Set(), origins: new Set(), search: '', errorsOnly: false, mockedOnly: false }); },
}));
