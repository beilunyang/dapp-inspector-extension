import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@shared/tokens.css';
import { ErrorBoundary } from '@shared/ui/ErrorBoundary';
import { ThemeProvider } from '@shared/ui/ThemeProvider';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>,
);
