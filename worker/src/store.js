export class MemoryStore {
  constructor() {
    this.values = new Map();
  }

  async get(key) {
    const item = this.values.get(key);
    if (!item || (item.expiresAt && item.expiresAt <= Date.now())) {
      this.values.delete(key);
      return null;
    }
    return item.value;
  }

  async put(key, value, ttlSeconds) {
    this.values.set(key, {
      value,
      expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0
    });
  }
}

export class KvStore {
  constructor(namespace) {
    this.namespace = namespace;
  }

  async get(key) {
    if (!this.namespace) return null;
    return this.namespace.get(key, 'json');
  }

  async put(key, value, ttlSeconds) {
    if (!this.namespace) return;
    await this.namespace.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
  }
}

export function createStore(env, fallback = new MemoryStore()) {
  return env?.MIMOTOR_KV ? new KvStore(env.MIMOTOR_KV) : fallback;
}
