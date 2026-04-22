import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXT = path.resolve(__dirname, '../../dist');

test('changing language in Options updates Popup copy', async () => {
  const userDataDir = mkdtempSync(path.join(os.tmpdir(), 'dapp-insp-'));
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--no-first-run'],
  });
  let sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker');
  const extId = sw.url().split('/')[2];

  const options = await ctx.newPage();
  await options.goto(`chrome-extension://${extId}/src/options/options.html#general`);
  await options.getByRole('button', { name: '中文' }).click();

  const popup = await ctx.newPage();
  await popup.goto(`chrome-extension://${extId}/src/popup/popup.html`);
  await expect(popup.getByText('监控').first()).toBeVisible({ timeout: 3000 });

  await ctx.close();
});
