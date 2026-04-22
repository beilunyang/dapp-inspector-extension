import { createStore, type BgStore } from './store';
import { createTabTracker } from './tabs';
import { createPortHub } from './ports';
import { loadSettings, SETTINGS_KEY, DEFAULT_SETTINGS } from '@shared/settings';
import type { PageMsg, ControlMsg, AdminMsg } from '@shared/messages';
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

chrome.runtime.onMessage.addListener((msg: PageMsg | AdminMsg, sender) => {
  void (async () => {
    // Admin messages can arrive from any extension surface (no sender.tab)
    if (msg && (msg as AdminMsg).source === 'dappinsp-admin') {
      const store = await storeReady;
      if ((msg as AdminMsg).kind === 'clear-all') {
        await store.clearAll();
        ports.broadcastPanels({ kind: 'clear' });
        await ports.pushPopup(settings.monitoring);
      }
      return;
    }

    const tabId = sender.tab?.id;
    const origin = sender.tab?.url ? new URL(sender.tab.url).origin : '';
    if (!tabId || (msg as PageMsg)?.source !== 'dappinsp') return;

    const [store, tracker] = await Promise.all([storeReady, trackerReady]);
    const pageMsg = msg as PageMsg;

    if (pageMsg.kind === 'provider') {
      const prov = await tracker.onProvider(tabId, pageMsg.payload, origin);
      ports.pushPanel(tabId, { kind: 'provenance', provenance: prov });
    } else if (pageMsg.kind === 'call:start') {
      const call: CapturedCall = {
        id: pageMsg.payload.id, tabId, origin,
        providerInfo: pageMsg.payload.providerInfo,
        method: pageMsg.payload.method, kind: classify(pageMsg.payload.method),
        params: pageMsg.payload.params, startedAt: pageMsg.payload.startedAt,
        status: 'pending',
      };
      await store.append(call);
      const prov = await tracker.onCallStart(tabId, call);
      ports.pushPanel(tabId, { kind: 'append', call });
      ports.pushPanel(tabId, { kind: 'provenance', provenance: prov });
      await ports.pushPopup(settings.monitoring);
    } else if (pageMsg.kind === 'call:end') {
      const patch: Partial<CapturedCall> = {
        status: 'ok', endedAt: pageMsg.payload.endedAt,
        durationMs: pageMsg.payload.durationMs, result: pageMsg.payload.result,
      };
      const updated = await store.patch(pageMsg.payload.id, patch);
      if (updated?.method === 'eth_chainId' && typeof pageMsg.payload.result === 'string') {
        await tracker.onProvider(tabId, updated.providerInfo, origin);
      }
      ports.pushPanel(tabId, { kind: 'update', id: pageMsg.payload.id, patch });
      await ports.pushPopup(settings.monitoring);
    } else if (pageMsg.kind === 'call:error') {
      const patch: Partial<CapturedCall> = {
        status: 'error', endedAt: pageMsg.payload.endedAt,
        durationMs: pageMsg.payload.durationMs, error: pageMsg.payload.error,
      };
      await store.patch(pageMsg.payload.id, patch);
      ports.pushPanel(tabId, { kind: 'update', id: pageMsg.payload.id, patch });
      await ports.pushPopup(settings.monitoring);
    }
  })();
  return undefined;
});

chrome.tabs.onRemoved.addListener((tabId) => {
  void (async () => {
    const tracker = await trackerReady;
    await tracker.onTabRemoved(tabId);
    ports.pushPanel(tabId, { kind: 'clear' });
    await ports.pushPopup(settings.monitoring);
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
