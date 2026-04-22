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
