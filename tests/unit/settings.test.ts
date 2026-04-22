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
});
