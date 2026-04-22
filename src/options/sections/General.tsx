import { useT } from '@shared/stores/i18n-store';
import { useSettingsStore } from '@shared/stores/settings-store';
import type { Theme, Lang } from '@shared/types';

const THEMES: Theme[] = ['system', 'light', 'dark'];
const LANGS: Lang[] = ['en', 'zh'];

export function General() {
  const t = useT();
  const theme = useSettingsStore(s => s.theme);
  const lang = useSettingsStore(s => s.lang);
  const update = useSettingsStore(s => s.update);
  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">{t('options.nav.general')}</h1>

      <div>
        <div className="text-sm mb-2">{t('options.general.theme')}</div>
        <div className="flex gap-3">
          {THEMES.map(v => (
            <button key={v} onClick={() => update({ theme: v })}
              className={`w-28 h-20 rounded border flex items-end justify-center pb-2 text-xs ${theme === v ? 'border-accent' : 'border-border text-muted'}`}>
              {t(`options.general.theme${v[0].toUpperCase()}${v.slice(1)}` as any)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-sm mb-2">{t('options.general.lang')}</div>
        <div className="flex gap-2">
          {LANGS.map(v => (
            <button key={v} onClick={() => update({ lang: v })}
              className={`px-3 h-8 rounded border text-xs ${lang === v ? 'border-accent' : 'border-border text-muted'}`}>
              {v === 'en' ? 'English' : '中文'}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
