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

let settings: Settings = DEFAULT_SETTINGS;
void loadSettings().then((s) => { settings = s; });

// Block rules are read directly by each content script from chrome.storage.local
// (see src/content/index.ts), so the SW doesn't need to cache or broadcast them.

const ports = createPortHub(storeReady, () => settings.monitoring);

chrome.runtime.onMessage.addListener((msg: PageMsg | AdminMsg, sender) => {
  void (async () => {
    // Admin messages can arrive from any extension surface (no sender.tab)
    if (msg && (msg as AdminMsg).source === 'dappinsp-admin') {
      const adminMsg = msg as AdminMsg;
      if (adminMsg.kind === 'clear-all') {
        const store = await storeReady;
        await store.clearAll();
        ports.broadcastPanels({ kind: 'clear' });
        await ports.pushPopup(settings.monitoring);
      } else if (adminMsg.kind === 'replay') {
        const ctrl: ControlMsg = {
          source: 'dappinsp-ctrl',
          kind: 'replay',
          method: adminMsg.method,
          params: adminMsg.params,
        };
        chrome.tabs.sendMessage(adminMsg.tabId, ctrl).catch(() => { /* tab gone */ });
      }
      return;
    }

    const tabId = sender.tab?.id;
    const url = sender.tab?.url ?? '';
    const origin = url ? new URL(url).origin : '';
    if (!tabId || (msg as PageMsg)?.source !== 'dappinsp') return;

    const [store, tracker] = await Promise.all([storeReady, trackerReady]);
    const pageMsg = msg as PageMsg;

    // Push to the panel first, then persist. Both events land on the same
    // port so message order is preserved, but if we awaited IDB before
    // pushing, a fast-failing call:error could race ahead of the slower
    // call:start append (which also awaits tracker.onCallStart), leaving
    // the row stuck at "pending" until the next snapshot refresh.

    if (pageMsg.kind === 'provider') {
      const prov = await tracker.onProvider(tabId, pageMsg.payload, origin, url);
      ports.pushPanel(tabId, { kind: 'provenance', provenance: prov });
    } else if (pageMsg.kind === 'call:start') {
      const call: CapturedCall = {
        id: pageMsg.payload.id, tabId, origin,
        providerInfo: pageMsg.payload.providerInfo,
        method: pageMsg.payload.method, kind: classify(pageMsg.payload.method),
        params: pageMsg.payload.params, startedAt: pageMsg.payload.startedAt,
        status: 'pending',
      };
      ports.pushPanel(tabId, { kind: 'append', call });
      await store.append(call);
      const prov = await tracker.onCallStart(tabId, call, url);
      ports.pushPanel(tabId, { kind: 'provenance', provenance: prov });
      await ports.pushPopup(settings.monitoring);
    } else if (pageMsg.kind === 'call:end') {
      const patch: Partial<CapturedCall> = {
        status: 'ok', endedAt: pageMsg.payload.endedAt,
        durationMs: pageMsg.payload.durationMs, result: pageMsg.payload.result,
      };
      if (pageMsg.payload.mocked) patch.mocked = true;
      ports.pushPanel(tabId, { kind: 'update', id: pageMsg.payload.id, patch });
      const updated = await store.patch(pageMsg.payload.id, patch);
      if (updated?.method === 'eth_chainId' && typeof pageMsg.payload.result === 'string') {
        await tracker.onProvider(tabId, updated.providerInfo, origin, url);
      }
      await ports.pushPopup(settings.monitoring);
    } else if (pageMsg.kind === 'call:error') {
      const patch: Partial<CapturedCall> = {
        status: 'error', endedAt: pageMsg.payload.endedAt,
        durationMs: pageMsg.payload.durationMs, error: pageMsg.payload.error,
      };
      if (pageMsg.payload.mocked) patch.mocked = true;
      ports.pushPanel(tabId, { kind: 'update', id: pageMsg.payload.id, patch });
      await store.patch(pageMsg.payload.id, patch);
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
  if (area !== 'local') return;
  if (!changes[SETTINGS_KEY]) return;
  void (async () => {
    const store = await storeReady;
    settings = await loadSettings();
    // Content scripts observe storage.onChanged themselves and forward to the
    // page world, so no need to broadcast from here. We just need fresh
    // settings for our own logic + retention sweep.
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
