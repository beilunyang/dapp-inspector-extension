import type { BlockRule } from './rules';

export const BLOCK_RULES_KEY = 'dapp-inspector:block-rules';

export async function loadBlockRules(): Promise<BlockRule[]> {
  const res = await chrome.storage.local.get(BLOCK_RULES_KEY);
  const raw = res[BLOCK_RULES_KEY];
  return Array.isArray(raw) ? raw as BlockRule[] : [];
}

export async function saveBlockRules(rules: BlockRule[]): Promise<void> {
  await chrome.storage.local.set({ [BLOCK_RULES_KEY]: rules });
}

export async function upsertBlockRule(rule: BlockRule): Promise<BlockRule[]> {
  const current = await loadBlockRules();
  const i = current.findIndex(r => r.id === rule.id);
  if (i >= 0) current[i] = rule;
  else current.push(rule);
  await saveBlockRules(current);
  return current;
}

export async function deleteBlockRule(id: string): Promise<BlockRule[]> {
  const current = await loadBlockRules();
  const next = current.filter(r => r.id !== id);
  await saveBlockRules(next);
  return next;
}
