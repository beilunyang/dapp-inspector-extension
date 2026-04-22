import { useEffect, useState } from 'react';
import { useT } from '@shared/stores/i18n-store';
import { Mascot } from '@shared/ui/Mascot';
import { Icon } from '@shared/ui/Icon';
import { General } from './sections/General';
import { Capture } from './sections/Capture';
import { Mock } from './sections/Mock';
import { Advanced } from './sections/Advanced';
import { About } from './sections/About';

const SECTIONS = [
  { id: 'general',  icon: 'settings' },
  { id: 'capture',  icon: 'cpu' },
  { id: 'mock',     icon: 'mock' },
  { id: 'advanced', icon: 'bolt' },
  { id: 'about',    icon: 'logo' },
] as const;

type Section = typeof SECTIONS[number]['id'];

export function App() {
  const t = useT();
  const [section, setSection] = useState<Section>(() => {
    const h = location.hash.replace('#', '') as Section;
    return SECTIONS.some(s => s.id === h) ? h : 'general';
  });
  useEffect(() => {
    const onHash = () => {
      const h = location.hash.replace('#', '') as Section;
      if (SECTIONS.some(s => s.id === h)) setSection(h);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <div
      className="ui min-h-screen flex text-[13px]"
      style={{ background: 'rgb(var(--bg))', color: 'rgb(var(--fg))' }}
    >
      <aside
        className="flex-shrink-0 flex flex-col"
        style={{
          width: 200,
          borderRight: '1px solid rgb(var(--border))',
          background: 'rgb(var(--surface))',
          padding: '14px 10px',
        }}
      >
        <div className="flex items-center gap-2 px-2 pb-3 mb-1">
          <Mascot size={22} mood="neutral" />
          <div className="text-[13px] font-semibold">{t('options.title')}</div>
        </div>
        {SECTIONS.map(s => {
          const isActive = section === s.id;
          return (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center gap-2 mb-[1px]"
              style={{
                padding: '6px 8px',
                borderRadius: 5,
                fontSize: 12.5,
                color: isActive ? 'rgb(var(--fg))' : 'rgb(var(--fg-muted))',
                background: isActive ? 'rgb(var(--surface-2))' : 'transparent',
                textDecoration: 'none',
              }}
            >
              <Icon name={s.icon} size={13} /> {t(`options.nav.${s.id}`)}
            </a>
          );
        })}
      </aside>
      <main className="scroll flex-1 max-w-3xl" style={{ padding: '20px 28px' }}>
        {section === 'general' && <General />}
        {section === 'capture' && <Capture />}
        {section === 'mock' && <Mock />}
        {section === 'advanced' && <Advanced />}
        {section === 'about' && <About />}
      </main>
    </div>
  );
}
