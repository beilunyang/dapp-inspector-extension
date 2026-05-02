# Privacy Policy

> **Note:** Chrome Web Store requires a publicly-hosted URL pointing to this policy. The simplest setup is to push this repo to GitHub and enable GitHub Pages — the file then resolves at `https://beilunyang.github.io/dapp-inspector-extension/privacy.html` (or wherever you host it). Alternatively render this Markdown to a Gist and use the Gist's raw URL.

**Last updated:** 2026-05-02
**Extension:** DApp Inspector
**Maintainer:** beilunyang

## Summary

DApp Inspector is a local-first developer tool. We do not run a backend, we do not have user accounts, and we do not collect, transmit, or share any user data with parties under our control.

## What the extension stores

All data lives in your browser's local storage (`chrome.storage.local` and IndexedDB on your device):

- **Settings** — theme, language, capture toggle, retention cap, auto-fetch ABI toggle, accent color.
- **Captured RPC calls** — method, parameters, result, error, latency, origin, chain id, timestamps.
- **Mock and Block rules** — user-authored rule definitions.
- **Local ABI cache** — function signatures fetched from public ABI databases (see "Outbound network requests" below), keyed by chain id and contract address, with a 7-day TTL.
- **Local chain catalog cache** — chainId → human-readable name mapping fetched once and cached for 30 days.

Captured data is never transmitted off your device by this extension. You can clear it at any time via **Settings → Advanced → Clear all history** and **Clear ABI cache**.

## Outbound network requests

The extension makes anonymous, unauthenticated GET requests to a small set of public registries to enrich the inspector view:

| Host | When | Purpose | Data sent |
|---|---|---|---|
| `sourcify.dev` | When you open the Decoded tab on a call to a contract whose ABI is not in the local 7-day cache | Look up the contract's verified ABI by `(chainId, address)` | The chainId (e.g. `1`) and contract address (e.g. `0xE592...1564`) — both already public on chain. No browser identifiers, cookies, headers, or user data. |
| `api.4byte.sourcify.dev` | When the Sourcify lookup misses, on the same trigger | Resolve a 4-byte function selector to its text signature | The 4-byte selector (e.g. `0xa9059cbb`) — already publicly observable as the first 4 bytes of any tx calldata. |
| `chainid.network` | First time the extension encounters a chainId not in its built-in 24-chain seed map, then once every 30 days to refresh | Map chainIds to human-readable chain names | None — fetches the full public catalog as a single static JSON file. |

You can disable Sourcify and 4byte lookups entirely via **Settings → Capture → Auto-fetch ABI** (off). The extension will still function using the bundled built-in ABIs for ERC-20/721/1155/Permit2.

## What we do *not* collect

- We do not have analytics, telemetry, crash reporting, or any other phone-home behavior.
- We do not read DOM content, cookies, localStorage, form fields, passwords, or session storage from any page.
- We do not transmit private keys, mnemonics, or any wallet credentials. The extension only observes the public RPC method calls already passing between the page and the wallet — it does not have access to wallet internals.
- We do not sell, rent, or transfer any user data to third parties.

## Permissions

See the *Permissions Justification* section of the Chrome Web Store listing or `docs/store/permissions.md` in the source repository for the per-permission rationale.

## Source code

DApp Inspector is open source. The full implementation is available at:

  https://github.com/beilunyang/dapp-inspector-extension

You are encouraged to audit the network code paths (`src/shared/abi/sourcify.ts`, `src/shared/abi/fourbyte.ts`, `src/shared/chains.ts`) and confirm the claims above.

## Contact

Questions or concerns about privacy: open an issue at the GitHub repository linked above.

## Changes to this policy

Material changes will be reflected in this document and announced via the GitHub releases page. Continued use of the extension after such changes constitutes acceptance.
