import { useState, useMemo } from 'react';

const MAX_INLINE_STRING = 80;
const LARGE_THRESHOLD_BYTES = 1024 * 1024; // 1MB

export function JsonTree({ value }: { value: unknown }) {
  const estimatedSize = useMemo(() => {
    try { return JSON.stringify(value)?.length ?? 0; } catch { return 0; }
  }, [value]);
  const [expandAll] = useState(estimatedSize < LARGE_THRESHOLD_BYTES);
  return (
    <div className="font-mono text-xs leading-relaxed">
      {estimatedSize >= LARGE_THRESHOLD_BYTES && (
        <div className="mb-2 text-muted text-[11px]">Large object ({(estimatedSize / 1024).toFixed(0)} KB) — expanding may be slow.</div>
      )}
      <Node value={value} depth={0} initiallyOpen={expandAll} />
    </div>
  );
}

function Node({ value, depth, initiallyOpen }: { value: unknown; depth: number; initiallyOpen: boolean }) {
  if (value === null) return <span className="text-muted">null</span>;
  if (value === undefined) return <span className="text-muted">undefined</span>;
  const t = typeof value;
  if (t === 'string') {
    const s = value as string;
    return <span className="text-kind-subscribe">"{s.length > MAX_INLINE_STRING ? s.slice(0, MAX_INLINE_STRING) + '…' : s}"</span>;
  }
  if (t === 'number' || t === 'boolean' || t === 'bigint') return <span className="text-kind-write">{String(value)}</span>;
  if (Array.isArray(value)) return <Collapsible label={`Array(${value.length})`} depth={depth} initiallyOpen={initiallyOpen}>
    {value.map((v, i) => (
      <Row key={i} name={String(i)} depth={depth + 1}><Node value={v} depth={depth + 1} initiallyOpen={initiallyOpen} /></Row>
    ))}
  </Collapsible>;
  if (t === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return <Collapsible label={`Object (${entries.length})`} depth={depth} initiallyOpen={initiallyOpen}>
      {entries.map(([k, v]) => (
        <Row key={k} name={k} depth={depth + 1}><Node value={v} depth={depth + 1} initiallyOpen={initiallyOpen} /></Row>
      ))}
    </Collapsible>;
  }
  return <span className="text-muted">{String(value)}</span>;
}

function Collapsible({ label, depth, initiallyOpen, children }: { label: string; depth: number; initiallyOpen: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <>
      <button onClick={() => setOpen(v => !v)} className="text-muted hover:text-fg">
        <span className="inline-block w-3">{open ? '▾' : '▸'}</span> <span className="text-muted">{label}</span>
      </button>
      {open && <div style={{ marginLeft: 12 }}>{children}</div>}
      {!open && depth === 0 && <span className="text-muted"> …</span>}
    </>
  );
}

function Row({ name, depth: _depth, children }: { name: string; depth: number; children: React.ReactNode }) {
  return (
    <div className="whitespace-pre">
      <span className="text-accent">{name}</span>
      <span className="text-muted">: </span>
      {children}
    </div>
  );
}
