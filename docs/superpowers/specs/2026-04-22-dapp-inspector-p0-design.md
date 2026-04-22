# DApp Inspector — P0 设计文档

**日期:** 2026-04-22
**范围:** P0(最小可用版)
**目标:** 从空仓库起步,交付一个可装入 Chromium 的 MV3 扩展,实现 DApp ↔ Web3 钱包的 RPC 调用捕获 / 展示,覆盖原设计稿中所有 P0 面向用户的表面。

---

## 0. 决策纪要

| 维度 | 选择 |
|---|---|
| 实现形态 | 完整可运行的 Chrome MV3 扩展(非静态 UI) |
| 特性范围 | **P0 only** — DevTools 面板 / Popup / Options / 空态与引导;Mock/Replay/Block **保留 UI 占位但禁用** |
| 构建工具链 | Vite + `@crxjs/vite-plugin` + TypeScript(strict) |
| UI 样式 | Tailwind CSS,把原型 `theme.css` 的设计 token 移植为 Tailwind 主题变量;暗/亮主题用 class 切换 |
| 语言 | 英文 + 中文从首发就位(原型 i18n 字典直接移植) |
| Provider 发现 | EIP-1193(`window.ethereum`)+ EIP-6963(多 Provider announce) |
| 持久化 | **IndexedDB** 存调用历史 + `chrome.storage.local` 存设置 |
| 架构中心 | **Background Service Worker 为数据中枢**(单一真相源) |
| 状态管理 | **Zustand**,per-UI 存储 + 跨 UI 通过 `chrome.storage.onChanged` 同步 |
| 包管理器 | pnpm |

## 1. 高层架构

```
┌──────────────────────── 网页 (DApp) ────────────────────────────┐
│                                                                  │
│  [content_script · world: 'MAIN']                               │
│    • Chrome 在 document_start 同步执行(无异步注入)             │
│    • 包装 window.ethereum(EIP-1193)                            │
│    • 监听 eip6963:announceProvider,包装每个 announced provider │
│    • 通过 window.postMessage(source 标记)推出 call 事件         │
│                                                                  │
│  [content_script · world: 'ISOLATED']                           │
│    • 监听 postMessage,桥接到 chrome.runtime.sendMessage         │
│    • 从 background 接收控制消息(监控开关/忽略方法)            │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼  chrome.runtime
┌────────────────── Background service worker ────────────────────┐
│  • 每 tab 内存热缓存 + IndexedDB 持久化                          │
│  • 追踪 tab provenance(origin/chain/wallets)                   │
│  • 长连接端口:'panel:<tabId>', 'popup'                         │
│  • 设置缓存,chrome.storage.onChanged 广播                       │
│  • 启动 + 定时 sweep 驱逐旧记录(按保留策略)                   │
└──────────────────────────────────────────────────────────────────┘
       ▲              ▲              ▲                  ▲
       │port          │port          │port              │storage.local
       │              │              │                  │
  ┌────────┐    ┌──────────┐    ┌────────────┐    ┌──────────┐
  │ Popup  │    │ DevTools │    │ Inspector  │    │ Options  │
  │ 340×440│    │   Panel  │    │ 全屏页     │    │  780×560 │
  └────────┘    └──────────┘    └────────────┘    └──────────┘
```

**真相源:** Background SW。Popup/Panel/Inspector/Options 皆为消费者,通过 port 订阅。

## 2. 仓库目录结构

