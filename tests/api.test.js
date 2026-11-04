// The real API server on a spare port: pagination, filters, sorting, relations and the write protection.
import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = 3199;
const API = `http://localhost:${PORT}`;
let server;

const json = async (path, options) => {
  const response = await fetch(API + path, options);
  return { status: response.status, headers: response.headers, body: await response.json().catch(() => null) };
};
const send = (path, method, body) => json(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

before(async () => {
  server = spawn(process.execPath, ["api/server.js"], { env: { ...process.env, PORT: String(PORT), API_DELAY: "0", NODE_ENV: "test", API_DATA_DIR: mkdtempSync(join(tmpdir(), "coinfolio-api-")) }, stdio: "ignore" });
  for (let i = 0; i < 50; i += 1) {
    try {
      await fetch(`${API}/health`);
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  throw new Error("the API did not start");
});

after(() => server?.kill());

test("pagination: X-Total-Count, _page and _limit", async () => {
  const page = await json("/coins?_page=2&_limit=10&_sort=marketCap&_order=desc");
  assert.equal(page.headers.get("x-total-count"), "36");
  assert.match(page.headers.get("access-control-expose-headers"), /X-Total-Count/);
  assert.equal(page.body.length, 10);
  assert.equal(page.body[0].rank, 11);
  assert.equal((await json("/coins?_page=4&_limit=10")).body.length, 6);
});

test("filters, search and sorting happen on the server", async () => {
  assert.equal((await json("/coins?amount_gte=0.000001&_limit=100")).body.length, 7);
  assert.equal((await json("/coins?watched=true&_limit=1")).headers.get("x-total-count"), "4");
  assert.deepEqual((await json("/coins?category=Stablecoin")).body.map((c) => c.id), ["usdt"]);
  assert.ok((await json("/coins?change24h_lte=-0.01&_limit=100")).body.every((c) => c.change24h < 0));
  assert.deepEqual((await json("/coins?q=solana")).body.map((c) => c.id), ["sol"]);
  const byPrice = (await json("/coins?_sort=price&_order=desc&_limit=3")).body.map((c) => c.id);
  assert.deepEqual(byPrice, ["btc", "eth", "mkr"]);
});

test("relations: embedded transactions and the expanded coin", async () => {
  const btc = await json("/coins/btc?_embed=transactions");
  assert.equal(btc.body.transactions.length, 4);
  const recent = await json("/transactions?_sort=date&_order=desc&_limit=5&_expand=coin");
  assert.equal(recent.body.length, 5);
  assert.equal(recent.body[0].coin.id, "btc");
  assert.equal((await json("/coins/nope")).status, 404);
});

test("only the writes the app needs are allowed, and they are validated", async () => {
  assert.equal((await json("/coins/btc", { method: "DELETE" })).status, 405);
  assert.equal((await send("/coins", "POST", { id: "x" })).status, 405);
  assert.equal((await send("/coins/btc", "PATCH", { price: 1 })).status, 422);
  assert.equal((await send("/coins/btc", "PATCH", { watched: "yes" })).status, 422);
  const bad = await send("/transactions", "POST", { coinId: "zzz", type: "gift", amount: -1, price: 1, fee: 0, date: "yesterday" });
  assert.equal(bad.status, 422);
  assert.deepEqual(Object.keys(bad.body.fields).sort(), ["amount", "coinId", "date", "type"]);
  assert.equal((await send("/profile", "PATCH", { username: "x" })).status, 422);
});

test("a valid transaction is stored, a coin is patched, extra fields are dropped", async () => {
  const before = Number((await json("/transactions?_limit=1")).headers.get("x-total-count"));
  const created = await send("/transactions", "POST", { coinId: "btc", type: "buy", amount: 0.01, price: 60000, fee: 0.6, date: "2026-09-17T10:00", note: "test", admin: true });
  assert.equal(created.status, 201);
  assert.equal(created.body.admin, undefined);
  assert.equal(Number((await json("/transactions?_limit=1")).headers.get("x-total-count")), before + 1);
  const patched = await send("/coins/btc", "PATCH", { watched: true });
  assert.equal(patched.status, 200);
  assert.equal(patched.body.watched, true);
  const profile = await send("/profile", "PATCH", { firstName: "Test" });
  assert.equal(profile.body.firstName, "Test");
});

test("the committed seed file is not touched by the writes", async () => {
  const { readFileSync } = await import("node:fs");
  const seed = JSON.parse(readFileSync("api/db.json", "utf8"));
  assert.equal(seed.transactions.length, 48);
  assert.equal(seed.profile.firstName, "Valerii");
});
