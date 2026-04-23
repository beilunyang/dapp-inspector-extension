import { useCallback, useState } from 'react';

/**
 * HTML5 drag-and-drop reordering for a list of `{ id }` items. The caller
 * owns the item array; this hook only tracks drag state and calls
 * `onReorder(newIdsInOrder)` when the user drops onto a different row.
 */
export function useReorderable<T extends { id: string }>(
  items: T[],
  onReorder: (orderedIds: string[]) => void | Promise<void>,
) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const reset = useCallback(() => {
    setDraggingId(null);
    setOverId(null);
  }, []);

  const rowProps = useCallback((id: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      setDraggingId(id);
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', id); } catch { /* empty */ }
    },
    onDragOver: (e: React.DragEvent) => {
      if (!draggingId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (overId !== id) setOverId(id);
    },
    onDragLeave: () => {
      if (overId === id) setOverId(null);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const from = draggingId ? items.findIndex(x => x.id === draggingId) : -1;
      const to = items.findIndex(x => x.id === id);
      if (from < 0 || to < 0 || from === to) { reset(); return; }
      const next = [...items];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      void onReorder(next.map(x => x.id));
      reset();
    },
    onDragEnd: reset,
  }), [draggingId, overId, items, onReorder, reset]);

  return { draggingId, overId, rowProps };
}
