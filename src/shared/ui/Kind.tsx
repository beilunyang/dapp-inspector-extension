import type { Kind as KindType } from '../types';

const LABEL: Record<KindType, string> = { read: 'RD', write: 'WR', sign: 'SG', subscribe: 'SB' };
const COLOR: Record<KindType, string> = {
  read: 'bg-kind-read/15 text-kind-read',
  write: 'bg-kind-write/15 text-kind-write',
  sign: 'bg-kind-sign/15 text-kind-sign',
  subscribe: 'bg-kind-subscribe/15 text-kind-subscribe',
};

export function Kind({ kind }: { kind: KindType }) {
  return (
    <span className={`inline-flex items-center justify-center w-6 h-5 rounded text-[10px] font-semibold tracking-wide ${COLOR[kind]}`}>
      {LABEL[kind]}
    </span>
  );
}
