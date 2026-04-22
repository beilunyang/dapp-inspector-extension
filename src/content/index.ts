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