```
dapp-inspector/
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts            # 从 theme.css 移植的设计 token
├── postcss.config.js
├── manifest.config.ts            # MV3 manifest(TS 定义)
├── .nvmrc
│
├── docs/superpowers/specs/       # 本文件
│
├── public/icons/                 # 16 / 32 / 48 / 128 logo(D1 Bot 导出)
│
├── src/
│   ├── shared/
│   │   ├── tokens.css            # Tailwind 引用的 CSS 变量(深/浅主题)
│   │   ├── messages.ts           # chrome.runtime 消息类型联合
│   │   ├── types.ts              # CapturedCall, ProviderInfo, TabProvenance…
│   │   ├── serialize.ts          # 循环引用/BigInt/Error 安全序列化
│   │   ├── idb.ts                # ~60 行 IndexedDB 封装
│   │   ├── classify.ts           # 方法名 → kind
│   │   ├── settings.ts           # chrome.storage.local 适配器 + 默认值
│   │   ├── i18n/{index,en,zh}.ts
│   │   ├── stores/
│   │   │   ├── settings-store.ts # zustand + persist + storage adapter
│   │   │   └── i18n-store.ts     # 派生自 settings.lang
│   │   └── ui/
│   │       ├── Badge.tsx
│   │       ├── Kind.tsx          # 2 字 kind 徽章
│   │       ├── JsonTree.tsx
│   │       ├── Mascot.tsx        # D1 Bot 表情(happy/neutral/warn)
│   │       ├── Icon.tsx
│   │       └── ThemeProvider.tsx
│   │
│   ├── injected/                 # world: 'MAIN'
│   │   ├── index.ts
│   │   └── wrap-provider.ts
│   │
│   ├── content/                  # world: 'ISOLATED'
│   │   └── index.ts
│   │
│   ├── background/
│   │   ├── index.ts              # SW 入口
│   │   ├── store.ts              # IDB + 热缓存层
│   │   ├── tabs.ts               # TabProvenance 追踪
│   │   └── ports.ts              # port 订阅管理
│   │
│   ├── panel/
│   │   ├── panel.html
│   │   ├── panel.tsx             # React 入口
│   │   ├── devtools.html         # chrome.devtools.panels.create stub
│   │   ├── App.tsx
│   │   ├── Toolbar.tsx
│   │   ├── MethodList.tsx        # 虚拟列表
│   │   ├── EmptyStates.tsx
│   │   ├── Detail/
│   │   │   ├── DetailPane.tsx
│   │   │   ├── Header.tsx        # method + status + 三按钮(P0 禁用)
│   │   │   └── Tabs.tsx          # Parameters / Result / Timing / Raw
│   │   └── stores/
│   │       ├── captures-store.ts
│   │       └── view-store.ts
│   │
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.tsx
│   │   ├── App.tsx
│   │   └── stores/popup-store.ts
│   │
│   ├── inspector/                # 全屏版本(复用 panel/App)
│   │   ├── inspector.html
│   │   └── inspector.tsx
│   │
│   └── options/
│       ├── options.html
│       ├── options.tsx
│       ├── App.tsx
│       └── sections/{General,Capture,Mock,Advanced,About}.tsx
│
└── tests/
    ├── unit/                     # vitest
    ├── integration/              # vitest + happy-dom
    ├── e2e/                      # playwright + 加载扩展
    └── fixtures/
        ├── mock-dapp.html
        └── mock-provider.js
```

**Tailwind 配置要点:**
- `theme.extend.colors` 读 CSS 变量(`bg: 'rgb(var(--bg) / <alpha-value>)'`)
- 主题切换通过根节点 `class="theme-dark"` / `class="theme-light"`,CSS 变量在 `:root` / `.theme-dark` / `.theme-light` 三处定义
- `darkMode: 'class'`(不用系统媒体查询,由 settings store 控制)

## 3. 捕获管道

### 3.1 Page-world 注入(world: 'MAIN')

**注入方式:** 不使用 `<script src>` 动态注入(有异步竞态风险),改为 **manifest 中声明 `world: 'MAIN'` 的 content_script**。Chrome(≥ 111)会在 `document_start` 阶段同步在 page world 执行,**保证早于所有页面 `<script>` 与内联脚本**。

```ts
// manifest.config.ts 片段
content_scripts: [
  { matches: ['<all_urls>'], js: ['src/injected/index.ts'],
    run_at: 'document_start', world: 'MAIN' },
  { matches: ['<all_urls>'], js: ['src/content/index.ts'],
    run_at: 'document_start', world: 'ISOLATED' },
]
```

**Provider 发现两条路径:**

1. **EIP-1193:** 若 `window.ethereum` 已存在则立即包装;否则用 `Object.defineProperty(window, 'ethereum', { set, get })` 劫持 setter,在 Provider 被赋值时包装。
2. **EIP-6963:** 监听 `window.addEventListener('eip6963:announceProvider', …)`,包装每个 announced provider,记录 `info.uuid/name/icon/rdns`。启动时主动 dispatch 一次 `eip6963:requestProvider`。

**`wrapProvider(provider, info)`:**

```ts
if (wrapped.has(provider)) return;
wrapped.add(provider);
const original = provider.request.bind(provider);
provider.request = async (args) => {
  const id = nanoid();
  const startedAt = performance.now();
  emit('call:start', { id, method: args.method, params: args.params, providerInfo: info });
  try {
    const result = await original(args);
    emit('call:end', { id, durationMs: performance.now() - startedAt, result });
    return result;
  } catch (error) {
    emit('call:error', { id, durationMs: performance.now() - startedAt, error: serializeError(error) });
    throw error; // 原样透传,不改 DApp 可见行为
  }
};
```

同时包装 `provider.on('message', …)` 以捕获订阅推送。用 `WeakSet` 防重复包装。

