import { Fragment, useMemo } from 'react';
import { useCapturesStore } from './stores/captures-store';
import { useViewStore } from './stores/view-store';
import { useT } from '@shared/stores/i18n-store';
import { Icon } from '@shared/ui/Icon';
import { useChainName, chainTitle, fmtChain } from '@shared/chains';
import type { Kind } from '@shared/types';

interface ChipDef {
  id: Kind | 'all' | 'errors' | 'mocked' | 'blocked' | 'throttled' | 'replayed';
  labelKey: string;
  color?: string;
  // Kind chips use a colored dot. Status chips use a prefix icon so the
  // same color (e.g. amber) can be shared with a kind chip without the
  // two being visually indistinguishable.
  type: 'kind' | 'status';
  icon?: string;
}

const CHIPS: ChipDef[] = [
  { id: 'all',       labelKey: 'panel.filters.all',       type: 'kind' },
  { id: 'read',      labelKey: 'panel.filters.read',      type: 'kind',   color: 'rgb(var(--fg-muted))' },
  { id: 'write',     labelKey: 'panel.filters.write',     type: 'kind',   color: 'rgb(var(--amber))' },
  { id: 'sign',      labelKey: 'panel.filters.sign',      type: 'kind',   color: 'rgb(var(--violet))' },
  { id: 'subscribe', labelKey: 'panel.filters.subscribe', type: 'kind',   color: 'rgb(var(--accent))' },
  { id: 'errors',    labelKey: 'panel.filters.errors',    type: 'status', color: 'rgb(var(--red))',    icon: 'x' },
  { id: 'mocked',    labelKey: 'panel.filters.mocked',    type: 'status', color: 'rgb(var(--violet))', icon: 'mock' },
  { id: 'blocked',   labelKey: 'panel.filters.blocked',   type: 'status', color: 'rgb(var(--amber))',  icon: 'ban' },
  { id: 'throttled', labelKey: 'panel.filters.throttled', type: 'status', color: 'rgb(var(--amber))',  icon: 'clock' },
  { id: 'replayed',  labelKey: 'panel.filters.replayed',  type: 'status', color: 'rgb(var(--accent))', icon: 'replay' },
];

