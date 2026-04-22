import { useEffect, useState } from 'react';
import { useT } from '@shared/stores/i18n-store';
import { useSettingsStore } from '@shared/stores/settings-store';
import { Icon } from '@shared/ui/Icon';
import { PageTitle, Row } from '../primitives';

export function Capture() {
  const t = useT();
  const retention = useSettingsStore(s => s.retentionMax);
  const ignored = useSettingsStore(s => s.ignoredMethods);
  const update = useSettingsStore(s => s.update);
  const [storage, setStorage] = useState<{ used: number; quota: number } | null>(null);

  useEffect(() => {
    navigator.storage?.estimate?.().then(({ usage = 0, quota = 0 }) => setStorage({ used: usage, quota }));
  }, []);

  const pct = storage && storage.quota > 0 ? Math.round((storage.used / storage.quota) * 100) : 0;

  return (
    <div>
      <PageTitle title={t('options.nav.capture')} subtitle={t('options.capture.sub')} />

      {/* Retention + storage card */}
      <div
        className="mb-[14px]"
        style={{ padding: 14, borderRadius: 8, background: 'rgb(var(--surface))', border: '1px solid rgb(var(--border-soft))' }}
      >
        <div className="flex items-center mb-[10px]">
          <div className="flex-1">
            <div className="text-[13px] font-medium">{t('options.capture.retention')}</div>
            <div className="text-[11.5px] mt-[2px]" style={{ color: 'rgb(var(--fg-muted))' }}>
              {t('options.capture.retentionDesc')}
            </div>
          </div>
          <div className="mono text-[13px] font-semibold" style={{ color: 'rgb(var(--accent))' }}>
            {retention}
          </div>
        </div>
        <input
          type="range"
          min={500}
          max={50000}
          step={500}
          value={retention}
          onChange={e => update({ retentionMax: Number(e.target.value) })}
          className="w-full"
          style={{ accentColor: 'rgb(var(--accent))' }}
        />
        <div className="flex justify-between text-[10.5px] mb-[14px]" style={{ color: 'rgb(var(--fg-dim))' }}>
          <span>500</span><span>5k</span><span>10k</span><span>25k</span><span>50k</span>
        </div>

        <div className="flex text-[11.5px] mb-[6px]" style={{ color: 'rgb(var(--fg-muted))' }}>
          <span>{t('options.capture.storage')}</span>
          <span className="flex-1" />
          {storage ? (
            <span className="mono">
              {(storage.used / 1024 / 1024).toFixed(2)} MB / {(storage.quota / 1024 / 1024).toFixed(0)} MB
            </span>
          ) : <span className="mono">—</span>}
        </div>
        <div
          className="overflow-hidden"
          style={{ height: 6, borderRadius: 3, background: 'rgb(var(--surface-hi))' }}
        >
          <div
            style={{
              width: `${Math.min(pct, 100)}%`,
              height: '100%',
              background: 'linear-gradient(90deg, rgb(var(--accent)), rgb(var(--green)))',
            }}
          />
        </div>
      </div>

      <Row
        title={t('options.capture.ignoredMethods')}
        desc={t('options.capture.ignoredDesc')}
        control={
          <div className="flex flex-wrap gap-1 justify-end" style={{ maxWidth: 280 }}>
            {ignored.map(m => (
              <span key={m} className="chip mono">
                {m}
                <button
                  onClick={() => update({ ignoredMethods: ignored.filter(x => x !== m) })}
                  aria-label={`Remove ${m}`}
                  className="ml-1 inline-flex items-center"
                  style={{ background: 'transparent', border: 0, padding: 0, cursor: 'pointer', opacity: 0.55 }}
                >
                  <Icon name="x" size={10} />
                </button>
              </span>
            ))}
            <AddChip onAdd={(v) => update({ ignoredMethods: [...ignored, v] })} label={t('options.capture.add')} />
          </div>
        }
      />
    </div>
  );
}

function AddChip({ onAdd, label }: { onAdd: (v: string) => void; label: string }) {
  const [editing, setEditing] = useState(false);
  const [v, setV] = useState('');
  if (!editing) {
    return (
      <span
        className="chip cursor-pointer"
        style={{ borderStyle: 'dashed' }}
        onClick={() => setEditing(true)}
      >
        <Icon name="plus" size={10} /> {label}
      </span>
    );
  }
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (v.trim()) onAdd(v.trim());
        setV('');
        setEditing(false);
      }}
    >
      <input
        autoFocus
        value={v}
        onChange={e => setV(e.target.value)}
        onBlur={() => { setEditing(false); setV(''); }}
        placeholder="eth_..."
        className="mono"
        style={{
          height: 20,
          padding: '0 7px',
          fontSize: 11,
          background: 'rgb(var(--surface-2))',
          border: '1px solid rgb(var(--accent))',
          borderRadius: 4,
          color: 'rgb(var(--fg))',
          outline: 'none',
          width: 140,
        }}
      />
    </form>
  );
}
