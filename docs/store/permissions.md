# Permissions Justification

Chrome Web Store now requires a written justification for every requested permission. Paste each box below into its corresponding field on the dashboard's **Privacy practices** tab. Keep wording precise — reviewers cross-check against actual code paths.

---

## Single Purpose

```
DApp Inspector is a developer tool that captures and displays JSON-RPC traffic between web3 DApps running in the user's browser and their connected EVM wallet, then provides decoding, replay, and rule-based mocking/blocking of those RPC calls inside a Chrome DevTools panel.
```

---

## Per-permission justification

### `tabs`

```
Required to (1) read the currently active tab's id, URL, and favicon in the popup so the user knows which DApp the inspector is reporting on; (2) push replay messages from the DevTools panel back into the inspected tab via chrome.tabs.sendMessage so a user-clicked "Replay" re-fires the original RPC inside the original page context; (3) clear per-tab capture state when chrome.tabs.onRemoved fires so closed tabs don't keep accumulating data.
```

### `storage`

```
Required to persist user preferences (theme, language, capture retention, auto-fetch toggle), Mock and Block rule definitions, captured RPC call history (subject to a user-configurable retention cap), and the local ABI cache. All writes target chrome.storage.local on the user's device. No data leaves the browser.
```

### `alarms`

```
Required for a periodic background sweep (every 10 minutes) that enforces the user's configured retention cap on captured call history — without this alarm a long-running session could grow the local IndexedDB store unboundedly.
```

### `host_permissions: <all_urls>`

```
The extension's value proposition is observing RPC traffic between any DApp the user visits and the wallet connected to that page. The injected provider wrapper must run at document_start in MAIN world on every http(s) page so it can intercept window.ethereum / EIP-6963 announcements before the DApp's own scripts grab a reference. Restricting to a fixed allowlist would prevent the extension from working on the long tail of DApps users actually visit. The extension does not read DOM content, form data, cookies, or auth tokens — it only wraps the page's window.ethereum.request method to observe its arguments and return values.
```

### `web_accessible_resources` (inspector.html)

```
The "Open full call history" button in the popup opens src/inspector/inspector.html as a regular extension page so the user can browse capture data outside the DevTools panel. The page is exposed via web_accessible_resources so chrome-extension://… URLs can be navigated to from any tab context. The page reads only from chrome.storage.local — it does not communicate with any third-party origin.
```

---

## Remote code

```
The extension does not load or execute any remote code. All JavaScript ships in the package and runs locally. The only network traffic is JSON GETs to:
  - https://sourcify.dev/server/files/any/{chainId}/{address} (verified-contract ABI lookup)
  - https://api.4byte.sourcify.dev/signature-database/v1/lookup?function=0x... (4-byte selector → text signature, fallback for unverified contracts)
  - https://chainid.network/chains_mini.json (chainId → human-readable chain name)
These requests are unauthenticated, contain no user-identifying data, and are made on demand when the user opens the Decoded tab on a call whose ABI/chainId isn't already in the local 7-day cache. Users can disable all network ABI lookups via Settings → Capture → "Auto-fetch ABI".
```

---

## Data usage / collection

The dashboard's **Data usage** form has yes/no checkboxes. Use:

| Category | Collected? | Notes |
|---|---|---|
| Personally identifiable information | **No** | |
| Health information | **No** | |
| Financial and payment information | **No** | RPC traffic includes wallet addresses, but addresses stay on the user's device — never transmitted by us. |
| Authentication information | **No** | |
| Personal communications | **No** | |
| Location | **No** | |
| Web history | **No** | |
| User activity | **No** | |
| Website content | **No** | |

And declare:

- ☑ I do not sell or transfer user data to third parties, outside of the approved use cases.
- ☑ I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- ☑ I do not use or transfer user data to determine creditworthiness or for lending purposes.