**方法分类(`src/injected/classify.ts`):** `read` / `write` / `sign` / `subscribe`,表格驱动,未匹配默认 `read`。

### 3.2 Isolated-world 内容脚本

只做消息桥 —— 无注入逻辑:

```ts
// src/content/index.ts
window.addEventListener('message', (e) => {
  if (e.source !== window) return;
  const d = e.data;
  if (d?.source !== 'dappinsp') return;
  chrome.runtime.sendMessage(d).catch(() => { /* SW idle, drop */ });
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.source === 'dappinsp-ctrl') {
    window.postMessage(msg, window.location.origin);
  }
});
```

### 3.3 消息协议

**Page ↔ Content(window.postMessage):**

```ts
type PageMsg =
  | { source: 'dappinsp'; kind: 'call:start';  payload: CallStart }
  | { source: 'dappinsp'; kind: 'call:end';    payload: CallEnd }
  | { source: 'dappinsp'; kind: 'call:error';  payload: CallError }
  | { source: 'dappinsp'; kind: 'event';       payload: ProviderEvent }
  | { source: 'dappinsp'; kind: 'provider';    payload: ProviderInfo };

type ControlMsg =
  | { source: 'dappinsp-ctrl'; kind: 'monitoring'; enabled: boolean }
  | { source: 'dappinsp-ctrl'; kind: 'ignored-methods'; list: string[] };
```

**UI ↔ Background(chrome.runtime.connect 长连接):**

```ts
type PanelPush =
  | { kind: 'snapshot'; calls: CapturedCall[]; provenance: TabProvenance }
  | { kind: 'append';   call: CapturedCall }
  | { kind: 'update';   id: string; patch: Partial<CapturedCall> }
  | { kind: 'clear' };

type PanelReq =
  | { kind: 'clear' }
  | { kind: 'get-snapshot' }
  | { kind: 'set-monitoring'; enabled: boolean };
```

Popup port 推送节流为每秒一次:`{ kind: 'status', tab: TabStatus, recent: CapturedCall[] }`。

### 3.4 数据模型

```ts
interface CapturedCall {
  id: string; tabId: number; origin: string;
  providerInfo: ProviderInfo;
  method: string; kind: 'read' | 'write' | 'sign' | 'subscribe';
  params: unknown;
  startedAt: number; endedAt?: number; durationMs?: number;
  status: 'pending' | 'ok' | 'error';
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
  chainId?: string;
  truncated?: boolean;
}

interface TabProvenance {
  tabId: number; origin: string; url: string;
  chainId?: string; wallets: ProviderInfo[]; hasDapp: boolean;
}
```

### 3.5 边界情况

- **监控关闭:** control 消息通知注入脚本直接返回原始调用结果,不 emit,零开销
- **忽略方法过滤:** 在注入脚本侧过滤(`eth_blockNumber` 等轮询方法),避免消息总线过载;列表由 SW 启动时下推
- **大 payload:** 序列化后超过 512KB 截断并标记 `truncated: true`
- **循环引用 / BigInt / Error:** 用 `src/shared/serialize.ts` 的 replacer 统一处理
- **SW 回收:** UI 的长连接 port 在 DevTools/Popup 打开时保活;真的回收后,IDB 保留完整历史,热缓存在下次消费者连入时从 IDB 重建 — 无数据丢失
- **隐私:** 历史仅存本地,不外传;Options→Advanced 提供"清空全部历史"按钮

## 4. UI 层

### 4.1 共享状态层(Zustand)

**Store 分布:**

- `src/shared/stores/settings-store.ts` — 跨 UI,`persist` 中间件 + 自定义 `chrome.storage.local` 适配器
- `src/shared/stores/i18n-store.ts` — 派生自 settings.lang,提供 `t(key, vars)`
- `src/panel/stores/captures-store.ts` — 由 port push 填充,action:`applySnapshot` / `appendCall` / `updateCall` / `clear`
- `src/panel/stores/view-store.ts` — 纯 UI 状态:filter、selectedCallId、activeTab
- `src/popup/stores/popup-store.ts` — 简化版(tab status + recent calls + monitoring toggle)

**跨 UI 同步:** 每个 UI 入口装一次 `chrome.storage.onChanged` 监听,调 `useSettingsStore.persist.rehydrate()`。Options 里改主题 → Panel/Popup 实时跟随。

**Port 订阅不进 React 树:** `useBackgroundPort` 在消息到达时直接调 store action,组件用 selector 精确订阅,`MethodList` 的 append 不会让 `DetailPane` 重渲。

