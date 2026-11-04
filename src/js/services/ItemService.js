import { http as defaultClient } from "../api/http.js";
import { RequestCache, cache as defaultCache } from "../api/cache.js";

/**
 * Knows one collection of the API: how to build a request, how to read the total from X-Total-Count and when the
 * cached answers become stale. It never touches the DOM, so a view does not change if the backend does.
 */
export class ItemService {
  /**
   * @param {object} options
   * @param {string} options.resource  collection name, e.g. "coins"
   * @param {string[]} [options.related]  other collections whose cache must be dropped after a write
   */
  constructor({ resource, related = [], client = defaultClient, cache = defaultCache } = {}) {
    this.resource = resource;
    this.related = related;
    this.client = client;
    this.cache = cache;
  }

  get url() {
    return `/${this.resource}`;
  }

  /** GET /resource?params -> { items, total, page, limit, cached }. */
  async getList(params = {}, { signal, fresh = false } = {}) {
    const key = RequestCache.key(this.url, params);
    const hit = fresh ? null : this.cache.get(key);
    if (hit) {
      return { ...hit, cached: true };
    }
    const response = await this.client.get(this.url, { params, signal });
    const result = {
      items: response.data,
      total: Number(response.headers["x-total-count"] ?? response.data.length),
      page: Number(params._page ?? 1),
      limit: Number(params._limit ?? response.data.length),
      cached: false,
    };
    this.cache.set(key, result);
    return result;
  }

  /** GET /resource/id */
  async getById(id, params = {}, { signal, fresh = false } = {}) {
    const key = RequestCache.key(`${this.url}/${id}`, params);
    const hit = fresh ? null : this.cache.get(key);
    if (hit) {
      return hit;
    }
    const { data } = await this.client.get(`${this.url}/${encodeURIComponent(id)}`, { params, signal });
    this.cache.set(key, data);
    return data;
  }

  async create(values) {
    const { data } = await this.client.post(this.url, values);
    this.invalidate();
    return data;
  }

  async patch(id, values) {
    const { data } = await this.client.patch(`${this.url}/${encodeURIComponent(id)}`, values);
    this.invalidate();
    return data;
  }

  /** After a POST or a PATCH the cached lists of this collection (and the related ones) are out of date. */
  invalidate() {
    for (const prefix of [this.url, ...this.related]) {
      this.cache.invalidate(prefix);
    }
  }
}

/** A one-record resource such as /profile or /market: no id in the URL. */
export class SingletonService extends ItemService {
  async get({ signal, fresh = false } = {}) {
    const key = RequestCache.key(this.url);
    const hit = fresh ? null : this.cache.get(key);
    if (hit) {
      return hit;
    }
    const { data } = await this.client.get(this.url, { signal });
    this.cache.set(key, data);
    return data;
  }

  async update(values) {
    const { data } = await this.client.patch(this.url, values);
    this.invalidate();
    return data;
  }
}
