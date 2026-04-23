import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXT = path.resolve(__dirname, '../../dist');

const KEY = 'dapp-inspector:block-rules';

test('block rule makes a matching RPC request reject', async () => {
  const userDataDir = mkdtempSync(path.join(os.tmpdir(), 'dapp-insp-'));
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--no-first-run'],
  });
  const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker');

  // Seed a block rule for eth_chainId, all origins
  await sw.evaluate(async (k) => {
    await chrome.storage.local.set({
      [k]: [{
        id: 'test',
        enabled: true,
        method: 'eth_chainId',
        matchMode: 'exact',
        origin: '*',
        mode: 'block',
        errorCode: 4321,
        errorMessage: 'Blocked in E2E',
      }],
    });
  }, KEY);

  // Open the DApp — content script picks up the rule via storage broadcast
  const page = await ctx.newPage();
  await page.goto('http://localhost:4321/mock-dapp.html');
  await page.waitForFunction(() => (window as unknown as { __mockDappReady?: boolean }).__mockDappReady === true);
  // Wait for block rules to arrive at the injected script via SW bootstrap.
  await page.waitForFunction(
    () => (window as unknown as { __dappInspectorRulesLoaded?: boolean }).__dappInspectorRulesLoaded === true,
    { timeout: 3000 },
  );

  // Trigger eth_chainId and inspect the result via the page's provider
  const result = await page.evaluate(async () => {
    try {
      const r = await (window as unknown as { ethereum: { request: (a: { method: string; params: unknown[] }) => Promise<unknown> } }).ethereum.request({ method: 'eth_chainId', params: [] });
      return { ok: true, value: r };
    } catch (e) {
      const err = e as { code?: number; message?: string };
      return { ok: false, code: err.code, message: err.message };
    }
  });

  expect(result.ok).toBe(false);
  expect(result.code).toBe(4321);
  expect(result.message).toBe('Blocked in E2E');

  await ctx.close();
});

test('throttle rule delays a matching RPC request', async () => {
  const userDataDir = mkdtempSync(path.join(os.tmpdir(), 'dapp-insp-'));
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--no-first-run'],
  });
  const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker');

  await sw.evaluate(async (k) => {
    await chrome.storage.local.set({
      [k]: [{
        id: 'test-throttle',
        enabled: true,
        method: 'eth_chainId',
        matchMode: 'exact',
        origin: '*',
        mode: 'throttle',
        throttleMs: 800,
      }],
    });
  }, KEY);

  const page = await ctx.newPage();
  await page.goto('http://localhost:4321/mock-dapp.html');
  await page.waitForFunction(() => (window as unknown as { __mockDappReady?: boolean }).__mockDappReady === true);
  // Wait for block rules to arrive at the injected script via SW bootstrap.
  await page.waitForFunction(
    () => (window as unknown as { __dappInspectorRulesLoaded?: boolean }).__dappInspectorRulesLoaded === true,
    { timeout: 3000 },
  );

  const elapsed = await page.evaluate(async () => {
    const start = performance.now();
    await (window as unknown as { ethereum: { request: (a: { method: string; params: unknown[] }) => Promise<unknown> } }).ethereum.request({ method: 'eth_chainId', params: [] });
    return performance.now() - start;
  });

  expect(elapsed).toBeGreaterThanOrEqual(700);

  await ctx.close();
});
