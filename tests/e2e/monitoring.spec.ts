import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXT = path.resolve(__dirname, '../../dist');

test('monitoring off suppresses captures', async () => {
  const userDataDir = mkdtempSync(path.join(os.tmpdir(), 'dapp-insp-'));
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--no-first-run'],
  });
  const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker');
  const extId = sw.url().split('/')[2];

  const page = await ctx.newPage();
  await page.goto('http://localhost:4321/mock-dapp.html');
  await page.waitForFunction(() => (window as any).__mockDappReady === true);

  // Turn monitoring off via storage — SW broadcasts ControlMsg to tabs
  await sw.evaluate(async () => {
    await chrome.storage.local.set({ 'dapp-inspector:settings': { monitoring: false } });
  });
  await page.waitForTimeout(200); // let ControlMsg propagate

  await page.click('#chain');
  await page.waitForTimeout(600);

  const tabId = await sw.evaluate(async () => {
    const all = await chrome.tabs.query({ url: 'http://localhost:4321/*' });
    return all[0]?.id ?? -1;
  });

  const inspector = await ctx.newPage();
  await inspector.goto(`chrome-extension://${extId}/src/inspector/inspector.html?tabId=${tabId}`);
  await inspector.waitForTimeout(400);

  const rowCount = await inspector.locator('[role=listitem]').count();
  expect(rowCount).toBe(0);

  await ctx.close();
});
