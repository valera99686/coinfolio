import { CACHE_TTL } from "../config.js";

/**
 * Response cache with a time to live. Entries live in memory and are mirrored to `storage`
 * (sessionStorage) when one is given, so a reload shows the last list at once.
 * After a POST or PATCH the services call invalidate(), otherwise the user would see stale data.
 */
export class RequestCache {
  constructor({ ttl = CACHE_TTL, storage = null, prefix = "coinfolio:cache:" } = {}) {
    this.ttl = ttl;
    this.storage = storage;
    this.prefix = prefix;
    this.map = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  static key(url, params = {}) {
    const sorted = Object.keys(params)
      .sort()
      .map((name) => [name, String(params[name])]);
    return `${url}?${new URLSearchParams(sorted).toString()}`;
  }

  get(key) {
    let entry = this.map.get(key);
    if (!entry && this.storage) {
      try {
        entry = JSON.parse(this.storage.getItem(this.prefix + key) ?? "null") ?? undefined;
      } catch {
        entry = undefined;
      }
    }
    if (!entry || Date.now() - entry.time > this.ttl) {
      if (entry) {
        this.delete(key);
      }
      this.misses += 1;
      return null;
    }
    this.hits += 1;
    return entry.value;
  }

  set(key, value) {
    const entry = { value, time: Date.now() };
    this.map.set(key, entry);
    try {
      this.storage?.setItem(this.prefix + key, JSON.stringify(entry));
    } catch {
      // storage is full or blocked: the in-memory copy is enough
    }
  }

  delete(key) {
    this.map.delete(key);
    try {
      this.storage?.removeItem(this.prefix + key);
    } catch {
      // nothing to do
    }
  }

  /** Drops every entry whose key starts with `prefix` ("/coins" removes lists and single coins). */
  invalidate(prefix = "") {
    for (const key of [...this.map.keys()]) {
      if (key.startsWith(prefix)) {
        this.delete(key);
      }
    }
    if (this.storage) {
      try {
        for (let i = this.storage.length - 1; i >= 0; i -= 1) {
          const name = this.storage.key(i);
          if (name?.startsWith(this.prefix + prefix)) {
            this.storage.removeItem(name);
          }
        }
      } catch {
        // ignore
      }
    }
  }

  clear() {
    this.invalidate("");
  }
}

function sessionStore() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export const cache = new RequestCache({ storage: sessionStore() });