**开发中间件:** dev 环境挂 `devtools` 中间件,调试 port 消息流用。

### 4.2 DevTools Panel(1280 × 720)

**对应原型:** `devtools-panel.jsx`

**布局:** 三段式 — Toolbar / MethodList(左) / DetailPane(右)。

**组件映射:**

| 原型 | 目标 | 备注 |
|---|---|---|
| Toolbar | `panel/Toolbar.tsx` | 监控开关 + 搜索(debounced 150ms)+ kind/origin/chain chips + 清空 + 设置 |
| MethodList | `panel/MethodList.tsx` | 行高 28px;列:kind, method, origin, status, duration, ts |
| 虚拟列表 | `@tanstack/react-virtual` | 超 200 条时启用 |
| DetailPane | `panel/Detail/DetailPane.tsx` | 未选中时显示 waiting 空态 |
| DetailHeader | `panel/Detail/Header.tsx` | Replay/Mock/Block **外观保留、P0 禁用**,tooltip:"P1 功能" |
| DetailTabs | `panel/Detail/Tabs.tsx` | Parameters / Result / Timing / Raw |
| JsonTree | `shared/ui/JsonTree.tsx` | 移植 `json-tree.jsx`,折叠/展开/复制叶子值 |
| 空态 | `panel/EmptyStates.tsx` | waiting / no-dapp 两态 |

**本地 UI 状态:** `{ selectedCallId, filter, activeTab }`(在 view-store)。

### 4.3 Popup(340 × 440)

**对应原型:** `popup.jsx`

三种变体:`active` / `off` / `no-dapp`。

**实现要点:**
- 打开时 `chrome.tabs.query({ active: true, currentWindow: true })` 取当前 tab
- `chrome.runtime.connect({ name: 'popup' })` 订阅 tab 状态节流推送
- 监控开关:`storage.local.monitoring`(全局而非 per-tab,P0 简化)
- 近期活动列表:最近 5 条(36px 行高)
- "查看完整调用记录 →" 按钮 → `chrome.tabs.create({ url: chrome.runtime.getURL('src/inspector/inspector.html?tabId=<N>') })`(因 Chrome MV3 不允许扩展直接打开 DevTools,改为跳全屏 Inspector)

### 4.4 Options Page(780 × 560)

**对应原型:** `settings-onboarding.jsx`(Security 分区已按用户反馈移除)

五个分区:
- **General** — 主题(3 卡预览)/ 语言 / 快捷键
- **Capture** — 保留条数滑块(500–50000,默认 5000)/ 忽略方法标签(默认含 `eth_blockNumber`, `eth_getBlockByNumber`, `net_version`)/ 存储占用条(实时显示 `used / max` + 百分比)
- **Mock** — P0 占位:大卡"P1 功能,即将推出" + 3 条假规则预览(灰掉不可交互)
- **Advanced** — 导出格式 / 诊断网格 / 清空全部历史 / 重置全部设置
- **About** — Logo + 版本 + 资源链接 + 更新日志

**路由:** hash-based(`#general` / `#capture` / …),侧栏导航。

**Onboarding:** `chrome.runtime.onInstalled` reason === 'install' 时自动打开 Options 页并高亮 General 顶部的 Welcome 卡(三步上手)。

### 4.5 Inspector 全屏页(新增)

**目的:** Popup "查看完整调用记录 →"按钮的落地点(因 Chrome 不允许扩展直接打开 DevTools)。

**实现:** `src/inspector/inspector.tsx` 复用 `panel/App.tsx`,从 URL query 读 `tabId`;没有 tabId 时顶部显示 tab picker 让用户选活跃 tab。

## 5. 错误处理 & 测试

### 5.1 错误处理

**注入脚本(最敏感):**
- 所有 `emit()` try/catch,静默失败,绝不让 Inspector 错误冒到 DApp
- `provider.request` 包装保持零副作用透传;原 error 原样 throw
- 序列化失败:用 `{ code: -32000, message: 'serialization failed' }` 兜底

**内容脚本:**
- `sendMessage` 失败重试一次,再失败则丢弃
- Port `onDisconnect` 自动重连 + 重新拉 snapshot

**Background SW:**
- IDB 写入失败(配额耗尽)→ 紧急驱逐最旧 20% 再重试;仍失败计入**丢包计数器**,Panel 顶部显示"最近 N 条未能持久化"
- `navigator.storage.estimate()` 在 Settings → Capture 显示真实用量,接近配额主动提示
- SW 未捕获异常写入 `error-log` IDB store(最多 100 条),About 提供"导出诊断"

