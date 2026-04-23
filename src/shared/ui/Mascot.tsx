// D1 rounded-square bot from the design prototype: gradient body, white eyes
// with dark pupils, a small antenna on top, and an expression-driven mouth.

type Mood = 'happy' | 'neutral' | 'warn';

export function Mascot({
  size = 32,
  mood = 'neutral',
  idPrefix,
}: { size?: number; mood?: Mood; idPrefix?: string }) {
  // Ensure unique gradient ids when multiple mascots are on the same page.
  const gid = `mascot-grad-${idPrefix ?? Math.random().toString(36).slice(2, 8)}`;

  // Mouth paths — 96-unit viewBox following the prototype.
  const mouthByMood: Record<Mood, React.ReactNode> = {
    happy:   <path d="M38 62 Q48 68 58 62" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" fill="none" />,
    neutral: <path d="M40 63 L56 63" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" fill="none" />,
    warn:    <path d="M38 66 Q48 60 58 66" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" fill="none" />,
  };

  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="rgb(var(--accent))" />
          <stop offset="100%" stopColor="rgb(var(--accent-2))" />
        </linearGradient>
      </defs>
      {/* Antenna */}
      <path d="M48 18 L48 10" stroke={`url(#${gid})`} strokeWidth="4" strokeLinecap="round" />
      <circle cx="48" cy="8" r="3" fill={`url(#${gid})`} />
      {/* Body */}
      <rect x="14" y="18" width="68" height="66" rx="22" fill={`url(#${gid})`} />
      {/* Eyes — sclera */}
      <circle cx="36" cy="46" r="6.5" fill="#fff" />
      <circle cx="60" cy="46" r="6.5" fill="#fff" />
      {/* Pupils — fixed dark shade (like the toolbar icon). --accent-fg
          is ~white in light theme, which makes pupils blend into the
          sclera and vanish. */}
      <circle cx="38" cy="47" r="2.8" fill="#1c1834" />
      <circle cx="62" cy="47" r="2.8" fill="#1c1834" />
      {/* Mouth */}
      {mouthByMood[mood]}
    </svg>
  );
}
