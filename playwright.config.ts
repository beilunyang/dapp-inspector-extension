import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:4321' },
  webServer: {
    command: 'pnpm build && npx http-server tests/fixtures -p 4321 -c-1',
    port: 4321, reuseExistingServer: false, timeout: 60_000,
  },
  reporter: 'list',
});
