import { create } from 'zustand';
import { MOCK_RULES_KEY, loadMockRules, saveMockRules } from '../mock-rules-store';
import type { MockRule } from '../rules';

interface MockRulesStore {
  rules: MockRule[];
  hydrate(): Promise<void>;
  set(rules: MockRule[]): Promise<void>;
  upsert(rule: MockRule): Promise<void>;
  remove(id: string): Promise<void>;
  toggle(id: string, enabled: boolean): Promise<void>;
  reorder(orderedIds: string[]): Promise<void>;
}

export const useMockRulesStore = create<MockRulesStore>((set, get) => ({
  rules: [],
  async hydrate() {
    const rules = await loadMockRules();
    set({ rules });
  },
  async set(rules) {
    set({ rules });
    await saveMockRules(rules);
  },
  async upsert(rule) {
    const current = [...get().rules];
    const i = current.findIndex(r => r.id === rule.id);
    if (i >= 0) current[i] = rule;
    else current.push(rule);
    set({ rules: current });
    await saveMockRules(current);
  },
  async remove(id) {
    const next = get().rules.filter(r => r.id !== id);
    set({ rules: next });
    await saveMockRules(next);
  },
  async toggle(id, enabled) {
    const next = get().rules.map(r => r.id === id ? { ...r, enabled } : r);
    set({ rules: next });
    await saveMockRules(next);
  },
  async reorder(orderedIds) {
    const byId = new Map(get().rules.map(r => [r.id, r]));
    const reordered: MockRule[] = [];
    for (const id of orderedIds) {
      const r = byId.get(id);
      if (r) { reordered.push(r); byId.delete(id); }
    }
    for (const r of byId.values()) reordered.push(r);
    set({ rules: reordered });
    await saveMockRules(reordered);
  },
}));

if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[MOCK_RULES_KEY]) return;
    const v = changes[MOCK_RULES_KEY].newValue;
    if (Array.isArray(v)) useMockRulesStore.setState({ rules: v as MockRule[] });
  });
}

if (typeof chrome !== 'undefined' && chrome.storage?.local) {
  void useMockRulesStore.getState().hydrate();
}
