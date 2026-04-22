import { create } from 'zustand';
import type { Kind } from '@shared/types';

type Tab = 'params' | 'result' | 'timing' | 'raw';

interface ViewState {
  selectedCallId: string | null;
  activeTab: Tab;
  search: string;
  kinds: Set<Kind>;
  origins: Set<string>;
  select(id: string | null): void;
  setTab(t: Tab): void;
  setSearch(s: string): void;
  toggleKind(k: Kind): void;
  toggleOrigin(o: string): void;
  clearFilters(): void;
}

export const useViewStore = create<ViewState>((set) => ({
  selectedCallId: null,
  activeTab: 'params',
  search: '',
  kinds: new Set(),
  origins: new Set(),
  select(id) { set({ selectedCallId: id }); },
  setTab(t) { set({ activeTab: t }); },
  setSearch(s) { set({ search: s }); },
  toggleKind(k) { set((s) => { const n = new Set(s.kinds); n.has(k) ? n.delete(k) : n.add(k); return { kinds: n }; }); },
  toggleOrigin(o) { set((s) => { const n = new Set(s.origins); n.has(o) ? n.delete(o) : n.add(o); return { origins: n }; }); },
  clearFilters() { set({ kinds: new Set(), origins: new Set(), search: '' }); },
}));
