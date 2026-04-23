import { useState } from 'react';
import { useT } from '@shared/stores/i18n-store';
import { useMockRulesStore } from '@shared/stores/mock-rules-store';
import type { MockRule } from '@shared/rules';
import { Icon } from '@shared/ui/Icon';
import { PageTitle, MiniToggle } from '../primitives';
import { MockRuleEditDialog } from '../../panel/Detail/MockRuleForm';

export function Mock() {
  const t = useT();
  const rules = useMockRulesStore(s => s.rules);
  const upsert = useMockRulesStore(s => s.upsert);
  const remove = useMockRulesStore(s => s.remove);
  const toggle = useMockRulesStore(s => s.toggle);

  const [editing, setEditing] = useState<MockRule | null>(null);
  const [showNew, setShowNew] = useState(false);

  const activeCount = rules.filter(r => r.enabled).length;

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
          fontSize: 12,
          color: 'rgb(var(--fg-muted))',
        }}
      >
        <Icon name="mock" size={13} style={{ marginRight: 8, color: 'rgb(var(--violet))' }} />
        <span className="mono" style={{ color: 'rgb(var(--fg))' }}>
          {t('options.mock.activeCount', { active: activeCount, total: rules.length })}
        </span>
        <div className="flex-1" />
        <button
          className="btn accent"
          style={{ padding: '4px 10px' }}
          onClick={() => setShowNew(true)}
        >
          <Icon name="plus" size={12} /> {t('options.mock.newRule')}
        </button>
      </div>

      {rules.length === 0 ? (
        <div
          className="text-center"
          style={{
            padding: '40px 20px',
            background: 'rgb(var(--surface))',
            border: '1px dashed rgb(var(--border))',
            borderRadius: 6,
            color: 'rgb(var(--fg-muted))',
            fontSize: 12,
          }}
        >
          {t('options.mock.empty')}
        </div>
      ) : (
        <div
          style={{
            background: 'rgb(var(--surface))',
            border: '1px solid rgb(var(--border-soft))',
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          {/* Column header */}
          <div
            className="flex items-center uppercase"
            style={{
              height: 30, padding: '0 12px',
              fontSize: 10.5, fontWeight: 600, letterSpacing: 0.8,
              color: 'rgb(var(--fg-dim))',
              borderBottom: '1px solid rgb(var(--border-soft))',
            }}
          >
            <span style={{ width: 40 }}></span>
            <span style={{ flex: 1.4 }}>{t('options.mock.columnMethod')}</span>
            <span style={{ flex: 1 }}>{t('options.mock.columnOrigin')}</span>
            <span style={{ width: 90 }}>{t('options.mock.columnResponse')}</span>
            <span style={{ width: 70 }}>{t('options.mock.columnDelay')}</span>
            <span style={{ width: 30 }}></span>
          </div>

          {rules.map((r, i) => (
            <div
              key={r.id}
              className="flex items-center"
              style={{
                height: 44, padding: '0 12px',
                fontSize: 12.5,
                borderBottom: i < rules.length - 1 ? '1px solid rgb(var(--border-soft))' : 'none',
                opacity: r.enabled ? 1 : 0.55,
              }}
            >
              <div style={{ width: 40 }}>
                <MiniToggle value={r.enabled} onChange={(v) => void toggle(r.id, v)} />
              </div>
              <div className="mono truncate" style={{ flex: 1.4, fontWeight: 500 }}>
                {r.method || '—'}
              </div>
              <div className="mono truncate" style={{ flex: 1, fontSize: 11.5, color: 'rgb(var(--fg-muted))' }}>
                {r.origin || '*'}
              </div>
              <div style={{ width: 90 }}>
                <span
                  className="chip"
                  style={{
                    fontSize: 10,
                    color: r.responseType === 'error' ? 'rgb(var(--red))' : 'rgb(var(--violet))',
                  }}
                >
                  {r.responseType.toUpperCase()}
                </span>
              </div>
              <div
                className="mono"
                style={{ width: 70, fontSize: 11, color: 'rgb(var(--fg-muted))' }}
              >
                {r.delayMs ? `${r.delayMs}ms` : '—'}
              </div>
              <div style={{ width: 30, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn icon ghost"
                  onClick={() => setEditing(r)}
                  aria-label="Edit rule"
                >
                  <Icon name="menu" size={13} style={{ color: 'rgb(var(--fg-dim))' }} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <MockRuleEditDialog
          onClose={() => setShowNew(false)}
          onSave={async (r) => { await upsert(r); setShowNew(false); }}
        />
      )}
      {editing && (
        <MockRuleEditDialog
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={async (r) => { await upsert(r); setEditing(null); }}
          onDelete={async (id) => { await remove(id); setEditing(null); }}
        />
      )}
    </div>
  );
}
