import { useCapturesStore } from './stores/captures-store';
import { useViewStore } from './stores/view-store';
import { useSettingsStore } from '@shared/stores/settings-store';
import { useT } from '@shared/stores/i18n-store';
import { Icon } from '@shared/ui/Icon';

export function Toolbar({ onClear }: { onClear: () => void }) {
  const t = useT();
  const monitoring = useSettingsStore(s => s.monitoring);
  const update = useSettingsStore(s => s.update);
  const count = useCapturesStore(s => s.calls.length);
  const search = useViewStore(s => s.search);
  const setSearch = useViewStore(s => s.setSearch);

  return (
    <div
      className="flex items-center gap-[6px] h-10 px-[10px] flex-shrink-0"
      style={{
        background: 'rgb(var(--surface))',
        borderBottom: '1px solid rgb(var(--border))',
      }}
    >
      <button
        className="btn icon ghost"
        title={monitoring ? t('panel.toolbar.pause') : t('panel.toolbar.record')}
        onClick={() => update({ monitoring: !monitoring })}
        style={{ color: monitoring ? 'rgb(var(--red))' : 'rgb(var(--fg-muted))' }}
      >
        <span className="dot" style={{ width: 8, height: 8 }} />
      </button>
      <button className="btn icon ghost" title={t('panel.toolbar.clear')} onClick={onClear}>
        <Icon name="clear" size={14} />
      </button>
      <button className="btn icon ghost" title={t('panel.toolbar.export')} disabled>
        <Icon name="download" size={14} />
      </button>
      <div style={{ width: 1, height: 18, background: 'rgb(var(--border))', margin: '0 4px' }} />

      <div
        className="flex items-center gap-2 flex-1 h-[26px] px-[10px]"
        style={{
          maxWidth: 420,
          background: 'rgb(var(--bg))',
          border: '1px solid rgb(var(--border))',
          borderRadius: 6,
          color: 'rgb(var(--fg-muted))',
        }}
      >
        <Icon name="search" size={13} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('panel.toolbar.search')}
          className="flex-1 bg-transparent border-0 outline-none"
          style={{ color: 'rgb(var(--fg))', font: '400 12.5px/1 Inter Tight, sans-serif' }}
        />
        <span className="kbd">⌘F</span>
      </div>

      <div className="flex-1" />

      <div className="mono text-[11.5px]" style={{ color: 'rgb(var(--fg-dim))' }}>
        {t('panel.count', { n: count })}
      </div>
      <div style={{ width: 1, height: 18, background: 'rgb(var(--border))', margin: '0 4px' }} />
      <button
        className="btn icon ghost"
        title={t('panel.toolbar.settings')}
        onClick={() => chrome.runtime.openOptionsPage()}
      >
        <Icon name="settings" size={14} />
      </button>
    </div>
  );
}
