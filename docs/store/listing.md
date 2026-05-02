# DApp Inspector — Marketing Copy Kit / 文案物料包

Full bilingual content kit for Chrome Web Store, GitHub, and any launch
channel. Each section provides **English** and **简体中文** side-by-side
so you can paste either into the matching field.

---

## 1. Item name / 项目名

| | |
|---|---|
| **EN** | `DApp Inspector` |
| **ZH** | `DApp Inspector`（中文界面里仍保留英文品牌名，避免双套品牌资产） |

CWS limit: 75 chars. Current: 14.

---

## 2. GitHub repo description / 仓库简介

A one-line "About" for the GitHub repo header — limit ~350 chars but
~120 reads best.

**EN**
```
Chrome DevTools panel that captures, decodes, replays, and mocks RPC traffic between Web3 DApps and wallets. EVM-only for now.
```

**ZH**
```
Chrome DevTools 面板:实时捕获、解码、重放、模拟 Web3 DApp 与钱包之间的 RPC 通信。目前仅支持 EVM 链。
```

---

## 3. One-line tagline / 一句话定位

Use this on the README hero, social bios, and product hunt-style listings.

**EN**
```
Audit every wallet popup before you sign.
```

**ZH**
```
签字之前,先看清楚 DApp 在调什么。
```

---

## 4. Short description (CWS, ≤132 chars) / 商店短描述

**EN** (110 chars)
```
Inspect, decode, replay, and mock RPC traffic between Web3 DApps and wallets — right inside Chrome DevTools.
```

**ZH** (40 chars)
```
在 Chrome DevTools 里捕获、解码、重放、模拟 Web3 DApp 与钱包之间的 RPC 通信。
```

---

## 5. Detailed description (CWS) / 商店长描述

CWS limit: 16,000 chars. Both versions sit comfortably under 2,000.

### EN

```
DApp Inspector adds a DevTools panel that captures every JSON-RPC call your favorite Web3 DApps send to the connected wallet (MetaMask, Rabby, OKX, anything that exposes window.ethereum or speaks EIP-6963).

═══════════════════════════════
  WHAT YOU GET
═══════════════════════════════

▸ LIVE RPC CAPTURE
Every eth_call, eth_sendTransaction, eth_signTypedData_v4, personal_sign and friend lands in the panel as it happens. Method, params, result, error, latency breakdown — all visible at a glance.

▸ CALLDATA DECODING — PASTE-FREE
Built-in ABIs cover ERC-20 / 721 / 1155 / Permit2 instantly. Unknown contracts are resolved from Sourcify or 4byte.sourcify.dev with a 7-day local cache. You see the function name and named arguments — not raw 0xabcd bytes.

▸ RISK BADGES FOR THE AUDIT MOMENT
About to sign? "UNLIMITED APPROVAL", "ALL TOKENS APPROVAL", and "LARGE VALUE" warnings light up before the wallet popup does. Designed for the sub-second between clicking "Confirm" in the DApp and "Sign" in the wallet.

▸ REPLAY ANY CALL
One click re-fires a captured call from the panel; the wallet re-prompts as if the DApp had triggered it. Great for repro-ing flaky tx flows without touching the DApp UI.

▸ MOCK & BLOCK RULES
Short-circuit selected RPC methods with canned results, errors, or latency. "What if eth_chainId returns 0x89?" — answer in 30 seconds without leaving DevTools.

▸ FILTER, SEARCH, EXPORT
Filter by kind (read / write / sign / subscribe) or by status (errors / mocked / blocked / throttled / replayed). Search by method name. Copy any call as a JSON-RPC envelope or Markdown row for issues / postmortems.

▸ POLISHED CHROME
Light / dark themes following the system, multiple accent palettes, EN + 中文 UI, full keyboard nav.

═══════════════════════════════
  PRIVACY — LOCAL FIRST
═══════════════════════════════

Everything runs in your browser. Captured RPC traffic, settings, rules, and ABI cache are stored in chrome.storage.local on your machine — nothing is sent to any server we control.

The only outbound network requests are public, unauthenticated ABI / chain-name lookups (sourcify.dev, api.4byte.sourcify.dev, chainid.network) made on demand when you open the Decoded tab on a contract / chain not yet in the local cache. You can disable these in Settings → Capture → "Auto-fetch ABI" — the extension still works fully against its built-in ABI bundle.

No analytics. No telemetry. No accounts. No tracking.

═══════════════════════════════
  SCOPE
═══════════════════════════════

Currently supports EVM chains (any wallet that exposes window.ethereum or implements EIP-6963). Non-EVM (Solana, etc.) is on the roadmap.

═══════════════════════════════
  OPEN SOURCE
═══════════════════════════════

Source code: https://github.com/beilunyang/dapp-inspector
Issues, feature requests, and PRs welcome.
```

