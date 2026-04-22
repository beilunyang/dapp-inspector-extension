# DApp Inspector P0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome MV3 extension that captures DApp ↔ wallet RPC traffic, with DevTools panel, Popup, Options, and Inspector full-page surfaces. P0 scope — Mock/Replay/Block buttons render but are disabled.

**Architecture:** Two content scripts per page (`world: 'MAIN'` wraps `window.ethereum` + EIP-6963 providers; `world: 'ISOLATED'` bridges to chrome.runtime). Background SW persists calls to IndexedDB and fans out to UI via long-lived ports. UIs are React + Zustand + Tailwind, styled via CSS variables for theme switching.

**Tech Stack:** TypeScript (strict), Vite + `@crxjs/vite-plugin`, React 18, Tailwind CSS, Zustand (+ `persist` middleware), IndexedDB (hand-rolled wrapper), Vitest + fake-indexeddb + happy-dom, Playwright (loads extension into Chromium).

**Reference spec:** `docs/superpowers/specs/2026-04-22-dapp-inspector-p0-design.md`

---

## File Structure

```
dapp-inspector/
├── package.json, pnpm-lock.yaml, tsconfig.json, .nvmrc, .gitignore
├── vite.config.ts, postcss.config.js, tailwind.config.ts, manifest.config.ts
├── .eslintrc.cjs, .prettierrc
│
├── public/icons/{16,32,48,128}.png
│
├── src/
│   ├── shared/
│   │   ├── tokens.css              # Design tokens (:root + .theme-dark/.theme-light)
│   │   ├── types.ts                # CapturedCall, ProviderInfo, TabProvenance, Settings
│   │   ├── messages.ts             # PageMsg, ControlMsg, PanelPush, PanelReq unions
│   │   ├── classify.ts             # method → kind table
│   │   ├── serialize.ts            # safe JSON (BigInt, Error, circular)
│   │   ├── idb.ts                  # Promise-ified IndexedDB wrapper
│   │   ├── settings.ts             # Defaults + chrome.storage.local adapter
│   │   ├── i18n/{index,en,zh}.ts   # t(key, vars)
│   │   ├── stores/
│   │   │   ├── settings-store.ts   # zustand persist + chrome.storage adapter
│   │   │   └── i18n-store.ts       # derived from settings.lang
│   │   └── ui/
│   │       ├── ThemeProvider.tsx
│   │       ├── Icon.tsx, Kind.tsx, Badge.tsx, Mascot.tsx
│   │       ├── JsonTree.tsx
│   │       └── useBackgroundPort.ts
│   │
│   ├── injected/{index.ts, wrap-provider.ts}         # world: 'MAIN'
│   ├── content/index.ts                              # world: 'ISOLATED'
│   ├── background/{index.ts, store.ts, tabs.ts, ports.ts}
│   │
│   ├── panel/
│   │   ├── panel.html, panel.tsx, devtools.html, devtools.ts
│   │   ├── App.tsx, Toolbar.tsx, MethodList.tsx, EmptyStates.tsx
│   │   ├── Detail/{DetailPane.tsx, Header.tsx, Tabs.tsx}
│   │   └── stores/{captures-store.ts, view-store.ts}
│   │
│   ├── popup/{popup.html, popup.tsx, App.tsx, stores/popup-store.ts}
│   ├── inspector/{inspector.html, inspector.tsx}
│   └── options/
│       ├── options.html, options.tsx, App.tsx
│       └── sections/{General, Capture, Mock, Advanced, About}.tsx
│
└── tests/
    ├── unit/                       # vitest
    ├── integration/                # vitest + happy-dom
    ├── e2e/                        # playwright
    └── fixtures/{mock-dapp.html, mock-provider.js}
```

---

## Conventions

**Commits:** Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`). Stage specific files, never `git add -A`.

**Testing:** TDD on pure logic (classify, serialize, idb, settings, stores); visual/E2E for UI components.

**Running tests:**
- Unit/integration: `pnpm test` (vitest)
- E2E: `pnpm test:e2e` (playwright, loads built extension into Chromium)
- Type check: `pnpm typecheck`
- Lint: `pnpm lint`

---

## Task 1: Initialize repository scaffolding

**Files:**
- Create: `package.json`, `.nvmrc`, `.gitignore`, `tsconfig.json`, `pnpm-workspace.yaml`

- [ ] **Step 1: Create `.nvmrc`**

```
20.18.0
```

- [ ] **Step 2: Create `.gitignore`**

```
node_modules/
dist/
.DS_Store
*.log
.vite/
coverage/
playwright-report/
test-results/
.env.local
```

- [ ] **Step 3: Initialize pnpm and create `package.json`**

Run: `pnpm init`
Then overwrite `package.json`:

```json
{
  "name": "dapp-inspector",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b --noEmit",
    "lint": "eslint . --ext .ts,.tsx",
    "test": "vitest",
    "test:run": "vitest run",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^4.5.5",
    "@tanstack/react-virtual": "^3.10.8",
    "nanoid": "^5.0.7"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.0.0-beta.28",
    "@playwright/test": "^1.48.0",
    "@types/chrome": "^0.0.270",
    "@types/node": "^20.14.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@typescript-eslint/eslint-plugin": "^7.18.0",
    "@typescript-eslint/parser": "^7.18.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.19",
    "eslint": "^8.57.0",
    "eslint-plugin-react-hooks": "^4.6.2",
    "eslint-plugin-react-refresh": "^0.4.7",
    "fake-indexeddb": "^6.0.0",
    "happy-dom": "^14.12.3",
    "postcss": "^8.4.38",
    "prettier": "^3.3.2",
    "tailwindcss": "^3.4.6",
    "typescript": "^5.5.3",
    "vite": "^5.3.3",
    "vitest": "^2.0.3"
  },
  "engines": { "node": ">=20" }
}
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "types": ["chrome", "node", "vitest/globals"],
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["src/shared/*"]
    }
  },
  "include": ["src", "tests", "vite.config.ts", "manifest.config.ts", "tailwind.config.ts"]
}
```

- [ ] **Step 5: Install dependencies**

Run: `pnpm install`
Expected: lockfile created, no errors.

- [ ] **Step 6: Commit**

```bash
git add .nvmrc .gitignore package.json tsconfig.json pnpm-lock.yaml
git commit -m "chore: initialize repo scaffolding with pnpm + TypeScript"
```

---

## Task 2: Configure Vite, Tailwind, and MV3 manifest

**Files:**
- Create: `vite.config.ts`, `tailwind.config.ts`, `postcss.config.js`, `manifest.config.ts`, `src/shared/tokens.css`

- [ ] **Step 1: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  resolve: {
    alias: { '@shared': path.resolve(__dirname, 'src/shared') },
  },
  build: {
    rollupOptions: {
      input: {
        panel: 'src/panel/panel.html',
        devtools: 'src/panel/devtools.html',
        popup: 'src/popup/popup.html',
        options: 'src/options/options.html',
        inspector: 'src/inspector/inspector.html',
      },
    },
  },
  server: { port: 5173, strictPort: true },
});
```

- [ ] **Step 2: Create `manifest.config.ts`**

```ts
import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json';

export default defineManifest({
  manifest_version: 3,
  name: 'DApp Inspector',
  description: 'Inspect RPC traffic between DApps and Web3 wallets.',
  version: pkg.version,
  icons: {
    16: 'public/icons/16.png',
    32: 'public/icons/32.png',
    48: 'public/icons/48.png',
    128: 'public/icons/128.png',
  },
  action: {
    default_popup: 'src/popup/popup.html',
    default_icon: {
      16: 'public/icons/16.png',
      32: 'public/icons/32.png',
    },
  },
  options_ui: { page: 'src/options/options.html', open_in_tab: true },
  devtools_page: 'src/panel/devtools.html',
  background: { service_worker: 'src/background/index.ts', type: 'module' },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/injected/index.ts'],
      run_at: 'document_start',
      world: 'MAIN',
    },
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
      run_at: 'document_start',
      world: 'ISOLATED',
    },
  ],
  web_accessible_resources: [
    {
      resources: ['src/inspector/inspector.html'],
      matches: ['<all_urls>'],
    },
  ],
  host_permissions: ['<all_urls>'],
  permissions: ['tabs', 'storage', 'scripting'],
});
```

- [ ] **Step 3: Create `postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 4: Create `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx,html}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg:        'rgb(var(--bg) / <alpha-value>)',
        surface:   'rgb(var(--surface) / <alpha-value>)',
        elevated:  'rgb(var(--elevated) / <alpha-value>)',
        border:    'rgb(var(--border) / <alpha-value>)',
        fg:        'rgb(var(--fg) / <alpha-value>)',
        muted:     'rgb(var(--muted) / <alpha-value>)',
        accent:    'rgb(var(--accent) / <alpha-value>)',
        'accent-fg': 'rgb(var(--accent-fg) / <alpha-value>)',
        kind: {
          read:      'rgb(var(--kind-read) / <alpha-value>)',
          write:     'rgb(var(--kind-write) / <alpha-value>)',
          sign:      'rgb(var(--kind-sign) / <alpha-value>)',
          subscribe: 'rgb(var(--kind-subscribe) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter Tight', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        DEFAULT: '6px',
        lg: '8px',
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 5: Create `src/shared/tokens.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root, .theme-light {
  --bg:              255 255 255;
  --surface:         248 249 251;
  --elevated:        255 255 255;
  --border:          229 231 235;
  --fg:              20 23 28;
  --muted:           107 114 128;
  --accent:          86 66 214;
  --accent-fg:       255 255 255;
  --kind-read:       100 116 139;
  --kind-write:      217 119 6;
  --kind-sign:       139 92 246;
  --kind-subscribe:  14 165 233;
}

.theme-dark {
  --bg:              14 16 19;
  --surface:         24 26 30;
  --elevated:        32 34 38;
  --border:          51 54 59;
  --fg:              229 231 235;
  --muted:           148 156 166;
  --accent:          167 139 250;
  --accent-fg:       14 16 19;
  --kind-read:       148 163 184;
  --kind-write:      251 191 36;
  --kind-sign:       196 181 253;
  --kind-subscribe:  56 189 248;
}

html, body { @apply bg-bg text-fg font-sans antialiased; margin: 0; }
```

- [ ] **Step 6: Verify Vite builds an empty manifest**

Run: `pnpm build`
Expected: fails with "Cannot find module 'src/background/index.ts'" — proves manifest is wired but entries missing. This is fine for now.

- [ ] **Step 7: Commit**

```bash
git add vite.config.ts manifest.config.ts postcss.config.js tailwind.config.ts src/shared/tokens.css
git commit -m "chore: configure Vite + CRXJS + Tailwind + MV3 manifest"
```

---

## Task 3: Create shared types and messages

**Files:**
- Create: `src/shared/types.ts`, `src/shared/messages.ts`

- [ ] **Step 1: Create `src/shared/types.ts`**

```ts
export type Kind = 'read' | 'write' | 'sign' | 'subscribe';
export type CallStatus = 'pending' | 'ok' | 'error';

export interface ProviderInfo {
  uuid?: string;
  name: string;
  icon?: string;
  rdns?: string;
}

export interface CapturedCall {
  id: string;
  tabId: number;
  origin: string;
  providerInfo: ProviderInfo;
  method: string;
  kind: Kind;
  params: unknown;
  startedAt: number;
  endedAt?: number;
  durationMs?: number;
  status: CallStatus;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
  chainId?: string;
  truncated?: boolean;
}

export interface TabProvenance {
  tabId: number;
  origin: string;
  url: string;
  chainId?: string;
  wallets: ProviderInfo[];
  hasDapp: boolean;
}

export type Theme = 'light' | 'dark' | 'system';
export type Lang = 'en' | 'zh';

export interface Settings {
  theme: Theme;
  lang: Lang;
  monitoring: boolean;
  retentionMax: number;        // 500–50000
  ignoredMethods: string[];
  accent: 'cyan' | 'violet' | 'green' | 'amber' | 'indigo';
}
```

- [ ] **Step 2: Create `src/shared/messages.ts`**

```ts
import type { CapturedCall, ProviderInfo, TabProvenance } from './types';

export interface CallStart {
  id: string;
  method: string;
  params: unknown;
  providerInfo: ProviderInfo;
  startedAt: number;
}
export interface CallEnd {
  id: string;
  endedAt: number;
  durationMs: number;
  result: unknown;
}
export interface CallError {
  id: string;
  endedAt: number;
  durationMs: number;
  error: { code: number; message: string; data?: unknown };
}

export type PageMsg =
  | { source: 'dappinsp'; kind: 'call:start'; payload: CallStart }
  | { source: 'dappinsp'; kind: 'call:end';   payload: CallEnd }
  | { source: 'dappinsp'; kind: 'call:error'; payload: CallError }
  | { source: 'dappinsp'; kind: 'provider';   payload: ProviderInfo }
  | { source: 'dappinsp'; kind: 'chain';      payload: { chainId: string } };

export type ControlMsg =
  | { source: 'dappinsp-ctrl'; kind: 'monitoring'; enabled: boolean }
  | { source: 'dappinsp-ctrl'; kind: 'ignored-methods'; list: string[] };

export type PanelPush =
  | { kind: 'snapshot'; calls: CapturedCall[]; provenance: TabProvenance }
  | { kind: 'append'; call: CapturedCall }
  | { kind: 'update'; id: string; patch: Partial<CapturedCall> }
  | { kind: 'clear' }
  | { kind: 'provenance'; provenance: TabProvenance };

export type PanelReq =
  | { kind: 'subscribe'; tabId: number }
  | { kind: 'get-snapshot' }
  | { kind: 'clear' };

export type PopupPush =
  | { kind: 'status'; provenance: TabProvenance; recent: CapturedCall[]; monitoring: boolean };

export type PopupReq =
  | { kind: 'subscribe'; tabId: number }
  | { kind: 'toggle-monitoring' };
```

- [ ] **Step 3: Type-check**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/shared/types.ts src/shared/messages.ts
git commit -m "feat(shared): add CapturedCall, ProviderInfo, message unions"
```

---

## Task 4: Configure Vitest and write classify.ts with tests

**Files:**
- Create: `vitest.config.ts`, `src/shared/classify.ts`, `tests/unit/classify.test.ts`

- [ ] **Step 1: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'happy-dom',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
  resolve: {
    alias: { '@shared': path.resolve(__dirname, 'src/shared') },
  },
});
```

- [ ] **Step 2: Create `tests/setup.ts`**

```ts
import 'fake-indexeddb/auto';
```

- [ ] **Step 3: Write failing test in `tests/unit/classify.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { classify } from '@shared/classify';

describe('classify', () => {
  it('classifies read methods', () => {
    expect(classify('eth_call')).toBe('read');
    expect(classify('eth_getBalance')).toBe('read');
    expect(classify('eth_blockNumber')).toBe('read');
    expect(classify('net_version')).toBe('read');
    expect(classify('eth_chainId')).toBe('read');
  });
  it('classifies write methods', () => {
    expect(classify('eth_sendTransaction')).toBe('write');
    expect(classify('eth_sendRawTransaction')).toBe('write');
  });
  it('classifies sign methods', () => {
    expect(classify('personal_sign')).toBe('sign');
    expect(classify('eth_sign')).toBe('sign');
    expect(classify('eth_signTypedData_v4')).toBe('sign');
    expect(classify('wallet_requestPermissions')).toBe('sign');
    expect(classify('wallet_switchEthereumChain')).toBe('sign');
  });
  it('classifies subscribe methods', () => {
    expect(classify('eth_subscribe')).toBe('subscribe');
    expect(classify('eth_unsubscribe')).toBe('subscribe');
  });
  it('defaults unknown methods to read', () => {
    expect(classify('unknown_method')).toBe('read');
    expect(classify('custom_rpc')).toBe('read');
  });
});
```

- [ ] **Step 4: Run test — expect FAIL**

Run: `pnpm test:run tests/unit/classify.test.ts`
Expected: FAIL — `Cannot find module '@shared/classify'`.

- [ ] **Step 5: Create `src/shared/classify.ts`**

```ts
import type { Kind } from './types';

const WRITE = new Set(['eth_sendTransaction', 'eth_sendRawTransaction']);
const SIGN = new Set([
  'eth_sign', 'personal_sign',
  'eth_signTypedData', 'eth_signTypedData_v1', 'eth_signTypedData_v3', 'eth_signTypedData_v4',
]);
const SUBSCRIBE = new Set(['eth_subscribe', 'eth_unsubscribe']);

export function classify(method: string): Kind {
  if (WRITE.has(method)) return 'write';
  if (SIGN.has(method)) return 'sign';
  if (SUBSCRIBE.has(method)) return 'subscribe';
  if (method.startsWith('wallet_')) return 'sign';
  return 'read';
}
```

- [ ] **Step 6: Run test — expect PASS**

Run: `pnpm test:run tests/unit/classify.test.ts`
Expected: all 5 tests pass.

- [ ] **Step 7: Commit**

```bash
git add vitest.config.ts tests/setup.ts tests/unit/classify.test.ts src/shared/classify.ts
git commit -m "feat(shared): classify RPC method → kind"
```

---

## Task 5: Safe serialization (BigInt, Error, circular)

**Files:**
- Create: `src/shared/serialize.ts`, `tests/unit/serialize.test.ts`

- [ ] **Step 1: Write failing test in `tests/unit/serialize.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { safeClone, safeStringify, serializeError, MAX_PAYLOAD_BYTES } from '@shared/serialize';

describe('serialize', () => {
  it('clones plain objects unchanged', () => {
    expect(safeClone({ a: 1, b: [2, 3] })).toEqual({ a: 1, b: [2, 3] });
  });
  it('converts BigInt to string', () => {
    expect(safeClone({ amount: 123n })).toEqual({ amount: '123' });
  });
  it('replaces circular references with [Circular]', () => {
    const a: any = { name: 'a' };
    a.self = a;
    const cloned = safeClone(a) as any;
    expect(cloned.name).toBe('a');
    expect(cloned.self).toBe('[Circular]');
  });
  it('preserves Error shape', () => {
    const err = new Error('boom');
    const s = serializeError(err);
    expect(s.message).toBe('boom');
    expect(s.code).toBe(-32000);
  });
  it('preserves Error code when present', () => {
    const err: any = new Error('rejected');
    err.code = 4001;
    err.data = { foo: 'bar' };
    expect(serializeError(err)).toEqual({ code: 4001, message: 'rejected', data: { foo: 'bar' } });
  });
  it('flags truncation when payload exceeds max bytes', () => {
    const big = 'x'.repeat(MAX_PAYLOAD_BYTES + 100);
    const { value, truncated } = safeStringify(big);
    expect(truncated).toBe(true);
    expect(value.length).toBeLessThanOrEqual(MAX_PAYLOAD_BYTES + 50);
  });
  it('does not truncate small payloads', () => {
    const { truncated } = safeStringify({ a: 1 });
    expect(truncated).toBe(false);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm test:run tests/unit/serialize.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/shared/serialize.ts`**

```ts
export const MAX_PAYLOAD_BYTES = 512 * 1024; // 512 KB

export function safeClone(input: unknown): unknown {
  const seen = new WeakSet<object>();
  function walk(v: unknown): unknown {
    if (v === null || v === undefined) return v;
    const t = typeof v;
    if (t === 'bigint') return (v as bigint).toString();
    if (t !== 'object') return v;
    if (seen.has(v as object)) return '[Circular]';
    seen.add(v as object);
    if (Array.isArray(v)) return v.map(walk);
    if (v instanceof Error) return { name: v.name, message: v.message };
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as object)) out[k] = walk(val);
    return out;
  }
  return walk(input);
}

export function safeStringify(input: unknown): { value: string; truncated: boolean } {
  let value: string;
  try {
    value = JSON.stringify(safeClone(input)) ?? 'null';
  } catch {
    value = '"[Unserializable]"';
  }
  if (value.length > MAX_PAYLOAD_BYTES) {
    return { value: value.slice(0, MAX_PAYLOAD_BYTES) + '…', truncated: true };
  }
  return { value, truncated: false };
}

export interface SerializedError {
  code: number;
  message: string;
  data?: unknown;
}
export function serializeError(err: unknown): SerializedError {
  if (err && typeof err === 'object') {
    const e = err as { code?: number; message?: string; data?: unknown };
    return {
      code: typeof e.code === 'number' ? e.code : -32000,
      message: typeof e.message === 'string' ? e.message : String(err),
      ...(e.data !== undefined ? { data: safeClone(e.data) } : {}),
    };
  }
  return { code: -32000, message: String(err) };
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `pnpm test:run tests/unit/serialize.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/shared/serialize.ts tests/unit/serialize.test.ts
git commit -m "feat(shared): safe serialization for BigInt, Error, circular refs"
```

---

## Task 6: IndexedDB wrapper

**Files:**
- Create: `src/shared/idb.ts`, `tests/unit/idb.test.ts`

- [ ] **Step 1: Write failing test in `tests/unit/idb.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, type DappInspectorDb } from '@shared/idb';
import type { CapturedCall, TabProvenance } from '@shared/types';

