import { useState } from 'react';
import { useT } from '@shared/stores/i18n-store';
import { useSettingsStore } from '@shared/stores/settings-store';
import { DEFAULT_SETTINGS } from '@shared/settings';
import { clearCache as clearAbiCache } from '@shared/abi/cache';
import type { AdminMsg } from '@shared/messages';
import { PageTitle, SectionTitle, Row } from '../primitives';

export function Advanced() {
  const t = useT();
  const update = useSettingsStore(s => s.update);
  const [clearText, setClearText] = useState('');

  return (
    <div>
      <PageTitle title={t('options.nav.advanced')} subtitle={t('options.advanced.sub')} />

      {/* Diagnostics grid */}
      <SectionTitle>{t('options.advanced.diagnostics')}</SectionTitle>
      <div
        className="grid gap-[10px] mb-4"
        style={{
          gridTemplateColumns: '1fr 1fr',
          padding: 12,
          background: 'rgb(var(--surface))',
          border: '1px solid rgb(var(--border-soft))',
          borderRadius: 7,
          fontSize: 11.5,
        }}
      >
        <DiagItem label={t('options.advanced.version')} value={chrome.runtime.getManifest().version} />
        <DiagItem label={t('options.advanced.engine')} value={engineLabel()} />
        <DiagItem label={t('options.advanced.injected')} value="eip-1193 · eip-6963 · block/mock/replay" />
      </div>

      {/* Danger zone: clear history */}
      <div
        className="mb-3"
        style={{
          padding: 14,
          borderRadius: 8,
          border: '1px solid color-mix(in oklab, rgb(var(--red)) 35%, transparent)',
          background: 'color-mix(in oklab, rgb(var(--red)) 6%, rgb(var(--surface)))',
        }}
      >
        <div className="text-[13px] font-semibold mb-[2px]">{t('options.advanced.clearHistory')}</div>
        <div className="text-[11.5px] mb-[10px]" style={{ color: 'rgb(var(--fg-muted))' }}>
          {t('options.advanced.clearHistoryHint')}
        </div>
        <div className="flex items-center gap-2">
          <input
            value={clearText}
            onChange={e => setClearText(e.target.value)}
            placeholder={t('options.advanced.clearHistoryConfirm')}
            className="mono"
            style={{
              height: 28,
              padding: '0 10px',
              fontSize: 12,
              background: 'rgb(var(--bg))',
              border: '1px solid rgb(var(--border))',
              borderRadius: 6,
              color: 'rgb(var(--fg))',
              outline: 'none',
              flex: 1,
              maxWidth: 240,
            }}
          />
          <button
            disabled={clearText !== 'CLEAR'}
            onClick={async () => {
              const msg: AdminMsg = { source: 'dappinsp-admin', kind: 'clear-all' };
              await chrome.runtime.sendMessage(msg);
              setClearText('');
            }}
            className="btn"
            style={{
              background: clearText === 'CLEAR' ? 'rgb(var(--red))' : undefined,
              color: clearText === 'CLEAR' ? '#fff' : undefined,
              borderColor: clearText === 'CLEAR' ? 'rgb(var(--red))' : undefined,
            }}
          >
            {t('common.confirm')}
          </button>
        </div>
      </div>

      <Row
        title={t('options.advanced.clearAbiCache')}
        desc={t('options.advanced.clearAbiCacheHint')}
        control={
          <button onClick={() => void clearAbiCache()} className="btn">
            {t('common.confirm')}
          </button>
        }
      />

      <Row
        title={t('options.advanced.resetSettings')}
        desc={t('options.advanced.resetSettingsHint')}
        control={
          <button onClick={() => update(DEFAULT_SETTINGS)} className="btn">
            {t('common.confirm')}
          </button>
        }
      />
    </div>
  );
}

function DiagItem({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div>
      <div
        className="uppercase mb-[3px] text-[10px] font-semibold"
        style={{ color: 'rgb(var(--fg-dim))', letterSpacing: 0.5 }}
      >
        {label}
      </div>
      <div className="mono text-[11.5px] flex items-center gap-[5px]" style={{ color: 'rgb(var(--fg))' }}>
        {ok && <span className="dot" style={{ color: 'rgb(var(--green))' }} />}
        {value}
      </div>
    </div>
  );
}

function engineLabel(): string {
  const m = /Chrome\/(\d+)/.exec(navigator.userAgent);
  return m ? `Chromium ${m[1]}` : 'Unknown';
}
