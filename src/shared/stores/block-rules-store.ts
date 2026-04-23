import { create } from 'zustand';
import { BLOCK_RULES_KEY, loadBlockRules, saveBlockRules } from '../block-rules-store';
import type { BlockRule } from '../rules';

interface BlockRulesStore {
  rules: BlockRule[];
  hydrate(): Promise<void>;
  set(rules: BlockRule[]): Promise<void>;
  upsert(rule: BlockRule): Promise<void>;
  remove(id: string): Promise<void>;
  toggle(id: string, enabled: boolean): Promise<void>;
  reorder(orderedIds: string[]): Promise<void>;
}

export const useBlockRulesStore = create<BlockRulesStore>((set, get) => ({
  rules: [],
  async hydrate() {
    const rules = await loadBlockRules();
    set({ rules });
  },
  async set(rules) {
    set({ rules });
    await saveBlockRules(rules);
  },
  async upsert(rule) {
    const current = [...get().rules];
    const i = current.findIndex(r => r.id === rule.id);
    if (i >= 0) current[i] = rule;
    else current.push(rule);
    set({ rules: current });
    await saveBlockRules(current);
  },
  async remove(id) {
    const next = get().rules.filter(r => r.id !== id);
    set({ rules: next });
    await saveBlockRules(next);
  },
  async toggle(id, enabled) {
    const next = get().rules.map(r => r.id === id ? { ...r, enabled } : r);
    set({ rules: next });
    await saveBlockRules(next);
  },
  async reorder(orderedIds) {
    // Array order is match priority — earlier = higher priority. Re-sort
    // the store by the provided id order; any rules missing from the list
    // (shouldn't happen in normal UI flow, but defensive) are appended.
    const byId = new Map(get().rules.map(r => [r.id, r]));
    const reordered: BlockRule[] = [];
    for (const id of orderedIds) {
      const r = byId.get(id);
      if (r) { reordered.push(r); byId.delete(id); }
    }
    for (const r of byId.values()) reordered.push(r);
    set({ rules: reordered });
    await saveBlockRules(reordered);
  },
}));

if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[BLOCK_RULES_KEY]) return;
    const v = changes[BLOCK_RULES_KEY].newValue;
    if (Array.isArray(v)) useBlockRulesStore.setState({ rules: v as BlockRule[] });
  });
}

if (typeof chrome !== 'undefined' && chrome.storage?.local) {
  void useBlockRulesStore.getState().hydrate();
}
