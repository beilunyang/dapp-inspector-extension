import { describe, it, expect, beforeEach } from 'vitest';
import { useViewStore } from '../../src/panel/stores/view-store';

describe('view store filter toggles', () => {
  beforeEach(() => {
    useViewStore.getState().clearFilters();
    useViewStore.setState({ selectedCallId: null, activeTab: 'params' });
  });

  it('toggleErrorsOnly flips the flag', () => {
    expect(useViewStore.getState().errorsOnly).toBe(false);
    useViewStore.getState().toggleErrorsOnly();
    expect(useViewStore.getState().errorsOnly).toBe(true);
    useViewStore.getState().toggleErrorsOnly();
    expect(useViewStore.getState().errorsOnly).toBe(false);
  });

  it('toggleMockedOnly flips the flag', () => {
    expect(useViewStore.getState().mockedOnly).toBe(false);
    useViewStore.getState().toggleMockedOnly();
    expect(useViewStore.getState().mockedOnly).toBe(true);
  });

  it('errorsOnly and mockedOnly can both be active', () => {
    useViewStore.getState().toggleErrorsOnly();
    useViewStore.getState().toggleMockedOnly();
    expect(useViewStore.getState().errorsOnly).toBe(true);
    expect(useViewStore.getState().mockedOnly).toBe(true);
  });

  it('resetChips clears kinds and status-only flags but keeps search', () => {
    useViewStore.getState().setSearch('foo');
    useViewStore.getState().toggleKind('write');
    useViewStore.getState().toggleErrorsOnly();
    useViewStore.getState().toggleMockedOnly();

    useViewStore.getState().resetChips();

    const s = useViewStore.getState();
    expect(s.kinds.size).toBe(0);
    expect(s.errorsOnly).toBe(false);
    expect(s.mockedOnly).toBe(false);
    expect(s.search).toBe('foo');
  });
});
