# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install                # one-time
pnpm dev                    # vite dev server (rare — extension work usually wants `build` + load-unpacked)
pnpm build                  # tsc -b && vite build → dist/
pnpm typecheck              # tsc -b --noEmit
pnpm lint                   # eslint over src + tests
pnpm test                   # vitest watch
pnpm test:run               # vitest run (one-shot, used by CI + pack:release)
pnpm test:run -- <pattern>  # subset, e.g. `-- abi` or `-- tab-tracker`
pnpm test:e2e               # Playwright; auto-runs `pnpm build` then loads dist/ into Chromium
pnpm pack:release           # full release pipeline: typecheck → lint → test:run → build → zip dist/
pnpm gen:icons              # rasterise public/icons/icon.svg → 16/32/48/128 PNGs
pnpm gen:promo              # rasterise every *-WIDTHxHEIGHT.svg in docs/store/assets/
pnpm gen:screenshots        # Playwright capture of README hero PNGs at 1280×800
```

Node ≥ 20, pnpm 10.17.1 (pinned via `packageManager`). E2E uses `headless: false` because MV3 service workers don't reliably boot in headless mode — a Chromium window flashes during `test:e2e` / `gen:screenshots`.

Path alias `@shared/*` → `src/shared/*` is configured in `tsconfig.json`, `vite.config.ts`, and `vitest.config.ts`. All three must stay in sync.

## Architecture

This is a Chrome Manifest V3 extension with **five JS contexts** that communicate over a fixed message protocol. Understanding which context owns which state is essential.

### Contexts

| Context | Entry | World | Role |
|---|---|---|---|
| Background SW | `src/background/index.ts` | service-worker | Single source of truth for captured calls (IDB) and provenance. Owns the message hub. |
| Injected | `src/injected/index.ts` | MAIN | Wraps `window.ethereum`, listens for EIP-6963 announcements, applies block/throttle/mock rules synchronously before each `request()`. |
| Content | `src/content/index.ts` | ISOLATED | Tiny bridge: `window.postMessage` ↔ `chrome.runtime.sendMessage`. Also reads rules directly from `chrome.storage.local` and forwards them to the page world via `postMessage`. |
| DevTools panel | `src/panel/{devtools.ts,panel.tsx}` | extension page | UI for captured-call browsing. Subscribes to the SW via `chrome.runtime.connect`. Mounted by `chrome.devtools.panels.create` in `devtools.ts`. |
| Popup / Options / Inspector | `src/popup`, `src/options`, `src/inspector` | extension pages | The popup is a separate React tree; the inspector is a web-accessible duplicate of the panel for full-tab viewing. |

### Data flow on a captured call

```
DApp.request()
  └→ injected wrapProvider emits PageMsg (window.postMessage)
      └→ content forwards via chrome.runtime.sendMessage
          └→ background.onMessage handler:
              1. push call:start to panel ports         (live UI update)
              2. await store.append(call)               (persist to IDB)
              3. await tracker.onCallStart              (update provenance)
              4. push provenance to panel ports
```

Replay is the inverse: panel → background AdminMsg → `chrome.tabs.sendMessage` → content → `window.postMessage` → injected → calls real `eth.request()` again with `markNextRequestAsReplay()` set.

### Non-obvious invariants

- **MV3 listener registration must be synchronous.** `chrome.runtime.onMessage.addListener` is called at module top level in `background/index.ts`; all async deps (store, tracker, settings) are accessed via shared `Promise`s awaited inside the handler. If you wrap registration in an `await`, the SW will miss messages on wake-up.
- **`call.chainId` is stamped at `call:end`, not `call:start`.** At `call:start` the tab's first `eth_chainId` may not have resolved yet. `provAtEnd.chainId` is read in the `call:end` branch and copied onto the patch, so each captured call carries the network identity it ran on — tab-level network switches don't retroactively re-tag old calls.
- **Provenance.chainId is updated only via `tracker.onCallEnd`** for `eth_chainId` results. `tracker.onProvider` (used elsewhere on `eth_chainId`) deliberately does NOT touch chainId — there's a regression test (`tests/unit/tab-tracker.test.ts`) pinning this contract because mis-wiring it killed the entire ABI cache + Sourcify pipeline once.
- **Origin priority**: background prefers `pageMsg.origin` (the page's `window.location.origin`, sent by the injected wrapper) over `sender.tab.url` because the tab URL can lag at `document_start` (still `chrome://newtab/` while the new page has already committed).
- **Block rules path is page-side, not SW-side.** Content scripts read `BLOCK_RULES_KEY` / `MOCK_RULES_KEY` directly from `chrome.storage.local` and `postMessage` them to injected. The SW doesn't broadcast — `chrome.storage.onChanged` already fans out to every context.

### ABI subsystem (`src/shared/abi/`)

Resolution chain in `src/panel/hooks/useDecoded.ts`:
```
1. cache (chrome.storage.local, 7d TTL, key = chainId/address)
2. built-in (ERC-20/721/1155/Permit2, selector-indexed, 0ms)
3. Sourcify (sourcify.dev/server/files/any/<chainId>/<addr>)
4. 4byte.sourcify.dev (selector-only fallback, lower confidence)
5. raw hex
```

Fetchers return tri-state `Abi | 'miss' | 'error'` so transient network failures aren't memoised as definitive misses (see `useDecoded`'s `transientError` flag — terminal `'none'` is only memoised when no tier returned `'error'`). `cache.ts` mirrors storage in a per-context `memCache` and listens to `chrome.storage.onChanged` to flush across contexts when Options → Clear ABI cache fires.

Risk scanner (`abi/risk.ts`) only runs for `eth_sendTransaction` / `eth_signTransaction` — read-only methods (`eth_call`, `eth_estimateGas`) get the same decoded view but no risk overlay.

### I18n is two-layered

- **Manifest metadata** uses Chrome's native `_locales/` (`public/_locales/{en,zh_CN}/messages.json`, `default_locale: 'en'`, `__MSG_extName__` placeholders). This is what CWS auto-detects and what `chrome://extensions` displays.
- **UI text** uses a custom React i18n (`src/shared/i18n/{en,zh}.ts` + `useT()`) because Chrome's native `chrome.i18n` is locked to the browser locale — users need a manual override (Settings → General → Language).
- `loadSettings()` reads `chrome.i18n.getUILanguage()` once on first install to seed `lang`, but stored value wins forever after (spread order: `DEFAULT_SETTINGS → detectBrowserLang() → ...stored`).

### Storage layout

| Key | Backing | Owner |
|---|---|---|
| `dapp-inspector:settings` | `chrome.storage.local` | `src/shared/settings.ts` |
| `dapp-inspector:block-rules` / `:mock-rules` | `chrome.storage.local` | `src/shared/{block,mock}-rules-store.ts` |
| `dappinsp.abi-cache.v1` | `chrome.storage.local` | `src/shared/abi/cache.ts` (TTL 7d) |
| `dappinsp.chains.v1` | `chrome.storage.local` | `src/shared/chains.ts` (TTL 30d) |
| Captured calls + tab provenance | IndexedDB (`dapp-inspector`, stores `calls` and `tab-provenance`) | `src/shared/idb.ts` |

`db.clearAll()` clears BOTH stores (calls + tab-provenance) — the "Clear all history" admin action depends on this; tests rely on it for isolation between cases.

## Releasing

1. Bump `version` in `package.json`.
2. Prepend a new entry to `src/shared/changelog.ts`. **The top entry's `version` must equal `package.json.version`** — asserted by `tests/unit/changelog.test.ts`. CI fails otherwise.
3. Merge to `main`, push tag `vX.Y.Z`.
4. `.github/workflows/build.yml` runs typecheck → lint → tests → build → zips `dist/` → publishes to GitHub Releases.

For local store-submission packaging, `pnpm pack:release` produces `dapp-inspector-<version>.zip` and runs sanity checks (manifest version match, `scripting` permission absent — it would be flagged by CWS reviewers as unused).

## Test patterns

- **Unit tests** (`tests/unit/`) — vitest + happy-dom + `fake-indexeddb/auto` (loaded in `tests/setup.ts`). Chrome storage is mocked via `tests/mocks/chrome-storage.ts`'s `installChromeStorageMock()` — call this in `beforeEach` and pair with `_resetForTests()` from any module that holds module-level state (`abi/cache.ts`, `chains.ts`).
- **Integration** (`tests/integration/content-bridge.test.ts`) — same vitest harness, exercises the `window.postMessage` ↔ `chrome.runtime.sendMessage` bridge.
- **E2E** (`tests/e2e/`) — Playwright `launchPersistentContext` with `--load-extension=./dist`. A static fixture DApp lives at `tests/fixtures/mock-dapp.html` and is served via http-server on port 4321 (configured in `playwright.config.ts`). All e2e specs use `headless: false`.

## CWS submission assets

`docs/store/` holds everything needed for Chrome Web Store: `listing.md` (bilingual copy kit), `permissions.md` (per-permission justifications — important for the `<all_urls>` review), `privacy.md` (publishable privacy policy), `screenshots-recipe.md` (capture walkthrough), and `checklist.md` (full submission flow). `docs/store/assets/` holds the SVG sources for promo tiles + hero; rerun `pnpm gen:promo` after any edit.
