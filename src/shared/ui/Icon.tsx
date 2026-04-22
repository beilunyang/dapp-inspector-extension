const PATHS: Record<string, string> = {
  search: 'M21 21l-4.3-4.3m1.3-5.7a7 7 0 11-14 0 7 7 0 0114 0z',
  x: 'M18 6L6 18M6 6l12 12',
  chevDown: 'M6 9l6 6 6-6',
  chevRight: 'M9 6l6 6-6 6',
  chevdown: 'M6 9l6 6 6-6',
  chevright: 'M9 6l6 6-6 6',
  download: 'M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2',
  clear: 'M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1A1.7 1.7 0 009 19.4a1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1A1.7 1.7 0 004.6 9a1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z',
  power: 'M12 2v10M5 8a9 9 0 1014 0',
  refresh: 'M3 12a9 9 0 0115.5-6.4L21 8m0-5v5h-5M21 12a9 9 0 01-15.5 6.4L3 16m0 5v-5h5',
  replay: 'M3 12a9 9 0 0115.5-6.4L21 8m0-5v5h-5M21 12a9 9 0 01-15.5 6.4L3 16m0 5v-5h5',
  circle: 'M12 21a9 9 0 100-18 9 9 0 000 18z',
  ban: 'M4.9 4.9l14.2 14.2M3 12a9 9 0 1018 0 9 9 0 00-18 0z',
  block: 'M4.9 4.9l14.2 14.2M3 12a9 9 0 1018 0 9 9 0 00-18 0z',
  mock: 'M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83',
  globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3a13.5 13.5 0 010 18M12 3a13.5 13.5 0 000 18',
  wallet: 'M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm13 5a1 1 0 100 2 1 1 0 000-2z',
  cpu: 'M6 6h12v12H6zM9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3M10 10h4v4h-4z',
  link: 'M10 14a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1M14 10a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1',
  shield: 'M12 3l8 3v6c0 4.4-3.2 8.5-8 9-4.8-0.5-8-4.6-8-9V6l8-3z',
  bolt: 'M13 2L3 14h7l-1 8 10-12h-7l1-8z',
  dot3: 'M6 12h0M12 12h0M18 12h0',
  check: 'M5 13l4 4L19 7',
  logo: 'M12 2l9 5v10l-9 5-9-5V7l9-5z',
  plus: 'M12 5v14M5 12h14',
  menu: 'M4 6h16M4 12h16M4 18h16',
  sync: 'M4 4v6h6M20 20v-6h-6M4 10a8 8 0 0113.6-5.7L20 7M20 14a8 8 0 01-13.6 5.7L4 17',
  tx: 'M3 8h13l-4-4M21 16H8l4 4',
  warn: 'M12 3L2 21h20L12 3zM12 10v5M12 17v0.5',
};

export function Icon({ name, size = 16, className = '', style }: { name: keyof typeof PATHS | string; size?: number; className?: string; style?: React.CSSProperties }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} style={style} aria-hidden>
      <path d={d} />
    </svg>
  );
}
