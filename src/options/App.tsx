import { useEffect, useState } from 'react';
import { useT } from '@shared/stores/i18n-store';
import { Mascot } from '@shared/ui/Mascot';
import { General } from './sections/General';
import { Capture } from './sections/Capture';
import { Mock } from './sections/Mock';
import { Advanced } from './sections/Advanced';
import { About } from './sections/About';

const SECTIONS = ['general', 'capture', 'mock', 'advanced', 'about'] as const;
type Section = typeof SECTIONS[number];

export function App() {
  const t = useT();
  const [section, setSection] = useState<Section>(() => {
    const h = location.hash.replace('#', '') as Section;
    return (SECTIONS as readonly string[]).includes(h) ? h : 'general';
  });
  useEffect(() => {
    const onHash = () => {
      const h = location.hash.replace('#', '') as Section;
      if ((SECTIONS as readonly string[]).includes(h)) setSection(h);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <div className="min-h-screen flex bg-bg text-fg">
      <aside className="w-[200px] border-r border-border p-3 flex flex-col gap-1">
        <div className="flex items-center gap-2 px-2 py-2 mb-2">
          <Mascot size={24} mood="happy" />
          <span className="text-sm font-semibold">DApp Inspector</span>
        </div>
        {SECTIONS.map(s => (
          <a key={s} href={`#${s}`}
            className={`px-2 py-1.5 text-xs rounded ${section === s ? 'bg-accent/10 text-fg' : 'text-muted hover:text-fg'}`}>
            {t(`options.nav.${s}`)}
          </a>
        ))}
      </aside>
      <main className="flex-1 max-w-3xl p-6">
        {section === 'general' && <General />}
        {section === 'capture' && <Capture />}
        {section === 'mock' && <Mock />}
        {section === 'advanced' && <Advanced />}
        {section === 'about' && <About />}
      </main>
    </div>
  );
}
