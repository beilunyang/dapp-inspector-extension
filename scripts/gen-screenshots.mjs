// Capture README hero screenshots from the actual built extension.
//
// Strategy: launch a headless chromium with dist/ loaded as an unpacked
// extension, seed IndexedDB + chrome.storage with realistic mock RPC
// traffic, then screenshot popup / options / panel / detail at exactly
// 1280×800 — both English and Chinese variants.
//
// Run: pnpm gen:screenshots  (or: node scripts/gen-screenshots.mjs)
// Prereq: pnpm build (so dist/ exists)
//         pnpm exec playwright install chromium  (one-time browser binary)

// `playwright` is a transitive dep of `@playwright/test` (which is in
// devDependencies); import via the public package so we don't need to add
// `playwright` itself to package.json.
import { chromium } from '@playwright/test';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const EXT = path.join(ROOT, 'dist');
const OUT = path.join(ROOT, 'docs/images');
const W = 1280;
const H = 800;
const BG = '#ece8f6';
const TAB_ID = 1;

if (!(await exists(path.join(EXT, 'manifest.json')))) {
  console.error('✗ dist/manifest.json not found — run `pnpm build` first');
  process.exit(1);
}
await fs.mkdir(OUT, { recursive: true });

// -------------------------------------------------------------------
//  Mock data: a realistic Uniswap-flavoured trace
// -------------------------------------------------------------------

const NOW = Date.now();
const ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564'; // Uniswap V3 SwapRouter
const USDC   = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const USER   = '0x1234567890aBcDef1234567890aBcDeF12345678';

function mkCall(over) {
  return {
    id: over.id,
    tabId: TAB_ID,
    origin: 'https://app.uniswap.org',
    providerInfo: { name: 'MetaMask', rdns: 'io.metamask' },
    method: 'eth_call',
    kind: 'read',
    params: [],
    startedAt: over.startedAt ?? NOW - 60_000,
    status: 'ok',
    chainId: '0x1',
    durationMs: 12.4,
    ...over,
  };
}

const MOCK_CALLS = [
  // setApprovalForAll on opensea — used to demonstrate the risk warning
  mkCall({
    id: 'c10', method: 'eth_sendTransaction', kind: 'sign',
    params: [{ from: USER, to: USDC, data:
      // approve(0xE592...1564, MaxUint256)
      '0x095ea7b3000000000000000000000000e592427a0aece92de3edee1f18e0157c05861564ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
      value: '0x0',
    }],
    startedAt: NOW - 5_000,
    durationMs: 1845,
    status: 'pending',
  }),
  // eth_sendTransaction — exactInputSingle swap
  mkCall({
    id: 'c9', method: 'eth_sendTransaction', kind: 'write',
    params: [{ from: USER, to: ROUTER, data:
      '0x414bf389' +
      '000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' +
      '000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2' +
      '00000000000000000000000000000000000000000000000000000000000001f4' +
      '000000000000000000000000' + USER.slice(2).toLowerCase() +
      '0000000000000000000000000000000000000000000000000000000067412345' +
      '00000000000000000000000000000000000000000000000000000000000003e8' +
      '00000000000000000000000000000000000000000000000000000000000000d4' +
      '0000000000000000000000000000000000000000000000000000000000000000',
      value: '0x0',
    }],
    startedAt: NOW - 12_000, durationMs: 2104,
  }),
  mkCall({ id: 'c8', method: 'eth_estimateGas', kind: 'read', startedAt: NOW - 14_000, durationMs: 87,
           params: [{ from: USER, to: ROUTER, data: '0x414bf389' + 'aabb'.repeat(64), value: '0x0' }] }),
  mkCall({ id: 'c7', method: 'eth_call', startedAt: NOW - 18_000, durationMs: 22,
           params: [{ to: USDC, data: '0x70a08231000000000000000000000000' + USER.slice(2).toLowerCase() }, 'latest'] }),
  mkCall({ id: 'c6', method: 'eth_call', startedAt: NOW - 19_500, durationMs: 18,
           params: [{ to: USDC, data: '0xdd62ed3e' }, 'latest'] }),
  mkCall({ id: 'c5', method: 'eth_blockNumber', startedAt: NOW - 22_000, durationMs: 9, result: '0x12d4f70' }),
  mkCall({ id: 'c4', method: 'eth_chainId', startedAt: NOW - 24_500, durationMs: 4, result: '0x1' }),
  mkCall({ id: 'c3', method: 'eth_accounts', startedAt: NOW - 25_000, durationMs: 7, result: [USER] }),
  mkCall({ id: 'c2', method: 'eth_requestAccounts', kind: 'sign', startedAt: NOW - 26_000, durationMs: 312, result: [USER] }),
  mkCall({ id: 'c1', method: 'wallet_switchEthereumChain', kind: 'sign',
           params: [{ chainId: '0x1' }], startedAt: NOW - 27_000, durationMs: 480, result: null }),
];

