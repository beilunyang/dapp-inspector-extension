import { Mascot } from '@shared/ui/Mascot';
import { useT } from '@shared/stores/i18n-store';

type Variant = 'waiting' | 'noDapp';

export function EmptyStates({ variant }: { variant: Variant }) {
  const t = useT();
  const title = t(`panel.empty.${variant}.title`);
  const hint = t(`panel.empty.${variant}.hint`);
  const mood = variant === 'noDapp' ? 'warn' : 'neutral';
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
      <Mascot size={72} mood={mood} />
      <div className="text-base font-medium">{title}</div>
      <div className="text-sm text-muted max-w-sm">{hint}</div>
    </div>
  );
}
