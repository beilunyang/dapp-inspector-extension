import { useViewStore } from '../stores/view-store';
import { useT } from '@shared/stores/i18n-store';
import { JsonTree } from '@shared/ui/JsonTree';
import type { CapturedCall } from '@shared/types';

const TABS = ['params', 'result', 'timing', 'raw'] as const;

export function DetailTabs({ call }: { call: CapturedCall }) {
  const t = useT();
  const active = useViewStore(s => s.activeTab);
  const setTab = useViewStore(s => s.setTab);
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex gap-4 px-4 border-b border-border h-8">
        {TABS.map(name => (
          <button key={name}
            className={`text-xs h-8 border-b-2 -mb-px ${active === name ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg'}`}
            onClick={() => setTab(name)}
          >{t(`panel.detail.tabs.${name}`)}</button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4">{renderTab(active, call)}</div>
    </div>
  );
}

function renderTab(tab: typeof TABS[number], c: CapturedCall) {
  if (tab === 'params') return <JsonTree value={c.params} />;
  if (tab === 'result') return c.status === 'error'
    ? <JsonTree value={c.error} />
    : <JsonTree value={c.result} />;
  if (tab === 'timing') return (
    <div className="space-y-2 text-xs font-mono">
      <div>Started: {new Date(c.startedAt).toISOString()}</div>
      <div>Ended: {c.endedAt ? new Date(c.endedAt).toISOString() : '—'}</div>
      <div>Duration: {c.durationMs != null ? `${c.durationMs.toFixed(1)} ms` : '—'}</div>
      <div>Kind: {c.kind}</div>
    </div>
  );
  return <JsonTree value={c} />;
}
