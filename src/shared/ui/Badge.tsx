export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'ok' | 'warn' | 'error' }) {
  const toneClass = {
    neutral: 'bg-surface border-border text-muted',
    ok: 'bg-kind-subscribe/15 text-kind-subscribe border-transparent',
    warn: 'bg-kind-write/15 text-kind-write border-transparent',
    error: 'bg-red-500/15 text-red-400 border-transparent',
  }[tone];
  return <span className={`inline-flex items-center px-1.5 h-5 rounded text-[10px] font-medium border ${toneClass}`}>{children}</span>;
}
