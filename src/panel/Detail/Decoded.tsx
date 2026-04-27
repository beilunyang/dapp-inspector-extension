import { useMemo, useState } from 'react';
import type { CapturedCall } from '@shared/types';
import { useT } from '@shared/stores/i18n-store';
import { decodeBuiltin, extractTxContext } from '@shared/abi/decode';
import type { AbiSource, DecodedArg, DecodedCall, RiskFlag, RiskSeverity } from '@shared/abi/types';

const SEVERITY_COLOR: Record<RiskSeverity, string> = {
  info:    'rgb(var(--accent))',
  warning: 'rgb(var(--amber))',
  danger:  'rgb(var(--red))',
};

const SOURCE_COLOR: Record<AbiSource, string> = {
  builtin:  'rgb(var(--green))',
  sourcify: 'rgb(var(--accent))',
  '4byte':  'rgb(var(--amber))',
  cached:   'rgb(var(--accent))',
};

export function DecodedView({ call }: { call: CapturedCall }) {
  const t = useT();
  const tx = useMemo(() => extractTxContext(call), [call]);
  const decoded = useMemo<DecodedCall | null>(() => {
    if (!tx?.data) return null;
    return decodeBuiltin(tx.data, tx.value);
  }, [tx]);

  if (!tx?.data) {
    return (
      <div className="text-[12px]" style={{ color: 'rgb(var(--fg-muted))' }}>
        {t('panel.detail.decoded.noDecode')}
      </div>
    );
  }

  if (!decoded) {
    return (
      <>
        <Header
          title={t('panel.detail.decoded.signature')}
          value="—"
          contractTitle={t('panel.detail.decoded.contract')}
          contract={tx.to}
        />
        <div className="text-[12px] mt-3" style={{ color: 'rgb(var(--fg-muted))' }}>
          {t('panel.detail.decoded.noDecode')}
        </div>
        <RawToggle data={tx.data} t={t} />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-[8px] mb-[10px]">
        <span className="mono text-[13px]" style={{ color: 'rgb(var(--fg))', fontWeight: 600 }}>
          {decoded.signature}
        </span>
        <SourceBadge source={decoded.source} t={t} />
      </div>
      {tx.to && (
        <div className="flex items-center gap-[8px] mb-3 text-[11.5px]" style={{ color: 'rgb(var(--fg-muted))' }}>
          <span style={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }}>
            {t('panel.detail.decoded.contract')}
          </span>
          <span className="mono" style={{ color: 'rgb(var(--fg))' }}>{tx.to}</span>
        </div>
      )}

      {decoded.risks.length > 0 && (
        <RiskList risks={decoded.risks} t={t} />
      )}

      <SectionLabel>{t('panel.detail.decoded.args')}</SectionLabel>
      <ArgsTable args={decoded.args} risks={decoded.risks} />

      <RawToggle data={tx.data} t={t} />
    </>
  );
}

function Header({
  title, value, contractTitle, contract,
}: { title: string; value: string; contractTitle: string; contract?: string }) {
  return (
    <>
      <div className="flex items-center gap-[8px] mb-[10px]">
        <span style={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10, color: 'rgb(var(--fg-dim))' }}>
          {title}
        </span>
        <span className="mono text-[13px]" style={{ color: 'rgb(var(--fg))', fontWeight: 600 }}>{value}</span>
      </div>
      {contract && (
        <div className="flex items-center gap-[8px] mb-3 text-[11.5px]" style={{ color: 'rgb(var(--fg-muted))' }}>
          <span style={{ textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }}>{contractTitle}</span>
          <span className="mono" style={{ color: 'rgb(var(--fg))' }}>{contract}</span>
        </div>
      )}
    </>
  );
}

function SourceBadge({ source, t }: { source: AbiSource; t: (k: string) => string }) {
  const color = SOURCE_COLOR[source];
  const label = t(`panel.detail.decoded.source${source.charAt(0).toUpperCase() + source.slice(1).replace('byte', 'byte')}`)
    || source.toUpperCase();
  // The lookup above is fragile across the four sources — use a direct map:
  const labelKey: Record<AbiSource, string> = {
    builtin:  'panel.detail.decoded.sourceBuiltin',
    sourcify: 'panel.detail.decoded.sourceSourcify',
    '4byte':  'panel.detail.decoded.sourceFourbyte',
    cached:   'panel.detail.decoded.sourceCached',
  };
  return (
    <span
      className="mono"
      style={{
        fontSize: 9.5, fontWeight: 600,
        padding: '1px 6px', borderRadius: 3,
        color, background: `color-mix(in oklab, ${color} 14%, transparent)`,
        letterSpacing: 0.4,
      }}
    >
      {t(labelKey[source]) || label}
    </span>
  );
}

