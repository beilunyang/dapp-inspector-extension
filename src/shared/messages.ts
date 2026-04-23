import type { CapturedCall, ProviderInfo, TabProvenance } from './types';
import type { BlockRule, MockRule } from './rules';

export interface CallStart {
  id: string;
  method: string;
  params: unknown;
  providerInfo: ProviderInfo;
  startedAt: number;
  // Page-reported origin (window.location.origin). Authoritative — the
  // background prefers this over sender.tab.url because the tab URL can
  // lag during navigation (e.g. still "chrome://newtab/" at document_start).
  origin: string;
  replayed?: boolean;
}
export interface CallEnd {
  id: string;
  endedAt: number;
  durationMs: number;
  result: unknown;
  mocked?: boolean;
  throttleMs?: number;
}
export interface CallError {
  id: string;
  endedAt: number;
  durationMs: number;
  error: { code: number; message: string; data?: unknown };
  mocked?: boolean;
  blocked?: boolean;
  throttleMs?: number;
}

export type PageMsg =
  | { source: 'dappinsp'; kind: 'call:start'; payload: CallStart }
  | { source: 'dappinsp'; kind: 'call:end';   payload: CallEnd }
  | { source: 'dappinsp'; kind: 'call:error'; payload: CallError }
  | { source: 'dappinsp'; kind: 'provider';   payload: ProviderInfo; origin: string }
  | { source: 'dappinsp'; kind: 'chain';      payload: { chainId: string } };

export type ControlMsg =
  | { source: 'dappinsp-ctrl'; kind: 'monitoring'; enabled: boolean }
  | { source: 'dappinsp-ctrl'; kind: 'ignored-methods'; list: string[] }
  | { source: 'dappinsp-ctrl'; kind: 'replay'; method: string; params: unknown }
  | { source: 'dappinsp-ctrl'; kind: 'block-rules'; rules: BlockRule[] }
  | { source: 'dappinsp-ctrl'; kind: 'mock-rules'; rules: MockRule[] };

export type AdminMsg =
  | { source: 'dappinsp-admin'; kind: 'clear-all' }
  | { source: 'dappinsp-admin'; kind: 'replay'; tabId: number; method: string; params: unknown };

export type { BlockRule, MockRule };

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
