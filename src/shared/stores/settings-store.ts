import { create } from 'zustand';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../settings';
import type { Settings } from '../types';
import { SETTINGS_KEY } from '../settings';

interface SettingsStore extends Settings {
  update(partial: Partial<Settings>): Promise<void>;
  hydrate(): Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,
  async update(partial) {
    set({ ...get(), ...partial });
    await saveSettings(partial);
  },
  async hydrate() {
    const s = await loadSettings();
    set({ ...get(), ...s });
  },
}));

// Cross-UI sync
if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (!changes[SETTINGS_KEY]) return;
    const v = changes[SETTINGS_KEY].newValue as Partial<Settings> | undefined;
    if (v) useSettingsStore.setState({ ...DEFAULT_SETTINGS, ...v });
  });
}

// Auto-hydrate on import (runs once per UI load)
// Only hydrate if chrome.storage is available
if (typeof chrome !== 'undefined' && chrome.storage) {
  void useSettingsStore.getState().hydrate();
}
