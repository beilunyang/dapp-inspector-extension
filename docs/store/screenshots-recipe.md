# Screenshots — Capture Recipe

CWS allows up to 5 screenshots, **1280×800 or 640×400 PNG/JPEG**, must accurately represent the extension. Pick 1280×800 (higher fidelity).

The first screenshot is already done — `docs/store/assets/hero-1280x800.png` is a polished hero card ready for upload as **screenshot #1**.

For #2–#5 you need real captures from a live DApp because synthetic mock-ups risk CWS rejection ("doesn't match actual UI"). Below is the exact recipe.

---

## Prep (once)

1. **Build & load the extension unpacked**
   ```bash
   pnpm pack:release      # produces a fresh dist/
   ```
   Then in Chrome:
   - `chrome://extensions` → Developer mode ON → **Load unpacked** → pick `dist/`
   - Pin DApp Inspector to the toolbar

2. **Set up a clean Chrome profile** (recommended, avoids personal history leaking into screenshots)
   - `chrome://settings` → People → Add → New profile → call it "store-screenshots"
   - Load the extension into that profile

3. **Window size**: 1280×800 minimum visible viewport. With DevTools docked **bottom**, you get ≈1280 wide × 800 tall total — ideal. If your monitor is bigger, just resize the Chrome window so the screenshot crop is exactly 1280×800 with no cropping needed.
   - Quick way: in DevTools console: `window.resizeTo(1280, 800)` → resizes the window to exactly that.

4. **Pick a DApp**: Use **app.uniswap.org** on Ethereum mainnet for shots #2–#3 (realistic ERC-20 + swap traffic, lots of decode-able calls). For #4 the Options page itself is the screenshot. For #5 the popup is the screenshot.

5. **Connect a wallet that won't expose mnemonics in screenshots**: a fresh MetaMask account, or a watch-only Rabby. Make sure the address visible in the screenshots is anonymous, not your daily-use one.

---

## #2 — Live capture + decoded view

**Caption:** *Live capture of every JSON-RPC call between DApp and wallet.*

1. Open `app.uniswap.org` (Ethereum mainnet)
2. Open DevTools (Cmd+Opt+I / F12), dock it **bottom**, drag the divider so DevTools takes ~60% of the window height
3. Switch to the **DApp Inspector** panel
4. Connect the wallet, pick a swap pair (USDC → ETH), but **don't sign** — we just want the `eth_call` traffic
5. Wait ~5 seconds for the panel to fill with calls
6. Click any meaty call (look for `eth_sendTransaction` or `eth_call` to a DEX router) so the right-side detail panel shows
7. Make sure the call you clicked has the **Decoded** tab populated with named arguments

**Capture (macOS)**: `Cmd + Shift + 4` then `Space` then click the Chrome window → captures the whole window with shadow. Crop to 1280×800 in Preview (Tools → Adjust Size, or just Crop to selection).

**Capture (Linux/Windows)**: use the OS screen capture tool of choice. For pixel-exact 1280×800: open the Chrome window resized to 1280×800 (step 3 in Prep), then `Cmd/Win + Shift + S` and drag the full window.

---

## #3 — Decoded calldata with a risk warning

**Caption:** *Decoded calldata with named arguments and risk warnings.*

This one needs an unlimited approval to look right. Two paths:

### Path A: real `approve(MaxUint256)` (best fidelity)

1. In Uniswap, swap into a token you don't already hold, then back. Uniswap will request a token approval.
2. Most modern wallets show "spend cap" — set to **Use default (unlimited)** so the calldata uses MaxUint256.
3. **Reject the wallet popup** — the call is still captured.
4. Find that call in the panel (it'll be `eth_sendTransaction` with method `approve` after decoding).
5. Click it. The right panel's **Decoded** tab should show:
   - `approve(address spender, uint256 amount)`
   - `spender = 0xE592...1564` (Uniswap V3 SwapRouter — should resolve to a real Sourcify ABI)
   - `amount = 115792089237316195423570985...`  ← the `UNLIMITED APPROVAL` amber tag should be visible next to this row

Capture as in #2.

### Path B: replay an existing approve (faster, requires Path A done once)

If you've already captured an approval in this profile, just click that row again — same end state, no need to re-do the wallet flow.

---

## #4 — Mock / Block rules in Options

**Caption:** *Mock and block rules to test UI states without touching the chain.*

1. Right-click the extension icon → **Options** (or click the gear in the panel toolbar)
2. Switch to the **Mock** section
3. Click **New rule** → fill it in with realistic content:
   - Method: `eth_chainId`
   - Match: `exact`
   - Origin: `*`
   - Response type: Result
   - Response body: `"0x89"`
   - Delay: `0`
4. Save the rule. Add 2-3 more dummy rules so the list isn't empty (e.g. `eth_blockNumber` returning a fixed block, `eth_getBalance` returning a fake balance).
5. Resize the window to 1280×800 if the page can't be cropped cleanly

**Capture**: `Cmd+Shift+4 → Space → click window`. Crop to 1280×800 with the rule list + edit form both visible.

---

## #5 — Popup overview

**Caption:** *Popup overview with active chain, wallet, and recent activity.*

1. Make sure you're still on `app.uniswap.org` with a wallet connected (so popup has data)
2. Click the extension icon in the toolbar — popup opens
3. The popup is fixed-size (~360px wide, varies in height). For a clean 1280×800 capture, crop the popup itself out of a screen capture, then place it on a soft lavender background (`#ece8f6`, same as hero-1280x800.png) so it fills the canvas.

   Quickest path: open `docs/store/assets/popup-bg.svg` (template below) in any image editor, drop the popup capture on top, save as PNG.

**Template** (`docs/store/assets/popup-bg-1280x800.svg` — bg only, drop popup capture into the center):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 800" width="1280" height="800">
  <rect width="1280" height="800" fill="#ece8f6"/>
</svg>
```

---

## Post-processing checklist (every screenshot)

- [ ] Exact 1280×800 px (CWS rejects anything else for this size class)
- [ ] PNG (smaller than JPEG for UI / text)
- [ ] **No personal info** visible: wallet address, balance, tab history, profile name, browser bookmarks bar (turn it off via View menu), system menu bar
- [ ] **No DevTools "this site has been modified by an extension" banner** — that yellow strip looks alarming. If it appears, dismiss it before capturing.
- [ ] Mouse cursor not in frame
- [ ] No notifications / popups in the periphery

## Final upload order on the dashboard

Upload in this order so the carousel tells a story:

1. `hero-1280x800.png` (already in `docs/store/assets/`) — the polished hero
2. Screenshot from #2 above — "this is what live capture looks like"
3. Screenshot from #3 above — "this is the audit value: risk warnings on approval"
4. Screenshot from #4 above — "you can also mock RPC for testing"
5. Screenshot from #5 above — "popup gives a quick overview"

Captions (paste into the caption box for each):

| # | EN caption | ZH caption |
|---|---|---|
| 1 | (no caption needed — hero is self-explanatory) | (同上) |
| 2 | Live capture of every JSON-RPC call between DApp and wallet. | 实时捕获 DApp 与钱包之间的每一笔 JSON-RPC 调用。 |
| 3 | Decoded calldata with named arguments and risk warnings. | Calldata 解码后显示命名参数与风险提示。 |
| 4 | Mock and block rules to test UI states without touching the chain. | Mock / Block 规则,不动链上就能测试 UI 状态。 |
| 5 | Popup overview with active chain, wallet, and recent activity. | 弹窗概览:当前链、钱包、最近活动一目了然。 |
