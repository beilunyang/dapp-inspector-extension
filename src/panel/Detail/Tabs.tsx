import { useEffect, useMemo } from 'react';
import { useViewStore } from '../stores/view-store';
import { useT } from '@shared/stores/i18n-store';
import { JsonTree } from '@shared/ui/JsonTree';
import type { CapturedCall } from '@shared/types';
import { hasDecodableContent } from '@shared/abi/decode';
import { DecodedView } from './Decoded';

const ALL_TABS = ['decoded', 'params', 'result', 'timing', 'raw'] as const;

export function DetailTabs({ call }: { call: CapturedCall }) {
  const t = useT();
  const active = useViewStore(s => s.activeTab);
  const setTab = useViewStore(s => s.setTab);

  // Decoded tab is only shown when the call carries calldata (eth_call /
  // eth_sendTransaction / eth_signTransaction / eth_estimateGas with a
  // params[0].data). We derive this once per call to drive both the tab
  // strip and the auto-select effect below.
  const hasDecoded = useMemo(() => hasDecodableContent(call), [call]);

  const tabs = hasDecoded ? ALL_TABS : ALL_TABS.filter(n => n !== 'decoded');

  // Auto-jump to Decoded when (a) the new call has decoded content and
  // (b) the user isn't already pinned on a specific tab from this call.
  // Triggered on call.id change, not on every render — this keeps user's
  // tab choice sticky within a single call detail view.
  useEffect(() => {
    if (hasDecoded && (active === 'decoded' || active === 'params')) {
      setTab('decoded');
    } else if (!hasDecoded && active === 'decoded') {
      setTab('params');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call.id, hasDecoded]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div
        className="flex items-end"
        style={{
          gap: 2,
          padding: '0 20px',
          height: 34,
          borderBottom: '1px solid rgb(var(--border-soft))',
        }}
      >
        {tabs.map(name => {
          const isActive = active === name;
          return (
            <div
              key={name}
              onClick={() => setTab(name)}
              className="flex items-center cursor-pointer"
              style={{
                padding: '0 10px',
                height: 30,
                fontSize: 12,
                fontWeight: 500,
                color: isActive ? 'rgb(var(--fg))' : 'rgb(var(--fg-muted))',
                borderBottom: `2px solid ${isActive ? 'rgb(var(--accent))' : 'transparent'}`,
                marginBottom: -1,
              }}
            >
              {t(`panel.detail.tabs.${name}`)}
            </div>
          );
        })}
      </div>
      <div className="scroll flex-1 overflow-auto" style={{ padding: '14px 20px 20px' }}>
        {renderTab(active, call, t)}
      </div>
    </div>
  );
}

function renderTab(
  tab: typeof ALL_TABS[number],
  c: CapturedCall,
  t: (key: string, vars?: Record<string, string | number>) => string,
) {
  if (tab === 'decoded') return (
    <>
      <SectionLabel>{t('panel.detail.sec.decoded')}</SectionLabel>
      <DecodedView call={c} />
    </>
  );
  if (tab === 'params') return (
    <>
      <SectionLabel>{t('panel.detail.sec.params')}</SectionLabel>
      <JsonTree value={c.params ?? []} />
    </>
  );
  if (tab === 'result') return (
    <>
      <SectionLabel>{t('panel.detail.sec.result')}</SectionLabel>
      <JsonTree value={c.status === 'error' ? c.error : c.result} />
    </>
  );
  if (tab === 'timing') return <TimingView call={c} t={t} />;
  return (
    <>
      <SectionLabel>{t('panel.detail.sec.raw')}</SectionLabel>
      <pre
        className="mono scroll"
        style={{
          background: 'rgb(var(--surface))',
          padding: 14,
          borderRadius: 6,
          border: '1px solid rgb(var(--border-soft))',
          fontSize: 11.5,
          color: 'rgb(var(--fg))',
          lineHeight: 1.6,
          overflow: 'auto',
          margin: 0,
        }}
      >
        {JSON.stringify({
          jsonrpc: '2.0',
          id: c.id,
          method: c.method,
          params: c.params,
        }, null, 2)}
      </pre>
    </>
  );
}

function TimingView({
  call,
  t,
}: {
  call: CapturedCall;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const total = call.durationMs ?? 0;
  if (total <= 0) {
    return (
      <>
        <SectionLabel>{t('panel.detail.sec.timing', { n: '0.0' })}</SectionLabel>
        <div className="text-[12px]" style={{ color: 'rgb(var(--fg-muted))' }}>—</div>
      </>
    );
  }
  // Throttle is the one segment we actually measure — take it out of the
  // total first, then synthesize the rest over the remainder.
  const throttle = call.throttleMs ?? 0;
  const organic = Math.max(0, total - throttle);
  const rpc = Math.max(5, Math.min(organic - 5, organic * 0.5));
  const approval = call.kind === 'sign' || call.kind === 'write' ? Math.max(0, organic - rpc - 8) : 0;
  const dapp = 2;
  const queue = 1;
  const ret = Math.max(0, organic - dapp - queue - approval - rpc);

  type Row = { label: string; t: number; w: number; color: string };
  const rows: Row[] = [
    { label: t('panel.detail.timing.dapp'),  t: 0,          w: dapp,  color: 'rgb(var(--fg-muted))' },
    { label: t('panel.detail.timing.queue'), t: dapp,       w: queue, color: 'rgb(var(--fg-dim))' },
  ];
  let cursor = dapp + queue;
  if (throttle > 0) {
    rows.push({ label: t('panel.detail.timing.throttle'), t: cursor, w: throttle, color: 'rgb(var(--amber))' });
    cursor += throttle;
  }
  rows.push(
    { label: t('panel.detail.timing.approval'), t: cursor,                     w: approval, color: 'rgb(var(--violet))' },
    { label: t('panel.detail.timing.rpc'),      t: cursor + approval,          w: rpc,      color: 'rgb(var(--accent))' },
    { label: t('panel.detail.timing.return'),   t: cursor + approval + rpc,    w: ret,      color: 'rgb(var(--fg-muted))' },
  );

  return (
    <>
      <SectionLabel>{t('panel.detail.sec.timing', { n: total.toFixed(1) })}</SectionLabel>
      <div style={{ marginTop: 12 }}>
        {rows.map((r, i) => (
          <div key={i} className="flex items-center" style={{ height: 26, gap: 12 }}>
            <div style={{ width: 150, fontSize: 12, color: 'rgb(var(--fg-muted))' }}>{r.label}</div>
            <div className="flex-1 relative" style={{ height: 14, background: 'rgb(var(--surface))', borderRadius: 2 }}>
              <div style={{
                position: 'absolute',
                left: `${Math.max(0, Math.min(100, (r.t / total) * 100))}%`,
                width: `${Math.max(0.5, Math.min(100, (r.w / total) * 100))}%`,
                top: 0, bottom: 0,
                background: r.color,
                borderRadius: 2,
                opacity: 0.85,
              }} />
            </div>
            <div
              className="mono"
              style={{ width: 70, fontSize: 10.5, color: 'rgb(var(--fg-dim))', textAlign: 'right' }}
            >
              {r.w.toFixed(1)}ms
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="uppercase mb-2"
      style={{ fontSize: 10, fontWeight: 600, color: 'rgb(var(--fg-dim))', letterSpacing: 0.8 }}
    >
      {children}
    </div>
  );
}
