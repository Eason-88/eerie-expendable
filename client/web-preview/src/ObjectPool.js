/** Simple object pool for meshes / transient FX. */
export class ObjectPool {
  constructor(factory, initial = 16) {
    this._factory = factory;
    this._free = [];
    this._active = new Set();
    for (let i = 0; i < initial; i++) {
      this._free.push(factory());
    }
  }

  acquire() {
    const item = this._free.pop() ?? this._factory();
    this._active.add(item);
    return item;
  }

  release(item) {
    if (!this._active.has(item)) {
      return;
    }
    this._active.delete(item);
    this._free.push(item);
  }

  forEachActive(fn) {
    for (const item of [...this._active]) {
      fn(item);
    }
  }

  get activeCount() {
    return this._active.size;
  }
}
