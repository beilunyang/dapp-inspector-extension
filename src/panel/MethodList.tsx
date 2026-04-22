import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCapturesStore } from './stores/captures-store';
import { useViewStore } from './stores/view-store';
import { Kind } from '@shared/ui/Kind';
import { Badge } from '@shared/ui/Badge';
import { useT } from '@shared/stores/i18n-store';
import type { CapturedCall } from '@shared/types';

const ROW_HEIGHT = 28;

function relative(ts: number): string {
  const dt = Date.now() - ts;
  if (dt < 1000) return 'now';
  if (dt < 60_000) return `${Math.floor(dt / 1000)}s`;
  if (dt < 3_600_000) return `${Math.floor(dt / 60_000)}m`;
  return `${Math.floor(dt / 3_600_000)}h`;
}

export function MethodList() {
  const calls = useCapturesStore(s => s.calls);
  const search = useViewStore(s => s.search);
  const kinds = useViewStore(s => s.kinds);
  const selectedId = useViewStore(s => s.selectedCallId);
  const select = useViewStore(s => s.select);
  const t = useT();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return calls.filter(c => {
      if (kinds.size > 0 && !kinds.has(c.kind)) return false;
      if (!q) return true;
      return c.method.toLowerCase().includes(q) || c.origin.toLowerCase().includes(q);
    });
  }, [calls, search, kinds]);

  const parentRef = useRef<HTMLDivElement>(null);
  const virt = useVirtualizer({
    count: filtered.length, getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT, overscan: 10,
  });

  return (
    <div className="w-[420px] border-r border-border flex flex-col bg-bg">
      <div className="h-7 flex items-center px-3 text-[10px] uppercase tracking-wide text-muted border-b border-border">
        <span className="w-6">&nbsp;</span>
        <span className="flex-1">{t('panel.list.method')}</span>
        <span className="w-12 text-right">{t('panel.list.duration')}</span>
        <span className="w-10 text-right">{t('panel.list.ts')}</span>
      </div>
      <div ref={parentRef} className="flex-1 overflow-auto" role="list">
        <div style={{ height: virt.getTotalSize(), position: 'relative' }}>
          {virt.getVirtualItems().map(v => {
            const c = filtered[v.index];
            return <Row key={c.id} call={c} selected={c.id === selectedId} onClick={() => select(c.id)} offset={v.start} />;
          })}
        </div>
      </div>
    </div>
  );
}

function Row({ call, selected, onClick, offset }: { call: CapturedCall; selected: boolean; onClick: () => void; offset: number }) {
  return (
    <button
      role="listitem"
      onClick={onClick}
      className={`absolute left-0 right-0 h-7 flex items-center px-3 text-xs text-left ${selected ? 'bg-accent/10 text-fg' : 'hover:bg-surface text-fg'}`}
      style={{ transform: `translateY(${offset}px)` }}
    >
      <Kind kind={call.kind} />
      <span className="ml-2 flex-1 truncate font-mono">{call.method}</span>
      {call.status === 'pending' ? <Badge tone="warn">…</Badge>
        : call.status === 'error' ? <Badge tone="error">ERR</Badge>
        : <Badge tone="ok">OK</Badge>}
      <span className="w-12 text-right text-muted">{call.durationMs != null ? `${Math.round(call.durationMs)}ms` : '—'}</span>
      <span className="w-10 text-right text-muted">{relative(call.startedAt)}</span>
    </button>
  );
}
