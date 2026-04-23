import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCapturesStore } from './stores/captures-store';
import { useViewStore } from './stores/view-store';
import { useT } from '@shared/stores/i18n-store';
import type { CapturedCall, Kind } from '@shared/types';

const ROW_HEIGHT = 28;

const KIND_STYLE: Record<Kind, { label: string; color: string }> = {
  read:      { label: 'RD', color: 'rgb(var(--fg-muted))' },
  write:     { label: 'WR', color: 'rgb(var(--amber))' },
  sign:      { label: 'SG', color: 'rgb(var(--violet))' },
  subscribe: { label: 'SB', color: 'rgb(var(--accent))' },
};

const STATUS_COLOR: Record<string, string> = {
  ok:      'rgb(var(--green))',
  error:   'rgb(var(--red))',
  pending: 'rgb(var(--accent))',
};

export function MethodList() {
  const t = useT();
  const calls = useCapturesStore(s => s.calls);
  const search = useViewStore(s => s.search);
  const kinds = useViewStore(s => s.kinds);
  const errorsOnly = useViewStore(s => s.errorsOnly);
  const mockedOnly = useViewStore(s => s.mockedOnly);
  const blockedOnly = useViewStore(s => s.blockedOnly);
  const throttledOnly = useViewStore(s => s.throttledOnly);
  const replayedOnly = useViewStore(s => s.replayedOnly);
  const selectedId = useViewStore(s => s.selectedCallId);
  const select = useViewStore(s => s.select);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return calls.filter(c => {
      if (kinds.size > 0 && !kinds.has(c.kind)) return false;
      if (errorsOnly && c.status !== 'error') return false;
      if (mockedOnly && !c.mocked) return false;
      if (blockedOnly && !c.blocked) return false;
      if (throttledOnly && !((c.throttleMs ?? 0) > 0)) return false;
      if (replayedOnly && !c.replayed) return false;
      if (!q) return true;
      return c.method.toLowerCase().includes(q) || c.origin.toLowerCase().includes(q);
    });
  }, [calls, search, kinds, errorsOnly, mockedOnly, blockedOnly, throttledOnly, replayedOnly]);

  const parentRef = useRef<HTMLDivElement>(null);
  const virt = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 10,
  });

  return (
    <div
      className="scroll flex flex-col overflow-hidden flex-shrink-0"
      style={{ width: 360, borderRight: '1px solid rgb(var(--border))' }}
    >
      {/* Column header */}
      <div
        className="flex items-center flex-shrink-0 uppercase"
        style={{
          height: 26,
          padding: '0 12px',
          fontSize: 10.5,
          fontWeight: 500,
          color: 'rgb(var(--fg-dim))',
          letterSpacing: 0.4,
          background: 'rgb(var(--surface))',
          borderBottom: '1px solid rgb(var(--border-soft))',
        }}
      >
        <div className="flex-1">{t('panel.list.method')}</div>
        <div style={{ width: 60, textAlign: 'right' }}>{t('panel.list.duration')}</div>
      </div>

      {/* Rows */}
      <div ref={parentRef} className="scroll flex-1 overflow-auto" role="list">
        <div style={{ height: virt.getTotalSize(), position: 'relative', width: '100%' }}>
          {virt.getVirtualItems().map(v => {
            const c = filtered[v.index];
            return (
              <Row
                key={c.id}
                call={c}
                selected={c.id === selectedId}
                onClick={() => select(c.id)}
                offset={v.start}
                t={t}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Row({ call, selected, onClick, offset, t }: {
  call: CapturedCall;
  selected: boolean;
  onClick: () => void;
  offset: number;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const kc = KIND_STYLE[call.kind];
  const statusColor = STATUS_COLOR[call.status] ?? STATUS_COLOR.ok;
  return (
    <div
      role="listitem"
      onClick={onClick}
      className="flex items-center cursor-pointer"
      style={{
        position: 'absolute',
        left: 0, right: 0,
        height: ROW_HEIGHT,
        transform: `translateY(${offset}px)`,
        padding: '0 12px 0 10px',
        gap: 8,
        fontSize: 12,
        color: selected ? 'rgb(var(--fg))' : 'rgb(var(--fg-muted))',
        background: selected ? 'rgb(var(--accent) / 0.18)' : 'transparent',
        borderLeft: `2px solid ${selected ? 'rgb(var(--accent))' : 'transparent'}`,
        borderBottom: '1px solid rgb(var(--border-soft))',
      }}
      onMouseEnter={e => !selected && (e.currentTarget.style.background = 'rgb(var(--surface))')}
      onMouseLeave={e => !selected && (e.currentTarget.style.background = 'transparent')}
    >
      <span
        className="mono inline-flex items-center justify-center"
        style={{
          fontSize: 9.5,
          fontWeight: 600,
          padding: '2px 4px',
          borderRadius: 3,
          color: kc.color,
          background: `color-mix(in oklab, ${kc.color} 14%, transparent)`,
          width: 22,
          letterSpacing: 0.3,
        }}
      >
        {kc.label}
      </span>
      <span
        className="mono flex-1 truncate"
        style={{
          color: selected ? 'rgb(var(--fg))' : (call.status === 'error' ? 'rgb(var(--red))' : 'rgb(var(--fg-muted))'),
          fontSize: 11.5,
        }}
      >
        {call.method}
      </span>
      {call.replayed && <Tag color="rgb(var(--accent))" label="R" title="Replayed call" />}
      {call.blocked && <Tag color="rgb(var(--amber))" label="B" title="Blocked by rule" />}
      {call.throttleMs != null && call.throttleMs > 0 && (
        <Tag
          color="rgb(var(--amber))"
          label="T"
          title={t('panel.list.throttleHint', { n: call.throttleMs })}
        />
      )}
      {call.mocked && <Tag color="rgb(var(--violet))" label="M" title="Mocked response" />}
      {call.status !== 'ok' && !call.mocked && !call.blocked && (
        <span className="dot" style={{ color: statusColor }} />
      )}
      <span
        className="mono"
        style={{ width: 56, textAlign: 'right', color: 'rgb(var(--fg-dim))', fontSize: 10.5 }}
      >
        {fmtTime(call.durationMs)}
      </span>
    </div>
  );
}

function Tag({ color, label, title }: { color: string; label: string; title: string }) {
  return (
    <span
      className="mono"
      style={{
        fontSize: 9.5, fontWeight: 600,
        padding: '1px 5px', borderRadius: 3,
        color,
        background: `color-mix(in oklab, ${color} 14%, transparent)`,
        letterSpacing: 0.4,
      }}
      title={title}
    >
      {label}
    </span>
  );
}

function fmtTime(ms: number | undefined): string {
  if (ms == null) return '—';
  return ms < 1000 ? `${ms.toFixed(1)}ms` : `${(ms / 1000).toFixed(2)}s`;
}
