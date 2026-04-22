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
