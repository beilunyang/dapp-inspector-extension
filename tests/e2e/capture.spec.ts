import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXT = path.resolve(__dirname, '../../dist');

test('captures eth_chainId from the mock DApp', async () => {
  const userDataDir = mkdtempSync(path.join(os.tmpdir(), 'dapp-insp-'));
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXT}`,
      `--load-extension=${EXT}`,
      '--no-first-run',
    ],
  });

  let sw = ctx.serviceWorkers()[0];
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const extId = sw.url().split('/')[2];

  const page = await ctx.newPage();
  await page.goto('http://localhost:4321/mock-dapp.html');
  await page.waitForFunction(() => (window as any).__mockDappReady === true);
  await page.click('#chain');
  await page.waitForTimeout(300);

  const tabId = await sw.evaluate(async () => {
    const all = await chrome.tabs.query({ url: 'http://localhost:4321/*' });
    return all[0]?.id ?? -1;
  });
  expect(tabId).toBeGreaterThan(-1);

  const inspector = await ctx.newPage();
  await inspector.goto(`chrome-extension://${extId}/src/inspector/inspector.html?tabId=${tabId}`);
  await inspector.locator('[role=listitem]').filter({ hasText: 'eth_chainId' }).first()
    .waitFor({ state: 'visible', timeout: 5000 });
  const rows = await inspector.locator('[role=listitem]').allTextContents();
  expect(rows.some(r => r.includes('eth_chainId'))).toBe(true);

  await ctx.close();
});