const fakeCall = (over: Partial<CapturedCall> = {}): CapturedCall => ({
  id: 'c1', tabId: 1, origin: 'https://app.test',
  providerInfo: { name: 'MetaMask' },
  method: 'eth_chainId', kind: 'read', params: [],
  startedAt: Date.now(), status: 'ok', result: '0x1',
  ...over,
});

describe('idb', () => {
  let db: DappInspectorDb;
  beforeEach(async () => {
    // fake-indexeddb/auto resets between each test suite via global reset — force fresh db by unique name
    const indexedDB = globalThis.indexedDB;
    const dbs = await indexedDB.databases?.();
    for (const d of dbs ?? []) if (d.name) indexedDB.deleteDatabase(d.name);
    db = await openDb();
  });

  it('puts and gets a call', async () => {
    await db.putCall(fakeCall());
    const got = await db.getCall('c1');
    expect(got?.method).toBe('eth_chainId');
  });

  it('lists calls for a tab, newest first', async () => {
    await db.putCall(fakeCall({ id: 'a', startedAt: 100 }));
    await db.putCall(fakeCall({ id: 'b', startedAt: 200 }));
    await db.putCall(fakeCall({ id: 'c', startedAt: 150, tabId: 2 }));
    const list = await db.listCallsByTab(1);
    expect(list.map(c => c.id)).toEqual(['b', 'a']);
  });

  it('clears calls for a tab', async () => {
    await db.putCall(fakeCall({ id: 'a', tabId: 1 }));
    await db.putCall(fakeCall({ id: 'b', tabId: 2 }));
    await db.clearTab(1);
    const t1 = await db.listCallsByTab(1);
    const t2 = await db.listCallsByTab(2);
    expect(t1).toHaveLength(0);
    expect(t2).toHaveLength(1);
  });

  it('evicts oldest calls when over cap', async () => {
    for (let i = 0; i < 10; i++) {
      await db.putCall(fakeCall({ id: `x${i}`, startedAt: i }));
    }
    await db.evictOldest(4);
    const remaining = await db.countCalls();
    expect(remaining).toBe(4);
    const all = await db.listCallsByTab(1);
    expect(all.map(c => c.id)).toEqual(['x9', 'x8', 'x7', 'x6']);
  });

  it('puts and gets tab provenance', async () => {
    const prov: TabProvenance = { tabId: 7, origin: 'https://app.test', url: 'https://app.test/x', wallets: [], hasDapp: true };
    await db.putProvenance(prov);
    const got = await db.getProvenance(7);
    expect(got?.origin).toBe('https://app.test');
  });

  it('patches call in place', async () => {
    await db.putCall(fakeCall({ id: 'p', status: 'pending' }));
    await db.patchCall('p', { status: 'ok', durationMs: 42, endedAt: 100 });
    const got = await db.getCall('p');
    expect(got?.status).toBe('ok');
    expect(got?.durationMs).toBe(42);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm test:run tests/unit/idb.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/shared/idb.ts`**

```ts
import type { CapturedCall, TabProvenance } from './types';

const DB_NAME = 'dapp-inspector';
const DB_VERSION = 1;
const CALLS = 'calls';
const PROVENANCE = 'tab-provenance';

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(db: IDBDatabase, store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => Promise<T> | T): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    Promise.resolve(fn(s)).then(
      (result) => { t.oncomplete = () => resolve(result); t.onerror = () => reject(t.error); },
      reject,
    );
  });
}

export interface DappInspectorDb {
  putCall(call: CapturedCall): Promise<void>;
  patchCall(id: string, patch: Partial<CapturedCall>): Promise<void>;
  getCall(id: string): Promise<CapturedCall | undefined>;
  listCallsByTab(tabId: number): Promise<CapturedCall[]>;
  clearTab(tabId: number): Promise<void>;
  clearAll(): Promise<void>;
  countCalls(): Promise<number>;
  evictOldest(keepLastN: number): Promise<number>; // returns how many removed
  putProvenance(prov: TabProvenance): Promise<void>;
  getProvenance(tabId: number): Promise<TabProvenance | undefined>;
  close(): void;
}

export async function openDb(): Promise<DappInspectorDb> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(CALLS)) {
        const s = d.createObjectStore(CALLS, { keyPath: 'id' });
        s.createIndex('byTabId', 'tabId', { unique: false });
        s.createIndex('byStartedAt', 'startedAt', { unique: false });
        s.createIndex('byOrigin', 'origin', { unique: false });
      }
      if (!d.objectStoreNames.contains(PROVENANCE)) {
        d.createObjectStore(PROVENANCE, { keyPath: 'tabId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return {
    async putCall(call) {
      await tx(db, CALLS, 'readwrite', (s) => request(s.put(call)));
    },
    async patchCall(id, patch) {
      await tx(db, CALLS, 'readwrite', async (s) => {
        const cur = await request(s.get(id));
        if (!cur) return;
        await request(s.put({ ...cur, ...patch }));
      });
    },
    async getCall(id) {
      return tx(db, CALLS, 'readonly', (s) => request(s.get(id)) as Promise<CapturedCall | undefined>);
    },
    async listCallsByTab(tabId) {
      return tx(db, CALLS, 'readonly', async (s) => {
        const idx = s.index('byTabId');
        const calls = await request(idx.getAll(IDBKeyRange.only(tabId))) as CapturedCall[];
        return calls.sort((a, b) => b.startedAt - a.startedAt);
      });
    },
    async clearTab(tabId) {
      await tx(db, CALLS, 'readwrite', async (s) => {
        const idx = s.index('byTabId');
        const keys = await request(idx.getAllKeys(IDBKeyRange.only(tabId))) as IDBValidKey[];
        for (const k of keys) await request(s.delete(k));
      });
    },
    async clearAll() {
      await tx(db, CALLS, 'readwrite', (s) => request(s.clear()));
    },
    async countCalls() {
      return tx(db, CALLS, 'readonly', (s) => request(s.count()));
    },
    async evictOldest(keepLastN) {
      return tx(db, CALLS, 'readwrite', async (s) => {
        const total = await request(s.count());
        if (total <= keepLastN) return 0;
        const idx = s.index('byStartedAt');
        const toRemove = total - keepLastN;
        let removed = 0;
        await new Promise<void>((resolve, reject) => {
          const cursorReq = idx.openCursor(null, 'next');
          cursorReq.onsuccess = () => {
            const c = cursorReq.result;
            if (!c || removed >= toRemove) return resolve();
            c.delete();
            removed++;
            c.continue();
          };
          cursorReq.onerror = () => reject(cursorReq.error);
        });
        return removed;
      });
    },
    async putProvenance(prov) {
      await tx(db, PROVENANCE, 'readwrite', (s) => request(s.put(prov)));
    },
    async getProvenance(tabId) {
      return tx(db, PROVENANCE, 'readonly', (s) => request(s.get(tabId)) as Promise<TabProvenance | undefined>);
    },
    close() { db.close(); },
  };
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `pnpm test:run tests/unit/idb.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/shared/idb.ts tests/unit/idb.test.ts
git commit -m "feat(shared): IndexedDB wrapper with tab-indexed calls + provenance"
```

---

## Task 7: Settings module (defaults + chrome.storage adapter)

**Files:**
- Create: `src/shared/settings.ts`, `tests/unit/settings.test.ts`, `tests/mocks/chrome-storage.ts`

- [ ] **Step 1: Create chrome.storage mock in `tests/mocks/chrome-storage.ts`**

```ts
interface Listener { (changes: Record<string, chrome.storage.StorageChange>, areaName: string): void }

export function installChromeStorageMock() {
  const store = new Map<string, unknown>();
  const listeners: Listener[] = [];
  const area = {
    get: async (keys?: string | string[] | Record<string, unknown> | null) => {
      if (keys == null) return Object.fromEntries(store);
      if (typeof keys === 'string') return { [keys]: store.get(keys) };
      if (Array.isArray(keys)) return Object.fromEntries(keys.map(k => [k, store.get(k)]));
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(keys)) out[k] = store.has(k) ? store.get(k) : (keys as any)[k];
      return out;
    },
    set: async (items: Record<string, unknown>) => {
      const changes: Record<string, chrome.storage.StorageChange> = {};
      for (const [k, v] of Object.entries(items)) {
        const oldValue = store.get(k);
        store.set(k, v);
        changes[k] = { oldValue, newValue: v };
      }
      for (const l of listeners) l(changes, 'local');
    },
    remove: async (k: string | string[]) => {
      const keys = Array.isArray(k) ? k : [k];
      for (const key of keys) store.delete(key);
    },
    clear: async () => store.clear(),
  };
  (globalThis as any).chrome = {
    storage: {
      local: area,
      onChanged: {
        addListener: (l: Listener) => listeners.push(l),
        removeListener: (l: Listener) => {
          const i = listeners.indexOf(l);
          if (i >= 0) listeners.splice(i, 1);
        },
      },
    },
  };
  return { store, listeners };
}
```

- [ ] **Step 2: Write failing test in `tests/unit/settings.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { installChromeStorageMock } from '../mocks/chrome-storage';
import { DEFAULT_SETTINGS, loadSettings, saveSetting } from '@shared/settings';

describe('settings', () => {
  beforeEach(() => { installChromeStorageMock(); });

  it('returns defaults when storage is empty', async () => {
    const s = await loadSettings();
    expect(s).toEqual(DEFAULT_SETTINGS);
  });

  it('persists a single setting', async () => {
    await saveSetting('theme', 'dark');
    const s = await loadSettings();
    expect(s.theme).toBe('dark');
    // Others stay default
    expect(s.lang).toBe(DEFAULT_SETTINGS.lang);
  });

  it('merges partial storage with defaults', async () => {
    await saveSetting('retentionMax', 1000);
    const s = await loadSettings();
    expect(s.retentionMax).toBe(1000);
    expect(s.monitoring).toBe(DEFAULT_SETTINGS.monitoring);
  });
});
```

- [ ] **Step 3: Run test — expect FAIL**

Run: `pnpm test:run tests/unit/settings.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Create `src/shared/settings.ts`**

```ts
import type { Settings } from './types';

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  lang: 'en',
  monitoring: true,
  retentionMax: 5000,
  ignoredMethods: ['eth_blockNumber', 'eth_getBlockByNumber', 'net_version'],
  accent: 'violet',
};

const KEY = 'dapp-inspector:settings';

export async function loadSettings(): Promise<Settings> {
  const res = await chrome.storage.local.get(KEY);
  return { ...DEFAULT_SETTINGS, ...(res[KEY] ?? {}) };
}

export async function saveSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
  const current = await loadSettings();
  const next = { ...current, [key]: value };
  await chrome.storage.local.set({ [KEY]: next });
}

