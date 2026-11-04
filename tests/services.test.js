import { test } from "node:test";
import assert from "node:assert/strict";
import { RequestCache } from "../src/js/api/cache.js";
import { ApiError, HttpClient } from "../src/js/api/http.js";
import { ItemService, SingletonService } from "../src/js/services/ItemService.js";
import { CoinService } from "../src/js/services/CoinService.js";
import { TransactionService } from "../src/js/services/TransactionService.js";

/** A client that records the requests and answers from a script. */
function fakeClient(answer = () => ({ data: [], headers: {} })) {
  const calls = [];
  const record = (method) => async (url, ...rest) => {
    calls.push({ method, url, args: rest });
    return answer(method, url, ...rest);
  };
  return { calls, get: record("get"), post: record("post"), patch: record("patch") };
}

test("the cache forgets an entry after its time to live", () => {
  let now = 1000;
  const realNow = Date.now;
  Date.now = () => now;
  try {
    const cache = new RequestCache({ ttl: 60_000 });
    cache.set("/coins?a=1", { items: [1] });
    assert.deepEqual(cache.get("/coins?a=1"), { items: [1] });
    now += 59_000;
    assert.ok(cache.get("/coins?a=1"));
    now += 2_000;
    assert.equal(cache.get("/coins?a=1"), null);
    assert.equal(cache.hits, 2);
    assert.equal(cache.misses, 1);
  } finally {
    Date.now = realNow;
  }
});

test("cache keys do not depend on the order of the parameters; invalidate works by prefix", () => {
  assert.equal(RequestCache.key("/coins", { b: 2, a: 1 }), RequestCache.key("/coins", { a: 1, b: 2 }));
  const cache = new RequestCache();
  cache.set("/coins?x=1", 1);
  cache.set("/coins/btc?", 2);
  cache.set("/transactions?x=1", 3);
  cache.invalidate("/coins");
  assert.equal(cache.get("/coins?x=1"), null);
  assert.equal(cache.get("/coins/btc?"), null);
  assert.equal(cache.get("/transactions?x=1"), 3);
});

test("getList reads the total from X-Total-Count and caches the answer", async () => {
  const client = fakeClient(() => ({ data: [{ id: "btc" }], headers: { "x-total-count": "36" } }));
  const service = new ItemService({ resource: "coins", client, cache: new RequestCache() });
  const first = await service.getList({ _page: 2, _limit: 10 });
  assert.deepEqual([first.total, first.page, first.limit, first.cached], [36, 2, 10, false]);
  const second = await service.getList({ _limit: 10, _page: 2 });
  assert.equal(second.cached, true);
  assert.equal(client.calls.length, 1);
});

test("a write drops the cached lists of the collection and of the related ones", async () => {
  const client = fakeClient(() => ({ data: [], headers: { "x-total-count": "0" } }));
  const cache = new RequestCache();
  const coins = new ItemService({ resource: "coins", client, cache });
  const tx = new TransactionService({ client, cache });
  await coins.getList();
  await tx.list();
  assert.equal(client.calls.length, 2);
  await tx.create({ coinId: "btc" }); // POST /transactions
  await coins.getList();
  await tx.list();
  assert.equal(client.calls.length, 5); // the POST and both lists went to the network again
});

test("CoinService turns the chips of the page into json-server operators", async () => {
  const client = fakeClient(() => ({ data: [], headers: { "x-total-count": "0" } }));
  const coins = new CoinService({ client, cache: new RequestCache() });
  await coins.list({ q: "sol", filter: "gainers", category: "DeFi", sort: "price", order: "asc", page: 3, limit: 10 });
  assert.deepEqual(client.calls[0].args[0].params, { _page: 3, _limit: 10, _sort: "price", _order: "asc", change24h_gte: 0.01, q: "sol", category: "DeFi" });
  await coins.list({ filter: "watchlist" });
  assert.equal(client.calls[1].args[0].params.watched, true);
  await coins.list({ filter: "holdings" });
  assert.equal(client.calls[2].args[0].params.amount_gte, 0.000001);
});

test("a singleton resource has no id in the URL", async () => {
  const client = fakeClient(() => ({ data: { firstName: "Valerii" }, headers: {} }));
  const profile = new SingletonService({ resource: "profile", client, cache: new RequestCache() });
  assert.equal((await profile.get()).firstName, "Valerii");
  await profile.update({ firstName: "V" });
  assert.deepEqual(client.calls.map((c) => `${c.method} ${c.url}`), ["get /profile", "patch /profile"]);
});

test("HttpClient turns every failure into an ApiError with a readable message", () => {
  assert.equal(HttpClient.normalize({ response: { status: 404, data: {} } }).message, "Request failed with status 404");
  const invalid = HttpClient.normalize({ response: { status: 422, data: { error: "Validation failed.", fields: { amount: "Too small" } } } });
  assert.ok(invalid instanceof ApiError);
  assert.deepEqual([invalid.status, invalid.fields.amount], [422, "Too small"]);
  assert.match(HttpClient.normalize({ code: "ECONNABORTED" }).message, /too long/);
  assert.match(HttpClient.normalize({ message: "Network Error" }).message, /Network error/);
});

test("a lost GET is tried again, an answer of the server is not", async () => {
  const client = new HttpClient("http://x", { retries: 2, retryDelay: 1 });
  let attempts = 0;
  client.instance = { get: async () => { attempts += 1; throw new ApiError("Network error", { status: 0 }); } };
  await assert.rejects(client.get("/coins"), /Network error/);
  assert.equal(attempts, 3);
  attempts = 0;
  client.instance = { get: async () => { attempts += 1; throw new ApiError("Not found", { status: 404 }); } };
  await assert.rejects(client.get("/coins/zzz"), /Not found/);
  assert.equal(attempts, 1);
});
