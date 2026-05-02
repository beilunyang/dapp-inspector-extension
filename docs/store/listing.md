# Chrome Web Store — Listing Copy

Drop-in text for every field on the developer dashboard. Both English and 简体中文 versions provided; pick the primary, paste the other under **Add a new language**.

---

## Item name

```
DApp Inspector
```

(33 chars; CWS limit is 75)

## Short description (132 chars max)

**EN**
```
Inspect, decode, replay, and mock RPC traffic between Web3 DApps and wallets — right inside Chrome DevTools.
```
(110 chars)

**ZH**
```
在 Chrome DevTools 里捕获、解码、重放、模拟 Web3 DApp 与钱包之间的 RPC 通信。
```
(40 chars)

---

## Detailed description

### EN

```
DApp Inspector adds a DevTools panel that captures every JSON-RPC call your favorite Web3 DApps send to the connected wallet (MetaMask, Rabby, OKX, anything that exposes window.ethereum or speaks EIP-6963).

WHAT YOU GET

• Live RPC capture — every eth_call, eth_sendTransaction, eth_signTypedData_v4, personal_sign and friend lands in the panel as it happens, with method, params, result, error, and latency breakdown.

• Calldata decoding — paste-free. Built-in ABIs cover ERC-20 / 721 / 1155 / Permit2 instantly; unknown contracts are resolved from Sourcify or 4byte.sourcify.dev with a 7-day local cache. Function name + named arguments, plus risk badges for "unlimited approval", "all tokens approval", and large native value transfers.

• Replay any call from the panel — wallet will re-prompt as if the DApp triggered it.

• Mock & block rules — short-circuit selected RPC methods with canned results, errors, or latency. Useful for testing UI states ("what if eth_chainId returns 0x89?") without touching the chain.

• Search, filter by kind (read / write / sign / subscribe), filter by status (errors / mocked / blocked / throttled / replayed), copy as JSON-RPC envelope or Markdown.

• Light / dark themes that follow the system, multiple accent palettes, EN + 中文 UI.

PRIVACY

Everything runs locally in your browser. Captured RPC traffic, settings, and rules are stored in chrome.storage.local on your machine — nothing is sent to any server we control. The only outbound network requests are public, unauthenticated ABI lookups (Sourcify and chainid.network) made on demand when you open the Decoded tab on a contract not yet in the local cache. You can disable these in Settings → Capture → "Auto-fetch ABI".

SCOPE

Currently supports EVM chains. Solana / non-EVM is on the roadmap.

OPEN SOURCE

https://github.com/beilunyang/dapp-inspector — issues and PRs welcome.
```

### ZH

```
DApp Inspector 在 Chrome 开发者工具里加了一个面板，实时捕获你访问的 Web3 DApp 与连接钱包（MetaMask、Rabby、OKX 等任何暴露 window.ethereum 或支持 EIP-6963 的钱包）之间的所有 JSON-RPC 通信。

主要功能

• 实时 RPC 捕获 — 每一个 eth_call / eth_sendTransaction / eth_signTypedData_v4 / personal_sign 等调用都会即时进入面板,显示方法名、参数、返回值、错误信息和耗时分解。

• Calldata 解码 — 免粘贴。ERC-20 / 721 / 1155 / Permit2 内置 ABI 即时解析;未知合约从 Sourcify 或 4byte.sourcify.dev 自动拉取并本地缓存 7 天。显示函数名 + 命名参数,审计场景下还会标记"无限授权"、"全部授权"、"大额原生币转账"等风险。

• 一键重放任意调用 — 钱包会像 DApp 触发那样重新弹窗授权。

• Mock / Block 规则 — 用预置的 result、error 或延迟短路指定 RPC 方法。测试 UI 状态(比如"eth_chainId 返回 0x89 会怎样")时不必触碰链上。

• 搜索 / 按类型(读取 / 写入 / 签名 / 订阅)过滤 / 按状态(错误 / 模拟 / 拦截 / 限速 / 重放)过滤 / 复制为 JSON-RPC envelope 或 Markdown。

• 跟随系统的浅色 / 深色主题,多种强调色,中英文双语界面。

隐私

所有数据完全在你本地浏览器内处理。捕获的 RPC 通信、设置、规则都只存在 chrome.storage.local 里,**绝不**发送到我们的服务器。唯一的对外网络请求是按需向 Sourcify 和 chainid.network 发起的公开、无鉴权 ABI / 链信息查询,且仅在你打开 Decoded 标签页且本地未缓存时触发。可在「设置 → 抓取 → 自动获取 ABI」里关闭。

范围

目前支持 EVM 链。Solana 等非 EVM 在规划中。

开源

https://github.com/beilunyang/dapp-inspector — 欢迎提 issue 与 PR。
```

---

## Category

`Developer Tools`

## Language

`English (United States)` as primary; add `Chinese (Simplified)` as secondary.

## Public-facing developer name

```
beilunyang
```

(or whatever name you want users to see on the listing)
