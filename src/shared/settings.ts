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
  autoFetchAbi: true,
};

const KEY = 'dapp-inspector:settings';

/** First-install language pick: read the browser's UI locale and map it
 *  to one of our supported langs. After the user's first manual save,
 *  the value in storage takes precedence (see loadSettings spread order)
 *  so manual switches are respected indefinitely. */
function detectBrowserLang(): Settings['lang'] {
  try {
    const ui = chrome.i18n?.getUILanguage?.() ?? '';
    return ui.toLowerCase().startsWith('zh') ? 'zh' : 'en';
  } catch {
    return 'en';
  }
}

export async function loadSettings(): Promise<Settings> {
  const res = await chrome.storage.local.get(KEY);
  const stored = (res[KEY] ?? {}) as Partial<Settings>;
  // Browser-detected lang is the *default* — any value the user has
  // explicitly saved (in `stored`) trumps it because `...stored` spreads
  // last and overwrites.
  return {
    ...DEFAULT_SETTINGS,
    lang: detectBrowserLang(),
    ...stored,
  };
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