### ZH

```
DApp Inspector 在 Chrome 开发者工具里加了一个面板,实时捕获你访问的 Web3 DApp 与连接钱包(MetaMask、Rabby、OKX 等任何暴露 window.ethereum 或支持 EIP-6963 的钱包)之间的所有 JSON-RPC 通信。

═══════════════════════════════
  主要功能
═══════════════════════════════

▸ 实时 RPC 捕获
每一个 eth_call / eth_sendTransaction / eth_signTypedData_v4 / personal_sign 等调用都即时进入面板。方法名、参数、返回值、错误、耗时分解 —— 一眼看清。

▸ Calldata 自动解码
免粘贴。ERC-20 / 721 / 1155 / Permit2 内置 ABI 即时解析;未知合约自动从 Sourcify 或 4byte.sourcify.dev 拉取,本地缓存 7 天。显示函数名 + 命名参数,而不是 0xabcd 原始字节。

▸ 审计风险高亮
正要签名?"无限授权"、"全部 NFT 授权"、"大额原生币转账"会在钱包弹窗之前先在面板里红/黄高亮。专门为"DApp 点了 Confirm 到钱包点 Sign"那一秒钟设计。

▸ 一键重放任意调用
面板里点一下 "Replay",钱包像 DApp 触发那样重新弹窗。复现易抖的交易流程时不用回到 DApp 界面重新操作。

▸ Mock / Block 规则
用预置的 result、error 或延迟短路指定 RPC 方法。"如果 eth_chainId 返回 0x89 会怎样?" —— 30 秒之内 DevTools 里就能给出答案,不必动链上。

▸ 过滤、搜索、导出
按类型(读取 / 写入 / 签名 / 订阅)或状态(错误 / 模拟 / 拦截 / 限速 / 重放)过滤,按方法名搜索。任意调用可复制为 JSON-RPC envelope 或 Markdown 行,贴到 issue / 复盘文档里都行。

▸ 用心做的视觉细节
跟随系统的浅色 / 深色主题,多种强调色,中英文双语界面,完整键盘导航。

═══════════════════════════════
  隐私 —— 本地优先
═══════════════════════════════

所有逻辑在你本地浏览器内运行。捕获的 RPC 通信、设置、规则、ABI 缓存全部存在 chrome.storage.local 里 —— **绝不**发送到我们的任何服务器。

唯一的对外网络请求是按需向 sourcify.dev / api.4byte.sourcify.dev / chainid.network 发起的公开、无鉴权 ABI 与链信息查询,且仅在你打开 Decoded 标签页、本地未缓存时触发。可在「设置 → 抓取 → 自动获取 ABI」里关闭 —— 关闭后扩展仍能完整运行,只是不再补全长尾合约的 ABI。

无任何统计、遥测、账户、追踪。

═══════════════════════════════
  支持范围
═══════════════════════════════

目前支持 EVM 链(任何暴露 window.ethereum 或实现 EIP-6963 的钱包)。Solana 等非 EVM 链在规划中。

═══════════════════════════════
  开源
═══════════════════════════════

源码:https://github.com/beilunyang/dapp-inspector
欢迎提 issue / 功能建议 / PR。
```

---

## 6. Feature highlights / 功能亮点（短列表）

For carousels, embedded landing pages, third-party listings.

**EN**
```
• Captures every wallet RPC call live
• ABI-decoded calldata with named arguments
• Risk warnings before you sign
• One-click replay
• Mock & block rules for state testing
• Local-first — nothing leaves your browser
• EVM chains, EN + 中文 UI
```

**ZH**
```
• 实时捕获每一笔钱包 RPC 调用
• Calldata 自动解码,显示命名参数
• 签名前的风险高亮提示
• 一键重放任意调用
• Mock / Block 规则用于状态测试
• 本地优先 —— 数据不离开你的浏览器
• EVM 链,中英文双语界面
```

---

## 7. Screenshot captions / 截图配文

CWS 截图区每张图最多 ~80 字符配文。建议按这个顺序提交,顺便也是给截图取景的清单。

| # | EN | ZH |
|---|---|---|
| 1 | Live capture of every JSON-RPC call between DApp and wallet. | 实时捕获 DApp 与钱包之间的每一笔 JSON-RPC 调用。 |
| 2 | Decoded calldata with named arguments and risk warnings. | Calldata 解码后显示命名参数与风险提示。 |
| 3 | One-click replay re-fires any call through the wallet. | 一键重放,任意调用都能通过钱包重新发出。 |
| 4 | Mock and block rules to test UI states without touching the chain. | Mock / Block 规则,不动链上就能测试 UI 状态。 |
| 5 | Popup overview with active chain, wallet, and recent activity. | 弹窗概览:当前链、钱包、最近活动一目了然。 |

