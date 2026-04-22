import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settings-store';
import { applyAccent } from '../accents';

function resolveTheme(theme: 'system' | 'dark' | 'light'): 'dark' | 'light' {
  if (theme !== 'system') return theme;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore(s => s.theme);
  const accent = useSettingsStore(s => s.accent);

  useEffect(() => {
    const root = document.documentElement;

    const apply = (resolved: 'dark' | 'light') => {
      root.classList.remove('theme-dark', 'theme-light');
      root.classList.add(`theme-${resolved}`);
      applyAccent(accent, resolved);
    };

    apply(resolveTheme(theme));

    if (theme !== 'system') return;
    const mm = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => apply(mm.matches ? 'dark' : 'light');
    mm.addEventListener('change', onChange);
    return () => mm.removeEventListener('change', onChange);
  }, [theme, accent]);

  return <>{children}</>;
}
