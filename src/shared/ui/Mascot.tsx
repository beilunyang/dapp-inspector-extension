export function Mascot({ size = 32, mood = 'neutral' }: { size?: number; mood?: 'happy' | 'neutral' | 'warn' }) {
  const eye = mood === 'happy' ? <path d="M8 12c0.8-1 2.2-1 3 0M13 12c0.8-1 2.2-1 3 0" /> : <>
    <circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </>;
  const mouth = mood === 'warn' ? <path d="M9 17h6" /> : <path d="M9 16c1.2 1 4 1 6 0" />;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="text-accent-fg" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="rgb(var(--accent))" />
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">{eye}{mouth}</g>
    </svg>
  );
}