export async function saveSettings(partial: Partial<Settings>): Promise<void> {
  const current = await loadSettings();
  await chrome.storage.local.set({ [KEY]: { ...current, ...partial } });
}

export const SETTINGS_KEY = KEY;
```

- [ ] **Step 5: Run test — expect PASS**

Run: `pnpm test:run tests/unit/settings.test.ts`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/shared/settings.ts tests/unit/settings.test.ts tests/mocks/chrome-storage.ts
git commit -m "feat(shared): settings module with chrome.storage.local persistence"
```

---

## Task 8: i18n module (en + zh dictionaries)

**Files:**
- Create: `src/shared/i18n/en.ts`, `src/shared/i18n/zh.ts`, `src/shared/i18n/index.ts`, `tests/unit/i18n.test.ts`

- [ ] **Step 1: Write failing test in `tests/unit/i18n.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { t, getKeys } from '@shared/i18n';
import { en } from '@shared/i18n/en';
import { zh } from '@shared/i18n/zh';

describe('i18n', () => {
  it('returns English by default', () => {
    expect(t('en', 'panel.empty.waiting.title')).toBe('Waiting for calls');
  });
  it('returns Chinese when requested', () => {
    expect(t('zh', 'panel.empty.waiting.title')).toBe('等待调用');
  });
  it('interpolates variables', () => {
    expect(t('en', 'panel.count', { n: 5 })).toBe('5 calls');
    expect(t('zh', 'panel.count', { n: 5 })).toBe('5 条调用');
  });
  it('falls back to the key when missing', () => {
    expect(t('en', 'totally.unknown.key' as any)).toBe('totally.unknown.key');
  });
  it('has the same keys in both dictionaries', () => {
    const enKeys = getKeys(en).sort();
    const zhKeys = getKeys(zh).sort();
    expect(zhKeys).toEqual(enKeys);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm test:run tests/unit/i18n.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/shared/i18n/en.ts`**

```ts
export const en = {
  panel: {
    count: '{n} calls',
    toolbar: {
      search: 'Search',
      clear: 'Clear',
      settings: 'Settings',
      monitoring: 'Monitoring',
      filter: { kind: 'Kind', origin: 'Origin', chain: 'Chain' },
    },
    list: { method: 'Method', origin: 'Origin', status: 'Status', duration: 'Time', ts: 'When' },
    detail: {
      tabs: { params: 'Parameters', result: 'Result', timing: 'Timing', raw: 'Raw' },
      replay: 'Replay', mock: 'Mock', block: 'Block',
      disabledHint: 'P1 feature — coming soon',
      empty: 'Select a call to inspect',
    },
    empty: {
      waiting: { title: 'Waiting for calls', hint: 'Interact with the DApp to capture RPC activity' },
      noDapp: { title: 'No DApp detected', hint: 'This page does not expose a Web3 provider' },
    },
  },
  popup: {
    title: 'DApp Inspector',
    monitoring: 'Monitoring',
    openFull: 'View full call history',
    variants: {
      active: { heading: 'Connected', hint: 'Inspecting activity' },
      off: { heading: 'Monitoring off', hint: 'Turn on to capture calls' },
      noDapp: { heading: 'No DApp here', hint: 'Visit a Web3 DApp to start' },
    },
    recent: 'Recent activity',
  },
  options: {
    nav: { general: 'General', capture: 'Capture', mock: 'Mock', advanced: 'Advanced', about: 'About' },
    general: {
      theme: 'Theme', themeSystem: 'System', themeLight: 'Light', themeDark: 'Dark',
      lang: 'Language',
    },
    capture: {
      retention: 'Retention (calls)',
      ignoredMethods: 'Ignored methods',
      storage: 'Storage usage',
    },
    mock: {
      locked: 'Mock rules — coming in P1',
      lockedHint: 'Intercept RPC requests and return custom responses. Available in the next release.',
    },
    advanced: {
      clearHistory: 'Clear all history',
      clearHistoryConfirm: 'Type CLEAR to confirm',
      resetSettings: 'Reset all settings',
    },
    about: { version: 'Version', links: 'Resources', changelog: 'Changelog' },
  },
  common: { on: 'On', off: 'Off', cancel: 'Cancel', confirm: 'Confirm', save: 'Save' },
} as const;

export type I18nDict = typeof en;
```

- [ ] **Step 4: Create `src/shared/i18n/zh.ts`**

```ts
import type { I18nDict } from './en';

export const zh: I18nDict = {
  panel: {
    count: '{n} 条调用',
    toolbar: {
      search: '搜索',
      clear: '清空',
      settings: '设置',
      monitoring: '监控',
      filter: { kind: '类型', origin: '来源', chain: '链' },
    },
    list: { method: '方法', origin: '来源', status: '状态', duration: '耗时', ts: '时间' },
    detail: {
      tabs: { params: '参数', result: '返回值', timing: '耗时', raw: '原始数据' },
      replay: '重放', mock: '模拟', block: '拦截',
      disabledHint: 'P1 功能 — 即将推出',
      empty: '选择一条调用查看详情',
    },
    empty: {
      waiting: { title: '等待调用', hint: '在 DApp 上操作以捕获 RPC 活动' },
      noDapp: { title: '未检测到 DApp', hint: '此页面未暴露 Web3 Provider' },
    },
  },
  popup: {
    title: 'DApp Inspector',
    monitoring: '监控',
    openFull: '查看完整调用记录',
    variants: {
      active: { heading: '已连接', hint: '正在检查活动' },
      off: { heading: '监控已关闭', hint: '打开以开始捕获' },
      noDapp: { heading: '此处无 DApp', hint: '访问 Web3 DApp 以开始' },
    },
    recent: '近期活动',
  },
  options: {
    nav: { general: '常规', capture: '抓取', mock: '模拟', advanced: '高级', about: '关于' },
    general: {
      theme: '主题', themeSystem: '跟随系统', themeLight: '浅色', themeDark: '深色',
      lang: '语言',
    },
    capture: {
      retention: '保留条数',
      ignoredMethods: '忽略方法',
      storage: '存储占用',
    },
    mock: {
      locked: 'Mock 规则 — P1 版本',
      lockedHint: '拦截 RPC 请求并返回自定义响应。下一版本推出。',
    },
    advanced: {
      clearHistory: '清空全部历史',
      clearHistoryConfirm: '输入 CLEAR 确认',
      resetSettings: '重置全部设置',
    },
    about: { version: '版本', links: '资源', changelog: '更新日志' },
  },
  common: { on: '开', off: '关', cancel: '取消', confirm: '确认', save: '保存' },
};
```

- [ ] **Step 5: Create `src/shared/i18n/index.ts`**

```ts
import { en, type I18nDict } from './en';
import { zh } from './zh';
import type { Lang } from '../types';

const DICTS: Record<Lang, I18nDict> = { en, zh };

type Path<T, P extends string = ''> = T extends object
  ? { [K in keyof T & string]: T[K] extends object ? Path<T[K], `${P}${K}.`> : `${P}${K}` }[keyof T & string]
  : never;
export type I18nKey = Path<I18nDict>;

export function t(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const dict = DICTS[lang] ?? en;
  const parts = key.split('.');
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return key;
    }
  }
  if (typeof cur !== 'string') return key;
  if (!vars) return cur;
  return cur.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

export function getKeys(dict: unknown, prefix = ''): string[] {
  if (dict == null || typeof dict !== 'object') return [prefix];
  const out: string[] = [];
  for (const [k, v] of Object.entries(dict as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null) out.push(...getKeys(v, next));
    else out.push(next);
  }
  return out;
}
```

- [ ] **Step 6: Run test — expect PASS**

Run: `pnpm test:run tests/unit/i18n.test.ts`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/shared/i18n tests/unit/i18n.test.ts
git commit -m "feat(shared): i18n with en/zh dictionaries and t() helper"
```

---

## Task 9: Provider wrapper (pure function)

**Files:**
- Create: `src/injected/wrap-provider.ts`, `tests/unit/wrap-provider.test.ts`

- [ ] **Step 1: Write failing test in `tests/unit/wrap-provider.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { wrapProvider, createEmitter } from '../../src/injected/wrap-provider';
import type { ProviderInfo } from '@shared/types';

const info: ProviderInfo = { name: 'Test', rdns: 'test.wallet' };

describe('wrapProvider', () => {
  let emit: ReturnType<typeof vi.fn>;
  beforeEach(() => { emit = vi.fn(); });

  it('forwards request and emits call:start + call:end on success', async () => {
    const provider = { request: vi.fn().mockResolvedValue('0x1') };
    wrapProvider(provider as any, info, emit);
    const result = await provider.request({ method: 'eth_chainId', params: [] });
    expect(result).toBe('0x1');
    const kinds = emit.mock.calls.map(c => c[0].kind);
    expect(kinds).toEqual(['call:start', 'call:end']);
  });

  it('emits call:error and rethrows when request rejects', async () => {
    const err = Object.assign(new Error('rejected'), { code: 4001 });
    const provider = { request: vi.fn().mockRejectedValue(err) };
    wrapProvider(provider as any, info, emit);
    await expect(provider.request({ method: 'personal_sign', params: [] })).rejects.toBe(err);
    const kinds = emit.mock.calls.map(c => c[0].kind);
    expect(kinds).toEqual(['call:start', 'call:error']);
    expect(emit.mock.calls[1][0].payload.error.code).toBe(4001);
  });

  it('does not double-wrap the same provider', () => {
    const provider = { request: vi.fn().mockResolvedValue(0) };
    const original = provider.request;
    wrapProvider(provider as any, info, emit);
    const firstWrap = provider.request;
    wrapProvider(provider as any, info, emit);
    expect(provider.request).toBe(firstWrap);
    expect(firstWrap).not.toBe(original);
  });

  it('emits provider info on wrap', () => {
    const provider = { request: vi.fn() };
    wrapProvider(provider as any, info, emit);
    expect(emit).toHaveBeenCalledWith({ source: 'dappinsp', kind: 'provider', payload: info });
  });
});

