import { useEffect, useRef, useState } from 'react';
import { Icon } from '@shared/ui/Icon';
import { useT } from '@shared/stores/i18n-store';
import type { CapturedCall } from '@shared/types';
import {
  toJsonRpcEnvelope,
  toEthersSnippet,
  toMarkdownRow,
} from '@shared/call-export';

type Format = 'jsonRpc' | 'ethers' | 'markdown';

const SERIALIZERS: Record<Format, (c: CapturedCall) => string> = {
  jsonRpc:  toJsonRpcEnvelope,
  ethers:   toEthersSnippet,
  markdown: toMarkdownRow,
};

export function CopyMenu({
  call, onClose,
}: { call: CapturedCall; onClose: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [justCopied, setJustCopied] = useState<Format | null>(null);
  const [failed, setFailed] = useState<Format | null>(null);

  // Close on outside click or Esc. The menu pops up next to the ⋯ button;
  // the DetailHeader owns positioning.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener('keydown', onKey);
    // Defer the click listener so the opening click doesn't immediately close us.
    const h = setTimeout(() => window.addEventListener('mousedown', onClick), 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(h);
      window.removeEventListener('mousedown', onClick);
    };
  }, [onClose]);

  async function copy(fmt: Format) {
    const text = SERIALIZERS[fmt](call);
    try {
      await navigator.clipboard.writeText(text);
      setJustCopied(fmt);
      setFailed(null);
      setTimeout(() => onClose(), 700);
    } catch {
      setFailed(fmt);
      setJustCopied(null);
    }
  }

  return (
    <div
      ref={ref}
      className="ui"
      style={{
        position: 'absolute',
        right: 0,
        top: '100%',
        marginTop: 4,
        minWidth: 260,
        background: 'rgb(var(--bg))',
        border: '1px solid rgb(var(--border))',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
        padding: 4,
        zIndex: 60,
        fontSize: 13,
      }}
    >
      <div
        className="uppercase"
        style={{
          padding: '6px 10px 4px',
          fontSize: 10, fontWeight: 600, letterSpacing: 0.8,
          color: 'rgb(var(--fg-dim))',
        }}
      >
        {t('panel.copy.title')}
      </div>
      <MenuItem
        icon="download"
        label={t('panel.copy.jsonRpc')}
        hint={t('panel.copy.jsonRpcHint')}
        state={stateFor('jsonRpc', justCopied, failed, t)}
        onClick={() => void copy('jsonRpc')}
      />
      <MenuItem
        icon="bolt"
        label={t('panel.copy.ethers')}
        hint={t('panel.copy.ethersHint')}
        state={stateFor('ethers', justCopied, failed, t)}
        onClick={() => void copy('ethers')}
      />
      <MenuItem
        icon="link"
        label={t('panel.copy.markdown')}
        hint={t('panel.copy.markdownHint')}
        state={stateFor('markdown', justCopied, failed, t)}
        onClick={() => void copy('markdown')}
      />
    </div>
  );
}

function stateFor(
  fmt: Format,
  justCopied: Format | null,
  failed: Format | null,
  t: (k: string) => string,
): { tone: 'none' | 'ok' | 'error'; hint?: string } {
  if (justCopied === fmt) return { tone: 'ok', hint: t('panel.copy.copied') };
  if (failed === fmt)     return { tone: 'error', hint: t('panel.copy.copyFailed') };
  return { tone: 'none' };
}

function MenuItem({
  icon, label, hint, state, onClick,
}: {
  icon: string;
  label: string;
  hint: string;
  state: { tone: 'none' | 'ok' | 'error'; hint?: string };
  onClick: () => void;
}) {
  const hintColor =
    state.tone === 'ok'    ? 'rgb(var(--green))' :
    state.tone === 'error' ? 'rgb(var(--red))' :
                             'rgb(var(--fg-dim))';
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        width: '100%', textAlign: 'left',
        padding: '8px 10px',
        border: 'none', background: 'transparent',
        cursor: 'pointer', borderRadius: 4,
        color: 'rgb(var(--fg))',
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgb(var(--surface))'}
      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
    >
      <Icon name={icon} size={14} style={{ marginTop: 2, color: 'rgb(var(--fg-muted))' }} />
      <div className="flex-1 min-w-0">
        <div className="text-[12.5px] font-medium">{label}</div>
        <div className="text-[10.5px] mt-[2px]" style={{ color: hintColor }}>
          {state.hint ?? hint}
        </div>
      </div>
      {state.tone === 'ok' && (
        <Icon name="check" size={13} style={{ marginTop: 2, color: 'rgb(var(--green))' }} />
      )}
    </button>
  );
}
