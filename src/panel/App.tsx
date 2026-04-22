import { useEffect } from 'react';
import { useBackgroundPort } from '@shared/ui/useBackgroundPort';
import type { PanelPush, PanelReq } from '@shared/messages';
import { useCapturesStore } from './stores/captures-store';
import { useViewStore } from './stores/view-store';
import { Toolbar } from './Toolbar';
import { MethodList } from './MethodList';
import { DetailPane } from './Detail/DetailPane';
import { EmptyStates } from './EmptyStates';

export function App({ tabId }: { tabId: number }) {
  const apply = useCapturesStore(s => s.apply);
  const setConnected = useCapturesStore(s => s.setConnected);
  const calls = useCapturesStore(s => s.calls);
  const provenance = useCapturesStore(s => s.provenance);
  const selectedId = useViewStore(s => s.selectedCallId);

  const { send } = useBackgroundPort<PanelPush, PanelReq>(
    `panel:${tabId}`,
    (m) => apply(m),
  );

  useEffect(() => { setConnected(true); return () => setConnected(false); }, [setConnected]);

  const showList = calls.length > 0 || (provenance?.hasDapp ?? false);

  return (
    <div className="h-full flex flex-col bg-bg text-fg">
      <Toolbar onClear={() => send({ kind: 'clear' })} />
      {!showList ? (
        <EmptyStates variant="waiting" />
      ) : (
        <div className="flex-1 flex min-h-0">
          <MethodList />
          <DetailPane selectedId={selectedId} />
        </div>
      )}
    </div>
  );
}
