// Shared form used by both the per-call BlockDialog (from DetailHeader) and
// the Options-page Block rules manager.

import { useEffect, useState } from 'react';
import { nanoid } from 'nanoid';
import { Icon } from '@shared/ui/Icon';
import { useT } from '@shared/stores/i18n-store';
import {
  DEFAULT_BLOCK_ERROR_CODE,
  DEFAULT_BLOCK_ERROR_MESSAGE,
  DEFAULT_THROTTLE_MS,
  type BlockRule,
  type BlockMode,
  type MatchMode,
} from '@shared/rules';

export function BlockRuleForm({
  rule, onChange,
}: {
  rule: BlockRule;
  onChange: (patch: Partial<BlockRule>) => void;
}) {
  const t = useT();
  return (
    <div className="grid gap-y-3 gap-x-4 mt-2" style={{ gridTemplateColumns: '120px 1fr' }}>
      <Label>{t('panel.block.method')}</Label>
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

      <Label>{t('panel.block.origin')}</Label>
      <div>
        <TextInput
          value={rule.origin}
          onChange={(v) => onChange({ origin: v })}
          className="mono w-full"
          placeholder="*"
        />
        <div className="text-[10.5px] mt-1" style={{ color: 'rgb(var(--fg-dim))' }}>
          {t('panel.block.originHint')}
        </div>
      </div>

      <Label>{t('panel.block.mode')}</Label>
      <Segmented<BlockMode>
        value={rule.mode}
        onChange={(v) => onChange({ mode: v })}
        options={[
          { id: 'block',    label: t('panel.block.blockMode'),    color: 'rgb(var(--red))' },
          { id: 'throttle', label: t('panel.block.throttleMode'), color: 'rgb(var(--amber))' },
        ]}
      />

      {rule.mode === 'throttle' && (
        <>
          <Label>{t('panel.block.throttleMs')}</Label>
          <TextInput
            type="number"
            value={String(rule.throttleMs ?? DEFAULT_THROTTLE_MS)}
            onChange={(v) => onChange({ throttleMs: Math.max(0, Number(v) || 0) })}
            className="mono"
            style={{ width: 120 }}
          />
        </>
      )}

      {rule.mode === 'block' && (
        <>
          <Label>{t('panel.block.errorCode')}</Label>
          <TextInput
            type="number"
            value={String(rule.errorCode ?? DEFAULT_BLOCK_ERROR_CODE)}
            onChange={(v) => onChange({ errorCode: Number(v) || 0 })}
            className="mono"
            style={{ width: 120 }}
          />
          <Label>{t('panel.block.errorMessage')}</Label>
          <TextInput
            value={rule.errorMessage ?? DEFAULT_BLOCK_ERROR_MESSAGE}
            onChange={(v) => onChange({ errorMessage: v })}
            className="mono w-full"
          />
        </>
      )}
    </div>
  );
}

// ── BlockRuleEditDialog ─────────────────────────────────────────────────────
// Modal wrapper for new/edit flows without a captured-call context.

export function BlockRuleEditDialog({
  initial, onClose, onSave, onDelete,
}: {
  initial?: BlockRule;
  onClose: () => void;
  onSave: (rule: BlockRule) => void;
  onDelete?: (id: string) => void;
}) {
  const t = useT();
  const [rule, setRule] = useState<BlockRule>(() => initial ?? blankRule());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (rule.method.trim()) onSave(rule);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onSave, rule]);

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
          width: 680, maxHeight: '88vh',
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
          <Icon name="block" size={14} style={{ color: 'rgb(var(--red))' }} />
          <div className="text-[13.5px] font-semibold">
            {editing ? t('options.blockRules.editTitle') : t('panel.block.newRule')}
          </div>
          <div className="flex-1" />
          <button className="btn icon ghost" onClick={onClose} aria-label="Close">
            <Icon name="x" size={13} />
          </button>
        </div>
        <div className="scroll flex-1 overflow-auto" style={{ padding: 20 }}>
          <BlockRuleForm rule={rule} onChange={(patch) => setRule({ ...rule, ...patch })} />
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
              <Icon name="clear" size={12} /> {t('panel.block.delete')}
            </button>
          )}
          <div className="flex-1" />
          <button className="btn ghost" onClick={onClose}>{t('panel.block.cancel')}</button>
          <button
            className="btn accent"
            onClick={() => onSave(rule)}
            disabled={!rule.method.trim()}
          >
            <Icon name="block" size={12} /> {t('panel.block.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

function blankRule(): BlockRule {
  return {
    id: nanoid(),
    enabled: true,
    method: '',
    matchMode: 'exact',
    origin: '*',
    mode: 'block',
    throttleMs: DEFAULT_THROTTLE_MS,
    errorCode: DEFAULT_BLOCK_ERROR_CODE,
    errorMessage: DEFAULT_BLOCK_ERROR_MESSAGE,
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