**UI 层:**
- 每个入口根组件外包 `ErrorBoundary`
- Port 连接超过 5 秒失败 → 顶部警告条
- JsonTree >1MB 默认折叠,提示"大对象,展开可能卡顿"

### 5.2 测试策略

**单元测试(Vitest):**
- `classify.ts` / `idb.ts`(fake-indexeddb) / `settings.ts`(mock chrome.storage) / `serialize.ts` / `i18n` 字典完整性 / Zustand store actions
- 核心 shared 模块覆盖率 ≥ 85%

**集成测试(Vitest + happy-dom):**
- 注入 → 内容桥:postMessage → sendMessage payload
- SW port 订阅:snapshot + 后续 push + 重连 hydration
- EIP-6963 发现:announce 事件 → provider 包装 → request 捕获

**E2E(Playwright + `chromium.launchPersistentContext` 加载扩展):**
- **S1** 冷启动捕获 — 打开 fixture DApp,触发 `eth_blockNumber`,Panel 列表出现 1 条
- **S2** P0 占位按钮 — 点 Replay,tooltip 可见,无副作用
- **S3** 设置同步 — Options 切主题,Panel/Popup 同步变
- **S4** 保留溢出 — 上限改 10,触发 20 次调用,只留最近 10 条
- **S5** i18n 切换 — 切中文,"Parameters" → "参数"
- **S6** Popup 三变体 — 在非 DApp 页开 Popup,显示 no-dapp

**E2E fixture:** `tests/fixtures/mock-dapp.html` + `mock-provider.js`,注入一个 EIP-6963 announce + EIP-1193 假 provider,支持 `eth_blockNumber` / `eth_chainId` / `eth_call` / `personal_sign`(延迟 300ms)/ `eth_sendTransaction`(抛 error)。

**CI:** GitHub Actions 三 job — lint(ESLint + typecheck) / test(Vitest) / e2e(Playwright);main tag 触发打包 zip。

**手动验收清单(P0 Ship Gate):**
- [ ] 在 Uniswap / OpenSea / Aave 三个真实 DApp 上各跑一次
- [ ] MetaMask + Rabby 同装,EIP-6963 正确区分两个 Provider
- [ ] Chromium + Edge 各测一轮
- [ ] 扩展图标 16/32/48/128 在 Windows/macOS 工具栏清晰
- [ ] 禁用扩展 → 启用,Panel 正确 rehydrate

## 6. 非目标(显式)

- **不做 P1**:Mock / Replay / Block 只保留 UI 占位,不实现功能
- **不做 P2**:ABI 解码 / Gas 异常 / 安全风险标记 / 跨窗口同步
- **不做 Firefox / Safari 移植**
- **不做 Solana / Cosmos / 非 EVM**
- **不做云同步 / 账号体系**:所有数据本地
- **不做性能打点采集**:无匿名遥测

## 7. 里程碑

| # | 产出 | 说明 |
|---|---|---|
| M1 | 脚手架 + Provider 捕获管道跑通 | manifest / Vite / 两个 content_script / SW / IDB / 能在 console 看到捕获事件 |
| M2 | DevTools Panel 可用 | 列表 + 详情 + 四 Tab + JsonTree + 筛选 + 清空 |
| M3 | Popup + 监控开关 + 三变体 | 包括 Inspector 全屏页 |
| M4 | Options Page 五分区 | 含 Welcome 引导 + 主题/语言切换联动所有 UI |
| M5 | 测试 + 文档 + Ship gate | 单元/集成/E2E 全绿 + 三大真实 DApp 验收 |

## 8. 风险

- **R1:** Chrome MV3 API 差异或 Edge 行为差异 — 缓解:CI 跑 Edge,手动验收必过
- **R2:** 某些钱包(老版 MetaMask)绕过 EIP-6963,只暴露 `window.ethereum` — 缓解:双路径都保留
- **R3:** 某些 DApp 高频轮询 `eth_blockNumber` 压满消息总线 — 缓解:注入脚本侧忽略方法过滤
- **R4:** IDB 配额在某些企业策略下被收紧 — 缓解:监控 estimate,超 80% 时自动降保留阈值并告知用户

## 9. 未决问题

- **Inspector 全屏页**与 DevTools Panel 的 UI 是否完全一致?还是 Inspector 页需要加一个"当前 tab 选择器"?— 初版采用完全复用 + URL query 传 tabId
- **"清空全部历史"**是否需要二次确认?— 采用"输入 CLEAR 确认"的重度防护,避免误点
- **首次安装打开 Options** 是否可被用户在 Options 里关闭?— 不开放关闭,只执行一次(靠 onInstalled reason)
