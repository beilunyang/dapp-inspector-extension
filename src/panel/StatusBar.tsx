import { useCapturesStore } from './stores/captures-store';
import { useSettingsStore } from '@shared/stores/settings-store';
import { useT } from '@shared/stores/i18n-store';

export function StatusBar() {
  const t = useT();
  const count = useCapturesStore(s => s.calls.length);
  const monitoring = useSettingsStore(s => s.monitoring);
  return (
    <div
      className="flex items-center flex-shrink-0"
      style={{
        height: 24,
        gap: 14,
        padding: '0 12px',
        fontSize: 10.5,
        color: 'rgb(var(--fg-dim))',
        background: 'rgb(var(--surface))',
        borderTop: '1px solid rgb(var(--border))',
      }}
    >
      <span className="inline-flex items-center gap-[5px]">
        <span className="dot" style={{ color: monitoring ? 'rgb(var(--green))' : 'rgb(var(--fg-dim))' }} />
        {monitoring ? t('panel.status.connected') : t('panel.status.idle')}
      </span>
      <span className="mono">{t('panel.status.total', { n: count })}</span>
      <div className="flex-1" />
      <span>{t('panel.status.shortcut', { k: '⌘K' })}</span>
    </div>
  );
}
