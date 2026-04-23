// Single source of truth for the About → Changelog list.
// Add a NEW entry at the top each release; the first entry's `version`
// must match package.json / manifest.json (asserted at runtime in dev).

export interface ChangelogEntry {
  version: string;
  date: string;   // ISO (YYYY-MM-DD)
  en: string;
  zh: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.1.0',
    date: '2026-04-22',
    en: 'Initial P0 release: DevTools panel, Popup, Options.',
    zh: '初始 P0 发布：DevTools 面板、Popup、设置页。',
  },
];
