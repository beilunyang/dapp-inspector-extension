import { Icon } from '@shared/ui/Icon';
import { Badge } from '@shared/ui/Badge';
import type { CapturedCall } from '@shared/types';
import { useT } from '@shared/stores/i18n-store';

export function DetailHeader({ call }: { call: CapturedCall }) {
  const t = useT();
  const tone = call.status === 'ok' ? 'ok' : call.status === 'error' ? 'error' : 'warn';
  return (
    <div className="h-12 flex items-center gap-2 px-4 border-b border-border bg-surface">
      <span className="font-mono text-sm truncate">{call.method}</span>
      <Badge tone={tone as any}>{call.status.toUpperCase()}</Badge>
      <span className="text-[11px] text-muted truncate">{call.origin}</span>
      <div className="flex-1" />
      <DisabledBtn icon="refresh" label={t('panel.detail.replay')} />
      <DisabledBtn icon="circle" label={t('panel.detail.mock')} />
      <DisabledBtn icon="ban" label={t('panel.detail.block')} />
    </div>
  );
}

function DisabledBtn({ icon, label }: { icon: string; label: string }) {
  const t = useT();
  return (
    <button disabled title={t('panel.detail.disabledHint')}
      className="inline-flex items-center gap-1 text-xs px-2 h-7 rounded border border-border text-muted opacity-50 cursor-not-allowed">
      <Icon name={icon} size={12} /> {label}
    </button>
  );
}
