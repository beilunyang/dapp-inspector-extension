import { createStore, type BgStore } from './store';
import { createTabTracker } from './tabs';
import { createPortHub } from './ports';
import { loadSettings, SETTINGS_KEY, DEFAULT_SETTINGS } from '@shared/settings';
import type { PageMsg, ControlMsg } from '@shared/messages';
import type { CapturedCall, Settings } from '@shared/types';
import { classify } from '@shared/classify';

// MV3 requires listeners to be registered synchronously at module top level
// so they survive service-worker wake-ups. All async dependencies (store,
// settings) are awaited inside the handler bodies via shared promises.

const storeReady: Promise<BgStore> = createStore();
const trackerReady = storeReady.then(createTabTracker);
const ports = createPortHub(storeReady);

let settings: Settings = DEFAULT_SETTINGS;
void loadSettings().then((s) => { settings = s; });

chrome.runtime.onMessage.addListener((msg: PageMsg, sender) => {
  void (async () => {
    const tabId = sender.tab?.id;
    const origin = sender.tab?.url ? new URL(sender.tab.url).origin : '';
    if (!tabId || msg?.source !== 'dappinsp') return;

    const [store, tracker] = await Promise.all([storeReady, trackerReady]);

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
      const prov = await tracker.onCallStart(tabId, call);
      ports.pushPanel(tabId, { kind: 'append', call });
      ports.pushPanel(tabId, { kind: 'provenance', provenance: prov });
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
  void (async () => {
    const tracker = await trackerReady;
    await tracker.onTabRemoved(tabId);
  })();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes[SETTINGS_KEY]) return;
  void (async () => {
    const store = await storeReady;
    settings = await loadSettings();
    const tabs = await chrome.tabs.query({});
    for (const t of tabs) {
      if (t.id == null) continue;
      const msgMon: ControlMsg = { source: 'dappinsp-ctrl', kind: 'monitoring', enabled: settings.monitoring };
      const msgIgn: ControlMsg = { source: 'dappinsp-ctrl', kind: 'ignored-methods', list: settings.ignoredMethods };
      chrome.tabs.sendMessage(t.id, msgMon).catch(() => {});
      chrome.tabs.sendMessage(t.id, msgIgn).catch(() => {});
    }
    await store.enforceRetention(settings.retentionMax);
  })();
});

chrome.alarms?.create?.('retention-sweep', { periodInMinutes: 10 });
chrome.alarms?.onAlarm.addListener((alarm) => {
  if (alarm.name !== 'retention-sweep') return;
  void (async () => {
    const store = await storeReady;
    await store.enforceRetention(settings.retentionMax);
  })();
});

chrome.runtime.onInstalled.addListener((d) => {
  if (d.reason === 'install') chrome.runtime.openOptionsPage();
});
