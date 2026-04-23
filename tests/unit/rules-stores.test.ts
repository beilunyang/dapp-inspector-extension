import { describe, it, expect, beforeEach } from 'vitest';
import { installChromeStorageMock } from '../mocks/chrome-storage';
import { useBlockRulesStore } from '@shared/stores/block-rules-store';
import { useMockRulesStore } from '@shared/stores/mock-rules-store';
import type { BlockRule, MockRule } from '@shared/rules';

const mkBlock = (id: string, method = id): BlockRule => ({
  id, enabled: true, method, matchMode: 'exact', origin: '*', mode: 'block',
});
const mkMock = (id: string, method = id): MockRule => ({
  id, enabled: true, method, matchMode: 'exact', origin: '*',
  responseType: 'result', responseBody: 'null',
});

describe('block-rules-store.reorder', () => {
  beforeEach(() => { installChromeStorageMock(); useBlockRulesStore.setState({ rules: [] }); });

  it('reorders by the provided id list', async () => {
    await useBlockRulesStore.getState().set([mkBlock('a'), mkBlock('b'), mkBlock('c')]);
    await useBlockRulesStore.getState().reorder(['c', 'a', 'b']);
    expect(useBlockRulesStore.getState().rules.map(r => r.id)).toEqual(['c', 'a', 'b']);
  });

  it('appends ids not listed (defensive)', async () => {
    await useBlockRulesStore.getState().set([mkBlock('a'), mkBlock('b'), mkBlock('c')]);
    await useBlockRulesStore.getState().reorder(['c']); // only one id — others appended
    const ids = useBlockRulesStore.getState().rules.map(r => r.id);
    expect(ids[0]).toBe('c');
    expect(ids).toContain('a');
    expect(ids).toContain('b');
    expect(ids.length).toBe(3);
  });
});

describe('mock-rules-store.reorder', () => {
  beforeEach(() => { installChromeStorageMock(); useMockRulesStore.setState({ rules: [] }); });

  it('reorders by the provided id list', async () => {
    await useMockRulesStore.getState().set([mkMock('x'), mkMock('y'), mkMock('z')]);
    await useMockRulesStore.getState().reorder(['z', 'y', 'x']);
    expect(useMockRulesStore.getState().rules.map(r => r.id)).toEqual(['z', 'y', 'x']);
  });
});
