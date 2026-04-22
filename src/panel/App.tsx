import { useEffect } from 'react';
import { useBackgroundPort } from '@shared/ui/useBackgroundPort';
import type { PanelPush, PanelReq } from '@shared/messages';
import { useCapturesStore } from './stores/captures-store';
import { useViewStore } from './stores/view-store';
import { Toolbar } from './Toolbar';
import { FilterBar } from './FilterBar';
import { MethodList } from './MethodList';
import { DetailPane } from './Detail/DetailPane';
import { EmptyStates } from './EmptyStates';
import { StatusBar } from './StatusBar';

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
    <div
      className="ui h-full flex flex-col overflow-hidden text-[13px]"
      style={{ background: 'rgb(var(--bg))', color: 'rgb(var(--fg))' }}
    >
      <Toolbar onClear={() => send({ kind: 'clear' })} />
      <FilterBar />
      {!showList ? (
        <div className="flex-1 min-h-0">
          <EmptyStates variant="waiting" />
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          <MethodList />
          <DetailPane selectedId={selectedId} />
        </div>
      )}
      <StatusBar />
    </div>
  );
}
