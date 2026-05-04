# DApp Inspector — Post-P0 Evolution

**Date:** 2026-05-05
**Scope:** Everything added or materially changed after the P0 spec (`2026-04-22-dapp-inspector-p0-design.md`) was frozen. Architectural reference for future contributors who only see the original spec.

The P0 spec is closed history; the current architecture summary lives in `CLAUDE.md` at the repo root. This file is the audit trail of *what changed and why*.

---

## 0. Headline divergences from P0

| P0 spec said | Reality now | Notes |
|---|---|---|
| Mock / Replay / Block — UI placeholders, P0 disabled | All three fully functional | See §1 |
| No ABI decoding (P2 deferred) | Built-in / Sourcify / 4byte tiered decoder + cache | See §2 |
| No security risk markers (P2) | UNLIMITED APPROVAL, ALL TOKENS APPROVAL, LARGE VALUE flags rendered inline in Decoded view | See §2 |
| No chainId → human chain name | 24-chain bundled seed + chainlist.org online tier | See §3 |
| Detail tabs: Parameters / Result / Timing / Raw (4) | Decoded / Parameters / Result / Timing / Raw (5) — Decoded is the default when the call has decodable calldata or signing payload | See §2 |
| Options sections: General / Capture / Mock(placeholder) / Advanced / About (5) | General / Capture / Mock / Block / Advanced / About (6) — Mock and Block both edit real rules | See §1 |
| Custom React i18n only | Custom i18n + native `_locales/` for manifest metadata | See §4 |
| No license declared | Apache 2.0 + NOTICE | See §5 |
| Capture recipe / promo / hero done by hand | Three pnpm gen scripts (`gen:icons`, `gen:promo`, `gen:screenshots`) | See §6 |

---

## 1. Rule engine (Mock / Block / Throttle / Replay)

P0 deferred all of these to P1; all four are now live.

**Storage.** `chrome.storage.local` keys `dapp-inspector:block-rules` and `dapp-inspector:mock-rules`, hand-rolled stores in `src/shared/{block,mock}-rules-store.ts`. Each rule has `{ id, enabled, method, matchMode: 'exact' | 'prefix' | 'glob', origin, … }`.

**Page-side enforcement.** `src/content/index.ts` reads the storage keys directly (the SW does not broadcast — `chrome.storage.onChanged` already fans out across contexts) and posts the rules to the injected world via `window.postMessage`. `src/injected/wrap-provider.ts` consults two synchronous hooks before each `request()`:

- `preRequest(ctx)` returns `{ kind: 'pass' | 'block' | 'delay' }` — block path emits a `call:error` tagged `blocked: true`; delay path tags the eventual emit with `throttleMs`.
- `mockRequest(ctx)` runs after pre-request. Match returns a synthetic `call:end` / `call:error` tagged `mocked: true` and short-circuits the real provider.

**Replay.** Reverse messaging chain: panel `Replay` button → background `AdminMsg{ kind: 'replay' }` → `chrome.tabs.sendMessage` to content → content `postMessage` to injected → injected calls `markNextRequestAsReplay()` then re-fires `eth.request()`. The `replayed: true` flag rides on the resulting `call:start` payload so the panel tags the row.

**Tags.** Single-letter row badges in `MethodList`: **R** (replayed), **B** (blocked), **T** (throttled), **M** (mocked). Throttle never appears next to Block on the same call by construction.

**Where to find it.**
- Rule data + matching: `src/shared/rules.ts`, `src/shared/{block,mock}-rules-store.ts`
- Hook integration: `src/injected/wrap-provider.ts`
- UI: `src/panel/Detail/{BlockDialog,MockDialog,ReplayDialog}.tsx`, `src/options/sections/{Block,Mock}.tsx`
- E2E: `tests/e2e/{block,mock,replay}.spec.ts`

---

## 2. ABI decode subsystem

A new top-level module under `src/shared/abi/` plus a panel hook + Detail tab.

