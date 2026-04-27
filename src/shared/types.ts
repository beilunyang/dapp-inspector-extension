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
  /** True when the result/error came from a Mock rule rather than the real provider. */
  mocked?: boolean;
  /** True when the call was short-circuited with an error by a Block rule. */
  blocked?: boolean;
  /** True when the call was dispatched by a user-triggered Replay. */
  replayed?: boolean;
  /** Milliseconds of artificial delay injected by a Throttle rule before the real request. */
  throttleMs?: number;
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
  /** Allow ABI lookup over the network (Sourcify + 4byte). When false the
   *  Decoded tab uses cache + built-in only and never makes external calls. */
  autoFetchAbi: boolean;
}
