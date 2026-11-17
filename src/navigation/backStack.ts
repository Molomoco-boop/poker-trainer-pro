/** LIFO back stack synced to history. One source of truth for Android and the browser. */
export type Unregister = () => void;

export interface HistoryLike {
  pushState(data: unknown, unused: string): void;
  replaceState(data: unknown, unused: string): void;
  go(delta: number): void;
}

export interface BackController {
  register(close: () => void): Unregister;
  /** Close the top layer. Returns false when already at the root. */
  handleBack(): boolean;
  depth(): number;
  attach(history: HistoryLike): Unregister;
  /** Browser popstate. 'ignored' = our own history.go, 'closed' = overlay, 'root' = at home. */
  notifyPop(): 'ignored' | 'closed' | 'root';
  /** Flush pending history sync. Exposed so tests can await it. */
  flush(): void;
}

export function createBackController(): BackController {
  type Layer = { id: number; close: () => void };
  let layers: Layer[] = [];
  let nextId = 1;
  let historyDepth = 0;
  let ignorePops = 0;
  let syncScheduled = false;
  let history: HistoryLike | null = null;

  function flush() {
    syncScheduled = false;
    if (!history) return;
    const want = layers.length;
    while (historyDepth < want) {
      historyDepth++;
      history.pushState({ ptp: historyDepth }, '');
    }
    if (historyDepth > want) {
      const n = historyDepth - want;
      ignorePops += n;
      historyDepth = want;
      history.go(-n);
    }
  }

  function scheduleSync() {
    if (!history || syncScheduled) return;
    syncScheduled = true;
    queueMicrotask(flush);
  }

  return {
    register(close) {
      const id = nextId++;
      layers.push({ id, close });
      scheduleSync();
      return () => {
        const i = layers.findIndex(l => l.id === id);
        if (i === -1) return;
        layers.splice(i, 1);
        scheduleSync();
      };
    },
    handleBack() {
      if (layers.length === 0) return false;
      const top = layers.pop()!;
      top.close();
      scheduleSync();
      return true;
    },
    depth: () => layers.length,
    attach(h) {
      history = h;
      h.replaceState({ ptp: 0 }, '');
      historyDepth = 0;
      return () => { history = null; };
    },
    notifyPop() {
      if (ignorePops > 0) {
        ignorePops--;
        return 'ignored' as const;
      }
      historyDepth = Math.max(0, historyDepth - 1);
      if (layers.length > 0) {
        const top = layers.pop()!;
        top.close();
        return 'closed' as const;
      }
      return 'root' as const;
    },
    flush,
  };
}
