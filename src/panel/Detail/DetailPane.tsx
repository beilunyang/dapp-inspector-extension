import { useCapturesStore } from '../stores/captures-store';
import { DetailHeader } from './Header';
import { DetailTabs } from './Tabs';
import { useT } from '@shared/stores/i18n-store';

export function DetailPane({ selectedId }: { selectedId: string | null }) {
  const call = useCapturesStore(s => s.calls.find(c => c.id === selectedId) ?? null);
  const t = useT();
  if (!call) return (
    <div className="flex-1 flex items-center justify-center text-muted text-sm">
      {t('panel.detail.empty')}
    </div>
  );
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-bg">
      <DetailHeader call={call} />
      <DetailTabs call={call} />
    </div>
  );
}