**Resolution chain** (per `src/panel/hooks/useDecoded.ts`):

```
1. cache (chrome.storage.local: dappinsp.abi-cache.v1, 7d TTL, key=chainId/address)
2. built-in (ERC-20/721/1155/Permit2 selector index, 0ms, offline)
3. Sourcify (https://sourcify.dev/server/files/any/<chainId>/<addr>)
4. 4byte (https://api.4byte.sourcify.dev/signature-database/v1/lookup?function=0x...)
5. raw hex
```

**Tri-state fetcher contract.** `fetchSourcifyAbi` and `fetchFourbyteAbi` return `Abi | 'miss' | 'error'`. The hook accumulates a `transientError` flag — terminal `'none'` is **only** memoised when no tier returned `'error'`, so a transient 5xx doesn't pin a stale negative across tab switches.

**Risk scanner** (`src/shared/abi/risk.ts`). Runs only for `eth_sendTransaction` / `eth_signTransaction` (read-only methods — `eth_call`, `eth_estimateGas` — get the same decoded view but no risk overlay). Thresholds: amount ≥ 2²⁰⁰ (uint256) or 2¹⁵⁹ (Permit2 uint160) → UNLIMITED APPROVAL; `setApprovalForAll(_, true)` → ALL TOKENS APPROVAL; tx-level `value ≥ 1 ETH` → LARGE VALUE.

**Cache invalidation across contexts.** `cache.ts` registers `chrome.storage.onChanged` at module load to flush its `memCache` when the key is removed (Options → Clear ABI cache from another extension surface). Without this, the panel context's memCache would keep serving stale data after the user wiped storage from Options.

**Sign-method decoding** (separate path). `eth_signTypedData_v4` / `personal_sign` / `eth_sign` go through `extractSignContext`, not the ABI tier chain. Decoded tab renders Domain / Types / Message panels for typed data, UTF-8 attempt with BINARY badge for personal_sign.

**Where to find it.**
- `src/shared/abi/{builtin,decode,risk,cache,sourcify,fourbyte,types}.ts`
- `src/panel/hooks/useDecoded.ts`
- `src/panel/Detail/Decoded.tsx`
- Tests: `tests/unit/abi-{builtin,decode,risk,sign,cache,cache-flow}.test.ts`

---

## 3. Chain name resolution

`src/shared/chains.ts`. Bundled SEED of 24 mainstream EVM chains (Ethereum / Polygon / BSC / Arbitrum + Nova / Base / Avalanche / zkSync Era / Linea / Scroll / Mantle / Blast / Polygon zkEVM / Celo / Fantom / Gnosis / opBNB / Sepolia / Holesky / Polygon Amoy / Arb Sepolia / OP Sepolia / Base Sepolia + a couple more). On miss → on-demand fetch of `chainid.network/chains_mini.json` (≈80KB), cached in `chrome.storage.local` under `dappinsp.chains.v1` for 30 days. `useChainName()` hook subscribes to a module-level listener so when the catalog hydrates, every render-site re-renders.

**Display sites.** Popup TabCard, panel FilterBar info chip, panel Detail Header. Tooltips multi-line with explicit `Hex:` / `Decimal:` labels (popup hover shows full id pair).

---

## 4. I18n is two-layered

P0 had only the custom React i18n. Added `_locales/` for Chrome's native i18n protocol so Web Store auto-detects supported languages and `chrome://extensions` displays localized name + description.

- **Manifest metadata.** `public/_locales/{en,zh_CN}/messages.json`, `default_locale: 'en'`, `name: '__MSG_extName__'`, `description: '__MSG_extDesc__'`.
- **In-app UI text** — still custom, because Chrome's native `chrome.i18n` is locked to the browser locale and can't be user-overridden. Settings → General → Language toggle requires the React side to drive translation lookup.
- **First-install language.** `loadSettings()` calls `chrome.i18n.getUILanguage()` once to seed `lang`, but stored value wins thereafter (spread order `DEFAULT_SETTINGS → detectBrowserLang() → ...stored`). A user on Chinese Chrome who manually switches to English never sees Chinese auto-restore.

