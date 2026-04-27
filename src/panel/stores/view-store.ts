import { create } from 'zustand';
import type { Kind } from '@shared/types';

type Tab = 'decoded' | 'params' | 'result' | 'timing' | 'raw';

interface ViewState {
  selectedCallId: string | null;
  activeTab: Tab;
  search: string;
  kinds: Set<Kind>;
  errorsOnly: boolean;
  mockedOnly: boolean;
  blockedOnly: boolean;
  throttledOnly: boolean;
  replayedOnly: boolean;
  select(id: string | null): void;
  setTab(t: Tab): void;
  setSearch(s: string): void;
  toggleKind(k: Kind): void;
  toggleErrorsOnly(): void;
  toggleMockedOnly(): void;
  toggleBlockedOnly(): void;
  toggleThrottledOnly(): void;
  toggleReplayedOnly(): void;
  resetChips(): void;
  clearFilters(): void;
}

export const useViewStore = create<ViewState>((set) => ({
  selectedCallId: null,
  activeTab: 'params',
  search: '',
  kinds: new Set(),
  errorsOnly: false,
  mockedOnly: false,
  blockedOnly: false,
  throttledOnly: false,
  replayedOnly: false,
  select(id) { set({ selectedCallId: id }); },
  setTab(t) { set({ activeTab: t }); },
  setSearch(s) { set({ search: s }); },
  toggleKind(k) { set((s) => { const n = new Set(s.kinds); n.has(k) ? n.delete(k) : n.add(k); return { kinds: n }; }); },
  toggleErrorsOnly() { set((s) => ({ errorsOnly: !s.errorsOnly })); },
  toggleMockedOnly() { set((s) => ({ mockedOnly: !s.mockedOnly })); },
  toggleBlockedOnly() { set((s) => ({ blockedOnly: !s.blockedOnly })); },
  toggleThrottledOnly() { set((s) => ({ throttledOnly: !s.throttledOnly })); },
  toggleReplayedOnly() { set((s) => ({ replayedOnly: !s.replayedOnly })); },
  resetChips() { set({ kinds: new Set(), errorsOnly: false, mockedOnly: false, blockedOnly: false, throttledOnly: false, replayedOnly: false }); },
  clearFilters() { set({ kinds: new Set(), search: '', errorsOnly: false, mockedOnly: false, blockedOnly: false, throttledOnly: false, replayedOnly: false }); },
}));
