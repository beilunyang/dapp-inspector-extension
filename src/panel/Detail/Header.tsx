import { useState } from 'react';
import { Icon } from '@shared/ui/Icon';
import type { CapturedCall, CallStatus } from '@shared/types';
import { useT } from '@shared/stores/i18n-store';
import { useChainName, chainTitle, fmtChain } from '@shared/chains';
import { ReplayDialog } from './ReplayDialog';
import { BlockDialog } from './BlockDialog';
import { MockDialog } from './MockDialog';
import { CopyMenu } from './CopyMenu';

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
  const [showBlock, setShowBlock] = useState(false);
  const [showMock, setShowMock] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  return (
    <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid rgb(var(--border-soft))' }}>
      <div className="flex items-center gap-[10px] mb-[10px]">
        <span
          className="mono"
          style={{ fontSize: 18, fontWeight: 600, color: 'rgb(var(--fg))', letterSpacing: -0.2 }}
        >
          {call.method}
        </span>
        <StatusBadge status={call.status} mocked={call.mocked} />
        <div className="flex-1" />
        <button
          className="btn ghost"
          style={{ fontSize: 12 }}
          onClick={() => setShowReplay(true)}
          title={t('panel.detail.replay')}
        >
          <Icon name="replay" size={12} /> {t('panel.detail.replay')}
        </button>
        <button
          className="btn ghost"
          style={{ fontSize: 12 }}
          onClick={() => setShowMock(true)}
          title={t('panel.detail.mock')}
        >
          <Icon name="mock" size={12} /> {t('panel.detail.mock')}
        </button>
        <button
          className="btn ghost"
          style={{ fontSize: 12 }}
          onClick={() => setShowBlock(true)}
          title={t('panel.detail.block')}
        >
          <Icon name="block" size={12} /> {t('panel.detail.block')}
        </button>
        <div style={{ position: 'relative' }}>
          <button
            className="btn ghost"
            style={{ fontSize: 12 }}
            title={t('panel.copy.title')}
            aria-haspopup="menu"
            aria-expanded={showCopy}
            onClick={() => setShowCopy(v => !v)}
          >
            <Icon name="copy" size={12} /> {t('panel.copy.button')}
          </button>
          {showCopy && <CopyMenu call={call} onClose={() => setShowCopy(false)} />}
        </div>
      </div>
      {showReplay && (
        <ReplayDialog call={call} tabId={call.tabId} onClose={() => setShowReplay(false)} />
      )}
      {showBlock && (
        <BlockDialog call={call} onClose={() => setShowBlock(false)} />
      )}
      {showMock && (
        <MockDialog call={call} onClose={() => setShowMock(false)} />
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
          <ChainPill chainId={call.chainId} />
        )}
        <span
          className="inline-flex items-center gap-[5px] mono"
          title={new Date(call.startedAt).toISOString()}
        >
          <Icon name="clock" size={12} />
          {fmtLocalTs(call.startedAt)}
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

function StatusBadge({ status, mocked }: { status: CallStatus; mocked?: boolean }) {
  // Mocked results/errors use the violet "MOCKED" tint to distinguish them
  // from real provider activity at a glance.
  const key = mocked ? 'mocked' : status;
  const color = STATUS_COLOR[key] ?? STATUS_COLOR.ok;
  const label = mocked ? 'MOCKED' : status.toUpperCase();
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

function ChainPill({ chainId }: { chainId: string }) {
  useChainName(chainId);
  return (
    <span className="inline-flex items-center gap-[5px]" title={chainTitle(chainId)}>
      <Icon name="cpu" size={12} />
      <span className="mono">{fmtChain(chainId, 'name+hex')}</span>
    </span>
  );
}

function safeHost(url: string): string {
  try { return new URL(url).host; } catch { return url; }
}

function fmtLocalTs(ts: number): string {
  // Local-timezone YYYY-MM-DD HH:mm:ss.SSS. The title attr above
  // carries the UTC ISO string for cross-reference on hover.
  const d = new Date(ts);
  const p2 = (n: number) => String(n).padStart(2, '0');
  const p3 = (n: number) => String(n).padStart(3, '0');
  return (
    `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ` +
    `${p2(d.getHours())}:${p2(d.getMinutes())}:${p2(d.getSeconds())}.${p3(d.getMilliseconds())}`
  );
}
