import type { Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  lang: 'en',
  monitoring: true,
  retentionMax: 5000,
  ignoredMethods: [
    'eth_blockNumber',
    'eth_getBlockByNumber',
    'net_version',
  ],
  accent: 'indigo',
};

const KEY = 'dapp-inspector:settings';

export async function loadSettings(): Promise<Settings> {
  const res = await chrome.storage.local.get(KEY);
  return { ...DEFAULT_SETTINGS, ...(res[KEY] ?? {}) };
}

export async function saveSetting<K extends keyof Settings>(
  key: K,
  value: Settings[K]
): Promise<void> {
  const current = await loadSettings();
  const next = { ...current, [key]: value };
  await chrome.storage.local.set({ [KEY]: next });
}

export async function saveSettings(
  partial: Partial<Settings>
): Promise<void> {
  const current = await loadSettings();
  await chrome.storage.local.set({ [KEY]: { ...current, ...partial } });
}

export const SETTINGS_KEY = KEY;
