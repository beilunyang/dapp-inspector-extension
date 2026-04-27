interface Listener {
  (changes: Record<string, chrome.storage.StorageChange>, areaName: string): void;
}

export function installChromeStorageMock() {
  const store = new Map<string, unknown>();
  const listeners: Listener[] = [];

  const area = {
    get: async (
      keys?: string | string[] | Record<string, unknown> | null
    ) => {
      if (keys == null) return Object.fromEntries(store);
      if (typeof keys === 'string') return { [keys]: store.get(keys) };
      if (Array.isArray(keys))
        return Object.fromEntries(keys.map((k) => [k, store.get(k)]));
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(keys)) {
        out[k] = store.has(k) ? store.get(k) : (keys as any)[k];
      }
      return out;
    },
    set: async (items: Record<string, unknown>) => {
      const changes: Record<string, chrome.storage.StorageChange> = {};
      for (const [k, v] of Object.entries(items)) {
        const oldValue = store.get(k);
        store.set(k, v);
        changes[k] = { oldValue, newValue: v };
      }
      for (const l of listeners) l(changes, 'local');
    },
    remove: async (k: string | string[]) => {
      const keys = Array.isArray(k) ? k : [k];
      const changes: Record<string, chrome.storage.StorageChange> = {};
      for (const key of keys) {
        if (!store.has(key)) continue;
        changes[key] = { oldValue: store.get(key), newValue: undefined };
        store.delete(key);
      }
      if (Object.keys(changes).length > 0) {
        for (const l of listeners) l(changes, 'local');
      }
    },
    clear: async () => store.clear(),
  };

  (globalThis as any).chrome = {
    storage: {
      local: area,
      onChanged: {
        addListener: (l: Listener) => listeners.push(l),
        removeListener: (l: Listener) => {
          const i = listeners.indexOf(l);
          if (i >= 0) listeners.splice(i, 1);
        },
      },
    },
  };

  return { store, listeners };
}
