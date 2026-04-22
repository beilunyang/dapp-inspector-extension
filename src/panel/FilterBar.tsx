import { useMemo } from 'react';
import { useCapturesStore } from './stores/captures-store';
import { useViewStore } from './stores/view-store';
import { useT } from '@shared/stores/i18n-store';
import { Icon } from '@shared/ui/Icon';
import type { Kind } from '@shared/types';

interface ChipDef {
  id: Kind | 'all' | 'errors';
  labelKey: string;
  color?: string;
}

const CHIPS: ChipDef[] = [
  { id: 'all', labelKey: 'panel.filters.all' },
  { id: 'read', labelKey: 'panel.filters.read', color: 'rgb(var(--fg-muted))' },
  { id: 'write', labelKey: 'panel.filters.write', color: 'rgb(var(--amber))' },
  { id: 'sign', labelKey: 'panel.filters.sign', color: 'rgb(var(--violet))' },
  { id: 'errors', labelKey: 'panel.filters.errors', color: 'rgb(var(--red))' },
];

export function FilterBar() {
  const t = useT();
  const calls = useCapturesStore(s => s.calls);
  const provenance = useCapturesStore(s => s.provenance);
  const kinds = useViewStore(s => s.kinds);
  const toggleKind = useViewStore(s => s.toggleKind);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: calls.length, read: 0, write: 0, sign: 0, subscribe: 0, errors: 0 };
    for (const call of calls) {
      c[call.kind] = (c[call.kind] ?? 0) + 1;
      if (call.status === 'error') c.errors++;
    }
    return c;
  }, [calls]);

  const allActive = kinds.size === 0;

  return (
    <div
      className="flex items-center gap-[6px] h-[34px] px-[10px] flex-shrink-0"
      style={{ background: 'rgb(var(--bg))', borderBottom: '1px solid rgb(var(--border))' }}
    >
      {CHIPS.map(c => {
        const isActive =
          c.id === 'all' ? allActive :
          c.id === 'errors' ? false :
          kinds.has(c.id as Kind);
        return (
          <button
            key={c.id}
            onClick={() => {
              if (c.id === 'all') {
                // Clear kind filters
                kinds.forEach(k => toggleKind(k));
              } else if (c.id !== 'errors') {
                toggleKind(c.id as Kind);
              }
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
