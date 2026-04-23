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
}));

if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[BLOCK_RULES_KEY]) return;
    const v = changes[BLOCK_RULES_KEY].newValue;
    if (Array.isArray(v)) useBlockRulesStore.setState({ rules: v as BlockRule[] });
  });
}

void useBlockRulesStore.getState().hydrate();
