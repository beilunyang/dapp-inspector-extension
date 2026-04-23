import { useMemo } from 'react';
import { useCapturesStore } from './stores/captures-store';
import { useViewStore } from './stores/view-store';
import { useT } from '@shared/stores/i18n-store';
import { Icon } from '@shared/ui/Icon';
import type { Kind } from '@shared/types';

interface ChipDef {
  id: Kind | 'all' | 'errors' | 'mocked';
  labelKey: string;
  color?: string;
}

const CHIPS: ChipDef[] = [
  { id: 'all', labelKey: 'panel.filters.all' },
  { id: 'read', labelKey: 'panel.filters.read', color: 'rgb(var(--fg-muted))' },
  { id: 'write', labelKey: 'panel.filters.write', color: 'rgb(var(--amber))' },
  { id: 'sign', labelKey: 'panel.filters.sign', color: 'rgb(var(--violet))' },
  { id: 'errors', labelKey: 'panel.filters.errors', color: 'rgb(var(--red))' },
  { id: 'mocked', labelKey: 'panel.filters.mocked', color: 'rgb(var(--violet))' },
];

export function FilterBar() {
  const t = useT();
  const calls = useCapturesStore(s => s.calls);
  const provenance = useCapturesStore(s => s.provenance);
  const kinds = useViewStore(s => s.kinds);
  const toggleKind = useViewStore(s => s.toggleKind);
  const errorsOnly = useViewStore(s => s.errorsOnly);
  const mockedOnly = useViewStore(s => s.mockedOnly);
  const toggleErrorsOnly = useViewStore(s => s.toggleErrorsOnly);
  const toggleMockedOnly = useViewStore(s => s.toggleMockedOnly);
  const resetChips = useViewStore(s => s.resetChips);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: calls.length, read: 0, write: 0, sign: 0, subscribe: 0, errors: 0, mocked: 0 };
    for (const call of calls) {
      c[call.kind] = (c[call.kind] ?? 0) + 1;
      if (call.status === 'error') c.errors++;
      if (call.mocked) c.mocked++;
    }
    return c;
  }, [calls]);

  const allActive = kinds.size === 0 && !errorsOnly && !mockedOnly;

  return (
    <div
      className="flex items-center gap-[6px] h-[34px] px-[10px] flex-shrink-0"
      style={{ background: 'rgb(var(--bg))', borderBottom: '1px solid rgb(var(--border))' }}
    >
      {CHIPS.map(c => {
        const isActive =
          c.id === 'all' ? allActive :
          c.id === 'errors' ? errorsOnly :
          c.id === 'mocked' ? mockedOnly :
          kinds.has(c.id as Kind);
        return (
          <button
            key={c.id}
            onClick={() => {
              if (c.id === 'all') resetChips();
              else if (c.id === 'errors') toggleErrorsOnly();
              else if (c.id === 'mocked') toggleMockedOnly();
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
            {c.color && !isActive && <span className="dot" style={{ color: c.color }} />}
            {t(c.labelKey)}
            <span className="mono" style={{ color: 'rgb(var(--fg-dim))' }}>{counts[c.id] ?? 0}</span>
          </button>
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
            <FilterChip icon="cpu" label={`Chain ${provenance.chainId}`} />
          )}
        </>
      )}
    </div>
  );
}

function FilterChip({ icon, label }: { icon: string; label: string }) {
  return (
    <div
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

function safeHost(url: string): string {
  try { return new URL(url).host; } catch { return url; }
}
