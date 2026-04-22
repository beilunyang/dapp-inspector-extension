import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@shared/tokens.css';
import { ErrorBoundary } from '@shared/ui/ErrorBoundary';
import { ThemeProvider } from '@shared/ui/ThemeProvider';
import { App } from '../panel/App';

function TabPicker({ onPick }: { onPick: (tabId: number) => void }) {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);
  useEffect(() => { chrome.tabs.query({}).then(setTabs); }, []);
  return (
    <div className="h-full flex items-center justify-center bg-bg text-fg">
      <div className="w-[420px] p-4 border border-border rounded bg-surface">
        <div className="text-sm mb-2">Select a tab to inspect</div>
        <ul className="space-y-1">
          {tabs.filter(t => t.id && t.url?.startsWith('http')).map(t => (
            <li key={t.id}>
              <button onClick={() => onPick(t.id!)} className="w-full text-left px-2 py-1 text-xs hover:bg-elevated rounded truncate">
                {t.title ?? t.url}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Root() {
  const params = new URLSearchParams(location.search);
  const initial = Number(params.get('tabId'));
  const [tabId, setTabId] = useState<number | null>(Number.isFinite(initial) && initial > 0 ? initial : null);
  if (tabId == null) return <TabPicker onPick={setTabId} />;
  return <App tabId={tabId} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
