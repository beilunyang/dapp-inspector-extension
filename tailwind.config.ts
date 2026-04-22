import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:        'rgb(var(--bg) / <alpha-value>)',
        surface:   'rgb(var(--surface) / <alpha-value>)',
        elevated:  'rgb(var(--elevated) / <alpha-value>)',
        border:    'rgb(var(--border) / <alpha-value>)',
        fg:        'rgb(var(--fg) / <alpha-value>)',
        muted:     'rgb(var(--muted) / <alpha-value>)',
        accent:    'rgb(var(--accent) / <alpha-value>)',
        'accent-fg': 'rgb(var(--accent-fg) / <alpha-value>)',
        kind: {
          read:      'rgb(var(--kind-read) / <alpha-value>)',
          write:     'rgb(var(--kind-write) / <alpha-value>)',
          sign:      'rgb(var(--kind-sign) / <alpha-value>)',
          subscribe: 'rgb(var(--kind-subscribe) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter Tight', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '6px',
        lg: '8px',
      },
    },
  },
  plugins: [],
} satisfies Config;
