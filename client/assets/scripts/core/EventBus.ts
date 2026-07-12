type Handler = (payload?: unknown) => void;

/** Lightweight cross-module event bus. */
export class EventBus {
  private readonly _map = new Map<string, Set<Handler>>();

  on(event: string, handler: Handler): void {
    let set = this._map.get(event);
    if (!set) {
      set = new Set();
      this._map.set(event, set);
    }
    set.add(handler);
  }

  off(event: string, handler: Handler): void {
    this._map.get(event)?.delete(handler);
  }

  emit(event: string, payload?: unknown): void {
    const set = this._map.get(event);
    if (!set) {
      return;
    }
    for (const handler of [...set]) {
      handler(payload);
    }
  }

  clear(): void {
    this._map.clear();
  }
}

export const gameEvents = new EventBus();
