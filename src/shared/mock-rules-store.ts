import type { MockRule } from './rules';

export const MOCK_RULES_KEY = 'dapp-inspector:mock-rules';

export async function loadMockRules(): Promise<MockRule[]> {
  const res = await chrome.storage.local.get(MOCK_RULES_KEY);
  const raw = res[MOCK_RULES_KEY];
  return Array.isArray(raw) ? raw as MockRule[] : [];
}

export async function saveMockRules(rules: MockRule[]): Promise<void> {
  await chrome.storage.local.set({ [MOCK_RULES_KEY]: rules });
}