describe('createEmitter', () => {
  it('posts to window', () => {
    const post = vi.fn();
    (globalThis as any).window = { postMessage: post };
    const emit = createEmitter();
    emit({ source: 'dappinsp', kind: 'provider', payload: info });
    expect(post).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm test:run tests/unit/wrap-provider.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/injected/wrap-provider.ts`**

```ts
import { nanoid } from 'nanoid';
import type { PageMsg } from '@shared/messages';
import type { ProviderInfo } from '@shared/types';
import { classify } from '@shared/classify';
import { safeClone, serializeError } from '@shared/serialize';

interface EIP1193Provider {
  request(args: { method: string; params?: unknown }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
}

const WRAPPED = new WeakSet<EIP1193Provider>();

export type EmitFn = (msg: PageMsg) => void;

export function createEmitter(): EmitFn {
  return (msg) => {
    try { (globalThis as { window?: Window }).window?.postMessage(msg, '*'); }
    catch { /* swallow: must not affect the DApp */ }
  };
}

export function wrapProvider(provider: EIP1193Provider, info: ProviderInfo, emit: EmitFn): void {
  if (WRAPPED.has(provider)) return;
  WRAPPED.add(provider);

  try { emit({ source: 'dappinsp', kind: 'provider', payload: info }); } catch {}

  const original = provider.request.bind(provider);
  provider.request = async function wrappedRequest(args) {
    const id = nanoid();
    const method = args?.method ?? '<unknown>';
    const startedAt = Date.now();
    const startPerf = performance.now();
    try {
      emit({
        source: 'dappinsp', kind: 'call:start',
        payload: { id, method, params: safeClone(args?.params), providerInfo: info, startedAt },
      });
    } catch {}
    void classify; // referenced to avoid unused import under some tsconfigs
    try {
      const result = await original(args);
      const endedAt = Date.now();
      try {
        emit({
          source: 'dappinsp', kind: 'call:end',
          payload: { id, endedAt, durationMs: performance.now() - startPerf, result: safeClone(result) },
        });
      } catch {}
      return result;
    } catch (error) {
      const endedAt = Date.now();
      try {
        emit({
          source: 'dappinsp', kind: 'call:error',
          payload: { id, endedAt, durationMs: performance.now() - startPerf, error: serializeError(error) },
        });
      } catch {}
      throw error;
    }
  } as typeof provider.request;
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `pnpm test:run tests/unit/wrap-provider.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/injected/wrap-provider.ts tests/unit/wrap-provider.test.ts
git commit -m "feat(injected): wrap EIP-1193 provider.request with call lifecycle events"
```

---

## Task 10: Injected entry (EIP-1193 trap + EIP-6963 listener)

**Files:**
- Create: `src/injected/index.ts`

- [ ] **Step 1: Create `src/injected/index.ts`**

```ts
import { wrapProvider, createEmitter, type EmitFn } from './wrap-provider';
import type { ProviderInfo } from '@shared/types';
import type { ControlMsg } from '@shared/messages';

(() => {
  const emit: EmitFn = createEmitter();
  let monitoring = true;
  let ignored = new Set<string>();

  const emitGated: EmitFn = (msg) => {
    if (!monitoring) return;
    if (msg.kind === 'call:start' && ignored.has(msg.payload.method)) return;
    emit(msg);
  };

  // Control channel from isolated world
  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    const d = e.data as ControlMsg | undefined;
    if (!d || d.source !== 'dappinsp-ctrl') return;
    if (d.kind === 'monitoring') monitoring = d.enabled;
    if (d.kind === 'ignored-methods') ignored = new Set(d.list);
  });

  // EIP-1193: wrap existing or trap setter
  try {
    const desc = Object.getOwnPropertyDescriptor(window, 'ethereum');
    const current = (window as unknown as { ethereum?: unknown }).ethereum;
    if (current && typeof current === 'object') {
      wrapProvider(current as Parameters<typeof wrapProvider>[0], { name: 'window.ethereum' }, emitGated);
    }
    if (!desc || desc.configurable !== false) {
      let stored = current;
      Object.defineProperty(window, 'ethereum', {
        configurable: true,
        get() { return stored; },
        set(v) {
          stored = v;
          if (v && typeof v === 'object') {
            try { wrapProvider(v, { name: 'window.ethereum' }, emitGated); } catch {}
          }
        },
      });
    }
  } catch { /* some pages freeze window; skip silently */ }

  // EIP-6963 discovery
  window.addEventListener('eip6963:announceProvider', (e: Event) => {
    const detail = (e as CustomEvent<{ info: ProviderInfo; provider: unknown }>).detail;
    if (!detail?.provider || typeof detail.provider !== 'object') return;
    try { wrapProvider(detail.provider as Parameters<typeof wrapProvider>[0], detail.info, emitGated); } catch {}
  });
  try { window.dispatchEvent(new Event('eip6963:requestProvider')); } catch {}
})();
```

- [ ] **Step 2: Type-check**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/injected/index.ts
git commit -m "feat(injected): EIP-1193 setter trap + EIP-6963 announcement listener"
```

---

## Task 11: Content script bridge

**Files:**
- Create: `src/content/index.ts`, `tests/integration/content-bridge.test.ts`

- [ ] **Step 1: Write integration test in `tests/integration/content-bridge.test.ts`**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('content bridge', () => {
  beforeEach(() => {
    vi.resetModules();
    (globalThis as any).chrome = {
      runtime: {
        sendMessage: vi.fn().mockResolvedValue(undefined),
        onMessage: { addListener: vi.fn() },
      },
    };
  });

  it('forwards dappinsp messages from page to runtime', async () => {
    await import('../../src/content/index');
    window.postMessage({ source: 'dappinsp', kind: 'provider', payload: { name: 'X' } }, '*');
    await new Promise(r => setTimeout(r, 0));
    expect((chrome.runtime.sendMessage as any).mock.calls.length).toBe(1);
    expect((chrome.runtime.sendMessage as any).mock.calls[0][0].kind).toBe('provider');
  });

  it('ignores messages from other sources', async () => {
    await import('../../src/content/index');
    window.postMessage({ hello: 'world' }, '*');
    await new Promise(r => setTimeout(r, 0));
    expect((chrome.runtime.sendMessage as any).mock.calls.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm test:run tests/integration/content-bridge.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/content/index.ts`**

```ts
import type { PageMsg, ControlMsg } from '@shared/messages';

window.addEventListener('message', (e) => {
  if (e.source !== window) return;
  const d = e.data as PageMsg | undefined;
  if (!d || d.source !== 'dappinsp') return;
  chrome.runtime.sendMessage(d).catch(() => { /* SW idle, drop */ });
});

chrome.runtime.onMessage.addListener((msg: ControlMsg) => {
  if (msg?.source === 'dappinsp-ctrl') {
    window.postMessage(msg, window.location.origin);
  }
});
```

- [ ] **Step 4: Run test — expect PASS**

Run: `pnpm test:run tests/integration/content-bridge.test.ts`
Expected: both tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/content/index.ts tests/integration/content-bridge.test.ts
git commit -m "feat(content): bridge dappinsp page messages to runtime"
```

---

## Task 12: Background store (IDB + hot cache)

**Files:**
- Create: `src/background/store.ts`, `tests/unit/background-store.test.ts`

- [ ] **Step 1: Write failing test in `tests/unit/background-store.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from '../../src/background/store';
import type { CapturedCall } from '@shared/types';

const mk = (over: Partial<CapturedCall> = {}): CapturedCall => ({
  id: 'x', tabId: 1, origin: 'https://a.test',
  providerInfo: { name: 'M' },
  method: 'eth_chainId', kind: 'read', params: [],
  startedAt: Date.now(), status: 'ok',
  ...over,
});

describe('background store', () => {
  beforeEach(async () => {
    const dbs = await indexedDB.databases?.();
    for (const d of dbs ?? []) if (d.name) indexedDB.deleteDatabase(d.name);
  });

  it('appends and returns via snapshot', async () => {
    const s = await createStore();
    await s.append(mk({ id: 'a' }));
    const snap = await s.snapshot(1);
    expect(snap.calls.map(c => c.id)).toEqual(['a']);
  });

  it('patches pending → ok', async () => {
    const s = await createStore();
    await s.append(mk({ id: 'p', status: 'pending' }));
    await s.patch('p', { status: 'ok', durationMs: 10 });
    const snap = await s.snapshot(1);
    expect(snap.calls[0].status).toBe('ok');
  });

  it('clears a tab', async () => {
    const s = await createStore();
    await s.append(mk({ id: 'a', tabId: 1 }));
    await s.append(mk({ id: 'b', tabId: 2 }));
    await s.clear(1);
    expect((await s.snapshot(1)).calls).toHaveLength(0);
    expect((await s.snapshot(2)).calls).toHaveLength(1);
  });

  it('evicts when over retention cap', async () => {
    const s = await createStore();
    for (let i = 0; i < 20; i++) await s.append(mk({ id: `i${i}`, startedAt: i }));
    await s.enforceRetention(5);
    expect(await s.totalCount()).toBe(5);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

Run: `pnpm test:run tests/unit/background-store.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create `src/background/store.ts`**

```ts
import { openDb, type DappInspectorDb } from '@shared/idb';
import type { CapturedCall, TabProvenance } from '@shared/types';

export interface BgStore {
  append(call: CapturedCall): Promise<void>;
  patch(id: string, patch: Partial<CapturedCall>): Promise<CapturedCall | undefined>;
  clear(tabId: number): Promise<void>;
  clearAll(): Promise<void>;
  snapshot(tabId: number): Promise<{ calls: CapturedCall[]; provenance: TabProvenance }>;
  putProvenance(prov: TabProvenance): Promise<void>;
  totalCount(): Promise<number>;
  enforceRetention(max: number): Promise<number>;
  close(): void;
}

const DEFAULT_PROVENANCE = (tabId: number): TabProvenance => ({
  tabId, origin: '', url: '', wallets: [], hasDapp: false,
});

export async function createStore(): Promise<BgStore> {
  const db: DappInspectorDb = await openDb();

  return {
    async append(call) { await db.putCall(call); },
    async patch(id, patch) {
      await db.patchCall(id, patch);
      return db.getCall(id);
    },
    async clear(tabId) { await db.clearTab(tabId); },
    async clearAll() { await db.clearAll(); },
    async snapshot(tabId) {
      const [calls, prov] = await Promise.all([
        db.listCallsByTab(tabId),
        db.getProvenance(tabId),
      ]);
      return { calls, provenance: prov ?? DEFAULT_PROVENANCE(tabId) };
    },
    async putProvenance(prov) { await db.putProvenance(prov); },
    async totalCount() { return db.countCalls(); },
    async enforceRetention(max) { return db.evictOldest(max); },
    close() { db.close(); },
  };
}
```

- [ ] **Step 4: Run test — expect PASS**

Run: `pnpm test:run tests/unit/background-store.test.ts`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/background/store.ts tests/unit/background-store.test.ts
git commit -m "feat(background): IDB-backed store with append/patch/clear/retention"
```

---

## Task 13: Background tab provenance tracker

**Files:**
- Create: `src/background/tabs.ts`

- [ ] **Step 1: Create `src/background/tabs.ts`**

```ts
import type { BgStore } from './store';
import type { CapturedCall, ProviderInfo, TabProvenance } from '@shared/types';

export function createTabTracker(store: BgStore) {
  async function getOrInit(tabId: number, hints?: { origin?: string; url?: string }): Promise<TabProvenance> {
    const snap = await store.snapshot(tabId);
    const base = snap.provenance;
    if (hints?.origin && !base.origin) base.origin = hints.origin;
    if (hints?.url && !base.url) base.url = hints.url;
    return base;
  }

  return {
    async onCallStart(tabId: number, call: CapturedCall): Promise<TabProvenance> {
      const prov = await getOrInit(tabId, { origin: call.origin });
      prov.hasDapp = true;
      if (call.providerInfo && !prov.wallets.some(w => w.rdns === call.providerInfo.rdns && w.name === call.providerInfo.name)) {
        prov.wallets.push(call.providerInfo);
      }
      if (call.method === 'eth_chainId' && typeof call.result === 'string') {
        prov.chainId = call.result;
      }
      await store.putProvenance(prov);
      return prov;
    },
    async onCallEnd(tabId: number, id: string, result: unknown): Promise<TabProvenance | null> {
      if (typeof result !== 'string') return null;
      const prov = await getOrInit(tabId);
      // Only act on eth_chainId results; method is available via patched call lookup
      const patched = await store.patch(id, {});
      if (patched?.method === 'eth_chainId') {
        prov.chainId = result;
        await store.putProvenance(prov);
        return prov;
      }
      return null;
    },
    async onProvider(tabId: number, info: ProviderInfo, origin: string): Promise<TabProvenance> {
      const prov = await getOrInit(tabId, { origin });
      prov.hasDapp = true;
      if (!prov.wallets.some(w => w.rdns === info.rdns && w.name === info.name)) {
        prov.wallets.push(info);
      }
      await store.putProvenance(prov);
      return prov;
    },
    async onTabRemoved(tabId: number): Promise<void> {
      await store.clear(tabId);
    },
  };
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/background/tabs.ts
git commit -m "feat(background): track per-tab provenance (origin, chainId, wallets)"
```

---

## Task 14: Background port management

**Files:**
- Create: `src/background/ports.ts`

- [ ] **Step 1: Create `src/background/ports.ts`**

```ts
import type { PanelPush, PanelReq, PopupPush, PopupReq } from '@shared/messages';
import type { BgStore } from './store';

interface PanelClient { tabId: number; port: chrome.runtime.Port }
interface PopupClient { tabId: number | null; port: chrome.runtime.Port }

export function createPortHub(store: BgStore) {
  const panels: PanelClient[] = [];
  const popups: PopupClient[] = [];

  function pushPanel(tabId: number, msg: PanelPush) {
    for (const p of panels) if (p.tabId === tabId) {
      try { p.port.postMessage(msg); } catch {}
    }
  }

  async function pushPopup(monitoring: boolean) {
    for (const p of popups) {
      if (p.tabId == null) continue;
      const snap = await store.snapshot(p.tabId);
      const msg: PopupPush = {
        kind: 'status', provenance: snap.provenance,
        recent: snap.calls.slice(0, 5), monitoring,
      };
      try { p.port.postMessage(msg); } catch {}
    }
  }

  function removeClient(arr: { port: chrome.runtime.Port }[], port: chrome.runtime.Port) {
    const i = arr.findIndex(c => c.port === port);
    if (i >= 0) arr.splice(i, 1);
  }

  chrome.runtime.onConnect.addListener((port) => {
    if (port.name.startsWith('panel:')) {
      const tabId = Number(port.name.slice('panel:'.length));
      panels.push({ tabId, port });
      port.onMessage.addListener(async (req: PanelReq) => {
        if (req.kind === 'get-snapshot') {
          const snap = await store.snapshot(tabId);
          port.postMessage({ kind: 'snapshot', calls: snap.calls, provenance: snap.provenance } as PanelPush);
        } else if (req.kind === 'clear') {
          await store.clear(tabId);
          port.postMessage({ kind: 'clear' } as PanelPush);
        }
      });
      port.onDisconnect.addListener(() => removeClient(panels as any, port));
      // Send initial snapshot
      store.snapshot(tabId).then(snap => {
        try { port.postMessage({ kind: 'snapshot', calls: snap.calls, provenance: snap.provenance } as PanelPush); } catch {}
      });
    } else if (port.name === 'popup') {
      const client: PopupClient = { tabId: null, port };
      popups.push(client);
      port.onMessage.addListener(async (req: PopupReq) => {
        if (req.kind === 'subscribe') client.tabId = req.tabId;
      });
      port.onDisconnect.addListener(() => removeClient(popups as any, port));
    }
  });

  return { pushPanel, pushPopup };
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/background/ports.ts
git commit -m "feat(background): port hub for panel + popup subscriptions"
```

---

## Task 15: Background service worker entry

**Files:**
- Create: `src/background/index.ts`

- [ ] **Step 1: Create `src/background/index.ts`**

```ts
import { createStore } from './store';
import { createTabTracker } from './tabs';
import { createPortHub } from './ports';
import { loadSettings, SETTINGS_KEY } from '@shared/settings';
import type { PageMsg, ControlMsg } from '@shared/messages';
import type { CapturedCall, Settings } from '@shared/types';
import { classify } from '@shared/classify';

const storeReady = createStore();
let settings: Settings = await loadSettings();

const hub = storeReady.then((store) => {
  const tracker = createTabTracker(store);
  const ports = createPortHub(store);

  chrome.runtime.onMessage.addListener((msg: PageMsg, sender) => {
    void (async () => {
      const tabId = sender.tab?.id;
      const origin = sender.tab?.url ? new URL(sender.tab.url).origin : '';
      if (!tabId || msg?.source !== 'dappinsp') return;

      if (msg.kind === 'provider') {
        const prov = await tracker.onProvider(tabId, msg.payload, origin);
        ports.pushPanel(tabId, { kind: 'provenance', provenance: prov });
      } else if (msg.kind === 'call:start') {
        const call: CapturedCall = {
          id: msg.payload.id, tabId, origin,
          providerInfo: msg.payload.providerInfo,
          method: msg.payload.method, kind: classify(msg.payload.method),
          params: msg.payload.params, startedAt: msg.payload.startedAt,
          status: 'pending',
        };
        await store.append(call);
        await tracker.onCallStart(tabId, call);
        ports.pushPanel(tabId, { kind: 'append', call });
        await ports.pushPopup(settings.monitoring);
      } else if (msg.kind === 'call:end') {
        const patch: Partial<CapturedCall> = {
          status: 'ok', endedAt: msg.payload.endedAt,
          durationMs: msg.payload.durationMs, result: msg.payload.result,
        };
        const updated = await store.patch(msg.payload.id, patch);
        if (updated?.method === 'eth_chainId' && typeof msg.payload.result === 'string') {
          await tracker.onProvider(tabId, updated.providerInfo, origin);
        }
        ports.pushPanel(tabId, { kind: 'update', id: msg.payload.id, patch });
        await ports.pushPopup(settings.monitoring);
      } else if (msg.kind === 'call:error') {
        const patch: Partial<CapturedCall> = {
          status: 'error', endedAt: msg.payload.endedAt,
          durationMs: msg.payload.durationMs, error: msg.payload.error,
        };
        await store.patch(msg.payload.id, patch);
        ports.pushPanel(tabId, { kind: 'update', id: msg.payload.id, patch });
        await ports.pushPopup(settings.monitoring);
      }
    })();
    return undefined;
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    void tracker.onTabRemoved(tabId);
  });

  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area !== 'local' || !changes[SETTINGS_KEY]) return;
    settings = await loadSettings();
    // broadcast control to all tabs
    const tabs = await chrome.tabs.query({});
    for (const t of tabs) {
      if (t.id == null) continue;
      const msgMon: ControlMsg = { source: 'dappinsp-ctrl', kind: 'monitoring', enabled: settings.monitoring };
      const msgIgn: ControlMsg = { source: 'dappinsp-ctrl', kind: 'ignored-methods', list: settings.ignoredMethods };
      chrome.tabs.sendMessage(t.id, msgMon).catch(() => {});
      chrome.tabs.sendMessage(t.id, msgIgn).catch(() => {});
    }
    // enforce retention on change
    await store.enforceRetention(settings.retentionMax);
  });

  // Periodic eviction
  chrome.alarms?.create?.('retention-sweep', { periodInMinutes: 10 });
  chrome.alarms?.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'retention-sweep') await store.enforceRetention(settings.retentionMax);
  });

  // Welcome flow
  chrome.runtime.onInstalled.addListener((d) => {
    if (d.reason === 'install') chrome.runtime.openOptionsPage();
  });

  return ports;
});

void hub; // keep reference
```

- [ ] **Step 2: Add `alarms` permission to manifest**

Edit `manifest.config.ts`, the `permissions` array:

```ts
permissions: ['tabs', 'storage', 'scripting', 'alarms'],
```

- [ ] **Step 3: Type-check**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/background/index.ts manifest.config.ts
git commit -m "feat(background): SW entry wires store + tracker + ports + settings sync"
```

---

## Task 16: Settings store (Zustand)

**Files:**
- Create: `src/shared/stores/settings-store.ts`, `tests/unit/settings-store.test.ts`

- [ ] **Step 1: Write failing test in `tests/unit/settings-store.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { installChromeStorageMock } from '../mocks/chrome-storage';
import { useSettingsStore } from '@shared/stores/settings-store';
import { DEFAULT_SETTINGS } from '@shared/settings';

describe('settings-store', () => {
  beforeEach(() => {
    installChromeStorageMock();
    useSettingsStore.setState(DEFAULT_SETTINGS, true);
  });

  it('starts at defaults', () => {
    expect(useSettingsStore.getState().theme).toBe(DEFAULT_SETTINGS.theme);
  });

  it('update() persists to chrome.storage', async () => {
    await useSettingsStore.getState().update({ theme: 'dark' });
    const got = await chrome.storage.local.get('dapp-inspector:settings');
    expect(got['dapp-inspector:settings'].theme).toBe('dark');
    expect(useSettingsStore.getState().theme).toBe('dark');
  });
});
```

- [ ] **Step 2: Create `src/shared/stores/settings-store.ts`**

```ts
import { create } from 'zustand';
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from '../settings';
import type { Settings } from '../types';
import { SETTINGS_KEY } from '../settings';

interface SettingsStore extends Settings {
  update(partial: Partial<Settings>): Promise<void>;
  hydrate(): Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...DEFAULT_SETTINGS,
  async update(partial) {
    set({ ...get(), ...partial });
    await saveSettings(partial);
  },
  async hydrate() {
    const s = await loadSettings();
    set({ ...get(), ...s });
  },
}));

// Cross-UI sync
if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (!changes[SETTINGS_KEY]) return;
    const v = changes[SETTINGS_KEY].newValue as Partial<Settings> | undefined;
    if (v) useSettingsStore.setState({ ...DEFAULT_SETTINGS, ...v });
  });
}

// Auto-hydrate on import (runs once per UI load)
void useSettingsStore.getState().hydrate();
```

- [ ] **Step 3: Run test — expect PASS**

Run: `pnpm test:run tests/unit/settings-store.test.ts`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/shared/stores/settings-store.ts tests/unit/settings-store.test.ts
git commit -m "feat(shared): Zustand settings-store with chrome.storage sync"
```

---

## Task 17: i18n store + hook

**Files:**
- Create: `src/shared/stores/i18n-store.ts`, `src/shared/ui/ThemeProvider.tsx`

- [ ] **Step 1: Create `src/shared/stores/i18n-store.ts`**

```ts
import { useSettingsStore } from './settings-store';
import { t as translate } from '../i18n';

export function useT() {
  const lang = useSettingsStore(s => s.lang);
  return (key: string, vars?: Record<string, string | number>) => translate(lang, key, vars);
}

export function useLang() {
  return useSettingsStore(s => s.lang);
}
```

- [ ] **Step 2: Create `src/shared/ui/ThemeProvider.tsx`**

```tsx
import { useEffect } from 'react';
import { useSettingsStore } from '../stores/settings-store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSettingsStore(s => s.theme);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-light');
    const resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    root.classList.add(`theme-${resolved}`);
    if (theme !== 'system') return;
    const mm = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      root.classList.remove('theme-dark', 'theme-light');
      root.classList.add(mm.matches ? 'theme-dark' : 'theme-light');
    };
    mm.addEventListener('change', onChange);
    return () => mm.removeEventListener('change', onChange);
  }, [theme]);
  return <>{children}</>;
}
```

- [ ] **Step 3: Type-check**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/shared/stores/i18n-store.ts src/shared/ui/ThemeProvider.tsx
git commit -m "feat(shared): i18n hook + ThemeProvider reacting to settings"
```

---

## Task 18: Shared UI primitives (Icon, Kind, Badge, Mascot)

**Files:**
- Create: `src/shared/ui/Icon.tsx`, `src/shared/ui/Kind.tsx`, `src/shared/ui/Badge.tsx`, `src/shared/ui/Mascot.tsx`

- [ ] **Step 1: Create `src/shared/ui/Icon.tsx`**

```tsx
const PATHS: Record<string, string> = {
  search: 'M21 21l-4.3-4.3m1.3-5.7a7 7 0 11-14 0 7 7 0 0114 0z',
  x: 'M18 6L6 18M6 6l12 12',
  chevDown: 'M6 9l6 6 6-6',
  chevRight: 'M9 6l6 6-6 6',
  download: 'M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2',
  clear: 'M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6',
  settings: 'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1A1.7 1.7 0 009 19.4a1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1A1.7 1.7 0 004.6 9a1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z',
  power: 'M12 2v10M5 8a9 9 0 1014 0',
  refresh: 'M3 12a9 9 0 0115.5-6.4L21 8m0-5v5h-5M21 12a9 9 0 01-15.5 6.4L3 16m0 5v-5h5',
  circle: 'M12 21a9 9 0 100-18 9 9 0 000 18z',
  ban: 'M4.9 4.9l14.2 14.2M3 12a9 9 0 1018 0 9 9 0 00-18 0z',
};

export function Icon({ name, size = 16, className = '' }: { name: keyof typeof PATHS | string; size?: number; className?: string }) {
  const d = PATHS[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d={d} />
    </svg>
  );
}
```

- [ ] **Step 2: Create `src/shared/ui/Kind.tsx`**

```tsx
import type { Kind as KindType } from '../types';

const LABEL: Record<KindType, string> = { read: 'RD', write: 'WR', sign: 'SG', subscribe: 'SB' };
const COLOR: Record<KindType, string> = {
  read: 'bg-kind-read/15 text-kind-read',
  write: 'bg-kind-write/15 text-kind-write',
  sign: 'bg-kind-sign/15 text-kind-sign',
  subscribe: 'bg-kind-subscribe/15 text-kind-subscribe',
};

export function Kind({ kind }: { kind: KindType }) {
  return (
    <span className={`inline-flex items-center justify-center w-6 h-5 rounded text-[10px] font-semibold tracking-wide ${COLOR[kind]}`}>
      {LABEL[kind]}
    </span>
  );
}
```

- [ ] **Step 3: Create `src/shared/ui/Badge.tsx`**

```tsx
export function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'ok' | 'warn' | 'error' }) {
  const toneClass = {
    neutral: 'bg-surface border-border text-muted',
    ok: 'bg-kind-subscribe/15 text-kind-subscribe border-transparent',
    warn: 'bg-kind-write/15 text-kind-write border-transparent',
    error: 'bg-red-500/15 text-red-400 border-transparent',
  }[tone];
  return <span className={`inline-flex items-center px-1.5 h-5 rounded text-[10px] font-medium border ${toneClass}`}>{children}</span>;
}
```

- [ ] **Step 4: Create `src/shared/ui/Mascot.tsx`**

```tsx
export function Mascot({ size = 32, mood = 'neutral' }: { size?: number; mood?: 'happy' | 'neutral' | 'warn' }) {
  const eye = mood === 'happy' ? <path d="M8 12c0.8-1 2.2-1 3 0M13 12c0.8-1 2.2-1 3 0" /> : <>
    <circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none" />
  </>;
  const mouth = mood === 'warn' ? <path d="M9 17h6" /> : <path d="M9 16c1.2 1 4 1 6 0" />;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className="text-accent-fg" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="rgb(var(--accent))" />
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">{eye}{mouth}</g>
    </svg>
  );
}
```

- [ ] **Step 5: Type-check**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/shared/ui/Icon.tsx src/shared/ui/Kind.tsx src/shared/ui/Badge.tsx src/shared/ui/Mascot.tsx
git commit -m "feat(shared): UI primitives (Icon, Kind, Badge, Mascot)"
```

---

## Task 19: JsonTree component

**Files:**
- Create: `src/shared/ui/JsonTree.tsx`

- [ ] **Step 1: Create `src/shared/ui/JsonTree.tsx`**

```tsx
import { useState, useMemo } from 'react';

const MAX_INLINE_STRING = 80;
const LARGE_THRESHOLD_BYTES = 1024 * 1024; // 1MB

export function JsonTree({ value }: { value: unknown }) {
  const estimatedSize = useMemo(() => {
    try { return JSON.stringify(value)?.length ?? 0; } catch { return 0; }
  }, [value]);
  const [expandAll] = useState(estimatedSize < LARGE_THRESHOLD_BYTES);
  return (
    <div className="font-mono text-xs leading-relaxed">
      {estimatedSize >= LARGE_THRESHOLD_BYTES && (
        <div className="mb-2 text-muted text-[11px]">Large object ({(estimatedSize / 1024).toFixed(0)} KB) — expanding may be slow.</div>
      )}
      <Node value={value} depth={0} initiallyOpen={expandAll} />
    </div>
  );
}

function Node({ value, depth, initiallyOpen }: { value: unknown; depth: number; initiallyOpen: boolean }) {
  if (value === null) return <span className="text-muted">null</span>;
  if (value === undefined) return <span className="text-muted">undefined</span>;
  const t = typeof value;
  if (t === 'string') {
    const s = value as string;
    return <span className="text-kind-subscribe">"{s.length > MAX_INLINE_STRING ? s.slice(0, MAX_INLINE_STRING) + '…' : s}"</span>;
  }
  if (t === 'number' || t === 'boolean' || t === 'bigint') return <span className="text-kind-write">{String(value)}</span>;
  if (Array.isArray(value)) return <Collapsible label={`Array(${value.length})`} depth={depth} initiallyOpen={initiallyOpen}>
    {value.map((v, i) => (
      <Row key={i} name={String(i)} depth={depth + 1}><Node value={v} depth={depth + 1} initiallyOpen={initiallyOpen} /></Row>
    ))}
  </Collapsible>;
  if (t === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    return <Collapsible label={`Object (${entries.length})`} depth={depth} initiallyOpen={initiallyOpen}>
      {entries.map(([k, v]) => (
        <Row key={k} name={k} depth={depth + 1}><Node value={v} depth={depth + 1} initiallyOpen={initiallyOpen} /></Row>
      ))}
    </Collapsible>;
  }
  return <span className="text-muted">{String(value)}</span>;
}

function Collapsible({ label, depth, initiallyOpen, children }: { label: string; depth: number; initiallyOpen: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <>
      <button onClick={() => setOpen(v => !v)} className="text-muted hover:text-fg">
        <span className="inline-block w-3">{open ? '▾' : '▸'}</span> <span className="text-muted">{label}</span>
      </button>
      {open && <div style={{ marginLeft: 12 }}>{children}</div>}
      {!open && depth === 0 && <span className="text-muted"> …</span>}
    </>
  );
}

function Row({ name, depth: _depth, children }: { name: string; depth: number; children: React.ReactNode }) {
  return (
    <div className="whitespace-pre">
      <span className="text-accent">{name}</span>
      <span className="text-muted">: </span>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/shared/ui/JsonTree.tsx
git commit -m "feat(shared): JsonTree with collapse, large-object hint"
```

---

## Task 20: useBackgroundPort hook

**Files:**
- Create: `src/shared/ui/useBackgroundPort.ts`

- [ ] **Step 1: Create `src/shared/ui/useBackgroundPort.ts`**

```ts
import { useEffect, useRef } from 'react';

export function useBackgroundPort<Push, Req>(
  name: string,
  onMessage: (m: Push) => void,
  initialReq?: Req,
) {
  const portRef = useRef<chrome.runtime.Port | null>(null);

  useEffect(() => {
    let cancelled = false;
    function connect() {
      if (cancelled) return;
      const port = chrome.runtime.connect({ name });
      portRef.current = port;
      port.onMessage.addListener(onMessage as any);
      port.onDisconnect.addListener(() => {
        portRef.current = null;
        setTimeout(connect, 500);
      });
      if (initialReq) { try { port.postMessage(initialReq); } catch {} }
    }
    connect();
    return () => {
      cancelled = true;
      try { portRef.current?.disconnect(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  return {
    send(req: Req) { try { portRef.current?.postMessage(req); } catch {} },
  };
}
```

- [ ] **Step 2: Type-check**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/shared/ui/useBackgroundPort.ts
git commit -m "feat(shared): useBackgroundPort hook with auto-reconnect"
```

---

## Task 21: Panel stores (captures + view)

**Files:**
- Create: `src/panel/stores/captures-store.ts`, `src/panel/stores/view-store.ts`, `tests/unit/captures-store.test.ts`

- [ ] **Step 1: Write failing test in `tests/unit/captures-store.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useCapturesStore } from '../../src/panel/stores/captures-store';

const mk = (id: string, startedAt: number, method = 'eth_chainId') => ({
  id, tabId: 1, origin: 'https://a', providerInfo: { name: 'x' },
  method, kind: 'read' as const, params: [], startedAt, status: 'ok' as const,
});

describe('captures-store', () => {
  beforeEach(() => useCapturesStore.getState().reset());

  it('appends with newest first', () => {
    useCapturesStore.getState().apply({ kind: 'append', call: mk('a', 100) });
    useCapturesStore.getState().apply({ kind: 'append', call: mk('b', 200) });
    expect(useCapturesStore.getState().calls.map(c => c.id)).toEqual(['b', 'a']);
  });

  it('patches existing', () => {
    useCapturesStore.getState().apply({ kind: 'append', call: mk('a', 100) });
    useCapturesStore.getState().apply({ kind: 'update', id: 'a', patch: { status: 'error' } });
    expect(useCapturesStore.getState().calls[0].status).toBe('error');
  });

  it('replaces on snapshot', () => {
    useCapturesStore.getState().apply({ kind: 'append', call: mk('a', 1) });
    useCapturesStore.getState().apply({ kind: 'snapshot', calls: [mk('b', 2)], provenance: { tabId: 1, origin: '', url: '', wallets: [], hasDapp: false } });
    expect(useCapturesStore.getState().calls.map(c => c.id)).toEqual(['b']);
  });

  it('clears', () => {
    useCapturesStore.getState().apply({ kind: 'append', call: mk('a', 1) });
    useCapturesStore.getState().apply({ kind: 'clear' });
    expect(useCapturesStore.getState().calls).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Create `src/panel/stores/captures-store.ts`**

```ts
import { create } from 'zustand';
import type { CapturedCall, TabProvenance } from '@shared/types';
import type { PanelPush } from '@shared/messages';

interface State {
  calls: CapturedCall[];
  provenance: TabProvenance | null;
  connected: boolean;
  apply(msg: PanelPush): void;
  setConnected(v: boolean): void;
  reset(): void;
}

export const useCapturesStore = create<State>((set) => ({
  calls: [],
  provenance: null,
  connected: false,
  apply(msg) {
    set((s) => {
      switch (msg.kind) {
        case 'snapshot':
          return { calls: [...msg.calls].sort((a, b) => b.startedAt - a.startedAt), provenance: msg.provenance };
        case 'append':
          return { calls: [msg.call, ...s.calls] };
        case 'update':
          return { calls: s.calls.map(c => c.id === msg.id ? { ...c, ...msg.patch } : c) };
        case 'clear':
          return { calls: [] };
        case 'provenance':
          return { provenance: msg.provenance };
      }
    });
  },
  setConnected(v) { set({ connected: v }); },
  reset() { set({ calls: [], provenance: null, connected: false }); },
}));
```

- [ ] **Step 3: Create `src/panel/stores/view-store.ts`**

```ts
import { create } from 'zustand';
import type { Kind } from '@shared/types';

type Tab = 'params' | 'result' | 'timing' | 'raw';

interface ViewState {
  selectedCallId: string | null;
  activeTab: Tab;
  search: string;
  kinds: Set<Kind>;
  origins: Set<string>;
  select(id: string | null): void;
  setTab(t: Tab): void;
  setSearch(s: string): void;
  toggleKind(k: Kind): void;
  toggleOrigin(o: string): void;
  clearFilters(): void;
}

export const useViewStore = create<ViewState>((set) => ({
  selectedCallId: null,
  activeTab: 'params',
  search: '',
  kinds: new Set(),
  origins: new Set(),
  select(id) { set({ selectedCallId: id }); },
  setTab(t) { set({ activeTab: t }); },
  setSearch(s) { set({ search: s }); },
  toggleKind(k) { set((s) => { const n = new Set(s.kinds); n.has(k) ? n.delete(k) : n.add(k); return { kinds: n }; }); },
  toggleOrigin(o) { set((s) => { const n = new Set(s.origins); n.has(o) ? n.delete(o) : n.add(o); return { origins: n }; }); },
  clearFilters() { set({ kinds: new Set(), origins: new Set(), search: '' }); },
}));
```

- [ ] **Step 4: Run test — expect PASS**

Run: `pnpm test:run tests/unit/captures-store.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/panel/stores tests/unit/captures-store.test.ts
git commit -m "feat(panel): captures-store + view-store"
```

---

## Task 22: DevTools page stub

**Files:**
- Create: `src/panel/devtools.html`, `src/panel/devtools.ts`

- [ ] **Step 1: Create `src/panel/devtools.html`**

```html
<!doctype html>
<html>
<head><meta charset="utf-8"><title>DApp Inspector</title></head>
<body><script type="module" src="./devtools.ts"></script></body>
</html>
```

- [ ] **Step 2: Create `src/panel/devtools.ts`**

```ts
chrome.devtools.panels.create(
  'DApp Inspector',
  'public/icons/16.png',
  'src/panel/panel.html',
);
```

- [ ] **Step 3: Commit**

```bash
git add src/panel/devtools.html src/panel/devtools.ts
git commit -m "feat(panel): DevTools page that registers the panel"
```

---

## Task 23: Panel shell (html + tsx entry + App skeleton)

**Files:**
- Create: `src/panel/panel.html`, `src/panel/panel.tsx`, `src/panel/App.tsx`

- [ ] **Step 1: Create `src/panel/panel.html`**

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>DApp Inspector Panel</title>
</head>
<body class="h-screen overflow-hidden">
  <div id="root" class="h-full"></div>
  <script type="module" src="./panel.tsx"></script>
</body>
</html>
```

- [ ] **Step 2: Create `src/panel/panel.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@shared/tokens.css';
import { ThemeProvider } from '@shared/ui/ThemeProvider';
import { App } from './App';

const tabId = chrome.devtools?.inspectedWindow?.tabId ?? -1;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App tabId={tabId} />
    </ThemeProvider>
  </StrictMode>,
);
```

- [ ] **Step 3: Create `src/panel/App.tsx`**

```tsx
import { useEffect } from 'react';
import { useBackgroundPort } from '@shared/ui/useBackgroundPort';
import type { PanelPush, PanelReq } from '@shared/messages';
import { useCapturesStore } from './stores/captures-store';
import { useViewStore } from './stores/view-store';
import { Toolbar } from './Toolbar';
import { MethodList } from './MethodList';
import { DetailPane } from './Detail/DetailPane';
import { EmptyStates } from './EmptyStates';

export function App({ tabId }: { tabId: number }) {
  const apply = useCapturesStore(s => s.apply);
  const setConnected = useCapturesStore(s => s.setConnected);
  const calls = useCapturesStore(s => s.calls);
  const provenance = useCapturesStore(s => s.provenance);
  const selectedId = useViewStore(s => s.selectedCallId);

  const { send } = useBackgroundPort<PanelPush, PanelReq>(
    `panel:${tabId}`,
    (m) => apply(m),
  );

  useEffect(() => { setConnected(true); return () => setConnected(false); }, [setConnected]);

  const showList = calls.length > 0 || (provenance?.hasDapp ?? false);

  return (
    <div className="h-full flex flex-col bg-bg text-fg">
      <Toolbar onClear={() => send({ kind: 'clear' })} />
      {!showList ? (
        <EmptyStates variant="waiting" />
      ) : (
        <div className="flex-1 flex min-h-0">
          <MethodList />
          <DetailPane selectedId={selectedId} />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/panel/panel.html src/panel/panel.tsx src/panel/App.tsx
git commit -m "feat(panel): panel shell with Toolbar + list + detail wiring"
```

---

## Task 24: Panel — Toolbar

**Files:**
- Create: `src/panel/Toolbar.tsx`

- [ ] **Step 1: Create `src/panel/Toolbar.tsx`**

```tsx
import { useCapturesStore } from './stores/captures-store';
import { useViewStore } from './stores/view-store';
import { useSettingsStore } from '@shared/stores/settings-store';
import { useT } from '@shared/stores/i18n-store';
import { Icon } from '@shared/ui/Icon';
import type { Kind } from '@shared/types';

const KINDS: Kind[] = ['read', 'write', 'sign', 'subscribe'];

export function Toolbar({ onClear }: { onClear: () => void }) {
  const t = useT();
  const monitoring = useSettingsStore(s => s.monitoring);
  const update = useSettingsStore(s => s.update);
  const count = useCapturesStore(s => s.calls.length);
  const search = useViewStore(s => s.search);
  const kinds = useViewStore(s => s.kinds);
  const setSearch = useViewStore(s => s.setSearch);
  const toggleKind = useViewStore(s => s.toggleKind);

  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-border bg-surface">
      <button
        className={`inline-flex items-center gap-2 text-xs px-2 h-7 rounded border ${monitoring ? 'border-accent text-accent' : 'border-border text-muted'}`}
        onClick={() => update({ monitoring: !monitoring })}
        aria-pressed={monitoring}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${monitoring ? 'bg-accent' : 'bg-muted'}`} />
        {t('panel.toolbar.monitoring')}
      </button>
      <div className="flex items-center h-7 px-2 rounded border border-border bg-elevated text-xs">
        <Icon name="search" size={12} />
        <input
          className="ml-2 bg-transparent outline-none w-40 placeholder:text-muted"
          placeholder={t('panel.toolbar.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-1">
        {KINDS.map(k => (
          <button key={k}
            className={`px-1.5 h-6 text-[10px] font-semibold rounded border ${kinds.has(k) ? 'border-accent text-accent' : 'border-border text-muted'}`}
            onClick={() => toggleKind(k)}
          >{k.toUpperCase().slice(0, 2)}</button>
        ))}
      </div>
      <div className="flex-1" />
      <span className="text-[11px] text-muted">{t('panel.count', { n: count })}</span>
      <button onClick={onClear} className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg" title={t('panel.toolbar.clear')}>
        <Icon name="clear" size={14} /> {t('panel.toolbar.clear')}
      </button>
      <button onClick={() => chrome.runtime.openOptionsPage()} className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg" title={t('panel.toolbar.settings')}>
        <Icon name="settings" size={14} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/panel/Toolbar.tsx
git commit -m "feat(panel): toolbar with monitoring toggle, search, kind filter"
```

---

## Task 25: Panel — MethodList with virtual scroll

**Files:**
- Create: `src/panel/MethodList.tsx`

- [ ] **Step 1: Create `src/panel/MethodList.tsx`**

```tsx
import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useCapturesStore } from './stores/captures-store';
import { useViewStore } from './stores/view-store';
import { Kind } from '@shared/ui/Kind';
import { Badge } from '@shared/ui/Badge';
import { useT } from '@shared/stores/i18n-store';
import type { CapturedCall } from '@shared/types';

const ROW_HEIGHT = 28;

function relative(ts: number): string {
  const dt = Date.now() - ts;
  if (dt < 1000) return 'now';
  if (dt < 60_000) return `${Math.floor(dt / 1000)}s`;
  if (dt < 3_600_000) return `${Math.floor(dt / 60_000)}m`;
  return `${Math.floor(dt / 3_600_000)}h`;
}

export function MethodList() {
  const calls = useCapturesStore(s => s.calls);
  const search = useViewStore(s => s.search);
  const kinds = useViewStore(s => s.kinds);
  const selectedId = useViewStore(s => s.selectedCallId);
  const select = useViewStore(s => s.select);
  const t = useT();

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return calls.filter(c => {
      if (kinds.size > 0 && !kinds.has(c.kind)) return false;
      if (!q) return true;
      return c.method.toLowerCase().includes(q) || c.origin.toLowerCase().includes(q);
    });
  }, [calls, search, kinds]);

  const parentRef = useRef<HTMLDivElement>(null);
  const virt = useVirtualizer({
    count: filtered.length, getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT, overscan: 10,
  });

  return (
    <div className="w-[420px] border-r border-border flex flex-col bg-bg">
      <div className="h-7 flex items-center px-3 text-[10px] uppercase tracking-wide text-muted border-b border-border">
        <span className="w-6">&nbsp;</span>
        <span className="flex-1">{t('panel.list.method')}</span>
        <span className="w-12 text-right">{t('panel.list.duration')}</span>
        <span className="w-10 text-right">{t('panel.list.ts')}</span>
      </div>
      <div ref={parentRef} className="flex-1 overflow-auto" role="list">
        <div style={{ height: virt.getTotalSize(), position: 'relative' }}>
          {virt.getVirtualItems().map(v => {
            const c = filtered[v.index];
            return <Row key={c.id} call={c} selected={c.id === selectedId} onClick={() => select(c.id)} offset={v.start} />;
          })}
        </div>
      </div>
    </div>
  );
}

function Row({ call, selected, onClick, offset }: { call: CapturedCall; selected: boolean; onClick: () => void; offset: number }) {
  return (
    <button
      role="listitem"
      onClick={onClick}
      className={`absolute left-0 right-0 h-7 flex items-center px-3 text-xs text-left ${selected ? 'bg-accent/10 text-fg' : 'hover:bg-surface text-fg'}`}
      style={{ transform: `translateY(${offset}px)` }}
    >
      <Kind kind={call.kind} />
      <span className="ml-2 flex-1 truncate font-mono">{call.method}</span>
      {call.status === 'pending' ? <Badge tone="warn">…</Badge>
        : call.status === 'error' ? <Badge tone="error">ERR</Badge>
        : <Badge tone="ok">OK</Badge>}
      <span className="w-12 text-right text-muted">{call.durationMs != null ? `${Math.round(call.durationMs)}ms` : '—'}</span>
      <span className="w-10 text-right text-muted">{relative(call.startedAt)}</span>
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/panel/MethodList.tsx
git commit -m "feat(panel): virtualized MethodList with filter + selection"
```

---

## Task 26: Panel — DetailPane, Header, Tabs

**Files:**
- Create: `src/panel/Detail/DetailPane.tsx`, `src/panel/Detail/Header.tsx`, `src/panel/Detail/Tabs.tsx`

- [ ] **Step 1: Create `src/panel/Detail/Header.tsx`**

```tsx
import { Icon } from '@shared/ui/Icon';
import { Badge } from '@shared/ui/Badge';
import type { CapturedCall } from '@shared/types';
import { useT } from '@shared/stores/i18n-store';

export function DetailHeader({ call }: { call: CapturedCall }) {
  const t = useT();
  const tone = call.status === 'ok' ? 'ok' : call.status === 'error' ? 'error' : 'warn';
  return (
    <div className="h-12 flex items-center gap-2 px-4 border-b border-border bg-surface">
      <span className="font-mono text-sm truncate">{call.method}</span>
      <Badge tone={tone as any}>{call.status.toUpperCase()}</Badge>
      <span className="text-[11px] text-muted truncate">{call.origin}</span>
      <div className="flex-1" />
      <DisabledBtn icon="refresh" label={t('panel.detail.replay')} />
      <DisabledBtn icon="circle" label={t('panel.detail.mock')} />
      <DisabledBtn icon="ban" label={t('panel.detail.block')} />
    </div>
  );
}

function DisabledBtn({ icon, label }: { icon: string; label: string }) {
  const t = useT();
  return (
    <button disabled title={t('panel.detail.disabledHint')}
      className="inline-flex items-center gap-1 text-xs px-2 h-7 rounded border border-border text-muted opacity-50 cursor-not-allowed">
      <Icon name={icon} size={12} /> {label}
    </button>
  );
}
```

- [ ] **Step 2: Create `src/panel/Detail/Tabs.tsx`**

```tsx
import { useViewStore } from '../stores/view-store';
import { useT } from '@shared/stores/i18n-store';
import { JsonTree } from '@shared/ui/JsonTree';
import type { CapturedCall } from '@shared/types';

const TABS = ['params', 'result', 'timing', 'raw'] as const;

export function DetailTabs({ call }: { call: CapturedCall }) {
  const t = useT();
  const active = useViewStore(s => s.activeTab);
  const setTab = useViewStore(s => s.setTab);
  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex gap-4 px-4 border-b border-border h-8">
        {TABS.map(name => (
          <button key={name}
            className={`text-xs h-8 border-b-2 -mb-px ${active === name ? 'border-accent text-fg' : 'border-transparent text-muted hover:text-fg'}`}
            onClick={() => setTab(name)}
          >{t(`panel.detail.tabs.${name}`)}</button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4">{renderTab(active, call)}</div>
    </div>
  );
}

function renderTab(tab: typeof TABS[number], c: CapturedCall) {
  if (tab === 'params') return <JsonTree value={c.params} />;
  if (tab === 'result') return c.status === 'error'
    ? <JsonTree value={c.error} />
    : <JsonTree value={c.result} />;
  if (tab === 'timing') return (
    <div className="space-y-2 text-xs font-mono">
      <div>Started: {new Date(c.startedAt).toISOString()}</div>
      <div>Ended: {c.endedAt ? new Date(c.endedAt).toISOString() : '—'}</div>
      <div>Duration: {c.durationMs != null ? `${c.durationMs.toFixed(1)} ms` : '—'}</div>
      <div>Kind: {c.kind}</div>
    </div>
  );
  return <JsonTree value={c} />;
}
```

- [ ] **Step 3: Create `src/panel/Detail/DetailPane.tsx`**

```tsx
import { useCapturesStore } from '../stores/captures-store';
import { DetailHeader } from './Header';
import { DetailTabs } from './Tabs';
import { useT } from '@shared/stores/i18n-store';

export function DetailPane({ selectedId }: { selectedId: string | null }) {
  const call = useCapturesStore(s => s.calls.find(c => c.id === selectedId) ?? null);
  const t = useT();
  if (!call) return (
    <div className="flex-1 flex items-center justify-center text-muted text-sm">
      {t('panel.detail.empty')}
    </div>
  );
  return (
    <div className="flex-1 flex flex-col min-w-0 bg-bg">
      <DetailHeader call={call} />
      <DetailTabs call={call} />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/panel/Detail
git commit -m "feat(panel): detail pane with header, four tabs, disabled P1 buttons"
```

---

## Task 27: Panel — EmptyStates

**Files:**
- Create: `src/panel/EmptyStates.tsx`

- [ ] **Step 1: Create `src/panel/EmptyStates.tsx`**

```tsx
import { Mascot } from '@shared/ui/Mascot';
import { useT } from '@shared/stores/i18n-store';

type Variant = 'waiting' | 'noDapp';

export function EmptyStates({ variant }: { variant: Variant }) {
  const t = useT();
  const title = t(`panel.empty.${variant}.title`);
  const hint = t(`panel.empty.${variant}.hint`);
  const mood = variant === 'noDapp' ? 'warn' : 'neutral';
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
      <Mascot size={72} mood={mood} />
      <div className="text-base font-medium">{title}</div>
      <div className="text-sm text-muted max-w-sm">{hint}</div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/panel/EmptyStates.tsx
git commit -m "feat(panel): empty states for waiting / no-dapp"
```

---

## Task 28: Popup — stores + entry + App

**Files:**
- Create: `src/popup/stores/popup-store.ts`, `src/popup/popup.html`, `src/popup/popup.tsx`, `src/popup/App.tsx`

- [ ] **Step 1: Create `src/popup/stores/popup-store.ts`**

```ts
import { create } from 'zustand';
import type { CapturedCall, TabProvenance } from '@shared/types';
import type { PopupPush } from '@shared/messages';

interface State {
  provenance: TabProvenance | null;
  recent: CapturedCall[];
  monitoring: boolean;
  apply(m: PopupPush): void;
}

export const usePopupStore = create<State>((set) => ({
  provenance: null, recent: [], monitoring: true,
  apply(m) {
    if (m.kind === 'status') set({ provenance: m.provenance, recent: m.recent, monitoring: m.monitoring });
  },
}));
```

- [ ] **Step 2: Create `src/popup/popup.html`**

```html
<!doctype html>
<html>
<head><meta charset="utf-8"><title>DApp Inspector</title></head>
<body class="w-[340px] h-[440px]">
  <div id="root" class="h-full"></div>
  <script type="module" src="./popup.tsx"></script>
</body>
</html>
```

- [ ] **Step 3: Create `src/popup/popup.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@shared/tokens.css';
import { ThemeProvider } from '@shared/ui/ThemeProvider';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
```

- [ ] **Step 4: Create `src/popup/App.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useBackgroundPort } from '@shared/ui/useBackgroundPort';
import type { PopupPush, PopupReq } from '@shared/messages';
import { usePopupStore } from './stores/popup-store';
import { useSettingsStore } from '@shared/stores/settings-store';
import { useT } from '@shared/stores/i18n-store';
import { Mascot } from '@shared/ui/Mascot';
import { Kind } from '@shared/ui/Kind';

export function App() {
  const t = useT();
  const [tabId, setTabId] = useState<number | null>(null);
  const apply = usePopupStore(s => s.apply);
  const provenance = usePopupStore(s => s.provenance);
  const recent = usePopupStore(s => s.recent);
  const monitoring = useSettingsStore(s => s.monitoring);
  const updateSettings = useSettingsStore(s => s.update);

  const { send } = useBackgroundPort<PopupPush, PopupReq>('popup', apply);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) => {
      if (t?.id != null) { setTabId(t.id); send({ kind: 'subscribe', tabId: t.id }); }
    });
  }, [send]);

  const variant = !provenance?.hasDapp ? 'noDapp' : !monitoring ? 'off' : 'active';
  const mood = variant === 'active' ? 'happy' : variant === 'off' ? 'neutral' : 'warn';

  return (
    <div className="h-full flex flex-col bg-bg text-fg">
      <header className="flex items-center gap-3 px-4 pt-4">
        <Mascot size={36} mood={mood} />
        <div>
          <div className="text-sm font-semibold">{t('popup.title')}</div>
          <div className="text-[11px] text-muted">{t(`popup.variants.${variant}.heading`)}</div>
        </div>
        <div className="flex-1" />
        <label className="inline-flex items-center gap-2 text-xs cursor-pointer select-none">
          <input type="checkbox" checked={monitoring} onChange={e => updateSettings({ monitoring: e.target.checked })} />
          {t('popup.monitoring')}
        </label>
      </header>
      <div className="px-4 pt-3 text-xs text-muted">{t(`popup.variants.${variant}.hint`)}</div>
      {provenance && (
        <section className="px-4 pt-4">
          <div className="text-[11px] uppercase tracking-wide text-muted mb-1">{provenance.origin || '—'}</div>
          <div className="flex items-center gap-2 text-xs">
            {provenance.wallets.map((w, i) => (
              <span key={i} className="px-1.5 h-5 inline-flex items-center rounded border border-border">{w.name}</span>
            ))}
            {provenance.chainId && <span className="text-muted">chain: {provenance.chainId}</span>}
          </div>
        </section>
      )}
      <section className="flex-1 min-h-0 mt-4 px-2 overflow-auto">
        <div className="px-2 text-[11px] uppercase tracking-wide text-muted mb-1">{t('popup.recent')}</div>
        {recent.length === 0 ? (
          <div className="text-xs text-muted px-2">—</div>
        ) : recent.map(c => (
          <div key={c.id} className="flex items-center gap-2 h-9 px-2 text-xs rounded hover:bg-surface">
            <Kind kind={c.kind} />
            <span className="flex-1 truncate font-mono">{c.method}</span>
            {c.durationMs != null && <span className="text-muted">{Math.round(c.durationMs)}ms</span>}
          </div>
        ))}
      </section>
      <footer className="p-3 border-t border-border">
        <button
          onClick={() => tabId != null && chrome.tabs.create({ url: chrome.runtime.getURL('src/inspector/inspector.html') + `?tabId=${tabId}` })}
          className="w-full h-9 text-xs bg-accent text-accent-fg rounded"
        >
          {t('popup.openFull')}
        </button>
      </footer>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/popup
git commit -m "feat(popup): three-variant popup with status + recent activity"
```

---

## Task 29: Inspector full-page (reuse panel App)

**Files:**
- Create: `src/inspector/inspector.html`, `src/inspector/inspector.tsx`

- [ ] **Step 1: Create `src/inspector/inspector.html`**

```html
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>DApp Inspector</title></head>
<body class="h-screen overflow-hidden">
  <div id="root" class="h-full"></div>
  <script type="module" src="./inspector.tsx"></script>
</body>
</html>
```

- [ ] **Step 2: Create `src/inspector/inspector.tsx`**

```tsx
import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@shared/tokens.css';
import { ThemeProvider } from '@shared/ui/ThemeProvider';
import { App } from '../panel/App';

function TabPicker({ onPick }: { onPick: (tabId: number) => void }) {
  const [tabs, setTabs] = useState<chrome.tabs.Tab[]>([]);
  useEffect(() => { chrome.tabs.query({}).then(setTabs); }, []);
  return (
    <div className="h-full flex items-center justify-center bg-bg text-fg">
      <div className="w-[420px] p-4 border border-border rounded bg-surface">
        <div className="text-sm mb-2">Select a tab to inspect</div>
        <ul className="space-y-1">
          {tabs.filter(t => t.id && t.url?.startsWith('http')).map(t => (
            <li key={t.id}>
              <button onClick={() => onPick(t.id!)} className="w-full text-left px-2 py-1 text-xs hover:bg-elevated rounded truncate">
                {t.title ?? t.url}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Root() {
  const params = new URLSearchParams(location.search);
  const initial = Number(params.get('tabId'));
  const [tabId, setTabId] = useState<number | null>(Number.isFinite(initial) && initial > 0 ? initial : null);
  if (tabId == null) return <TabPicker onPick={setTabId} />;
  return <App tabId={tabId} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode><ThemeProvider><Root /></ThemeProvider></StrictMode>,
);
```

- [ ] **Step 3: Commit**

```bash
git add src/inspector
git commit -m "feat(inspector): full-page variant reusing panel App"
```

---

## Task 30: Options — shell + routing

**Files:**
- Create: `src/options/options.html`, `src/options/options.tsx`, `src/options/App.tsx`

- [ ] **Step 1: Create `src/options/options.html`**

```html
<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>DApp Inspector — Options</title></head>
<body class="min-h-screen">
  <div id="root"></div>
  <script type="module" src="./options.tsx"></script>
</body>
</html>
```

- [ ] **Step 2: Create `src/options/options.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@shared/tokens.css';
import { ThemeProvider } from '@shared/ui/ThemeProvider';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode><ThemeProvider><App /></ThemeProvider></StrictMode>,
);
```

- [ ] **Step 3: Create `src/options/App.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useT } from '@shared/stores/i18n-store';
import { Mascot } from '@shared/ui/Mascot';
import { General } from './sections/General';
import { Capture } from './sections/Capture';
import { Mock } from './sections/Mock';
import { Advanced } from './sections/Advanced';
import { About } from './sections/About';

const SECTIONS = ['general', 'capture', 'mock', 'advanced', 'about'] as const;
type Section = typeof SECTIONS[number];

export function App() {
  const t = useT();
  const [section, setSection] = useState<Section>(() => {
    const h = location.hash.replace('#', '') as Section;
    return (SECTIONS as readonly string[]).includes(h) ? h : 'general';
  });
  useEffect(() => {
    const onHash = () => {
      const h = location.hash.replace('#', '') as Section;
      if ((SECTIONS as readonly string[]).includes(h)) setSection(h);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <div className="min-h-screen flex bg-bg text-fg">
      <aside className="w-[200px] border-r border-border p-3 flex flex-col gap-1">
        <div className="flex items-center gap-2 px-2 py-2 mb-2">
          <Mascot size={24} mood="happy" />
          <span className="text-sm font-semibold">DApp Inspector</span>
        </div>
        {SECTIONS.map(s => (
          <a key={s} href={`#${s}`}
            className={`px-2 py-1.5 text-xs rounded ${section === s ? 'bg-accent/10 text-fg' : 'text-muted hover:text-fg'}`}>
            {t(`options.nav.${s}`)}
          </a>
        ))}
      </aside>
      <main className="flex-1 max-w-3xl p-6">
        {section === 'general' && <General />}
        {section === 'capture' && <Capture />}
        {section === 'mock' && <Mock />}
        {section === 'advanced' && <Advanced />}
        {section === 'about' && <About />}
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add src/options/options.html src/options/options.tsx src/options/App.tsx
git commit -m "feat(options): shell with hash-based routing"
```

---

## Task 31: Options — General section

**Files:**
- Create: `src/options/sections/General.tsx`

- [ ] **Step 1: Create `src/options/sections/General.tsx`**

```tsx
import { useT } from '@shared/stores/i18n-store';
import { useSettingsStore } from '@shared/stores/settings-store';
import type { Theme, Lang } from '@shared/types';

const THEMES: Theme[] = ['system', 'light', 'dark'];
const LANGS: Lang[] = ['en', 'zh'];

export function General() {
  const t = useT();
  const theme = useSettingsStore(s => s.theme);
  const lang = useSettingsStore(s => s.lang);
  const update = useSettingsStore(s => s.update);
  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">{t('options.nav.general')}</h1>

      <div>
        <div className="text-sm mb-2">{t('options.general.theme')}</div>
        <div className="flex gap-3">
          {THEMES.map(v => (
            <button key={v} onClick={() => update({ theme: v })}
              className={`w-28 h-20 rounded border flex items-end justify-center pb-2 text-xs ${theme === v ? 'border-accent' : 'border-border text-muted'}`}>
              {t(`options.general.theme${v[0].toUpperCase()}${v.slice(1)}` as any)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-sm mb-2">{t('options.general.lang')}</div>
        <div className="flex gap-2">
          {LANGS.map(v => (
            <button key={v} onClick={() => update({ lang: v })}
              className={`px-3 h-8 rounded border text-xs ${lang === v ? 'border-accent' : 'border-border text-muted'}`}>
              {v === 'en' ? 'English' : '中文'}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/options/sections/General.tsx
git commit -m "feat(options): General section with theme + language"
```

---

## Task 32: Options — Capture section

**Files:**
- Create: `src/options/sections/Capture.tsx`

- [ ] **Step 1: Create `src/options/sections/Capture.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { useT } from '@shared/stores/i18n-store';
import { useSettingsStore } from '@shared/stores/settings-store';

export function Capture() {
  const t = useT();
  const retention = useSettingsStore(s => s.retentionMax);
  const ignored = useSettingsStore(s => s.ignoredMethods);
  const update = useSettingsStore(s => s.update);
  const [storage, setStorage] = useState<{ used: number; quota: number } | null>(null);

  useEffect(() => {
    navigator.storage?.estimate?.().then(({ usage = 0, quota = 0 }) => setStorage({ used: usage, quota }));
  }, []);

  const pct = storage ? Math.round((storage.used / storage.quota) * 100) : 0;

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">{t('options.nav.capture')}</h1>

      <div>
        <label className="text-sm">{t('options.capture.retention')}: <b>{retention}</b></label>
        <input type="range" min={500} max={50000} step={500} value={retention}
          onChange={e => update({ retentionMax: Number(e.target.value) })}
          className="w-full mt-2" />
      </div>

      <div>
        <div className="text-sm mb-2">{t('options.capture.ignoredMethods')}</div>
        <div className="flex flex-wrap gap-2">
          {ignored.map(m => (
            <span key={m} className="px-2 h-6 inline-flex items-center text-xs rounded border border-border">
              {m}
              <button className="ml-1 text-muted hover:text-fg" onClick={() => update({ ignoredMethods: ignored.filter(x => x !== m) })}>×</button>
            </span>
          ))}
          <AddChip onAdd={(v) => update({ ignoredMethods: [...ignored, v] })} />
        </div>
      </div>

      <div>
        <div className="text-sm mb-1">{t('options.capture.storage')}</div>
        {storage ? (
          <>
            <div className="h-2 bg-surface rounded overflow-hidden">
              <div className="h-full bg-accent" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <div className="text-xs text-muted mt-1">
              {(storage.used / 1024 / 1024).toFixed(1)} MB / {(storage.quota / 1024 / 1024).toFixed(0)} MB ({pct}%)
            </div>
          </>
        ) : <div className="text-xs text-muted">—</div>}
      </div>
    </section>
  );
}

function AddChip({ onAdd }: { onAdd: (v: string) => void }) {
  const [v, setV] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (v) { onAdd(v); setV(''); } }}>
      <input value={v} onChange={e => setV(e.target.value)}
        placeholder="eth_..." className="h-6 px-2 text-xs bg-surface border border-border rounded outline-none focus:border-accent" />
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/options/sections/Capture.tsx
git commit -m "feat(options): Capture section — retention, ignored, storage bar"
```

---

## Task 33: Options — Mock (P1 placeholder)

**Files:**
- Create: `src/options/sections/Mock.tsx`

- [ ] **Step 1: Create `src/options/sections/Mock.tsx`**

```tsx
import { useT } from '@shared/stores/i18n-store';

export function Mock() {
  const t = useT();
  const fake = [
    { match: 'eth_call (UniswapV2Router)', action: 'Return cached', enabled: true },
    { match: 'eth_sendTransaction', action: 'Delay 2s', enabled: false },
    { match: 'personal_sign', action: 'Return custom signature', enabled: false },
  ];
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-semibold">{t('options.nav.mock')}</h1>
      <div className="p-4 border border-border rounded bg-surface">
        <div className="text-sm font-medium">{t('options.mock.locked')}</div>
        <div className="text-xs text-muted mt-1">{t('options.mock.lockedHint')}</div>
      </div>
      <div className="opacity-50 pointer-events-none select-none">
        {fake.map((r, i) => (
          <div key={i} className="flex items-center h-10 px-3 border-b border-border last:border-b-0 text-xs">
            <span className="font-mono flex-1 truncate">{r.match}</span>
            <span className="text-muted">{r.action}</span>
            <span className="ml-3 w-8 h-4 rounded-full bg-muted/30" />
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/options/sections/Mock.tsx
git commit -m "feat(options): Mock section locked placeholder for P1"
```

---

## Task 34: Options — Advanced section

**Files:**
- Create: `src/options/sections/Advanced.tsx`

- [ ] **Step 1: Create `src/options/sections/Advanced.tsx`**

```tsx
import { useState } from 'react';
import { useT } from '@shared/stores/i18n-store';
import { useSettingsStore } from '@shared/stores/settings-store';
import { DEFAULT_SETTINGS } from '@shared/settings';
import { openDb } from '@shared/idb';

export function Advanced() {
  const t = useT();
  const update = useSettingsStore(s => s.update);
  const [clearText, setClearText] = useState('');

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-semibold">{t('options.nav.advanced')}</h1>

      <div className="p-4 border border-red-500/30 rounded">
        <div className="text-sm font-medium">{t('options.advanced.clearHistory')}</div>
        <div className="mt-2 flex items-center gap-2">
          <input value={clearText} onChange={e => setClearText(e.target.value)}
            placeholder={t('options.advanced.clearHistoryConfirm')}
            className="h-8 px-2 text-xs bg-surface border border-border rounded outline-none" />
          <button disabled={clearText !== 'CLEAR'}
            onClick={async () => {
              const db = await openDb();
              await db.clearAll();
              db.close();
              setClearText('');
              alert('History cleared.');
            }}
            className="h-8 px-3 text-xs rounded bg-red-500/80 text-white disabled:opacity-40 disabled:cursor-not-allowed">
            {t('common.confirm')}
          </button>
        </div>
      </div>

      <div className="p-4 border border-border rounded">
        <div className="text-sm font-medium">{t('options.advanced.resetSettings')}</div>
        <button onClick={() => update(DEFAULT_SETTINGS)}
          className="mt-2 h-8 px-3 text-xs rounded border border-border hover:border-accent">
          {t('common.confirm')}
        </button>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/options/sections/Advanced.tsx
git commit -m "feat(options): Advanced — clear history + reset settings"
```

---

## Task 35: Options — About section

**Files:**
- Create: `src/options/sections/About.tsx`

- [ ] **Step 1: Create `src/options/sections/About.tsx`**

```tsx
import { useT } from '@shared/stores/i18n-store';
import { Mascot } from '@shared/ui/Mascot';

export function About() {
  const t = useT();
  const version = chrome.runtime.getManifest().version;
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-4 p-6 border border-border rounded">
        <Mascot size={64} mood="happy" />
        <div>
          <div className="text-lg font-semibold">DApp Inspector</div>
          <div className="text-xs text-muted">{t('options.about.version')} {version}</div>
        </div>
      </div>
      <div>
        <div className="text-sm font-medium mb-2">{t('options.about.links')}</div>
        <ul className="space-y-1 text-xs">
          <li><a className="text-accent hover:underline" href="https://github.com/" target="_blank" rel="noreferrer">GitHub</a></li>
          <li><a className="text-accent hover:underline" href="https://chromewebstore.google.com/" target="_blank" rel="noreferrer">Chrome Web Store</a></li>
        </ul>
      </div>
      <div>
        <div className="text-sm font-medium mb-2">{t('options.about.changelog')}</div>
        <ul className="space-y-1 text-xs text-muted">
          <li><b>0.1.0</b> — Initial P0 release: DevTools panel, Popup, Options.</li>
        </ul>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/options/sections/About.tsx
git commit -m "feat(options): About section with version + changelog"
```

---

## Task 36: ErrorBoundary wrappers

**Files:**
- Create: `src/shared/ui/ErrorBoundary.tsx`
- Modify: `src/panel/panel.tsx`, `src/popup/popup.tsx`, `src/options/options.tsx`, `src/inspector/inspector.tsx`

- [ ] **Step 1: Create `src/shared/ui/ErrorBoundary.tsx`**

```tsx
import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: unknown) { console.error('[DApp Inspector UI]', error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="p-6 text-sm text-fg bg-bg h-full">
        <div className="font-semibold mb-2">Something went wrong</div>
        <pre className="text-xs text-muted whitespace-pre-wrap font-mono">{this.state.error.message}</pre>
      </div>
    );
  }
}
```

- [ ] **Step 2: Wrap each UI entry**

Edit `src/panel/panel.tsx`:

```tsx
import { ErrorBoundary } from '@shared/ui/ErrorBoundary';
// ... inside createRoot().render():
<StrictMode>
  <ErrorBoundary>
    <ThemeProvider><App tabId={tabId} /></ThemeProvider>
  </ErrorBoundary>
</StrictMode>
```

Do the same in `src/popup/popup.tsx`, `src/options/options.tsx`, `src/inspector/inspector.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/shared/ui/ErrorBoundary.tsx src/panel/panel.tsx src/popup/popup.tsx src/options/options.tsx src/inspector/inspector.tsx
git commit -m "feat(ui): ErrorBoundary at all UI entry points"
```

---

## Task 37: Placeholder extension icons

**Files:**
- Create: `public/icons/16.png`, `public/icons/32.png`, `public/icons/48.png`, `public/icons/128.png`

- [ ] **Step 1: Generate simple square PNGs as placeholders**

Run (requires ImageMagick; install via `brew install imagemagick` on macOS):

```bash
mkdir -p public/icons
for size in 16 32 48 128; do
  magick -size ${size}x${size} xc:"#5642d6" -gravity center -pointsize $((size/2)) -fill white -annotate 0 "D" public/icons/${size}.png
done
```

If ImageMagick is unavailable, create solid-color placeholder PNGs via `node`:

```bash
node -e "
const fs = require('fs');
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000100000001008060000001ff3ff610000000b49444154785e63fcffff3f03000500010a00e83af7bc0000000049454e44ae426082', 'hex');
for (const s of [16,32,48,128]) fs.writeFileSync('public/icons/' + s + '.png', PNG);
"
```

- [ ] **Step 2: Commit**

```bash
git add public/icons
git commit -m "chore: add placeholder extension icons"
```

---

## Task 38: Build smoke test

**Files:** none new

- [ ] **Step 1: Build the extension**

Run: `pnpm build`
Expected: build succeeds; `dist/` contains `manifest.json`, `src/panel/panel.html`, `src/popup/popup.html`, `src/options/options.html`, `src/inspector/inspector.html`, background + content + injected chunks.

- [ ] **Step 2: Type-check + lint**

Run: `pnpm typecheck && pnpm lint`
Expected: PASS.

- [ ] **Step 3: Load into Chromium and verify**

Open `chrome://extensions`, toggle Developer mode, click **Load unpacked**, select the `dist/` folder.
Expected: extension installs with the placeholder mascot icon; Options page opens automatically (welcome flow); no console errors in `chrome://extensions` details view.

(This is a manual check. If it fails, fix whatever load error surfaces before continuing.)

- [ ] **Step 4: Commit (if any fixes needed)**

```bash
git status
# if fixes applied:
git add <files>
git commit -m "fix: resolve build issues from smoke test"
```

---

## Task 39: E2E fixture — mock DApp

**Files:**
- Create: `tests/fixtures/mock-dapp.html`, `tests/fixtures/mock-provider.js`

- [ ] **Step 1: Create `tests/fixtures/mock-provider.js`**

```js
(() => {
  const info = { uuid: 'test-1', name: 'MockWallet', rdns: 'test.mock.wallet' };
  const provider = {
    request: async ({ method, params }) => {
      if (method === 'eth_chainId') return '0x1';
      if (method === 'eth_blockNumber') return '0x12d687';
      if (method === 'eth_accounts') return ['0x1234567890abcdef1234567890abcdef12345678'];
      if (method === 'personal_sign') {
        await new Promise(r => setTimeout(r, 200));
        return '0x' + 'a'.repeat(130);
      }
      if (method === 'eth_sendTransaction') {
        const err = new Error('user rejected'); err.code = 4001; throw err;
      }
      return null;
    },
    on() {},
  };
  window.ethereum = provider;
  const announce = () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: { info, provider } }));
  window.addEventListener('eip6963:requestProvider', announce);
  announce();
  window.__mockDappReady = true;
})();
```

- [ ] **Step 2: Create `tests/fixtures/mock-dapp.html`**

```html
<!doctype html>
<html>
<head><meta charset="utf-8"><title>Mock DApp</title></head>
<body>
  <h1>Mock DApp</h1>
  <button id="chain">eth_chainId</button>
  <button id="block">eth_blockNumber</button>
  <button id="sign">personal_sign</button>
  <button id="tx">eth_sendTransaction (reject)</button>
  <div id="log"></div>
  <script src="./mock-provider.js"></script>
  <script>
    const log = (s) => { const d = document.createElement('div'); d.textContent = s; document.getElementById('log').appendChild(d); };
    document.getElementById('chain').onclick = async () => log('chain: ' + await window.ethereum.request({ method: 'eth_chainId' }));
    document.getElementById('block').onclick = async () => log('block: ' + await window.ethereum.request({ method: 'eth_blockNumber' }));
    document.getElementById('sign').onclick = async () => log('sign: ' + (await window.ethereum.request({ method: 'personal_sign', params: ['hi', '0x1234'] })).slice(0, 20));
    document.getElementById('tx').onclick = async () => { try { await window.ethereum.request({ method: 'eth_sendTransaction', params: [{}] }); } catch (e) { log('tx err: ' + e.message); } };
  </script>
</body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add tests/fixtures
git commit -m "test(e2e): mock DApp fixture with EIP-6963 provider"
```

---

## Task 40: E2E harness — Playwright config + first capture test

**Files:**
- Create: `playwright.config.ts`, `tests/e2e/capture.spec.ts`

- [ ] **Step 1: Create `playwright.config.ts`**

```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: { baseURL: 'http://localhost:4321' },
  webServer: {
    command: 'pnpm build && npx http-server tests/fixtures -p 4321 -c-1',
    port: 4321, reuseExistingServer: false, timeout: 60_000,
  },
  reporter: 'list',
});
```

Add `http-server` to dev deps: `pnpm add -D http-server`.

- [ ] **Step 2: Create `tests/e2e/capture.spec.ts`**

```ts
import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';

const EXT = path.resolve(__dirname, '../../dist');

test('captures eth_chainId from the mock DApp', async () => {
  const userDataDir = mkdtempSync(path.join(os.tmpdir(), 'dapp-insp-'));
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--disable-extensions-except=${EXT}`,
      `--load-extension=${EXT}`,
      '--no-first-run',
    ],
  });

  // Wait for the extension's service worker to boot
  let sw = ctx.serviceWorkers()[0];
  if (!sw) sw = await ctx.waitForEvent('serviceworker');
  const extId = sw.url().split('/')[2];

  const page = await ctx.newPage();
  await page.goto('http://localhost:4321/mock-dapp.html');
  await page.waitForFunction(() => (window as any).__mockDappReady === true);
  await page.click('#chain');
  await page.waitForTimeout(300);

  const tabs = await ctx.pages();
  const tabId = await sw.evaluate(async () => {
    const all = await chrome.tabs.query({ url: 'http://localhost:4321/*' });
    return all[0]?.id ?? -1;
  });
  expect(tabId).toBeGreaterThan(-1);

  // Open inspector full-page
  const inspector = await ctx.newPage();
  await inspector.goto(`chrome-extension://${extId}/src/inspector/inspector.html?tabId=${tabId}`);
  await inspector.waitForTimeout(500);

  const rows = await inspector.locator('[role=listitem]').allTextContents();
  expect(rows.some(r => r.includes('eth_chainId'))).toBe(true);

  await ctx.close();
  void tabs;
});
```

- [ ] **Step 3: Run E2E**

Run: `pnpm test:e2e`
Expected: PASS (will open a real Chromium window briefly).

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts tests/e2e/capture.spec.ts package.json pnpm-lock.yaml
git commit -m "test(e2e): first capture test — chainId from mock DApp appears in Inspector"
```

---

## Task 41: E2E — settings sync across UIs

**Files:**
- Create: `tests/e2e/settings-sync.spec.ts`

- [ ] **Step 1: Create `tests/e2e/settings-sync.spec.ts`**

```ts
import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';

const EXT = path.resolve(__dirname, '../../dist');

test('changing language in Options updates Popup copy', async () => {
  const userDataDir = mkdtempSync(path.join(os.tmpdir(), 'dapp-insp-'));
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--no-first-run'],
  });
  let sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker');
  const extId = sw.url().split('/')[2];

  const options = await ctx.newPage();
  await options.goto(`chrome-extension://${extId}/src/options/options.html#general`);
  await options.getByRole('button', { name: '中文' }).click();

  const popup = await ctx.newPage();
  await popup.goto(`chrome-extension://${extId}/src/popup/popup.html`);
  await popup.waitForTimeout(300);
  await expect(popup.getByText('监控')).toBeVisible();

  await ctx.close();
});
```

- [ ] **Step 2: Run**

Run: `pnpm test:e2e -g "settings sync"`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/settings-sync.spec.ts
git commit -m "test(e2e): settings change in Options propagates to Popup"
```

---

## Task 42: E2E — monitoring off suppresses captures

**Files:**
- Create: `tests/e2e/monitoring.spec.ts`

- [ ] **Step 1: Create `tests/e2e/monitoring.spec.ts`**

```ts
import { test, expect, chromium } from '@playwright/test';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';

const EXT = path.resolve(__dirname, '../../dist');

test('monitoring off suppresses captures', async () => {
  const userDataDir = mkdtempSync(path.join(os.tmpdir(), 'dapp-insp-'));
  const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--no-first-run'],
  });
  let sw = ctx.serviceWorkers()[0] ?? await ctx.waitForEvent('serviceworker');
  const extId = sw.url().split('/')[2];

  // Turn monitoring off via Options
  const options = await ctx.newPage();
  await options.goto(`chrome-extension://${extId}/src/options/options.html#general`);
  // Use popup to toggle since Options General doesn't expose the switch (alternatively reach into storage)
  await sw.evaluate(async () => {
    await chrome.storage.local.set({ 'dapp-inspector:settings': { monitoring: false } });
  });
  await options.waitForTimeout(200);

  const page = await ctx.newPage();
  await page.goto('http://localhost:4321/mock-dapp.html');
  await page.click('#chain');
  await page.waitForTimeout(300);

  const tabId = await sw.evaluate(async () => {
    const all = await chrome.tabs.query({ url: 'http://localhost:4321/*' });
    return all[0]?.id ?? -1;
  });
  const inspector = await ctx.newPage();
  await inspector.goto(`chrome-extension://${extId}/src/inspector/inspector.html?tabId=${tabId}`);
  await inspector.waitForTimeout(400);

  const rows = await inspector.locator('[role=listitem]').count();
  expect(rows).toBe(0);

  await ctx.close();
});
```

- [ ] **Step 2: Run**

Run: `pnpm test:e2e -g "monitoring off"`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/monitoring.spec.ts
git commit -m "test(e2e): monitoring off suppresses capture"
```

---

## Task 43: Lint + Prettier + ESLint config

**Files:**
- Create: `.eslintrc.cjs`, `.prettierrc`

- [ ] **Step 1: Create `.eslintrc.cjs`**

```js
module.exports = {
  root: true,
  env: { browser: true, es2022: true, node: true, webextensions: true },
  parser: '@typescript-eslint/parser',
  parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
  plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-empty': ['error', { allowEmptyCatch: true }],
  },
  ignorePatterns: ['dist', 'node_modules', 'coverage', 'playwright-report'],
};
```

- [ ] **Step 2: Create `.prettierrc`**

```json
{ "singleQuote": true, "trailingComma": "all", "printWidth": 120 }
```

- [ ] **Step 3: Run lint**

Run: `pnpm lint`
Expected: PASS (or only warnings).

- [ ] **Step 4: Commit**

```bash
git add .eslintrc.cjs .prettierrc
git commit -m "chore: ESLint + Prettier configuration"
```

---

## Task 44: GitHub Actions CI

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create `.github/workflows/ci.yml`**

```yaml
name: CI
on:
  push: { branches: [main] }
  pull_request: { branches: [main] }
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck
      - run: pnpm lint
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test:run
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: .nvmrc, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps chromium
      - run: xvfb-run --auto-servernum pnpm test:e2e
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: lint + typecheck + test + e2e on PR and main"
```

---

## Task 45: Manual acceptance sweep

**Files:** `docs/superpowers/plans/acceptance-checklist.md` (new)

- [ ] **Step 1: Create `docs/superpowers/plans/acceptance-checklist.md`**

```markdown
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
```

- [ ] **Step 2: Commit**

```bash
git add docs/superpowers/plans/acceptance-checklist.md
git commit -m "docs: P0 manual acceptance checklist"
```

---

## Self-Review

**Spec coverage:** Every section of the spec has a task —
- Section 0 decisions → Tasks 1, 2
- Section 1 architecture → Tasks 2 (manifest), 10, 11, 15 (background)
- Section 2 repo layout → Task 1 onward
- Section 3 capture pipeline → Tasks 3, 4, 5, 6, 9, 10, 11
- Section 4 UI → Tasks 16–35
- Section 5 error handling → Tasks 36 (boundaries), idb eviction in 6/15
- Section 5 testing → Tasks 4, 5, 6, 7, 8, 9, 11, 16, 21, 39–42
- Section 6 non-goals → by construction (no P1 tasks present)
- Section 7 milestones → Task flow M1 (1–15), M2 (21–27), M3 (28–29), M4 (30–35), M5 (39–45)
- Section 9 open questions → "Inspector page with tab picker" (Task 29), "CLEAR confirmation" (Task 34), "onInstalled opens Options" (Task 15)

**Placeholder scan:** No TBDs, each code step has full code, each test step has full assertions. "Similar to Task N" not used.

**Type consistency:** `PanelPush` / `PanelReq` / `PopupPush` / `PopupReq` defined in Task 3, used in Tasks 14, 15, 20, 21, 23, 28 unchanged. `CapturedCall` shape used consistently across IDB/store/UI. Store action names (`apply`, `update`, `select`, `setTab`) consistent across consumers.
