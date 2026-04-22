import { useEffect, useState } from 'react';
import { useBackgroundPort } from '@shared/ui/useBackgroundPort';
import type { PopupPush, PopupReq } from '@shared/messages';
import { usePopupStore } from './stores/popup-store';
import { useSettingsStore } from '@shared/stores/settings-store';
import { useT } from '@shared/stores/i18n-store';
import { Mascot } from '@shared/ui/Mascot';
import { Kind } from '@shared/ui/Kind';

export function App() {
  const t = useT();
  const [tabId, setTabId] = useState<number | null>(null);
  const apply = usePopupStore(s => s.apply);
  const provenance = usePopupStore(s => s.provenance);
  const recent = usePopupStore(s => s.recent);
  const monitoring = useSettingsStore(s => s.monitoring);
  const updateSettings = useSettingsStore(s => s.update);

  const { send } = useBackgroundPort<PopupPush, PopupReq>('popup', apply);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
      if (tab?.id != null) { setTabId(tab.id); send({ kind: 'subscribe', tabId: tab.id }); }
    });
  }, [send]);

  const variant = !provenance?.hasDapp ? 'noDapp' : !monitoring ? 'off' : 'active';
  const mood = variant === 'active' ? 'happy' : variant === 'off' ? 'neutral' : 'warn';

  return (
    <div className="h-full flex flex-col bg-bg text-fg">
      <header className="flex items-center gap-3 px-4 pt-4">
        <Mascot size={36} mood={mood} />
        <div>
          <div className="text-sm font-semibold">{t('popup.title')}</div>
          <div className="text-[11px] text-muted">{t(`popup.variants.${variant}.heading`)}</div>
        </div>
        <div className="flex-1" />
        <label className="inline-flex items-center gap-2 text-xs cursor-pointer select-none">
          <input type="checkbox" checked={monitoring} onChange={e => updateSettings({ monitoring: e.target.checked })} />
          {t('popup.monitoring')}
        </label>
      </header>
      <div className="px-4 pt-3 text-xs text-muted">{t(`popup.variants.${variant}.hint`)}</div>
      {provenance && (
        <section className="px-4 pt-4">
          <div className="text-[11px] uppercase tracking-wide text-muted mb-1">{provenance.origin || '—'}</div>
          <div className="flex items-center gap-2 text-xs">
            {provenance.wallets.map((w, i) => (
              <span key={i} className="px-1.5 h-5 inline-flex items-center rounded border border-border">{w.name}</span>
            ))}
            {provenance.chainId && <span className="text-muted">chain: {provenance.chainId}</span>}
          </div>
        </section>
      )}
      <section className="flex-1 min-h-0 mt-4 px-2 overflow-auto">
        <div className="px-2 text-[11px] uppercase tracking-wide text-muted mb-1">{t('popup.recent')}</div>
        {recent.length === 0 ? (
          <div className="text-xs text-muted px-2">—</div>
        ) : recent.map(c => (
          <div key={c.id} className="flex items-center gap-2 h-9 px-2 text-xs rounded hover:bg-surface">
            <Kind kind={c.kind} />
            <span className="flex-1 truncate font-mono">{c.method}</span>
            {c.durationMs != null && <span className="text-muted">{Math.round(c.durationMs)}ms</span>}
          </div>
        ))}
      </section>
      <footer className="p-3 border-t border-border">
        <button
          onClick={() => tabId != null && chrome.tabs.create({ url: chrome.runtime.getURL('src/inspector/inspector.html') + `?tabId=${tabId}` })}
          className="w-full h-9 text-xs bg-accent text-accent-fg rounded"
        >
          {t('popup.openFull')}
        </button>
      </footer>
    </div>
  );
}
