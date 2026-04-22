import { useSettingsStore } from './settings-store';
import { t as translate } from '../i18n';

export function useT() {
  const lang = useSettingsStore(s => s.lang);
  return (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars);
}

export function useLang() {
  return useSettingsStore(s => s.lang);
}
