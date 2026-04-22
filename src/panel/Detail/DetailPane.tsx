import { useCapturesStore } from '../stores/captures-store';
import { DetailHeader } from './Header';
import { DetailTabs } from './Tabs';
import { useT } from '@shared/stores/i18n-store';

export function DetailPane({ selectedId }: { selectedId: string | null }) {
  const call = useCapturesStore(s => s.calls.find(c => c.id === selectedId) ?? null);
  const t = useT();
  if (!call) {
    return (
      <div
        className="flex-1 flex items-center justify-center text-[13px]"
        style={{ color: 'rgb(var(--fg-muted))', background: 'rgb(var(--bg))' }}
      >
        {t('panel.detail.empty')}
      </div>
    );
  }
  return (
    <div
      className="scroll flex-1 flex flex-col min-w-0 overflow-hidden"
      style={{ background: 'rgb(var(--bg))' }}
    >
      <DetailHeader call={call} />
      <DetailTabs call={call} />
    </div>
  );
}
