# P0 Acceptance Checklist

Run through this before cutting the 0.1.0 tag.

## Real DApps
- [ ] Uniswap — connect wallet, perform a swap quote; Panel shows `eth_chainId`, `eth_call`, `personal_sign` if signing
- [ ] OpenSea — browse a collection, connect wallet; Panel records `eth_requestAccounts`
- [ ] Aave — open app; Panel records read calls without errors

## Wallets (EIP-6963)
- [ ] MetaMask only installed — Popup shows "MetaMask"
- [ ] MetaMask + Rabby both installed — Popup lists both wallets

## Browsers
- [ ] Chromium (latest stable) — all flows pass
- [ ] Microsoft Edge — load unpacked, all flows pass

## Icons
- [ ] 16/32 visible in toolbar (Windows)
- [ ] 16/32 visible in toolbar (macOS)
- [ ] 48/128 visible on chrome://extensions

## Resilience
- [ ] Disable → re-enable extension, open Panel: snapshot hydrates from IDB
- [ ] Toggle monitoring off → no new calls captured; toggle back on → capture resumes
- [ ] Clear history from Advanced → Panel immediately shows empty state
