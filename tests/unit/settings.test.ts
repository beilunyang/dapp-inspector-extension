import { describe, it, expect, beforeEach } from 'vitest';
import { installChromeStorageMock } from '../mocks/chrome-storage';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSetting,
} from '@shared/settings';

describe('settings', () => {
  beforeEach(() => {
    installChromeStorageMock();
  });

  it('returns defaults when storage is empty', async () => {
    const s = await loadSettings();
    expect(s).toEqual(DEFAULT_SETTINGS);
  });

  it('persists a single setting', async () => {
    await saveSetting('theme', 'dark');
    const s = await loadSettings();
    expect(s.theme).toBe('dark');
    // Others stay default
    expect(s.lang).toBe(DEFAULT_SETTINGS.lang);
  });

  it('merges partial storage with defaults', async () => {
    await saveSetting('retentionMax', 1000);
    const s = await loadSettings();
    expect(s.retentionMax).toBe(1000);
    expect(s.monitoring).toBe(DEFAULT_SETTINGS.monitoring);
  });

  it('first install picks zh when chrome.i18n.getUILanguage returns zh-CN', async () => {
    (globalThis as { chrome: typeof chrome }).chrome.i18n = {
      getUILanguage: () => 'zh-CN',
    } as unknown as typeof chrome.i18n;
    const s = await loadSettings();
    expect(s.lang).toBe('zh');
  });

  it('first install picks en when browser locale is non-Chinese', async () => {
    (globalThis as { chrome: typeof chrome }).chrome.i18n = {
      getUILanguage: () => 'fr-FR',
    } as unknown as typeof chrome.i18n;
    const s = await loadSettings();
    expect(s.lang).toBe('en');
  });

  it("user's saved lang choice overrides browser detection", async () => {
    // Simulate a Chinese browser
    (globalThis as { chrome: typeof chrome }).chrome.i18n = {
      getUILanguage: () => 'zh-CN',
    } as unknown as typeof chrome.i18n;
    // But the user manually saved English in a previous session
    await saveSetting('lang', 'en');
    const s = await loadSettings();
    expect(s.lang).toBe('en');
  });
});
