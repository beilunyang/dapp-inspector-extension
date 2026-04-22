import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@shared/tokens.css';
import { ThemeProvider } from '@shared/ui/ThemeProvider';
import { App } from './App';

const tabId = chrome.devtools?.inspectedWindow?.tabId ?? -1;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App tabId={tabId} />
    </ThemeProvider>
  </StrictMode>,
);
