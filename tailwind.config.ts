import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:           'rgb(var(--bg) / <alpha-value>)',
        surface:      'rgb(var(--surface) / <alpha-value>)',
        'surface-2':  'rgb(var(--surface-2) / <alpha-value>)',
        'surface-hi': 'rgb(var(--surface-hi) / <alpha-value>)',
        border:       'rgb(var(--border) / <alpha-value>)',
        'border-soft':'rgb(var(--border-soft) / <alpha-value>)',
        fg:           'rgb(var(--fg) / <alpha-value>)',
        'fg-muted':   'rgb(var(--fg-muted) / <alpha-value>)',
        'fg-dim':     'rgb(var(--fg-dim) / <alpha-value>)',
        accent:       'rgb(var(--accent) / <alpha-value>)',
        'accent-2':   'rgb(var(--accent-2) / <alpha-value>)',
        'accent-fg':  'rgb(var(--accent-fg) / <alpha-value>)',
        amber:        'rgb(var(--amber) / <alpha-value>)',
        violet:       'rgb(var(--violet) / <alpha-value>)',
        red:          'rgb(var(--red) / <alpha-value>)',
        green:        'rgb(var(--green) / <alpha-value>)',
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
