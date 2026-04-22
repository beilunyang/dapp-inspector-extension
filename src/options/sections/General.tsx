import { useT } from '@shared/stores/i18n-store';
import { useSettingsStore } from '@shared/stores/settings-store';
import type { Theme, Lang } from '@shared/types';
import { Icon } from '@shared/ui/Icon';
import { ACCENTS, ACCENT_ORDER } from '@shared/accents';
import { PageTitle, SectionTitle, Row, MiniToggle } from '../primitives';

const THEMES: { id: Theme; labelKey: string; bgA: string; bgB: string }[] = [
  { id: 'system', labelKey: 'options.general.themeSystem', bgA: '#ffffff', bgB: '#1a1a1a' },
  { id: 'light',  labelKey: 'options.general.themeLight',  bgA: '#ffffff', bgB: '#f3f3f3' },
  { id: 'dark',   labelKey: 'options.general.themeDark',   bgA: '#1e1e20', bgB: '#1e1e20' },
];

const LANGS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'zh', label: '中文' },
];

export function General() {
  const t = useT();
  const theme = useSettingsStore(s => s.theme);
  const lang = useSettingsStore(s => s.lang);
  const accent = useSettingsStore(s => s.accent);
  const monitoring = useSettingsStore(s => s.monitoring);
  const update = useSettingsStore(s => s.update);

  return (
    <div>
      <PageTitle title={t('options.nav.general')} subtitle={t('options.general.sub')} />

      <SectionTitle>{t('options.general.theme')}</SectionTitle>
      <div className="grid gap-[10px] mb-[6px]" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {THEMES.map(tm => {
          const isActive = theme === tm.id;
          return (
            <div
              key={tm.id}
              onClick={() => update({ theme: tm.id })}
              className="cursor-pointer"
              style={{
                borderRadius: 8,
                padding: 8,
                border: isActive ? '2px solid rgb(var(--accent))' : '2px solid rgb(var(--border))',
                background: 'rgb(var(--surface))',
              }}
            >
              <div
                className="flex overflow-hidden"
                style={{ height: 60, borderRadius: 5, border: '1px solid rgb(var(--border-soft))' }}
              >
                <div className="flex-1 flex flex-col p-[5px] gap-[3px]" style={{ background: tm.bgA }}>
                  <div style={{ height: 4, background: tm.id === 'dark' ? '#333' : '#ddd', width: '80%' }} />
                  <div style={{ height: 3, background: tm.id === 'dark' ? '#2a2a2a' : '#eaeaea', width: '60%' }} />
                  <div style={{ height: 3, background: tm.id === 'dark' ? '#2a2a2a' : '#eaeaea', width: '70%' }} />
                </div>
                {tm.id === 'system' && (
                  <div className="flex-1 p-[5px]" style={{ background: tm.bgB }}>
                    <div style={{ height: 4, background: '#444', width: '80%' }} />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-[5px] mt-[6px] text-[12px] font-medium">
                {isActive && <Icon name="check" size={11} style={{ color: 'rgb(var(--accent))' }} />}
                {t(tm.labelKey)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="text-[11.5px] mb-5" style={{ color: 'rgb(var(--fg-muted))' }}>
        {t('options.general.themeHint')}
      </div>

      <SectionTitle>{t('options.general.accent')}</SectionTitle>
      <div className="flex items-center gap-[10px] mb-[6px]">
        {ACCENT_ORDER.map(id => {
          const p = ACCENTS[id];
          const swatch = theme === 'light' ? p.light : p.dark;
          const isActive = accent === id;
          return (
            <button
              key={id}
              onClick={() => update({ accent: id })}
              title={p.label[lang]}
              aria-label={p.label[lang]}
              aria-pressed={isActive}
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: `rgb(${swatch})`,
                border: isActive ? '2px solid rgb(var(--fg))' : '2px solid transparent',
                boxShadow: isActive ? '0 0 0 1px rgb(var(--surface))' : 'none',
                cursor: 'pointer',
                padding: 0,
              }}
            />
          );
        })}
        <span className="text-[12px] ml-2" style={{ color: 'rgb(var(--fg-muted))' }}>
          {ACCENTS[accent].label[lang]}
        </span>
      </div>
      <div className="text-[11.5px] mb-5" style={{ color: 'rgb(var(--fg-muted))' }}>
        {t('options.general.accentHint')}
      </div>

      <Row
        title={t('options.general.monByDefault')}
        desc={t('options.general.monByDefaultDesc')}
        control={<MiniToggle value={monitoring} onChange={(v) => update({ monitoring: v })} />}
      />

      <Row
        title={t('options.general.badge')}
        desc={t('options.general.badgeDesc')}
        control={<MiniToggle value={true} />}
      />

      <Row
        title={t('options.general.shortcut')}
        desc={t('options.general.shortcutDesc')}
        control={
          <div className="flex gap-1">
            <span className="kbd">⌥</span>
            <span className="kbd">⌘</span>
            <span className="kbd">D</span>
          </div>
        }
      />

      <Row
        title={t('options.general.lang')}
        control={
          <div className="flex gap-2">
            {LANGS.map(v => (
              <button
                key={v.id}
                onClick={() => update({ lang: v.id })}
                className={lang === v.id ? 'btn accent' : 'btn'}
                style={{ fontSize: 12 }}
              >
                {v.label}
              </button>
            ))}
          </div>
        }
      />
    </div>
  );
}
