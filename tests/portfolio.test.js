import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { feeOf, netAmount, nextPosition, summarize } from "../src/js/utils/portfolio.js";

const db = JSON.parse(readFileSync(new URL("../api/db.json", import.meta.url), "utf8"));
const held = db.coins.filter((coin) => coin.amount > 0);

test("the portfolio of the seed matches the numbers of the Figma mockups", () => {
  const s = summarize(held);
  assert.equal(s.total, 49011.73);
  assert.equal(s.cost, 41250);
  assert.equal(s.profit, 7761.73);
  assert.equal(s.dayChange, 828.78);
  assert.equal(s.count, 7);
  assert.equal(s.best.id, "sol");
  assert.equal(s.worst.id, "eth");
  assert.equal(s.profitPct.toFixed(2), "18.82");
  assert.equal(s.dayChangePct.toFixed(2), "1.72");
});

test("allocation: the three biggest positions and the rest", () => {
  const { allocation } = summarize(held);
  assert.deepEqual(allocation.map((slice) => slice.id), ["btc", "eth", "sol", "others"]);
  assert.equal(allocation[0].share.toFixed(1), "55.7");
  assert.equal(allocation[3].count, 4);
  assert.ok(Math.abs(allocation.reduce((sum, slice) => sum + slice.share, 0) - 100) < 1e-9);
});

test("a buy raises the amount and the cost basis, the average price follows", () => {
  const btc = db.coins.find((coin) => coin.id === "btc");
  const next = nextPosition(btc, { type: "buy", amount: 0.075, price: 60000 });
  assert.equal(next.amount, 0.5);
  assert.equal(next.costBasis, 26782.94); // 22282.94 + 0.075 * 60000
  assert.equal(next.value, 32109.2);
  assert.equal(next.avgBuy, 53565.88);
});

test("a sell keeps the average buy price and lowers the cost", () => {
  const eth = db.coins.find((coin) => coin.id === "eth");
  const next = nextPosition(eth, { type: "sell", amount: 1.2, price: 3000 });
  assert.equal(next.amount, 2);
  assert.equal(next.avgBuy, 2700);
  assert.equal(next.costBasis, 5400);
  const all = nextPosition(eth, { type: "sell", amount: 10, price: 3000 });
  assert.equal(all.amount, 0);
  assert.equal(all.avgBuy, 0);
});

test("net amount and fee", () => {
  const btc = db.transactions.filter((tx) => tx.coinId === "btc");
  assert.equal(btc.length, 4);
  assert.equal(netAmount(btc), 0.425);
  assert.equal(feeOf(0.025, 64218.4), 1.61);
});
