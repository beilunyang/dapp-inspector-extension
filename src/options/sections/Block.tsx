import { useState } from 'react';
import { useT } from '@shared/stores/i18n-store';
import { useBlockRulesStore } from '@shared/stores/block-rules-store';
import type { BlockRule } from '@shared/rules';
import { Icon } from '@shared/ui/Icon';
import { PageTitle, MiniToggle } from '../primitives';
import { BlockRuleEditDialog } from '../../panel/Detail/BlockRuleForm';

export function Block() {
  const t = useT();
  const rules = useBlockRulesStore(s => s.rules);
  const upsert = useBlockRulesStore(s => s.upsert);
  const remove = useBlockRulesStore(s => s.remove);
  const toggle = useBlockRulesStore(s => s.toggle);

  const [editing, setEditing] = useState<BlockRule | null>(null);
  const [showNew, setShowNew] = useState(false);

  const activeCount = rules.filter(r => r.enabled).length;

  return (
    <div>
      <PageTitle title={t('options.nav.block')} subtitle={t('options.blockSec.sub')} />

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
        <Icon name="block" size={13} style={{ marginRight: 8, color: 'rgb(var(--red))' }} />
        <span className="mono" style={{ color: 'rgb(var(--fg))' }}>
          {t('options.blockSec.activeCount', { active: activeCount, total: rules.length })}
        </span>
        <div className="flex-1" />
        <button
          className="btn accent"
          style={{ padding: '4px 10px' }}
          onClick={() => setShowNew(true)}
        >
          <Icon name="plus" size={12} /> {t('options.blockSec.newRule')}
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
          {t('options.blockSec.empty')}
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
            <span style={{ flex: 1.4 }}>{t('options.blockSec.columnMethod')}</span>
            <span style={{ flex: 1 }}>{t('options.blockSec.columnOrigin')}</span>
            <span style={{ width: 90 }}>{t('options.blockSec.columnMode')}</span>
            <span style={{ width: 120 }}>{t('options.blockSec.columnValue')}</span>
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
                    color: r.mode === 'block' ? 'rgb(var(--red))' : 'rgb(var(--amber))',
                  }}
                >
                  {r.mode.toUpperCase()}
                </span>
              </div>
              <div
                className="mono truncate"
                style={{ width: 120, fontSize: 11, color: 'rgb(var(--fg-muted))' }}
                title={valueDescription(r)}
              >
                {valueDescription(r)}
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
        <BlockRuleEditDialog
          onClose={() => setShowNew(false)}
          onSave={async (r) => { await upsert(r); setShowNew(false); }}
        />
      )}
      {editing && (
        <BlockRuleEditDialog
          initial={editing}
          onClose={() => setEditing(null)}
          onSave={async (r) => { await upsert(r); setEditing(null); }}
          onDelete={async (id) => { await remove(id); setEditing(null); }}
        />
      )}
    </div>
  );
}

function valueDescription(r: BlockRule): string {
  if (r.mode === 'throttle') return `${r.throttleMs ?? 1000}ms`;
  return `code ${r.errorCode ?? 4001}`;
}
