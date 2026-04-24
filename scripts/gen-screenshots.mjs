// Capture the four README screenshots:
//   docs/images/{panel,detail,options,popup}.png
//
// Requires: `pnpm build` has produced ./dist. Launches a real Chromium with
// the extension loaded, seeds a few rules + captures, and writes PNGs.
//
// Run:  pnpm build && node scripts/gen-screenshots.mjs
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const EXT = path.resolve(repoRoot, 'dist');
const OUT = path.resolve(repoRoot, 'docs/images');
const FIXTURES = path.resolve(repoRoot, 'tests/fixtures');

if (!existsSync(path.join(EXT, 'manifest.json'))) {
  console.error('dist/ missing — run `pnpm build` first.');
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

// ── start fixture http-server ──
const server = spawn('npx', ['http-server', FIXTURES, '-p', '4321', '-c-1'], {
  cwd: repoRoot,
  stdio: ['ignore', 'pipe', 'pipe'],
});
// Don't trust stdout — poll the port instead so this works regardless of
// http-server version / silent flag.
await new Promise((resolve, reject) => {
  const deadline = Date.now() + 15000;
  const tick = async () => {
    try {
      const r = await fetch('http://localhost:4321/mock-dapp.html');
      if (r.ok) return resolve();
    } catch { /* not up yet */ }
    if (Date.now() > deadline) return reject(new Error('http-server timeout'));
    setTimeout(tick, 150);
  };
  tick();
});

const userDataDir = mkdtempSync(path.join(os.tmpdir(), 'dapp-insp-shots-'));
const ctx = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  viewport: { width: 1280, height: 720 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--no-first-run'],
});

const cleanup = async () => {
  try { await ctx.close(); } catch {}
  try { server.kill(); } catch {}
};
process.on('SIGINT', () => cleanup().then(() => process.exit(1)));

try {
  const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker');
  const extId = sw.url().split('/')[2];

  // Seed rules + a non-default setting so the Options page isn't empty.
  await sw.evaluate(async () => {
    await chrome.storage.local.set({
      'dapp-inspector:mock-rules': [
        {
          id: 'm1', enabled: true,
          method: 'eth_chainId', matchMode: 'exact', origin: '*',
          responseType: 'result', responseBody: '"0x89"',
        },
        {
          id: 'm2', enabled: false,
          method: 'eth_getBalance', matchMode: 'prefix', origin: '*',
          responseType: 'result', responseBody: '"0x1bc16d674ec80000"',
          delayMs: 250,
        },
        {
          id: 'm3', enabled: true,
          method: 'wallet_switchEthereumChain', matchMode: 'exact', origin: '*',
          responseType: 'error', responseBody: 'null',
          errorCode: 4902, errorMessage: 'Chain not configured (mocked)',
        },
      ],
      'dapp-inspector:block-rules': [
        {
          id: 'b1', enabled: true,
          method: 'eth_sendTransaction', matchMode: 'exact', origin: '*',
          mode: 'block', errorCode: 4001, errorMessage: 'User rejected (simulated)',
        },
        {
          id: 'b2', enabled: true,
          method: 'eth_getLogs', matchMode: 'prefix', origin: '*',
          mode: 'throttle', throttleMs: 1500,
        },
      ],
    });
  });

  // ── populate the panel with captures ──
  const page = await ctx.newPage();
  await page.goto('http://localhost:4321/mock-dapp.html');
  await page.waitForFunction(() => window.__mockDappReady === true);
  try {
    await page.waitForFunction(
      () => window.__dappInspectorRulesLoaded === true,
      { timeout: 3000 },
    );
  } catch { /* rules load is best-effort */ }
  for (const id of ['chain', 'block', 'sign', 'tx', 'chain', 'block']) {
    await page.click('#' + id);
    await page.waitForTimeout(120);
  }
  await page.waitForTimeout(500);

  const tabId = await sw.evaluate(async () => {
    const all = await chrome.tabs.query({ url: 'http://localhost:4321/*' });
    return all[0]?.id ?? -1;
  });

  // ── popup.png ──
  // The popup reads chrome.tabs.query({active:true}), which would return
  // the popup's OWN tab in this setup. Patch the query so it reports the
  // mock-dapp tab — mirrors the real browser-action popup experience.
  const popup = await ctx.newPage();
  await popup.addInitScript(() => {
    const MOCK_URL = 'http://localhost:4321/*';
    const patch = () => {
      const c = globalThis.chrome;
      if (c && c.tabs && c.tabs.query) {
        const orig = c.tabs.query.bind(c.tabs);
        c.tabs.query = (q) => {
          if (q && q.active === true) {
            return orig({ url: MOCK_URL }).then((list) => (list.length ? list : orig(q)));
          }
          return orig(q);
        };
        return;
      }
      setTimeout(patch, 3);
    };
    patch();
  });
  await popup.setViewportSize({ width: 340, height: 465 });
  await popup.goto(`chrome-extension://${extId}/src/popup/popup.html`);
  await popup.waitForTimeout(900);
  await popup.screenshot({ path: path.join(OUT, 'popup.png') });
  await popup.close();

  // ── options.png ──
  const opts = await ctx.newPage();
  await opts.setViewportSize({ width: 1280, height: 820 });
  await opts.goto(`chrome-extension://${extId}/src/options/options.html#mock`);
  await opts.waitForTimeout(700);
  await opts.screenshot({ path: path.join(OUT, 'options.png') });
  await opts.close();

  // ── panel.png + detail.png ──
  const insp = await ctx.newPage();
  await insp.setViewportSize({ width: 1280, height: 720 });
  await insp.goto(`chrome-extension://${extId}/src/inspector/inspector.html?tabId=${tabId}`);
  const row = insp.locator('[role=listitem]').filter({ hasText: 'personal_sign' }).first();
  await row.waitFor({ state: 'visible', timeout: 5000 });
  await row.click();
  await insp.waitForTimeout(500);
  await insp.screenshot({ path: path.join(OUT, 'panel.png') });

  // Switch to the Timing tab — its breakdown has richer visuals than the
  // Parameters tab and showcases the phase-by-phase latency view.
  await insp.getByText('Timing', { exact: true }).click();
  await insp.waitForTimeout(200);
  // Hide the fixed-width MethodList column so the detail pane expands to
  // fill the viewport — gives a clean, full-width "detail view" shot.
  await insp.evaluate(() => {
    const list = Array.from(document.querySelectorAll('div')).find(
      (el) => el.style.width === '360px' && el.style.borderRight,
    );
    if (list) list.style.display = 'none';
  });
  await insp.waitForTimeout(250);
  await insp.screenshot({ path: path.join(OUT, 'detail.png') });
  await insp.close();

  console.log('\nWrote:');
  for (const f of ['panel.png', 'detail.png', 'options.png', 'popup.png']) {
    console.log('  docs/images/' + f);
  }
} finally {
  await cleanup();
}
