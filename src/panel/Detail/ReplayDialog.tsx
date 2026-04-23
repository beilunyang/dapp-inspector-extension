import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@shared/ui/Icon';
import { useT } from '@shared/stores/i18n-store';
import type { AdminMsg } from '@shared/messages';
import type { CapturedCall } from '@shared/types';

export function ReplayDialog({
  call, tabId, onClose,
}: { call: CapturedCall; tabId: number; onClose: () => void }) {
  const t = useT();
  const originalJson = useMemo(() => safeStringify(call.params), [call.params]);
  const [text, setText] = useState(originalJson);
  const [error, setError] = useState<string | null>(null);

  const edited = text !== originalJson;

  // Esc to close, ⌘↵ to send
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        void submit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  async function submit() {
    let params: unknown;
    try { params = JSON.parse(text); }
    catch { setError(t('panel.replay.invalidJson')); return; }
    const msg: AdminMsg = {
      source: 'dappinsp-admin',
      kind: 'replay',
      tabId,
      method: call.method,
      params,
    };
    await chrome.runtime.sendMessage(msg);
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
          width: 680, maxHeight: '80vh',
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
          <Icon name="replay" size={14} style={{ color: 'rgb(var(--accent))' }} />
          <div className="text-[13.5px] font-semibold">{t('panel.replay.title')}</div>
          <span className="chip mono" style={{ color: 'rgb(var(--fg-muted))' }}>{call.method}</span>
          <div className="flex-1" />
          <button className="btn icon ghost" onClick={onClose} aria-label="Close">
            <Icon name="x" size={13} />
          </button>
        </div>

        {/* Body */}
        <div className="scroll flex-1 overflow-auto" style={{ padding: 20 }}>
          <div
            className="grid gap-y-[14px] gap-x-[18px] text-[12.5px] mb-5"
            style={{ gridTemplateColumns: '90px 1fr' }}
          >
            <div style={{ color: 'rgb(var(--fg-muted))' }}>Origin</div>
            <div className="mono" style={{ color: 'rgb(var(--fg-muted))' }}>{safeHost(call.origin)}</div>
            <div style={{ color: 'rgb(var(--fg-muted))' }}>Kind</div>
            <div><span className="chip">{call.kind}</span></div>
            {call.chainId && (
              <>
                <div style={{ color: 'rgb(var(--fg-muted))' }}>Chain</div>
                <div className="mono">{call.chainId}</div>
              </>
            )}
          </div>

          <div
            className="flex items-center gap-2 mb-2 text-[11px] font-medium"
            style={{ color: 'rgb(var(--fg-muted))' }}
          >
            <span>{t('panel.replay.paramsLabel')}</span>
            {edited && (
              <span style={{ color: 'rgb(var(--accent))' }}>{t('panel.replay.edited')}</span>
            )}
          </div>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setError(null); }}
            className="mono scroll"
            spellCheck={false}
            style={{
              width: '100%', minHeight: 180,
              padding: 14,
              background: 'rgb(var(--surface))',
              color: 'rgb(var(--fg))',
              border: `1px solid ${error ? 'rgb(var(--red))' : 'rgb(var(--border))'}`,
              borderRadius: 6,
              fontSize: 12, lineHeight: 1.7,
              outline: 'none', resize: 'vertical',
            }}
          />
          {error && (
            <div className="text-[11px] mt-1" style={{ color: 'rgb(var(--red))' }}>{error}</div>
          )}

          <div
            className="flex gap-2 mt-4"
            style={{
              padding: 10, borderRadius: 6, fontSize: 11.5,
              color: 'rgb(var(--fg-muted))',
              background: 'color-mix(in oklab, rgb(var(--amber)) 10%, rgb(var(--surface)))',
              border: '1px solid color-mix(in oklab, rgb(var(--amber)) 30%, rgb(var(--border)))',
            }}
          >
            <Icon name="warn" size={13} style={{ color: 'rgb(var(--amber))', flexShrink: 0, marginTop: 2 }} />
            <div>{t('panel.replay.warnReprompt')}</div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex gap-2 justify-end"
          style={{ padding: '12px 18px', borderTop: '1px solid rgb(var(--border-soft))', background: 'rgb(var(--surface))' }}
        >
          <button
            className="btn ghost"
            disabled={!edited}
            onClick={() => { setText(originalJson); setError(null); }}
          >
            {t('panel.replay.revert')}
          </button>
          <button className="btn accent" onClick={() => void submit()}>
            <Icon name="replay" size={12} /> {t('panel.replay.send')}
          </button>
        </div>
      </div>
    </div>
  );
}

function safeStringify(v: unknown): string {
  try { return JSON.stringify(v ?? [], null, 2); } catch { return '[]'; }
}

function safeHost(url: string): string {
  try { return new URL(url).host; } catch { return url; }
}