const MOCK_PROVENANCE = {
  tabId: TAB_ID,
  origin: 'https://app.uniswap.org',
  url: 'https://app.uniswap.org/swap',
  wallets: [{ name: 'MetaMask', rdns: 'io.metamask' }],
  chainId: '0x1',
  hasDapp: true,
};

const MOCK_MOCK_RULES = [
  { id: 'r1', enabled: true,  method: 'eth_chainId', matchMode: 'exact', origin: '*',
    responseType: 'result', responseBody: '"0x89"', delayMs: 0 },
  { id: 'r2', enabled: false, method: 'eth_getBalance', matchMode: 'exact', origin: '*',
    responseType: 'result', responseBody: '"0xde0b6b3a7640000"', delayMs: 200 },
  { id: 'r3', enabled: true,  method: 'eth_call', matchMode: 'prefix', origin: 'app.uniswap.org',
    responseType: 'error', errorCode: 4001, errorMessage: 'Mocked rejection', delayMs: 0 },
];

function settingsFor(lang) {
  return {
    theme: 'system', lang, monitoring: true,
    retentionMax: 5000,
    ignoredMethods: ['eth_blockNumber', 'eth_getBlockByNumber', 'net_version'],
    accent: 'indigo', autoFetchAbi: false,
  };
}

// -------------------------------------------------------------------
//  Capture flow per language
// -------------------------------------------------------------------

