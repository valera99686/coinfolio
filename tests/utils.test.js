import { test } from "node:test";
import assert from "node:assert/strict";
import { formatAmount, formatCompact, formatDateTime, formatPercent, formatPrice, formatRange, formatSignedPrice, formatUsd, interpolate, trendOf } from "../src/js/utils/format.js";
import { escapeHtml, html, raw } from "../src/js/utils/dom.js";
import { csvCell, toCsv } from "../src/js/utils/csv.js";
import { createQueryState } from "../src/js/utils/queryState.js";

test("formatPrice keeps the decimals that matter", () => {
  assert.equal(formatPrice(64218.4), "$64,218.40");
  assert.equal(formatPrice(1.0001), "$1.0001");
  assert.equal(formatPrice(0.4521), "$0.4521");
  assert.equal(formatPrice(27.9), "$27.90");
  assert.equal(formatPrice(0.00001927), "$0.00001927");
});

test("money, percent and compact numbers", () => {
  assert.equal(formatUsd(1250.125), "$1,250.13");
  assert.equal(formatPercent(-1.12), "1.12%");
  assert.equal(formatCompact(1.268e12), "1.27T");
  assert.equal(formatCompact(31.8e9), "31.8B");
  assert.equal(formatCompact(19.75e6), "19.75M");
  assert.equal(formatRange(62480.1, 64231.9), "$62,480 – $64,232");
  assert.equal(formatSignedPrice(-0.0004), "−$0.0004");
  assert.equal(formatAmount(0.425, 64218.4), "0.4250");
  assert.equal(formatAmount(1250, 1.0001), "1,250.00");
});

test("trend, date and template helpers", () => {
  assert.equal(trendOf(2.35), "up");
  assert.equal(trendOf(-0.01), "down");
  assert.equal(trendOf(0.001), "flat");
  assert.equal(formatDateTime("2026-09-16T09:14"), "Sep 16, 2026 · 09:14");
  assert.equal(interpolate("Showing {from}–{to} of {total}", { from: 1, to: 10, total: 36 }), "Showing 1–10 of 36");
  assert.equal(interpolate("{unknown} stays", {}), "{unknown} stays");
});

test("html`` escapes everything that comes from outside", () => {
  assert.equal(escapeHtml(`<img src=x onerror="alert(1)">`), "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  const name = "<script>alert(1)</script>";
  assert.equal(String(html`<b>${name}</b>`), "<b>&lt;script&gt;alert(1)&lt;/script&gt;</b>");
  // a nested template is trusted markup, a list is joined, false and null are empty
  assert.equal(String(html`<ul>${["a", "b"].map((x) => html`<li>${x}</li>`)}</ul>`), "<ul><li>a</li><li>b</li></ul>");
  assert.equal(String(html`${false}${null}${undefined}x`), "x");
  assert.equal(String(html`${raw("<i>ok</i>")}`), "<i>ok</i>");
});

test("csv quotes what must be quoted", () => {
  assert.equal(csvCell('say "hi", ok'), '"say ""hi"", ok"');
  assert.equal(csvCell(0.5), "0.5");
  assert.equal(csvCell(null), "");
  assert.equal(toCsv(["a", "b"], [[1, "x,y"]]), 'a,b\r\n1,"x,y"');
});

test("query state falls back to the defaults for broken values", () => {
  const state = createQueryState({ q: "", filter: "all", page: 1 }, { numeric: ["page"], allowed: { filter: ["all", "gainers"] } });
  assert.deepEqual(state.read("?q=sol&page=3&filter=gainers"), { q: "sol", filter: "gainers", page: 3 });
  assert.deepEqual(state.read("?page=-4&filter=hack"), { q: "", filter: "all", page: 1 });
  assert.deepEqual(state.read("?page=abc"), { q: "", filter: "all", page: 1 });
  assert.equal(state.toSearch({ q: "", filter: "all", page: 1 }), "");
  assert.equal(state.toSearch({ q: "sol", filter: "all", page: 2 }), "?q=sol&page=2");
});
