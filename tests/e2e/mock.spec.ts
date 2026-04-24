import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXT = path.resolve(__dirname, '../../dist');

const KEY = 'dapp-inspector:mock-rules';

async function launch(seed: unknown[]) {
  const userDataDir = mkdtempSync(path.join(os.tmpdir(), 'dapp-insp-'));
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--no-first-run'],
  });
  const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker');
  await sw.evaluate(async ({ key, rules }) => {
    await chrome.storage.local.set({ [key]: rules });
  }, { key: KEY, rules: seed });

  const page = await ctx.newPage();
  await page.goto('http://localhost:4321/mock-dapp.html');
  await page.waitForFunction(() => (window as unknown as { __mockDappReady?: boolean }).__mockDappReady === true);
  await page.waitForFunction(
    () => (window as unknown as { __dappInspectorRulesLoaded?: boolean }).__dappInspectorRulesLoaded === true,
    { timeout: 3000 },
  );
  return { ctx, page };
}

test('mock rule with result short-circuits the real provider', async () => {
  const { ctx, page } = await launch([{
    id: 'ok', enabled: true,
    method: 'eth_chainId', matchMode: 'exact', origin: '*',
    responseType: 'result',
    // Mocks Polygon (137)
    responseBody: '"0x89"',
  }]);

  const result = await page.evaluate(async () => {
    try {
      const r = await (window as unknown as { ethereum: { request: (a: { method: string; params: unknown[] }) => Promise<unknown> } })
        .ethereum.request({ method: 'eth_chainId', params: [] });
      return { ok: true, value: r };
    } catch (e) {
      const err = e as { message?: string };
      return { ok: false, message: err.message };
    }
  });

  expect(result.ok).toBe(true);
  expect(result.value).toBe('0x89');

  await ctx.close();
});

test('mock rule with error rejects with custom code/message', async () => {
  const { ctx, page } = await launch([{
    id: 'err', enabled: true,
    method: 'eth_chainId', matchMode: 'exact', origin: '*',
    responseType: 'error',
    responseBody: 'null',
    errorCode: -32999,
    errorMessage: 'Mocked failure',
  }]);

  const result = await page.evaluate(async () => {
    try {
      await (window as unknown as { ethereum: { request: (a: { method: string; params: unknown[] }) => Promise<unknown> } })
        .ethereum.request({ method: 'eth_chainId', params: [] });
      return { ok: true };
    } catch (e) {
      const err = e as { code?: number; message?: string };
      return { ok: false, code: err.code, message: err.message };
    }
  });

  expect(result.ok).toBe(false);
  expect(result.code).toBe(-32999);
  expect(result.message).toBe('Mocked failure');

  await ctx.close();
});

test('mock rule marks the captured call as MOCKED in the inspector', async () => {
  const { ctx, page } = await launch([{
    id: 'tagged', enabled: true,
    method: 'eth_chainId', matchMode: 'exact', origin: '*',
    responseType: 'result',
    responseBody: '"0x89"',
  }]);

  await page.click('#chain');
  await page.waitForTimeout(300);

  const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker');
  const tabId = await sw.evaluate(async () => {
    const all = await chrome.tabs.query({ url: 'http://localhost:4321/*' });
    return all[0]?.id ?? -1;
  });

  const inspector = await ctx.newPage();
  await inspector.goto(`chrome-extension://${sw.url().split('/')[2]}/src/inspector/inspector.html?tabId=${tabId}`);
  const row = inspector.locator('[role=listitem]').filter({ hasText: 'eth_chainId' }).first();
  await row.waitFor({ state: 'visible', timeout: 5000 });
  // The row marks a mocked call with a single-letter "M" tag whose tooltip is
  // "Mocked response"; assert that badge is present rather than the literal word.
  await expect(row.locator('[title="Mocked response"]')).toBeVisible();

  await ctx.close();
});
