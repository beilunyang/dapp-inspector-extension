import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settings-store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore(s => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-light');
    const resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    root.classList.add(`theme-${resolved}`);
    if (theme !== 'system') return;
    const mm = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      root.classList.remove('theme-dark', 'theme-light');
      root.classList.add(mm.matches ? 'theme-dark' : 'theme-light');
    };
    mm.addEventListener('change', onChange);
    return () => mm.removeEventListener('change', onChange);
  }, [theme]);
  return <>{children}</>;
}
