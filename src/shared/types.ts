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
