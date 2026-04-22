// Accent palette — five options matching the prototype's Tweaks panel.
// Values are sRGB channel triplets ("R G B") so they slot into
// tokens.css's `rgb(var(--accent) / <alpha>)` consumers.

import type { Settings } from './types';

export type AccentId = Settings['accent'];

interface AccentPalette {
  /** Accent base in dark themes (lighter/brighter). */
  dark: string;
  /** Accent base in light themes (more saturated/darker). */
  light: string;
  /** Secondary accent used for gradients / mascot body stop. */
  dark2: string;
  light2: string;
  /** Text/icon color on top of the accent fill. */
  darkFg: string;
  lightFg: string;
  /** Display name (en/zh) for the Options picker. */
  label: { en: string; zh: string };
}

export const ACCENTS: Record<AccentId, AccentPalette> = {
  cyan: {
    dark:     '128 212 231',
    light:    '53 149 181',
    dark2:    '155 147 246',
    light2:   '125 101 207',
    darkFg:   '36 46 52',
    lightFg:  '253 253 253',
    label:    { en: 'Cyan',   zh: '青色' },
  },
  violet: {
    dark:     '200 145 226',
    light:    '139 92 206',
    dark2:    '155 147 246',
    light2:   '125 101 207',
    darkFg:   '36 34 46',
    lightFg:  '253 253 253',
    label:    { en: 'Violet', zh: '紫色' },
  },
  green: {
    dark:     '112 205 150',
    light:    '42 147 96',
    dark2:    '128 212 231',
    light2:   '53 149 181',
    darkFg:   '32 44 36',
    lightFg:  '253 253 253',
    label:    { en: 'Green',  zh: '绿色' },
  },
  amber: {
    dark:     '224 180 91',
    light:    '176 119 30',
    dark2:    '231 134 99',
    light2:   '196 92 64',
    darkFg:   '44 34 18',
    lightFg:  '253 253 253',
    label:    { en: 'Amber',  zh: '琥珀' },
  },
  indigo: {
    dark:     '155 147 246',
    light:    '99 82 199',
    dark2:    '200 145 226',
    light2:   '139 92 206',
    darkFg:   '240 240 255',
    lightFg:  '253 253 253',
    label:    { en: 'Indigo', zh: '靛蓝' },
  },
};

export function applyAccent(accent: AccentId, theme: 'dark' | 'light'): void {
  const p = ACCENTS[accent] ?? ACCENTS.cyan;
  const root = document.documentElement;
  if (theme === 'dark') {
    root.style.setProperty('--accent',    p.dark);
    root.style.setProperty('--accent-2',  p.dark2);
    root.style.setProperty('--accent-fg', p.darkFg);
  } else {
    root.style.setProperty('--accent',    p.light);
    root.style.setProperty('--accent-2',  p.light2);
    root.style.setProperty('--accent-fg', p.lightFg);
  }
}

export const ACCENT_ORDER: AccentId[] = ['cyan', 'violet', 'green', 'amber', 'indigo'];
