// Shared form used by both the per-call MockDialog (from DetailHeader) and
// the Options-page rules manager. Reads a MockRule draft, emits updates via
// onChange, and surfaces JSON-body validation.

import { Icon } from '@shared/ui/Icon';
import { useT } from '@shared/stores/i18n-store';
import {
  DEFAULT_MOCK_ERROR_CODE,
  DEFAULT_MOCK_ERROR_MESSAGE,
  type MockRule,
  type MockResponseType,
  type MatchMode,
} from '@shared/rules';

export function validateMockRuleJson(rule: MockRule): string | null {
  if (rule.responseType !== 'result') return null;
  try { JSON.parse(rule.responseBody); return null; }
  catch { return 'invalid'; }
}

export function MockRuleForm({
  rule, onChange, jsonError,
}: {
  rule: MockRule;
  onChange: (patch: Partial<MockRule>) => void;
  jsonError?: string | null;
}) {
  const t = useT();
  return (
    <div className="grid gap-y-3 gap-x-4 mt-2" style={{ gridTemplateColumns: '120px 1fr' }}>
      <Label>{t('panel.mock.method')}</Label>
      <div className="flex gap-2 items-center">
        <TextInput
          value={rule.method}
          onChange={(v) => onChange({ method: v })}
          className="mono flex-1"
          placeholder="eth_*"
        />
        <Segmented<MatchMode>
          value={rule.matchMode}
          onChange={(v) => onChange({ matchMode: v })}
          options={[
            { id: 'exact',  label: 'exact'  },
            { id: 'prefix', label: 'prefix' },
            { id: 'glob',   label: 'glob'   },
          ]}
        />
      </div>

      <Label>{t('panel.mock.origin')}</Label>
      <TextInput
        value={rule.origin}
        onChange={(v) => onChange({ origin: v })}
        className="mono w-full"
        placeholder="*"
      />

      <Label>{t('panel.mock.responseType')}</Label>
      <Segmented<MockResponseType>
        value={rule.responseType}
        onChange={(v) => onChange({ responseType: v })}
        options={[
          { id: 'result', label: t('panel.mock.resultMode'), color: 'rgb(var(--green))' },
          { id: 'error',  label: t('panel.mock.errorMode'),  color: 'rgb(var(--red))' },
        ]}
      />

      {rule.responseType === 'result' && (
        <>
          <Label>{t('panel.mock.responseBody')}</Label>
          <div>
            <textarea
              value={rule.responseBody}
              onChange={(e) => onChange({ responseBody: e.target.value })}
              className="mono scroll"
              spellCheck={false}
              style={{
                width: '100%', minHeight: 140,
                padding: 10,
                background: 'rgb(var(--surface))',
                color: 'rgb(var(--fg))',
                border: `1px solid ${jsonError ? 'rgb(var(--red))' : 'rgb(var(--border))'}`,
                borderRadius: 6,
                fontSize: 12, lineHeight: 1.7,
                outline: 'none', resize: 'vertical',
              }}
            />
            <div
              className="text-[10.5px] mt-1"
              style={{ color: jsonError ? 'rgb(var(--red))' : 'rgb(var(--fg-dim))' }}
            >
              {jsonError ? t('panel.mock.invalidJson') : t('panel.mock.jsonHint')}
            </div>
          </div>
        </>
      )}

      {rule.responseType === 'error' && (
        <>
          <Label>{t('panel.mock.errorCode')}</Label>
          <TextInput
            type="number"
            value={String(rule.errorCode ?? DEFAULT_MOCK_ERROR_CODE)}
            onChange={(v) => onChange({ errorCode: Number(v) || 0 })}
            className="mono"
            style={{ width: 120 }}
          />
          <Label>{t('panel.mock.errorMessage')}</Label>
          <TextInput
            value={rule.errorMessage ?? DEFAULT_MOCK_ERROR_MESSAGE}
            onChange={(v) => onChange({ errorMessage: v })}
            className="mono w-full"
          />
        </>
      )}

      <Label>{t('panel.mock.delayMs')}</Label>
      <div>
        <TextInput
          type="number"
          value={String(rule.delayMs ?? 0)}
          onChange={(v) => onChange({ delayMs: Math.max(0, Number(v) || 0) })}
          className="mono"
          style={{ width: 120 }}
        />
        <div className="text-[10.5px] mt-1" style={{ color: 'rgb(var(--fg-dim))' }}>
          {t('panel.mock.delayHint')}
        </div>
      </div>
    </div>
  );
}

