import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXT = path.resolve(__dirname, '../../dist');

test('replay re-fires a captured call and appears as a new entry', async () => {
  const userDataDir = mkdtempSync(path.join(os.tmpdir(), 'dapp-insp-'));
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--no-first-run'],
  });
  const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker');
  const extId = sw.url().split('/')[2];

  const page = await ctx.newPage();
  await page.goto('http://localhost:4321/mock-dapp.html');
  await page.waitForFunction(() => (window as unknown as { __mockDappReady?: boolean }).__mockDappReady === true);
  await page.click('#chain');
  await page.waitForTimeout(300);

  const tabId = await sw.evaluate(async () => {
    const all = await chrome.tabs.query({ url: 'http://localhost:4321/*' });
    return all[0]?.id ?? -1;
  });

  const inspector = await ctx.newPage();
  await inspector.goto(`chrome-extension://${extId}/src/inspector/inspector.html?tabId=${tabId}`);
  const firstRow = inspector.locator('[role=listitem]').filter({ hasText: 'eth_chainId' }).first();
  await firstRow.waitFor({ state: 'visible', timeout: 5000 });
  await firstRow.click();

  // Click Replay button in the detail header
  await inspector.getByRole('button', { name: /Replay/i }).click();

  // Dialog visible; submit without edit
  await expect(inspector.getByText(/Replay call/i)).toBeVisible();
  await inspector.getByRole('button', { name: /Send/i }).click();

  // Two rows with eth_chainId
  await expect.poll(
    async () => await inspector.locator('[role=listitem]').filter({ hasText: 'eth_chainId' }).count(),
    { timeout: 5000 },
  ).toBeGreaterThanOrEqual(2);

  await ctx.close();
});
