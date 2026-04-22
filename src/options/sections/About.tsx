import { useT } from '@shared/stores/i18n-store';
import { Mascot } from '@shared/ui/Mascot';

export function About() {
  const t = useT();
  const version = chrome.runtime.getManifest().version;
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-4 p-6 border border-border rounded">
        <Mascot size={64} mood="happy" />
        <div>
          <div className="text-lg font-semibold">DApp Inspector</div>
          <div className="text-xs text-muted">{t('options.about.version')} {version}</div>
        </div>
      </div>
      <div>
        <div className="text-sm font-medium mb-2">{t('options.about.links')}</div>
        <ul className="space-y-1 text-xs">
          <li><a className="text-accent hover:underline" href="https://github.com/" target="_blank" rel="noreferrer">GitHub</a></li>
          <li><a className="text-accent hover:underline" href="https://chromewebstore.google.com/" target="_blank" rel="noreferrer">Chrome Web Store</a></li>
        </ul>
      </div>
      <div>
        <div className="text-sm font-medium mb-2">{t('options.about.changelog')}</div>
        <ul className="space-y-1 text-xs text-muted">
          <li><b>0.1.0</b> — Initial P0 release: DevTools panel, Popup, Options.</li>
        </ul>
      </div>
    </section>
  );
}