---

## 5. License

Apache 2.0 was adopted at `0a7705c`. Notable §s: 4(b) modified-file marking, 4(d) NOTICE preservation, 3 patent grant + termination-on-litigation, 6 trademark exclusion. `NOTICE` at repo root carries the attribution that downstream Derivative Works must preserve. `package.json.license: "Apache-2.0"`.

If a stronger anti-fork-and-close stance becomes the priority later, the escalation path is AGPL v3 + dual-licensing (no permissive license can stop closed-source forks).

---

## 6. CWS submission infrastructure

P0 left store assets to be done by hand. The repo now has an automation tier:

- `docs/store/listing.md` — bilingual marketing copy kit (item name, short / detailed description, GitHub repo description, screenshot captions, release announcement, social posts, FAQ — EN + ZH side-by-side)
- `docs/store/permissions.md` — per-permission justifications keyed to actual code paths; the `<all_urls>` justification is the most reviewer-scrutinised piece
- `docs/store/privacy.md` — publishable privacy policy
- `docs/store/screenshots-recipe.md` — manual capture walkthrough for #2-#5 of the carousel
- `docs/store/checklist.md` — the full submit-day checklist
- `docs/store/assets/` — SVG sources for promo tile (440×280), hero (1280×800), marquee (1400×560)
- `scripts/gen-icons.mjs` — sharp rasteriser for `public/icons/icon.svg` → 16/32/48/128 PNGs
- `scripts/gen-promo.mjs` — auto-discovers any `<name>-WIDTHxHEIGHT.svg` in `docs/store/assets/` and rasterises to a sibling PNG
- `scripts/gen-screenshots.mjs` — Playwright capture pipeline for `docs/images/` README heroes (panel / detail / options / popup × EN/ZH at 1280×800). Seeds IDB with mock Uniswap traffic, monkey-patches `chrome.tabs.query` for the popup, fetches the live Uniswap favicon as a base64 data URL.
- `scripts/pack-release.mjs` — sanity-checks dist's manifest.json then zips it to `dapp-inspector-<version>.zip`. Wired into `pnpm pack:release`, which runs the full typecheck → lint → test → build → zip pipeline.

**Manifest cleanup.** During CWS prep we removed the unused `scripting` permission. Current `permissions: ['tabs', 'storage', 'alarms']` + `host_permissions: ['<all_urls>']`. The pack-release script asserts `scripting` doesn't sneak back in.

---

## 7. Smaller but important changes

- **`tracker.onCallEnd` is the only path that updates `provenance.chainId`.** The earlier code wired `onProvider` to the eth_chainId branch, which silently never updated chainId — killing the entire ABI cache pipeline. `tests/unit/tab-tracker.test.ts` now pins this contract.
- **`call.chainId` is stamped at `call:end`, not `call:start`.** At call:start the tab's first `eth_chainId` may not have resolved yet. `provAtEnd.chainId` is read in the `call:end` branch and copied onto the patch. Network switches don't retroactively re-tag old calls.
- **Origin priority.** Background prefers `pageMsg.origin` (the page's own `window.location.origin`) over `sender.tab.url` because tab URL can lag at `document_start`.
- **`db.clearAll()` clears both stores** (calls + tab-provenance). The "Clear all history" admin action depends on this; tests rely on it for isolation.
- **CHANGELOG invariant.** `src/shared/changelog.ts`'s top entry's `version` MUST equal `package.json.version`. `tests/unit/changelog.test.ts` enforces it. CI fails on drift.

---

## 8. What's still on the roadmap (not yet built)

- Non-EVM support (Solana via `window.solana` etc.) — entire injected layer would need a parallel adapter
- Cloud sync of rules / settings (P0 explicit non-goal; still a non-goal)
- Per-tab monitoring toggle (currently global)
- Inspector full-tab page is functional but minimal — no per-tab snapshots, picker is bare