function RiskList({ risks, t }: { risks: RiskFlag[]; t: (k: string) => string }) {
  return (
    <div className="mb-3">
      <SectionLabel>{t('panel.detail.decoded.risks')}</SectionLabel>
      <div className="flex flex-col gap-[6px]">
        {risks.map((r, i) => {
          const c = SEVERITY_COLOR[r.severity];
          return (
            <div
              key={i}
              className="flex items-start gap-[8px]"
              style={{
                padding: '8px 10px',
                borderRadius: 6,
                background: `color-mix(in oklab, ${c} 8%, transparent)`,
                border: `1px solid color-mix(in oklab, ${c} 30%, transparent)`,
              }}
            >
              <span
                className="mono"
                style={{
                  fontSize: 9.5, fontWeight: 700, padding: '1px 6px',
                  borderRadius: 3, color: c,
                  background: `color-mix(in oklab, ${c} 18%, transparent)`,
                  letterSpacing: 0.4, flexShrink: 0,
                }}
              >
                {r.label}
              </span>
              <span className="text-[12px]" style={{ color: 'rgb(var(--fg))' }}>{r.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ArgsTable({ args, risks }: { args: DecodedArg[]; risks: RiskFlag[] }) {
  if (args.length === 0) {
    return <div className="text-[12px]" style={{ color: 'rgb(var(--fg-muted))' }}>—</div>;
  }
  const flagged = new Map<number, RiskFlag>();
  for (const r of risks) if (r.argIndex !== undefined) flagged.set(r.argIndex, r);
  return (
    <div
      className="flex flex-col"
      style={{
        background: 'rgb(var(--surface))',
        border: '1px solid rgb(var(--border-soft))',
        borderRadius: 6,
        overflow: 'hidden',
      }}
    >
      {args.map((arg, i) => (
        <div
          key={i}
          className="flex items-start gap-3"
          style={{
            padding: '8px 10px',
            borderBottom: i < args.length - 1 ? '1px solid rgb(var(--border-soft))' : 'none',
            fontSize: 11.5,
          }}
        >
          <div className="flex flex-col" style={{ width: 110, flexShrink: 0 }}>
            <span style={{ color: 'rgb(var(--fg))' }}>{arg.name || `arg${i}`}</span>
            <span className="mono" style={{ color: 'rgb(var(--fg-dim))', fontSize: 10 }}>{arg.type}</span>
          </div>
          <div className="mono flex-1 break-all" style={{ color: 'rgb(var(--fg))' }}>
            {fmtValue(arg.value)}
          </div>
          {flagged.has(i) && (
            <span
              className="mono"
              style={{
                fontSize: 9.5, fontWeight: 700, padding: '1px 6px', borderRadius: 3,
                color: SEVERITY_COLOR[flagged.get(i)!.severity],
                background: `color-mix(in oklab, ${SEVERITY_COLOR[flagged.get(i)!.severity]} 18%, transparent)`,
                flexShrink: 0,
              }}
            >
              {flagged.get(i)!.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function RawToggle({ data, t }: { data: `0x${string}`; t: (k: string) => string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-[5px] cursor-pointer"
        style={{
          fontSize: 11, color: 'rgb(var(--fg-muted))',
          background: 'transparent', border: 'none', padding: 0,
          textTransform: 'uppercase', letterSpacing: 0.5,
        }}
      >
        <span>{open ? '▾' : '▸'}</span>
        {t('panel.detail.decoded.rawToggle')}
      </button>
      {open && (
        <pre
          className="mono scroll mt-2"
          style={{
            background: 'rgb(var(--surface))', padding: 10, borderRadius: 6,
            border: '1px solid rgb(var(--border-soft))', fontSize: 11,
            color: 'rgb(var(--fg))', overflow: 'auto', margin: 0, whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}
        >
          {data}
        </pre>
      )}
    </div>
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

function fmtValue(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'bigint') return v.toString();
  if (typeof v === 'string') return v;
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Array.isArray(v)) return `[${v.map(fmtValue).join(', ')}]`;
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v, (_, val) => (typeof val === 'bigint' ? val.toString() : val), 2);
    } catch {
      return String(v);
    }
  }
  return String(v);
}
