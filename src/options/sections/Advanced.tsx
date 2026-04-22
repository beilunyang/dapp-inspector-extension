import { useState } from 'react';
import { useT } from '@shared/stores/i18n-store';
import { useSettingsStore } from '@shared/stores/settings-store';
import { DEFAULT_SETTINGS } from '@shared/settings';
import { openDb } from '@shared/idb';

export function Advanced() {
  const t = useT();
  const update = useSettingsStore(s => s.update);
  const [clearText, setClearText] = useState('');

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">{t('options.nav.advanced')}</h1>

      <div className="p-4 border border-red-500/30 rounded">
        <div className="text-sm font-medium">{t('options.advanced.clearHistory')}</div>
        <div className="mt-2 flex items-center gap-2">
          <input value={clearText} onChange={e => setClearText(e.target.value)}
            placeholder={t('options.advanced.clearHistoryConfirm')}
            className="h-8 px-2 text-xs bg-surface border border-border rounded outline-none" />
          <button disabled={clearText !== 'CLEAR'}
            onClick={async () => {
              const db = await openDb();
              await db.clearAll();
              db.close();
              setClearText('');
              alert('History cleared.');
            }}
            className="h-8 px-3 text-xs rounded bg-red-500/80 text-white disabled:opacity-40 disabled:cursor-not-allowed">
            {t('common.confirm')}
          </button>
        </div>
      </div>

      <div className="p-4 border border-border rounded">
        <div className="text-sm font-medium">{t('options.advanced.resetSettings')}</div>
        <button onClick={() => update(DEFAULT_SETTINGS)}
          className="mt-2 h-8 px-3 text-xs rounded border border-border hover:border-accent">
          {t('common.confirm')}
        </button>
      </div>
    </section>
  );
}