---

## 8. Release announcement / 发布公告（适合 Twitter 长帖、Discord、博客）

### EN

```
Just shipped DApp Inspector → Chrome Web Store.

It's a DevTools panel that:

• captures every wallet RPC call live
• decodes calldata to function name + named args (Sourcify + 4byte)
• flags UNLIMITED APPROVAL / setApprovalForAll / large native value transfers
• replays any captured call with one click
• mocks / blocks RPC methods so you can stress-test UI states

Local-first: nothing leaves your browser. EVM-only for now.

Open source — https://github.com/beilunyang/dapp-inspector
```

### ZH

```
DApp Inspector 上架 Chrome 网上应用商店。

一个 DevTools 面板:

• 实时捕获钱包的每一笔 RPC 调用
• 自动把 calldata 解码成函数名 + 命名参数(Sourcify + 4byte 兜底)
• 签字前高亮无限授权 / setApprovalForAll / 大额原生币转账等风险
• 任意调用一键重放
• 用 mock / block 规则压测 UI 状态

数据完全本地,不出浏览器。目前只支持 EVM 链。

开源:https://github.com/beilunyang/dapp-inspector
```

---

## 9. Social post / 社交媒体短贴（≤280 chars / 一条微博）

**EN**
```
Built a Chrome DevTools panel that intercepts every wallet RPC call live, decodes the calldata, and flags risky approvals before you sign. Local-first, open source, EVM-only for now.

🔗 https://github.com/beilunyang/dapp-inspector
```

**ZH**
```
做了一个 Chrome DevTools 面板:实时拦截钱包的每笔 RPC 调用,自动解码 calldata,签名前高亮危险授权。数据完全本地,开源,目前只支持 EVM。

🔗 https://github.com/beilunyang/dapp-inspector
```

---

## 10. FAQ / 常见问题

### EN

```
Q: Does it have access to my private keys / mnemonic?
A: No. The extension only observes calls the DApp makes to the wallet — it can't read wallet internals, private keys, or seed phrases.

Q: Does it phone home?
A: No analytics, no telemetry, no accounts. The only outbound traffic is on-demand ABI lookups to Sourcify (sourcify.dev) and chainid.network — both public, unauthenticated, and disable-able.

Q: Why does it want <all_urls>?
A: DApps live on arbitrary URLs. The injected provider wrapper has to run at document_start on every http(s) page so it can wrap window.ethereum before the DApp script grabs a reference. The extension does NOT read DOM, cookies, form fields, or localStorage from any page.

Q: Does it work with my wallet?
A: Any wallet that exposes window.ethereum or implements EIP-6963 — MetaMask, Rabby, OKX, Coinbase Wallet, Trust, Frame, etc. Custom wallet builders welcome to test.

Q: Solana / Bitcoin / Cosmos?
A: EVM-only for now. Non-EVM is on the roadmap; star the repo to follow progress.
```

### ZH

```
Q: 能拿到我的私钥 / 助记词吗?
A: 不能。扩展只观察 DApp 向钱包发起的 RPC 调用,读不到钱包内部状态、私钥或助记词。

Q: 会偷偷上传数据吗?
A: 没有任何统计 / 遥测 / 账户。唯一的对外请求是按需的 ABI 查询(sourcify.dev、chainid.network),公开、无鉴权,且可在设置里关掉。

Q: 为什么要 <all_urls> 权限?
A: DApp 部署在任意 URL 上。注入的 provider wrapper 必须在 document_start 时运行在每个 http(s) 页面,才能在 DApp 脚本之前包住 window.ethereum。**扩展不读取**任何页面的 DOM、cookie、表单、localStorage。

Q: 兼容我的钱包吗?
A: 任何暴露 window.ethereum 或实现 EIP-6963 的钱包都行 —— MetaMask、Rabby、OKX、Coinbase Wallet、Trust、Frame 等。

Q: 支持 Solana / 比特币 / Cosmos 吗?
A: 目前只支持 EVM。非 EVM 在规划中,可以 star 仓库追进度。
```

---

## 11. Category & Language / 分类与语言

| Field | Value |
|---|---|
| Category | `Developer Tools` |
| Primary language | `English (United States)` |
| Additional languages | `Chinese (Simplified)` |
| Public developer name | `beilunyang`(自行替换为你想公开露出的名字) |

---

## 12. Update log entry template / 更新日志条目模板

For new releases, append to `src/shared/changelog.ts`:

```ts
{
  version: '0.X.0',
  date: 'YYYY-MM-DD',
  en: 'One sentence about what changed.',
  zh: '一句话说清这次改了什么。',
},
```

The test suite asserts the top entry version equals package.json.version, so bump them together.
