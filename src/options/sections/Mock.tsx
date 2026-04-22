import { useT } from '@shared/stores/i18n-store';
import { Icon } from '@shared/ui/Icon';
import { PageTitle, MiniToggle } from '../primitives';

const SAMPLE_RULES = [
  { method: 'eth_chainId',    origin: 'localhost:3000',  enabled: true,  color: 'rgb(var(--amber))' },
  { method: 'eth_accounts',   origin: 'polymarket.com',  enabled: true,  color: 'rgb(var(--fg-muted))' },
  { method: 'personal_sign',  origin: '*',               enabled: false, color: 'rgb(var(--violet))' },
];

export function Mock() {
  const t = useT();
  return (
    <div>
      <PageTitle title={t('options.nav.mock')} subtitle={t('options.mock.sub')} />

      <div
        className="flex items-center mb-[10px]"
        style={{
          padding: '10px 12px',
          background: 'rgb(var(--surface))',
          border: '1px solid rgb(var(--border-soft))',
          borderRadius: 6,
          fontSize: 11.5,
          color: 'rgb(var(--fg-muted))',
        }}
      >
        <Icon name="mock" size={12} style={{ marginRight: 8, color: 'rgb(var(--violet))' }} />
        {t('options.mock.locked')} · {t('options.mock.lockedHint')}
        <div className="flex-1" />
        <button className="btn accent" disabled style={{ padding: '4px 10px' }}>
          <Icon name="plus" size={12} /> {t('options.mock.new')}
        </button>
      </div>

      <div className="pointer-events-none select-none" style={{ opacity: 0.55 }}>
        {SAMPLE_RULES.map((r, i) => (
          <div
            key={i}
            className="flex items-center gap-[10px] mb-[6px]"
            style={{
              padding: '10px 12px',
              background: 'rgb(var(--surface))',
              border: '1px solid rgb(var(--border-soft))',
              borderRadius: 6,
            }}
          >
            <div style={{ width: 3, height: 20, background: r.color, borderRadius: 2 }} />
            <div className="flex-1 min-w-0">
              <div className="mono text-[12px]">{r.method}</div>
              <div className="text-[10.5px]" style={{ color: 'rgb(var(--fg-dim))' }}>
                on <span className="mono">{r.origin}</span>
              </div>
            </div>
            <span className="chip" style={{ fontSize: 10 }}>MOCK</span>
            <MiniToggle value={r.enabled} />
            <button className="btn icon ghost" disabled>
              <Icon name="dot3" size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
