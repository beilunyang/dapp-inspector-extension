import { useEffect, useMemo, useState } from 'react';
import { nanoid } from 'nanoid';
import { Icon } from '@shared/ui/Icon';
import { useT } from '@shared/stores/i18n-store';
import { useMockRulesStore } from '@shared/stores/mock-rules-store';
import {
  methodMatches,
  originMatches,
  DEFAULT_MOCK_ERROR_CODE,
  DEFAULT_MOCK_ERROR_MESSAGE,
  DEFAULT_MOCK_DELAY_MS,
  type MockRule,
} from '@shared/rules';
import type { CapturedCall } from '@shared/types';
import { MockRuleForm, validateMockRuleJson } from './MockRuleForm';

export function MockDialog({
  call, onClose,
}: { call: CapturedCall; onClose: () => void }) {
  const t = useT();
  const rules = useMockRulesStore(s => s.rules);
  const upsert = useMockRulesStore(s => s.upsert);
  const remove = useMockRulesStore(s => s.remove);

  const host = safeHost(call.origin);
  const existing = useMemo(
    () => rules.filter(r =>
      methodMatches(r, call.method) && originMatches(r, call.origin),
    ),
    [rules, call.method, call.origin],
  );

  // Seed the new-rule form: for OK results, suggest the captured value.
  const initialResponseBody = useMemo(() => {
    try { return JSON.stringify(call.result ?? null, null, 2); }
    catch { return 'null'; }
  }, [call.result]);

  const [form, setForm] = useState<MockRule>(() => ({
    id: nanoid(),
    enabled: true,
    method: call.method,
    matchMode: 'exact',
    origin: host || '*',
    responseType: 'result',
    responseBody: initialResponseBody,
    delayMs: DEFAULT_MOCK_DELAY_MS,
    errorCode: DEFAULT_MOCK_ERROR_CODE,
    errorMessage: DEFAULT_MOCK_ERROR_MESSAGE,
  }));
  const jsonError = validateMockRuleJson(form);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function save() {
    if (jsonError) return;
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
          width: 760, maxHeight: '88vh',
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
          <Icon name="mock" size={14} style={{ color: 'rgb(var(--violet))' }} />
          <div className="text-[13.5px] font-semibold">{t('panel.mock.title')}</div>
          <span className="chip mono" style={{ color: 'rgb(var(--fg-muted))' }}>{call.method}</span>
          <div className="flex-1" />
          <button className="btn icon ghost" onClick={onClose} aria-label="Close">
            <Icon name="x" size={13} />
          </button>
        </div>

        {/* Body */}
        <div className="scroll flex-1 overflow-auto" style={{ padding: 20 }}>
          <div className="text-[12px] mb-4" style={{ color: 'rgb(var(--fg-muted))' }}>
            {t('panel.mock.intro')}
          </div>

          <SectionLabel>{t('panel.mock.existingFor')}</SectionLabel>
          {existing.length === 0 ? (
            <div className="text-[11.5px] mb-4 italic" style={{ color: 'rgb(var(--fg-dim))' }}>
              {t('panel.mock.noRules')}
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
                      <span className="chip" style={{ color: 'rgb(var(--violet))', fontSize: 10 }}>
                        {r.responseType.toUpperCase()}
                      </span>
                      {r.delayMs ? (
                        <span className="mono text-[10.5px]" style={{ color: 'rgb(var(--fg-muted))' }}>{r.delayMs}ms</span>
                      ) : null}
                    </div>
                    <div className="text-[10.5px]" style={{ color: 'rgb(var(--fg-dim))' }}>
                      on <span className="mono">{r.origin}</span> · match {r.matchMode}
                    </div>
                  </div>
                  <button
                    className="btn icon ghost"
                    title={t('panel.mock.delete')}
                    onClick={() => void remove(r.id)}
                  >
                    <Icon name="clear" size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <SectionLabel>{t('panel.mock.newRule')}</SectionLabel>
          <MockRuleForm rule={form} onChange={(patch) => setForm({ ...form, ...patch })} jsonError={jsonError} />

          <div
            className="flex gap-2 mt-4"
            style={{
              padding: 10, borderRadius: 6, fontSize: 11,
              color: 'rgb(var(--fg-muted))',
              background: 'color-mix(in oklab, rgb(var(--violet)) 10%, rgb(var(--surface)))',
              border: '1px solid color-mix(in oklab, rgb(var(--violet)) 30%, rgb(var(--border)))',
            }}
          >
            <Icon name="warn" size={12} style={{ color: 'rgb(var(--violet))', flexShrink: 0, marginTop: 2 }} />
            <div>{t('panel.mock.priority')}</div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex gap-2 justify-end"
          style={{ padding: '12px 18px', borderTop: '1px solid rgb(var(--border-soft))', background: 'rgb(var(--surface))' }}
        >
          <button className="btn ghost" onClick={onClose}>{t('panel.mock.cancel')}</button>
          <button className="btn accent" onClick={() => void save()} disabled={!form.method.trim() || !!jsonError}>
            <Icon name="mock" size={12} /> {t('panel.mock.save')}
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
