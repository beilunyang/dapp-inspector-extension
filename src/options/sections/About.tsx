import { useT } from '@shared/stores/i18n-store';
import { Mascot } from '@shared/ui/Mascot';
import { Icon } from '@shared/ui/Icon';
import { SectionTitle } from '../primitives';

export function About() {
  const t = useT();
  const version = chrome.runtime.getManifest().version;
  return (
    <div>
      <div
        className="flex items-center gap-4 mb-6"
        style={{ padding: 24, borderRadius: 10, background: 'rgb(var(--surface))', border: '1px solid rgb(var(--border-soft))' }}
      >
        <Mascot size={64} mood="happy" />
        <div className="flex-1 min-w-0">
          <div className="text-[18px] font-semibold">DApp Inspector</div>
          <div className="text-[12px]" style={{ color: 'rgb(var(--fg-muted))' }}>
            {t('options.about.tagline')}
          </div>
          <div className="text-[11px] mb-[6px]" style={{ color: 'rgb(var(--fg-dim))' }}>
            {t('options.about.scope')}
          </div>
          <div
            className="mono text-[11px] inline-flex items-center gap-[5px]"
            style={{ color: 'rgb(var(--fg-dim))' }}
          >
            <span className="dot" style={{ color: 'rgb(var(--green))' }} />
            {t('options.about.version')} {version}
          </div>
        </div>
      </div>

      <SectionTitle>{t('options.about.links')}</SectionTitle>
      <ul className="space-y-2 mb-6 text-[12px]">
        <li>
          <a
            className="inline-flex items-center gap-2"
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'rgb(var(--accent))' }}
          >
            <Icon name="link" size={12} /> {t('options.about.github')}
          </a>
        </li>
        <li>
          <a
            className="inline-flex items-center gap-2"
            href="https://chromewebstore.google.com/"
            target="_blank"
            rel="noreferrer"
            style={{ color: 'rgb(var(--accent))' }}
          >
            <Icon name="link" size={12} /> {t('options.about.store')}
          </a>
        </li>
      </ul>

      <SectionTitle>{t('options.about.changelog')}</SectionTitle>
      <ul className="space-y-2 text-[12px]" style={{ color: 'rgb(var(--fg-muted))' }}>
        <li>
          <b className="mono" style={{ color: 'rgb(var(--fg))' }}>0.1.0</b> — Initial P0 release: DevTools panel, Popup, Options.
        </li>
      </ul>
    </div>
  );
}
