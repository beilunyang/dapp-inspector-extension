import type { PageMsg, ControlMsg } from '@shared/messages';
import { BLOCK_RULES_KEY } from '@shared/block-rules-store';
import { MOCK_RULES_KEY } from '@shared/mock-rules-store';
import { SETTINGS_KEY, DEFAULT_SETTINGS } from '@shared/settings';
import type { Settings } from '@shared/types';

// Page → SW: forward dappinsp events
window.addEventListener('message', (e) => {
  if (e.source !== window) return;
  const d = e.data as PageMsg | undefined;
  if (!d || d.source !== 'dappinsp') return;
  chrome.runtime.sendMessage(d).catch(() => { /* SW idle, drop */ });
});

// SW → Page: forward control messages
chrome.runtime.onMessage.addListener((msg: ControlMsg) => {
  if (msg?.source === 'dappinsp-ctrl') {
    window.postMessage(msg, window.location.origin);
  }
});

// Bootstrap: read settings + block-rules directly from chrome.storage.local
// (the content script has the permission) and push them to the page world.
// This avoids a round-trip to the SW and the associated race.
function forward(msg: ControlMsg) {
  try { window.postMessage(msg, window.location.origin); } catch { /* empty */ }
}

void chrome.storage.local.get([SETTINGS_KEY, BLOCK_RULES_KEY, MOCK_RULES_KEY]).then((res) => {
  const settings: Settings = { ...DEFAULT_SETTINGS, ...(res[SETTINGS_KEY] ?? {}) };
  const blockRules = Array.isArray(res[BLOCK_RULES_KEY]) ? res[BLOCK_RULES_KEY] : [];
  const mockRules = Array.isArray(res[MOCK_RULES_KEY]) ? res[MOCK_RULES_KEY] : [];
  forward({ source: 'dappinsp-ctrl', kind: 'monitoring', enabled: settings.monitoring });
  forward({ source: 'dappinsp-ctrl', kind: 'ignored-methods', list: settings.ignoredMethods });
  forward({ source: 'dappinsp-ctrl', kind: 'block-rules', rules: blockRules });
  forward({ source: 'dappinsp-ctrl', kind: 'mock-rules', rules: mockRules });
});

// Watch storage directly so each tab picks up rule changes without depending
// on SW broadcast timing.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes[BLOCK_RULES_KEY]) {
    const v = changes[BLOCK_RULES_KEY].newValue;
    forward({ source: 'dappinsp-ctrl', kind: 'block-rules', rules: Array.isArray(v) ? v : [] });
  }
  if (changes[MOCK_RULES_KEY]) {
    const v = changes[MOCK_RULES_KEY].newValue;
    forward({ source: 'dappinsp-ctrl', kind: 'mock-rules', rules: Array.isArray(v) ? v : [] });
  }
  if (changes[SETTINGS_KEY]) {
    const v = changes[SETTINGS_KEY].newValue as Partial<Settings> | undefined;
    const s: Settings = { ...DEFAULT_SETTINGS, ...(v ?? {}) };
    forward({ source: 'dappinsp-ctrl', kind: 'monitoring', enabled: s.monitoring });
    forward({ source: 'dappinsp-ctrl', kind: 'ignored-methods', list: s.ignoredMethods });
  }
});
