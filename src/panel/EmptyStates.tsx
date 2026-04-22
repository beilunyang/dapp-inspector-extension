import { Mascot } from '@shared/ui/Mascot';
import { useT } from '@shared/stores/i18n-store';

type Variant = 'waiting' | 'noDapp';

export function EmptyStates({ variant }: { variant: Variant }) {
  const t = useT();
  const title = t(`panel.empty.${variant}.title`);
  const hint = t(`panel.empty.${variant}.hint`);
  const mood = variant === 'noDapp' ? 'warn' : 'neutral';
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3 text-center p-8">
      <Mascot size={72} mood={mood} />
      <div className="text-[15px] font-medium" style={{ color: 'rgb(var(--fg))' }}>{title}</div>
      <div className="text-[12.5px] max-w-sm" style={{ color: 'rgb(var(--fg-muted))' }}>{hint}</div>
    </div>
  );
}
