import { useT } from '@shared/stores/i18n-store';

export function Mock() {
  const t = useT();
  const fake = [
    { match: 'eth_call (UniswapV2Router)', action: 'Return cached', enabled: true },
    { match: 'eth_sendTransaction', action: 'Delay 2s', enabled: false },
    { match: 'personal_sign', action: 'Return custom signature', enabled: false },
  ];
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">{t('options.nav.mock')}</h1>
      <div className="p-4 border border-border rounded bg-surface">
        <div className="text-sm font-medium">{t('options.mock.locked')}</div>
        <div className="text-xs text-muted mt-1">{t('options.mock.lockedHint')}</div>
      </div>
      <div className="opacity-50 pointer-events-none select-none">
        {fake.map((r, i) => (
          <div key={i} className="flex items-center h-10 px-3 border-b border-border last:border-b-0 text-xs">
            <span className="font-mono flex-1 truncate">{r.match}</span>
            <span className="text-muted">{r.action}</span>
            <span className="ml-3 w-8 h-4 rounded-full bg-muted/30" />
          </div>
        ))}
      </div>
    </section>
  );
}
