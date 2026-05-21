<div align="center">
  <img src="public/icons/128.png" width="96" height="96" alt="DApp Inspector" />
  <h1>DApp Inspector</h1>
  <p><strong>A Chrome DevTools panel for inspecting and debugging Web3 RPC traffic between DApps and EVM wallets.</strong></p>
  <p>
    <a href="https://chromewebstore.google.com/detail/dapp-inspector/bcjlcalkhkfkcchgdokgngemjeemgmcj"><img alt="chrome web store" src="https://img.shields.io/badge/chrome%20web%20store-install-4285f4?logo=googlechrome&logoColor=white"></a>
    <a href="https://github.com/beilunyang/dapp-inspector-extension/releases/latest"><img alt="latest release" src="https://img.shields.io/github/v/release/beilunyang/dapp-inspector-extension?label=release&color=8957e5"></a>
    <a href="https://github.com/beilunyang/dapp-inspector-extension/actions/workflows/build.yml"><img alt="build" src="https://github.com/beilunyang/dapp-inspector-extension/actions/workflows/build.yml/badge.svg"></a>
    <img alt="manifest v3" src="https://img.shields.io/badge/manifest-v3-8957e5">
    <img alt="chains" src="https://img.shields.io/badge/chain-EVM-627eea">
    <a href="LICENSE"><img alt="license" src="https://img.shields.io/badge/license-Apache--2.0-1f883d"></a>
  </p>
  <p><strong>Site:</strong> <a href="https://dapp-inspector.chain.moe">dapp-inspector.chain.moe</a> · <strong>Privacy:</strong> <a href="https://dapp-inspector.chain.moe/privacy.html">dapp-inspector.chain.moe/privacy.html</a></p>
  <p>English · <a href="README.zh-CN.md">中文</a></p>
</div>

---

## Screenshots

<table>
  <tr>
    <td align="center">
      <img src="docs/images/panel.png" alt="DevTools panel" width="100%" />
      <sub>DevTools panel — captured calls, filters, detail pane</sub>
    </td>
    <td align="center">
      <img src="docs/images/detail.png" alt="Call detail" width="100%" />
      <sub>Call detail — params, result, timing, Replay / Mock / Block</sub>
    </td>
  </tr>
  <tr>
    <td align="center">
      <img src="docs/images/options.png" alt="Options / Rules" width="100%" />
      <sub>Options — Mock / Block &amp; Throttle rules</sub>
    </td>
    <td align="center">
      <img src="docs/images/popup.png" alt="Popup" width="100%" />
      <sub>Popup — quick status, toggle monitoring</sub>
    </td>
  </tr>
</table>

---

## Features

- **Captures every JSON-RPC call** between a DApp and its injected Web3 provider (e.g. MetaMask, Rabby, OKX Wallet), classified as `read` / `write` / `sign` / `subscribe`.
- **Rich detail view** — request params, return value, timing breakdown (DApp dispatch → queue → throttle → wallet approval → RPC roundtrip → return), and the raw JSON-RPC envelope.
- **Filter & search** by method, origin, kind, errors, mocked / blocked / throttled / replayed.
- **Rule engine**:
  - **Block** — reject matching RPC requests with a custom error code/message.
  - **Throttle** — delay matching RPC requests to exercise slow-network and timeout paths.
  - **Mock** — short-circuit matching calls with a canned result or error, without touching the chain.
  - **Replay** — re-fire any captured call with optional JSON parameter edits; wallet re-prompts naturally.
- **Copy & export** — JSON-RPC envelope or Markdown row, ready for GitHub issues / Notion.
- **i18n** — English and 简体中文.
- **Privacy** — everything runs locally in your browser. No telemetry, no external servers.

> Currently EVM-only. Other ecosystems are on the roadmap.

## Install

### From the Chrome Web Store (recommended)

Install with one click from the [Chrome Web Store listing](https://chromewebstore.google.com/detail/dapp-inspector/bcjlcalkhkfkcchgdokgngemjeemgmcj). Auto-updates with each release.

### From a release zip

1. Download `dapp-inspector-<version>.zip` from the [latest Release](https://github.com/beilunyang/dapp-inspector-extension/releases/latest).
2. Unzip it.
3. Open `chrome://extensions` in Chrome / Edge / Brave.
4. Toggle **Developer mode** on.
5. Click **Load unpacked** and pick the unzipped folder.

### From source

```bash
pnpm install
pnpm build
# then load ./dist as an unpacked extension
```

## Usage

1. Open any DApp in a tab that has a Web3 wallet extension installed.
2. Open Chrome DevTools (`F12` or `⌥⌘I`) → select the **DApp Inspector** tab.
3. Interact with the DApp — captured calls appear in real time.
4. Click a row to inspect params / result / timing, or click **Replay**, **Mock**, **Block** to act on it.
5. Manage persistent rules from the extension's **Options** page (right-click the toolbar icon → Options).

## Develop

Requirements: Node ≥ 20, pnpm 10.

```bash
pnpm install
pnpm dev        # vite dev mode (use `pnpm build` + load-unpacked for extension work)
pnpm typecheck  # tsc --noEmit
pnpm lint       # eslint
pnpm test       # vitest (unit)
pnpm test:e2e   # playwright (loads ./dist into a real Chromium)
pnpm build      # production build to ./dist
```

Releasing: bump `version` in `package.json`, prepend a new entry to `src/shared/changelog.ts`, merge to `main`, then push a `vX.Y.Z` tag — the `Build` workflow packages `dist/` and publishes a GitHub Release automatically.

## Privacy

See the [privacy policy](https://bitibiti.com/dapp-inspector-extension/privacy.html). Local-first: no analytics, no telemetry, no accounts.

## Tech stack

React 18 · Zustand · Tailwind · TypeScript · Vite · `@crxjs/vite-plugin` (Manifest V3) · Vitest · Playwright.

## Help wanted: a better logo

The current logo gets the job done, but we think the project deserves something more polished. **If you're a designer, we'd love your contribution.**

What we're looking for:

- A mark that reads at 16×16 (toolbar icon) and still feels right at 128×128 (Chrome Web Store tile).
- Something that hints at "inspecting Web3 RPC traffic" — a magnifying glass, scope, oscilloscope, sniffer, console, etc. Not another generic Ethereum diamond.
- Works on light and dark Chrome themes.
- Original artwork — must be licensed under Apache-2.0 (same as the project) so we can ship it.

How to contribute:

1. **Float the idea first** — open a [GitHub Issue](https://github.com/beilunyang/dapp-inspector-extension/issues/new) with a sketch / mockup / reference and tag it `logo`. This avoids two people designing in parallel.
2. Once a direction is agreed, open a PR replacing `public/icons/icon.svg` (the source). Run `pnpm gen:icons` to regenerate the 16/32/48/128 PNGs. Promo tiles in `docs/store/assets/` can be updated in the same PR (or a follow-up).
3. We'll credit the designer in the release notes and changelog.

Not a designer but have strong opinions? 👍 / 👎 on proposals in the issue tracker is also useful.

## Donate

If this tool saves you time, a small tip is hugely appreciated.

| Chain | Address |
|---|---|
| EVM (any EVM chain) | `0x1661c763b8352eea56f3d885b4a02568bdd17c56` |
| Solana | `GXeMRYDrJAJW2jDXnm7CqWdCL5gYmgjzoZ9jRMdA8cV` |
