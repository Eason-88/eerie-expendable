/** Generic object pool used by bullets / FX. */
export class ObjectPool<T> {
  private readonly _factory: () => T;
  private readonly _reset?: (item: T) => void;
  private readonly _free: T[] = [];
  private readonly _active = new Set<T>();

  constructor(factory: () => T, initial = 16, reset?: (item: T) => void) {
    this._factory = factory;
    this._reset = reset;
    for (let i = 0; i < initial; i++) {
      this._free.push(factory());
    }
  }

  acquire(): T {
    const item = this._free.pop() ?? this._factory();
    this._active.add(item);
    return item;
  }

  release(item: T): void {
    if (!this._active.has(item)) {
      return;
    }
    this._active.delete(item);
    this._reset?.(item);
    this._free.push(item);
  }

  forEachActive(fn: (item: T) => void): void {
    for (const item of [...this._active]) {
      fn(item);
    }
  }

  get activeCount(): number {
    return this._active.size;
  }
}