async function captureForLang(lang) {
  const userDataDir = mkdtempSync(path.join(os.tmpdir(), `dappinsp-shot-${lang}-`));
  // headless: false is required — Chrome's headless mode doesn't reliably
  // boot MV3 service workers, so storage seeding via sw.evaluate would
  // never get a worker handle. Same constraint the e2e suite hits.
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXT}`,
      `--load-extension=${EXT}`,
      '--no-first-run',
      '--no-default-browser-check',
    ],
    viewport: { width: W, height: H },
  });

  const sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker');
  const extId = sw.url().split('/')[2];

  // Seed everything: settings (incl. lang), mock rules, IDB calls + provenance.
  await sw.evaluate(async ([settings, mockRules, calls, prov]) => {
    await chrome.storage.local.set({
      'dapp-inspector:settings': settings,
      'dapp-inspector:mock-rules': mockRules,
    });
    // Open the IDB exactly the way idb.ts does (DB name + stores).
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('dapp-inspector', 1);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains('calls')) {
          const s = d.createObjectStore('calls', { keyPath: 'id' });
          s.createIndex('byTabId', 'tabId');
          s.createIndex('byStartedAt', 'startedAt');
        }
        if (!d.objectStoreNames.contains('tab-provenance')) {
          d.createObjectStore('tab-provenance', { keyPath: 'tabId' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const tx = db.transaction(['calls', 'tab-provenance'], 'readwrite');
    for (const c of calls) tx.objectStore('calls').put(c);
    tx.objectStore('tab-provenance').put(prov);
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  }, [settingsFor(lang), MOCK_MOCK_RULES, MOCK_CALLS, MOCK_PROVENANCE]);

  const suffix = lang === 'zh' ? '-zh' : '';

  // ---------- panel.png ----------
  // Use the inspector page (web_accessible) — it mounts the same panel
  // App component with a tabId param.
  const panel = await ctx.newPage();
  await panel.setViewportSize({ width: W, height: H });
  await panel.goto(`chrome-extension://${extId}/src/inspector/inspector.html?tabId=${TAB_ID}`);
  await panel.waitForLoadState('domcontentloaded');
  await panel.waitForTimeout(800);  // let the SW port subscription settle
  await panel.screenshot({ path: path.join(OUT, `panel${suffix}.png`) });

  // ---------- detail.png ----------
  // Click the first row to populate the detail pane, screenshot again.
  await panel.locator('[role="listitem"]').first().click({ trial: false }).catch(() => {});
  await panel.waitForTimeout(400);
  await panel.screenshot({ path: path.join(OUT, `detail${suffix}.png`) });
  await panel.close();

  // ---------- options.png ----------
  const options = await ctx.newPage();
  await options.setViewportSize({ width: W, height: H });
  await options.goto(`chrome-extension://${extId}/src/options/options.html#mock`);
  await options.waitForLoadState('domcontentloaded');
  await options.waitForTimeout(400);
  await options.screenshot({ path: path.join(OUT, `options${suffix}.png`) });
  await options.close();

  // ---------- popup.png ----------
  // Popup is fixed-narrow; render at native size, then composite onto a
  // 1280×800 lavender canvas to match CWS spec.
  //
  // The popup queries chrome.tabs.query({active, currentWindow}) and would
  // normally see itself (since Playwright opened popup.html as a regular
  // tab) — host would show as the extension ID. Patch chrome.tabs.query
  // before popup script runs so it sees a synthetic uniswap.org tab,
  // then seed provenance + calls against that fake tabId so the popup
  // renders the realistic "DApp connected" state instead of empty.
  const FAKE_POPUP_TAB_ID = 999;
  await sw.evaluate(async ([calls, prov]) => {
    const db = await new Promise((resolve, reject) => {
      const r = indexedDB.open('dapp-inspector', 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const tx = db.transaction(['calls', 'tab-provenance'], 'readwrite');
    for (const c of calls) tx.objectStore('calls').put(c);
    tx.objectStore('tab-provenance').put(prov);
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  }, [
    MOCK_CALLS.map((c) => ({ ...c, id: `pop-${c.id}`, tabId: FAKE_POPUP_TAB_ID })),
    { ...MOCK_PROVENANCE, tabId: FAKE_POPUP_TAB_ID },
  ]);

  const popup = await ctx.newPage();
  await popup.setViewportSize({ width: 360, height: 540 });
  // Real Uniswap favicon, fetched at script start and inlined as a
  // base64 data URL. We resolve it here (not at popup-load time) so
  // the popup itself doesn't need network access — it sees a same-
  // origin data: URL that loads synchronously.
  const FAKE_FAVICON = await resolveUniswapFavicon();

  await popup.addInitScript(({ tabId, favicon }) => {
    const fake = {
      id: tabId,
      url: 'https://app.uniswap.org/swap',
      favIconUrl: favicon,
      windowId: 1,
      active: true,
      title: 'Uniswap',
    };
    const origQuery = chrome.tabs?.query?.bind(chrome.tabs);
    if (origQuery) {
      // Override only the {active, currentWindow} query the popup uses;
      // pass through anything else to the real implementation.
      chrome.tabs.query = ((info, cb) => {
        const matches = (info && (info.active || info.currentWindow))
          ? [fake]
          : null;
        if (cb) {
          if (matches) { cb(matches); return; }
          return origQuery(info, cb);
        }
        return matches ? Promise.resolve(matches) : origQuery(info);
      });
    }
  }, { tabId: FAKE_POPUP_TAB_ID, favicon: FAKE_FAVICON });
  await popup.goto(`chrome-extension://${extId}/src/popup/popup.html`);
  await popup.waitForLoadState('domcontentloaded');
  await popup.waitForTimeout(800); // let the port subscription land + render
  // Use the body's actual rendered box, not documentElement.scrollWidth —
  // popup.html sets <body class="w-[340px]">, so the viewport must match
  // exactly or the screenshot picks up a sliver of empty viewport on the
  // right and the composite ends up off-center.
  const dim = await popup.evaluate(() => {
    const r = document.body.getBoundingClientRect();
    return { w: Math.ceil(r.width), h: Math.ceil(r.height) };
  });
  await popup.setViewportSize({ width: dim.w, height: dim.h });
  const popupBuf = await popup.screenshot({ type: 'png', clip: { x: 0, y: 0, width: dim.w, height: dim.h } });
  await popup.close();

  const bg = sharp({ create: { width: W, height: H, channels: 4, background: BG } }).png();
  await bg
    .composite([{ input: popupBuf, gravity: 'center' }])
    .toFile(path.join(OUT, `popup${suffix}.png`));

  await ctx.close();
}

// -------------------------------------------------------------------

await captureForLang('en');
await captureForLang('zh');

const written = (await fs.readdir(OUT)).filter((f) => f.endsWith('.png'));
console.log(`✓ ${written.length} screenshots written to docs/images/ at ${W}×${H}:`);
for (const f of written.sort()) {
  const stat = await fs.stat(path.join(OUT, f));
  console.log(`    ${f}  (${(stat.size / 1024).toFixed(1)} KB)`);
}

async function exists(p) { try { await fs.stat(p); return true; } catch { return false; } }

/** Fetch the live Uniswap favicon and return a base64 data URL so the
 *  popup can <img src=…> it without needing live network. Falls back to
 *  a pink-"U" SVG placeholder if the fetch fails (offline / blocked /
 *  Uniswap's CDN hiccupping). */
async function resolveUniswapFavicon() {
  const url = 'https://app.uniswap.org/favicon.ico';
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers.get('content-type') ?? 'image/x-icon';
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength === 0) throw new Error('empty body');
    console.log(`✓ fetched real Uniswap favicon (${buf.byteLength} B, ${ct})`);
    return `data:${ct};base64,${buf.toString('base64')}`;
  } catch (err) {
    console.warn(`! could not fetch real Uniswap favicon (${(err).message ?? err}); using inline placeholder`);
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
      '<rect width="32" height="32" rx="7" fill="#FF007A"/>' +
      '<text x="16" y="23" text-anchor="middle" ' +
      'font-family="Helvetica, Arial, sans-serif" font-weight="700" ' +
      'font-size="20" fill="white">U</text>' +
      '</svg>'
    );
  }
}
