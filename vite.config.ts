import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: { '@shared': path.resolve(__dirname, 'src/shared') },
  },
  build: {
    rollupOptions: {
      input: {
        panel: 'src/panel/panel.html',
        devtools: 'src/panel/devtools.html',
        popup: 'src/popup/popup.html',
        options: 'src/options/options.html',
        inspector: 'src/inspector/inspector.html',
      },
    },
  },
  server: { port: 5173, strictPort: true },
});
