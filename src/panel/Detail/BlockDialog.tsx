import { useEffect, useMemo, useState } from 'react';
import { nanoid } from 'nanoid';
import { Icon } from '@shared/ui/Icon';
import { useT } from '@shared/stores/i18n-store';
import { useBlockRulesStore } from '@shared/stores/block-rules-store';
import {
  methodMatches,
  originMatches,
  DEFAULT_BLOCK_ERROR_CODE,
  DEFAULT_BLOCK_ERROR_MESSAGE,
  DEFAULT_THROTTLE_MS,
  type BlockRule,
} from '@shared/rules';
import type { CapturedCall } from '@shared/types';
import { BlockRuleForm } from './BlockRuleForm';

export function BlockDialog({
  call, onClose,
}: { call: CapturedCall; onClose: () => void }) {
  const t = useT();
  const rules = useBlockRulesStore(s => s.rules);
  const upsert = useBlockRulesStore(s => s.upsert);
  const remove = useBlockRulesStore(s => s.remove);

  const host = safeHost(call.origin);
  const existing = useMemo(
    () => rules.filter(r =>
      methodMatches(r, call.method) && originMatches(r, call.origin),
    ),
    [rules, call.method, call.origin],
  );

  const [form, setForm] = useState<BlockRule>(() => ({
    id: nanoid(),
    enabled: true,
    method: call.method,
    matchMode: 'exact',
    origin: host || '*',
    mode: 'block',
    throttleMs: DEFAULT_THROTTLE_MS,
    errorCode: DEFAULT_BLOCK_ERROR_CODE,
    errorMessage: DEFAULT_BLOCK_ERROR_MESSAGE,
  }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function save() {
    await upsert(form);
    onClose();
  }

  return (
    <div
      className="ui"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 720, maxHeight: '85vh',
          display: 'flex', flexDirection: 'column',
          background: 'rgb(var(--bg))', color: 'rgb(var(--fg))',
          border: '1px solid rgb(var(--border))', borderRadius: 10,
          overflow: 'hidden',
          boxShadow: '0 20px 48px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center gap-[10px]"
          style={{ padding: '14px 18px', background: 'rgb(var(--surface))', borderBottom: '1px solid rgb(var(--border-soft))' }}
        >
          <Icon name="block" size={14} style={{ color: 'rgb(var(--red))' }} />
          <div className="text-[13.5px] font-semibold">{t('panel.block.title')}</div>
          <span className="chip mono" style={{ color: 'rgb(var(--fg-muted))' }}>{call.method}</span>
          <div className="flex-1" />
          <button className="btn icon ghost" onClick={onClose} aria-label="Close">
            <Icon name="x" size={13} />
          </button>
        </div>

        {/* Body */}
        <div className="scroll flex-1 overflow-auto" style={{ padding: 20 }}>
          <div className="text-[12px] mb-4" style={{ color: 'rgb(var(--fg-muted))' }}>
            {t('panel.block.intro')}
          </div>

          <SectionLabel>{t('panel.block.existingFor')}</SectionLabel>
          {existing.length === 0 ? (
            <div className="text-[11.5px] mb-4 italic" style={{ color: 'rgb(var(--fg-dim))' }}>
              {t('panel.block.noRules')}
            </div>
          ) : (
            <div className="mb-4">
              {existing.map(r => (
                <div
                  key={r.id}
                  className="flex items-center gap-[10px]"
                  style={{
                    padding: '10px 12px', marginBottom: 6,
                    background: 'rgb(var(--surface))',
                    border: '1px solid rgb(var(--border-soft))',
                    borderRadius: 6,
                    opacity: r.enabled ? 1 : 0.55,
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="mono text-[12px] font-medium truncate">{r.method}</span>
                      <span
                        className="chip"
                        style={{
                          color: r.mode === 'block' ? 'rgb(var(--red))' : 'rgb(var(--amber))',
                          fontSize: 10,
                        }}
                      >
                        {r.mode.toUpperCase()}
                      </span>
                      {r.mode === 'throttle' && (
                        <span className="mono text-[10.5px]" style={{ color: 'rgb(var(--fg-muted))' }}>{r.throttleMs}ms</span>
                      )}
                    </div>
                    <div className="text-[10.5px]" style={{ color: 'rgb(var(--fg-dim))' }}>
                      on <span className="mono">{r.origin}</span> · match {r.matchMode}
                    </div>
                  </div>
                  <button
                    className="btn icon ghost"
                    title={t('panel.block.delete')}
                    onClick={() => void remove(r.id)}
                  >
                    <Icon name="clear" size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <SectionLabel>{t('panel.block.newRule')}</SectionLabel>
          <BlockRuleForm rule={form} onChange={(patch) => setForm({ ...form, ...patch })} />

          <div
            className="flex gap-2 mt-4"
            style={{
              padding: 10, borderRadius: 6, fontSize: 11,
              color: 'rgb(var(--fg-muted))',
              background: 'color-mix(in oklab, rgb(var(--amber)) 10%, rgb(var(--surface)))',
              border: '1px solid color-mix(in oklab, rgb(var(--amber)) 30%, rgb(var(--border)))',
            }}
          >
            <Icon name="warn" size={12} style={{ color: 'rgb(var(--amber))', flexShrink: 0, marginTop: 2 }} />
            <div>{t('panel.block.priority')}</div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex gap-2 justify-end"
          style={{ padding: '12px 18px', borderTop: '1px solid rgb(var(--border-soft))', background: 'rgb(var(--surface))' }}
        >
          <button className="btn ghost" onClick={onClose}>{t('panel.block.cancel')}</button>
          <button className="btn accent" onClick={() => void save()} disabled={!form.method.trim()}>
            <Icon name="block" size={12} /> {t('panel.block.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="uppercase mb-2"
      style={{ fontSize: 10.5, fontWeight: 600, color: 'rgb(var(--fg-dim))', letterSpacing: 0.8 }}
    >
      {children}
    </div>
  );
}

function safeHost(url: string): string {
  try { return new URL(url).host; } catch { return url; }
}