export function FilterBar() {
  const t = useT();
  const calls = useCapturesStore(s => s.calls);
  const provenance = useCapturesStore(s => s.provenance);
  const kinds = useViewStore(s => s.kinds);
  const toggleKind = useViewStore(s => s.toggleKind);
  const errorsOnly = useViewStore(s => s.errorsOnly);
  const mockedOnly = useViewStore(s => s.mockedOnly);
  const blockedOnly = useViewStore(s => s.blockedOnly);
  const throttledOnly = useViewStore(s => s.throttledOnly);
  const replayedOnly = useViewStore(s => s.replayedOnly);
  const toggleErrorsOnly = useViewStore(s => s.toggleErrorsOnly);
  const toggleMockedOnly = useViewStore(s => s.toggleMockedOnly);
  const toggleBlockedOnly = useViewStore(s => s.toggleBlockedOnly);
  const toggleThrottledOnly = useViewStore(s => s.toggleThrottledOnly);
  const toggleReplayedOnly = useViewStore(s => s.toggleReplayedOnly);
  const resetChips = useViewStore(s => s.resetChips);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: calls.length, read: 0, write: 0, sign: 0, subscribe: 0, errors: 0, mocked: 0, blocked: 0, throttled: 0, replayed: 0 };
    for (const call of calls) {
      c[call.kind] = (c[call.kind] ?? 0) + 1;
      if (call.status === 'error') c.errors++;
      if (call.mocked) c.mocked++;
      if (call.blocked) c.blocked++;
      if ((call.throttleMs ?? 0) > 0) c.throttled++;
      if (call.replayed) c.replayed++;
    }
    return c;
  }, [calls]);

  const allActive = kinds.size === 0 && !errorsOnly && !mockedOnly && !blockedOnly && !throttledOnly && !replayedOnly;

  return (
    <div
      className="flex items-center gap-[6px] h-[34px] px-[10px] flex-shrink-0"
      style={{ background: 'rgb(var(--bg))', borderBottom: '1px solid rgb(var(--border))' }}
    >
      {CHIPS.map((c, i) => {
        const prev = CHIPS[i - 1];
        const showDivider = prev && prev.type === 'kind' && c.type === 'status';
        const isActive =
          c.id === 'all' ? allActive :
          c.id === 'errors' ? errorsOnly :
          c.id === 'mocked' ? mockedOnly :
          c.id === 'blocked' ? blockedOnly :
          c.id === 'throttled' ? throttledOnly :
          c.id === 'replayed' ? replayedOnly :
          kinds.has(c.id as Kind);
        return (
          <Fragment key={c.id}>
            {showDivider && (
              <div style={{ width: 1, height: 16, background: 'rgb(var(--border))', margin: '0 2px' }} />
            )}
            <button
              onClick={() => {
                if (c.id === 'all') resetChips();
                else if (c.id === 'errors') toggleErrorsOnly();
                else if (c.id === 'mocked') toggleMockedOnly();
                else if (c.id === 'blocked') toggleBlockedOnly();
                else if (c.id === 'throttled') toggleThrottledOnly();
                else if (c.id === 'replayed') toggleReplayedOnly();
                else toggleKind(c.id as Kind);
              }}
              className="inline-flex items-center gap-[6px] cursor-pointer"
              style={{
                padding: '3px 9px',
                borderRadius: 5,
                fontSize: 11.5,
                fontWeight: 500,
                color: isActive ? 'rgb(var(--fg))' : 'rgb(var(--fg-muted))',
                background: isActive ? 'rgb(var(--surface-2))' : 'transparent',
                border: `1px solid ${isActive ? 'rgb(var(--border))' : 'transparent'}`,
              }}
            >
              {c.type === 'kind' && c.color && !isActive && (
                <span className="dot" style={{ color: c.color }} />
              )}
              {c.type === 'status' && c.icon && (
                <Icon name={c.icon} size={12} style={{ color: isActive ? 'rgb(var(--fg))' : c.color }} />
              )}
              {t(c.labelKey)}
              <span className="mono" style={{ color: 'rgb(var(--fg-dim))' }}>{counts[c.id] ?? 0}</span>
            </button>
          </Fragment>
        );
      })}

      {provenance?.origin && (
        <>
          <div style={{ width: 1, height: 16, background: 'rgb(var(--border))', margin: '0 6px' }} />
          <FilterChip icon="globe" label={safeHost(provenance.origin)} />
          {provenance.wallets[0] && (
            <FilterChip icon="wallet" label={provenance.wallets[0].name} />
          )}
          {provenance.chainId && (
            <ChainChip chainId={provenance.chainId} />
          )}
        </>
      )}
    </div>
  );
}

function FilterChip({ icon, label, title }: { icon: string; label: string; title?: string }) {
  return (
    <div
      title={title}
      className="inline-flex items-center gap-[5px] cursor-pointer"
      style={{
        padding: '3px 8px',
        borderRadius: 5,
        fontSize: 11.5,
        color: 'rgb(var(--fg-muted))',
        border: '1px dashed rgb(var(--border))',
      }}
    >
      <Icon name={icon} size={12} /> {label}
    </div>
  );
}

function ChainChip({ chainId }: { chainId: string }) {
  // Subscribes to the chain catalog so an unknown chainId re-renders
  // once chainlist.org's data lands in cache.
  useChainName(chainId);
  return <FilterChip icon="cpu" label={fmtChain(chainId, 'name')} title={chainTitle(chainId)} />;
}

function safeHost(url: string): string {
  try { return new URL(url).host; } catch { return url; }
}
