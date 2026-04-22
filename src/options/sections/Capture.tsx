import { useEffect, useState } from 'react';
import { useT } from '@shared/stores/i18n-store';
import { useSettingsStore } from '@shared/stores/settings-store';

export function Capture() {
  const t = useT();
  const retention = useSettingsStore(s => s.retentionMax);
  const ignored = useSettingsStore(s => s.ignoredMethods);
  const update = useSettingsStore(s => s.update);
  const [storage, setStorage] = useState<{ used: number; quota: number } | null>(null);

  useEffect(() => {
    navigator.storage?.estimate?.().then(({ usage = 0, quota = 0 }) => setStorage({ used: usage, quota }));
  }, []);

  const pct = storage ? Math.round((storage.used / storage.quota) * 100) : 0;

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">{t('options.nav.capture')}</h1>

      <div>
        <label className="text-sm">{t('options.capture.retention')}: <b>{retention}</b></label>
        <input type="range" min={500} max={50000} step={500} value={retention}
          onChange={e => update({ retentionMax: Number(e.target.value) })}
          className="w-full mt-2" />
      </div>

      <div>
        <div className="text-sm mb-2">{t('options.capture.ignoredMethods')}</div>
        <div className="flex flex-wrap gap-2">
          {ignored.map(m => (
            <span key={m} className="px-2 h-6 inline-flex items-center text-xs rounded border border-border">
              {m}
              <button className="ml-1 text-muted hover:text-fg" onClick={() => update({ ignoredMethods: ignored.filter(x => x !== m) })}>×</button>
            </span>
          ))}
          <AddChip onAdd={(v) => update({ ignoredMethods: [...ignored, v] })} />
        </div>
      </div>

      <div>
        <div className="text-sm mb-1">{t('options.capture.storage')}</div>
        {storage ? (
          <>
            <div className="h-2 bg-surface rounded overflow-hidden">
              <div className="h-full bg-accent" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <div className="text-xs text-muted mt-1">
              {(storage.used / 1024 / 1024).toFixed(1)} MB / {(storage.quota / 1024 / 1024).toFixed(0)} MB ({pct}%)
            </div>
          </>
        ) : <div className="text-xs text-muted">—</div>}
      </div>
    </section>
  );
}

function AddChip({ onAdd }: { onAdd: (v: string) => void }) {
  const [v, setV] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (v) { onAdd(v); setV(''); } }}>
      <input value={v} onChange={e => setV(e.target.value)}
        placeholder="eth_..." className="h-6 px-2 text-xs bg-surface border border-border rounded outline-none focus:border-accent" />
    </form>
  );
}
