import { useState } from 'react';
import { Icon } from '@shared/ui/Icon';
import type { CapturedCall, CallStatus } from '@shared/types';
import { useT } from '@shared/stores/i18n-store';
import { ReplayDialog } from './ReplayDialog';

const STATUS_COLOR: Record<CallStatus | 'mocked', string> = {
  ok:      'rgb(var(--green))',
  error:   'rgb(var(--red))',
  pending: 'rgb(var(--accent))',
  mocked:  'rgb(var(--violet))',
};

export function DetailHeader({ call }: { call: CapturedCall }) {
  const t = useT();
  const host = safeHost(call.origin);
  const [showReplay, setShowReplay] = useState(false);
  return (
    <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgb(var(--border-soft))' }}>
      <div className="flex items-center gap-[10px] mb-[10px]">
        <span
          className="mono"
          style={{ fontSize: 18, fontWeight: 600, color: 'rgb(var(--fg))', letterSpacing: -0.2 }}
        >
          {call.method}
        </span>
        <StatusBadge status={call.status} />
        <div className="flex-1" />
        <button
          className="btn ghost"
          style={{ fontSize: 12 }}
          onClick={() => setShowReplay(true)}
          title={t('panel.detail.replay')}
        >
          <Icon name="replay" size={12} /> {t('panel.detail.replay')}
        </button>
        <DisabledBtn icon="mock" label={t('panel.detail.mock')} />
        <DisabledBtn icon="block" label={t('panel.detail.block')} />
        <button className="btn icon ghost" title="More actions" disabled>
          <Icon name="dot3" size={12} />
        </button>
      </div>
      {showReplay && (
        <ReplayDialog call={call} tabId={call.tabId} onClose={() => setShowReplay(false)} />
      )}
      <div
        className="flex items-center flex-wrap"
        style={{ gap: 14, fontSize: 11.5, color: 'rgb(var(--fg-muted))' }}
      >
        <span className="inline-flex items-center gap-[5px]">
          <Icon name="globe" size={12} />
          <span className="mono">{host || '—'}</span>
        </span>
        <span className="inline-flex items-center gap-[5px]">
          <Icon name="wallet" size={12} /> {call.providerInfo?.name || '—'}
        </span>
        {call.chainId && (
          <span className="inline-flex items-center gap-[5px]">
            <Icon name="cpu" size={12} /> Chain <span className="mono">{call.chainId}</span>
          </span>
        )}
        <span className="inline-flex items-center gap-[5px] mono">
          {new Date(call.startedAt).toISOString().slice(11, 19)}
        </span>
        {call.durationMs != null && (
          <span className="inline-flex items-center gap-[5px]">
            <Icon name="bolt" size={12} />
            <span className="mono">{call.durationMs.toFixed(1)}ms</span>
          </span>
        )}
        <div className="flex-1" />
        <span className="mono" style={{ fontSize: 10.5, color: 'rgb(var(--fg-dim))' }}>
          #{call.id.slice(0, 6)}
        </span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: CallStatus }) {
  const color = STATUS_COLOR[status] ?? STATUS_COLOR.ok;
  const label = status.toUpperCase();
  return (
    <span
      className="mono inline-flex items-center gap-[5px]"
      style={{
        padding: '2px 7px',
        borderRadius: 3,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: 0.5,
        color,
        background: `color-mix(in oklab, ${color} 14%, transparent)`,
        border: `1px solid color-mix(in oklab, ${color} 30%, transparent)`,
      }}
    >
      <span className="dot" style={{ width: 5, height: 5, color }} />
      {label}
    </span>
  );
}

function DisabledBtn({ icon, label }: { icon: string; label: string }) {
  const t = useT();
  return (
    <button
      className="btn ghost"
      disabled
      title={t('panel.detail.disabledHint')}
      style={{ fontSize: 12 }}
    >
      <Icon name={icon} size={12} /> {label}
    </button>
  );
}

function safeHost(url: string): string {
  try { return new URL(url).host; } catch { return url; }
}