// ── MockRuleEditDialog ──────────────────────────────────────────────────────
// Modal wrapper used by the Options page for new/edit with no captured-call
// context. Close with Esc; ⌘↵ saves.

import { useEffect, useState } from 'react';
import { nanoid } from 'nanoid';

export function MockRuleEditDialog({
  initial, onClose, onSave, onDelete,
}: {
  initial?: MockRule;
  onClose: () => void;
  onSave: (rule: MockRule) => void;
  onDelete?: (id: string) => void;
}) {
  const t = useT();
  const [rule, setRule] = useState<MockRule>(() => initial ?? blankRule());
  const jsonError = validateMockRuleJson(rule);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!jsonError && rule.method.trim()) onSave(rule);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onSave, rule, jsonError]);

  const editing = !!initial;

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
          width: 720, maxHeight: '88vh',
          display: 'flex', flexDirection: 'column',
          background: 'rgb(var(--bg))', color: 'rgb(var(--fg))',
          border: '1px solid rgb(var(--border))', borderRadius: 10,
          overflow: 'hidden',
          boxShadow: '0 20px 48px rgba(0,0,0,0.5)',
        }}
      >
        <div
          className="flex items-center gap-[10px]"
          style={{ padding: '14px 18px', background: 'rgb(var(--surface))', borderBottom: '1px solid rgb(var(--border-soft))' }}
        >
          <Icon name="mock" size={14} style={{ color: 'rgb(var(--violet))' }} />
          <div className="text-[13.5px] font-semibold">
            {editing ? t('options.mockRules.editTitle') : t('panel.mock.newRule')}
          </div>
          <div className="flex-1" />
          <button className="btn icon ghost" onClick={onClose} aria-label="Close">
            <Icon name="x" size={13} />
          </button>
        </div>
        <div className="scroll flex-1 overflow-auto" style={{ padding: 20 }}>
          <MockRuleForm rule={rule} onChange={(patch) => setRule({ ...rule, ...patch })} jsonError={jsonError} />
        </div>
        <div
          className="flex gap-2"
          style={{ padding: '12px 18px', borderTop: '1px solid rgb(var(--border-soft))', background: 'rgb(var(--surface))' }}
        >
          {editing && onDelete && (
            <button
              className="btn ghost"
              style={{ color: 'rgb(var(--red))' }}
              onClick={() => { onDelete(rule.id); onClose(); }}
            >
              <Icon name="clear" size={12} /> {t('panel.mock.delete')}
            </button>
          )}
          <div className="flex-1" />
          <button className="btn ghost" onClick={onClose}>{t('panel.mock.cancel')}</button>
          <button
            className="btn accent"
            onClick={() => onSave(rule)}
            disabled={!rule.method.trim() || !!jsonError}
          >
            <Icon name="mock" size={12} /> {t('panel.mock.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

function blankRule(): MockRule {
  return {
    id: nanoid(),
    enabled: true,
    method: '',
    matchMode: 'exact',
    origin: '*',
    responseType: 'result',
    responseBody: 'null',
    delayMs: 0,
    errorCode: DEFAULT_MOCK_ERROR_CODE,
    errorMessage: DEFAULT_MOCK_ERROR_MESSAGE,
  };
}

// ── small local primitives ──────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11.5px] pt-[7px]" style={{ color: 'rgb(var(--fg-muted))' }}>
      {children}
    </div>
  );
}

function TextInput({
  value, onChange, className = '', style, placeholder, type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  type?: 'text' | 'number';
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={className}
      style={{
        height: 28,
        padding: '0 10px',
        fontSize: 12,
        background: 'rgb(var(--surface))',
        color: 'rgb(var(--fg))',
        border: '1px solid rgb(var(--border))',
        borderRadius: 6,
        outline: 'none',
        ...style,
      }}
    />
  );
}

function Segmented<T extends string>({
  value, onChange, options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; color?: string }[];
}) {
  return (
    <div
      className="inline-flex gap-[4px]"
      style={{
        padding: 2,
        background: 'rgb(var(--surface))',
        border: '1px solid rgb(var(--border))',
        borderRadius: 6,
        width: 'fit-content',
      }}
    >
      {options.map(o => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            style={{
              padding: '4px 12px',
              borderRadius: 4,
              fontSize: 11.5,
              fontWeight: 500,
              background: active ? (o.color ?? 'rgb(var(--accent))') : 'transparent',
              color: active ? 'rgb(var(--accent-fg))' : 'rgb(var(--fg-muted))',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
