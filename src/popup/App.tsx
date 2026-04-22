import { useEffect, useMemo, useState } from 'react';
import { useBackgroundPort } from '@shared/ui/useBackgroundPort';
import type { PopupPush, PopupReq } from '@shared/messages';
import type { CapturedCall, TabProvenance } from '@shared/types';
import { usePopupStore } from './stores/popup-store';
import { useSettingsStore } from '@shared/stores/settings-store';
import { useT } from '@shared/stores/i18n-store';
import { Mascot } from '@shared/ui/Mascot';
import { Icon } from '@shared/ui/Icon';

const APP_VERSION = chrome.runtime?.getManifest?.()?.version ?? '0.1.0';

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

  const detected = !!provenance?.hasDapp;
  const mood: 'happy' | 'neutral' | 'warn' = monitoring ? (detected ? 'happy' : 'neutral') : 'warn';

  return (
    <div
      className="ui h-full flex flex-col overflow-hidden text-[13px]"
      style={{ background: 'rgb(var(--bg))', color: 'rgb(var(--fg))' }}
    >
      {/* Header */}
      <div
        className="px-4 py-[14px] flex items-center gap-[10px]"
        style={{ borderBottom: '1px solid rgb(var(--border-soft))' }}
      >
        <Mascot size={26} mood={mood} />
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold" style={{ letterSpacing: -0.1 }}>
            {t('popup.title')}
          </div>
          <div className="text-[10.5px]" style={{ color: 'rgb(var(--fg-dim))' }}>v{APP_VERSION}</div>
        </div>
        <button
          className="btn icon ghost"
          title={t('panel.toolbar.settings')}
          onClick={() => chrome.runtime.openOptionsPage()}
        >
          <Icon name="settings" size={13} />
        </button>
      </div>

      {/* Monitoring toggle card */}
      <div className="px-[14px] pt-3">
        <div
          className="p-3 flex items-center gap-3"
          style={{ borderRadius: 8, background: 'rgb(var(--surface))', border: '1px solid rgb(var(--border-soft))' }}
        >
          <div className="flex-1">
            <div className="text-[13px] font-medium">{t('popup.monitoring')}</div>
            <div className="text-[11px] mt-[2px]" style={{ color: 'rgb(var(--fg-muted))' }}>
              {monitoring
                ? t(`popup.variants.${detected ? 'active' : 'noDapp'}.hint`)
                : t('popup.variants.off.hint')}
            </div>
          </div>
          <Toggle value={monitoring} onChange={(v) => updateSettings({ monitoring: v })} />
        </div>
      </div>

      {/* Current tab status */}
      <div className="px-[14px] pt-[14px]">
        <SectionTitle>{t('popup.currentTab')}</SectionTitle>
        {detected && provenance
          ? <TabDetected prov={provenance} />
          : <TabNoDapp label={t('popup.variants.noDapp.heading')} hint={t('popup.variants.noDapp.hint')} />
        }
      </div>

      {/* Recent activity */}
      {detected && monitoring && recent.length > 0 && (
        <div className="px-[14px] pt-3">
          <div className="flex items-center gap-[6px] mb-2">
            <SectionTitle>{t('popup.recent')}</SectionTitle>
            <div className="flex-1" />
            <span className="mono text-[10px]" style={{ color: 'rgb(var(--fg-dim))' }}>
              {t('popup.calls120', { n: recent.length })}
            </span>
          </div>
          <SparkLine calls={recent} />
          {recent[0] && (
            <div
              className="flex justify-between mt-2 text-[10.5px]"
              style={{ color: 'rgb(var(--fg-muted))' }}
            >
              <span>
                {t('popup.last')}{' '}
                <span className="mono" style={{ color: 'rgb(var(--fg))' }}>{recent[0].method}</span>
              </span>
              <span className="mono" style={{ color: 'rgb(var(--fg-dim))' }}>
                {t('popup.agoS', { n: Math.max(1, Math.round((Date.now() - recent[0].startedAt) / 1000)) })}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex-1" />

      {/* Footer */}
      <div
        className="px-[14px] py-3 flex gap-2"
        style={{ borderTop: '1px solid rgb(var(--border-soft))' }}
      >
        <button
          className="btn"
          style={{ flex: 1, justifyContent: 'center', height: 32 }}
          onClick={() => tabId != null && chrome.tabs.create({ url: chrome.runtime.getURL('src/inspector/inspector.html') + `?tabId=${tabId}` })}
        >
          <Icon name="link" size={13} /> {t('popup.openFull')}
        </button>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="uppercase mb-2 text-[9.5px] font-semibold"
      style={{ color: 'rgb(var(--fg-dim))', letterSpacing: 0.8 }}
    >
      {children}
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      role="switch"
      aria-checked={value}
      tabIndex={0}
      className="cursor-pointer"
      style={{
        width: 34, height: 20, borderRadius: 10,
        background: value ? 'rgb(var(--accent))' : 'rgb(var(--surface-hi))',
        border: `1px solid ${value ? 'rgb(var(--accent))' : 'rgb(var(--border))'}`,
        position: 'relative',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <div
        style={{
          position: 'absolute', top: 1, left: value ? 15 : 1,
          width: 16, height: 16, borderRadius: '50%',
          background: value ? 'rgb(var(--accent-fg))' : 'rgb(var(--fg-muted))',
          transition: 'left 0.15s',
        }}
      />
    </div>
  );
}

function TabDetected({ prov }: { prov: TabProvenance }) {
  const t = useT();
  const wallet = prov.wallets[0];
  const host = safeHost(prov.origin || prov.url);
  return (
    <div
      className="p-3"
      style={{ borderRadius: 8, background: 'rgb(var(--surface))', border: '1px solid rgb(var(--border-soft))' }}
    >
      <div className="flex items-center gap-2 mb-[10px]">
        <div style={{
          width: 20, height: 20, borderRadius: 4, flexShrink: 0,
          background: 'linear-gradient(135deg, rgb(var(--accent)), rgb(var(--accent-2)))',
        }} />
        <div className="flex-1 min-w-0">
          <div className="mono text-[12px] font-medium truncate">{host || '—'}</div>
          <div className="text-[10.5px]" style={{ color: 'rgb(var(--fg-muted))' }}>{t('popup.detected')}</div>
        </div>
        <span className="dot" style={{ color: 'rgb(var(--green))' }} />
      </div>
      <div
        className="grid gap-2 pt-[10px]"
        style={{ gridTemplateColumns: '1fr 1fr', borderTop: '1px solid rgb(var(--border-soft))' }}
      >
        <StatCell icon="wallet" label={t('popup.provider')} value={wallet?.name ?? '—'} />
        <StatCell icon="cpu" label={t('popup.chain')} value={prov.chainId ?? '—'} />
      </div>
    </div>
  );
}

function StatCell({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div>
      <div
        className="flex items-center gap-[5px] uppercase text-[10px] mb-[3px]"
        style={{ color: 'rgb(var(--fg-dim))', letterSpacing: 0.5 }}
      >
        <Icon name={icon} size={10} /> {label}
      </div>
      <div className="mono truncate text-[11.5px]" style={{ color: 'rgb(var(--fg))' }}>
        {value}
      </div>
    </div>
  );
}

function TabNoDapp({ label, hint }: { label: string; hint: string }) {
  return (
    <div
      className="p-[14px] text-center"
      style={{ borderRadius: 8, background: 'rgb(var(--surface))', border: '1px dashed rgb(var(--border))' }}
    >
      <div
        className="inline-flex items-center justify-center mb-2"
        style={{ width: 32, height: 32, borderRadius: 8, background: 'rgb(var(--surface-2))', color: 'rgb(var(--fg-dim))' }}
      >
        <Icon name="globe" size={15} />
      </div>
      <div className="text-[12.5px] font-medium mb-[2px]">{label}</div>
      <div className="text-[11px]" style={{ color: 'rgb(var(--fg-muted))' }}>{hint}</div>
    </div>
  );
}

function SparkLine({ calls }: { calls: CapturedCall[] }) {
  const vals = useMemo(() => {
    const now = Date.now();
    const bars = new Array(30).fill(0) as number[];
    for (const c of calls) {
      const dt = Math.floor((now - c.startedAt) / 4000);
      if (dt < 0 || dt >= 30) continue;
      bars[29 - dt]++;
    }
    return bars;
  }, [calls]);
  const max = Math.max(1, ...vals);
  return (
    <div
      className="flex items-end gap-[2px] p-2"
      style={{
        height: 38, borderRadius: 6,
        background: 'rgb(var(--surface))',
        border: '1px solid rgb(var(--border-soft))',
      }}
    >
      {vals.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${Math.max(6, (v / max) * 100)}%`,
            background: v === 0 ? 'rgb(var(--border))' : 'rgb(var(--accent))',
            opacity: v === 0 ? 0.5 : 0.85,
            borderRadius: 1,
          }}
        />
      ))}
    </div>
  );
}

function safeHost(url: string): string {
  try { return new URL(url).host; } catch { return url; }
}
