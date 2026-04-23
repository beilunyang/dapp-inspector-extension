import type { CapturedCall, ProviderInfo, TabProvenance } from './types';
import type { BlockRule } from './rules';

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
  | { source: 'dappinsp-ctrl'; kind: 'ignored-methods'; list: string[] }
  | { source: 'dappinsp-ctrl'; kind: 'replay'; method: string; params: unknown }
  | { source: 'dappinsp-ctrl'; kind: 'block-rules'; rules: BlockRule[] };

export type AdminMsg =
  | { source: 'dappinsp-admin'; kind: 'clear-all' }
  | { source: 'dappinsp-admin'; kind: 'replay'; tabId: number; method: string; params: unknown };

// Kept for potential future uses (e.g., Mock rule broadcast) but currently
// content scripts read chrome.storage.local directly.
export type { BlockRule };

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
