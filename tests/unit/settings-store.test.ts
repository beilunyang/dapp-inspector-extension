import { describe, it, expect, beforeEach } from 'vitest';
import { installChromeStorageMock } from '../mocks/chrome-storage';
import { useSettingsStore } from '@shared/stores/settings-store';
import { DEFAULT_SETTINGS } from '@shared/settings';

describe('settings-store', () => {
  beforeEach(() => {
    installChromeStorageMock();
    useSettingsStore.setState(DEFAULT_SETTINGS);
  });

  it('starts at defaults', () => {
    expect(useSettingsStore.getState().theme).toBe(DEFAULT_SETTINGS.theme);
  });

  it('update() persists to chrome.storage', async () => {
    await useSettingsStore.getState().update({ theme: 'dark' });
    const got = await chrome.storage.local.get('dapp-inspector:settings');
    expect(got['dapp-inspector:settings'].theme).toBe('dark');
    expect(useSettingsStore.getState().theme).toBe('dark');
  });
});
