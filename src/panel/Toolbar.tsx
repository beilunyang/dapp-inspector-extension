import { useCapturesStore } from './stores/captures-store';
import { useViewStore } from './stores/view-store';
import { useSettingsStore } from '@shared/stores/settings-store';
import { useT } from '@shared/stores/i18n-store';
import { Icon } from '@shared/ui/Icon';
import type { Kind } from '@shared/types';

const KINDS: Kind[] = ['read', 'write', 'sign', 'subscribe'];

export function Toolbar({ onClear }: { onClear: () => void }) {
  const t = useT();
  const monitoring = useSettingsStore(s => s.monitoring);
  const update = useSettingsStore(s => s.update);
  const count = useCapturesStore(s => s.calls.length);
  const search = useViewStore(s => s.search);
  const kinds = useViewStore(s => s.kinds);
  const setSearch = useViewStore(s => s.setSearch);
  const toggleKind = useViewStore(s => s.toggleKind);

  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-surface">
      <button
        className={`inline-flex items-center gap-2 text-xs px-2 h-7 rounded border ${monitoring ? 'border-accent text-accent' : 'border-border text-muted'}`}
        onClick={() => update({ monitoring: !monitoring })}
        aria-pressed={monitoring}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${monitoring ? 'bg-accent' : 'bg-muted'}`} />
        {t('panel.toolbar.monitoring')}
      </button>
      <div className="flex items-center h-7 px-2 rounded border border-border bg-elevated text-xs">
        <Icon name="search" size={12} />
        <input
          className="ml-2 bg-transparent outline-none w-40 placeholder:text-muted"
          placeholder={t('panel.toolbar.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-1">
        {KINDS.map(k => (
          <button key={k}
            className={`px-1.5 h-6 text-[10px] font-semibold rounded border ${kinds.has(k) ? 'border-accent text-accent' : 'border-border text-muted'}`}
            onClick={() => toggleKind(k)}
          >{k.toUpperCase().slice(0, 2)}</button>
        ))}
      </div>
      <div className="flex-1" />
      <span className="text-[11px] text-muted">{t('panel.count', { n: count })}</span>
      <button onClick={onClear} className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg" title={t('panel.toolbar.clear')}>
        <Icon name="clear" size={14} /> {t('panel.toolbar.clear')}
      </button>
      <button onClick={() => chrome.runtime.openOptionsPage()} className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg" title={t('panel.toolbar.settings')}>
        <Icon name="settings" size={14} />
      </button>
    </div>
  );
}
