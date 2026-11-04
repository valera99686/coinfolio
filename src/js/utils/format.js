import dayjs from "dayjs";

// The interface language only changes the texts; numbers and dates keep the formats of the mockups.
const number = (min, max) => (value) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: min, maximumFractionDigits: max }).format(value);

export const trendOf = (change) => (change > 0.005 ? "up" : change < -0.005 ? "down" : "flat");

/** $1,234.50 */
export function formatUsd(value, digits = 2) {
  return "$" + number(digits, digits)(value);
}

/** Price of one coin: two decimals from $100, four for small prices, eight for tiny ones; trailing zeros are cut to two. */
export function formatPrice(value) {
  const digits = value >= 100 ? 2 : value >= 0.01 ? 4 : 8;
  return "$" + number(2, digits)(value);
}

/** +$1,474.46 / −$0.0004: a signed change of a price (small prices keep their extra decimals). */
export function formatSignedPrice(value) {
  return (value < 0 ? "−" : "+") + formatPrice(Math.abs(value));
}

/** $62,480 – $64,232 for big prices, $0.4402 – $0.4561 for small ones. */
export function formatRange(low, high) {
  const part = (v) => (high >= 1000 ? formatUsd(v, 0) : formatPrice(v));
  return `${part(low)} – ${part(high)}`;
}

export function formatSignedUsd(value) {
  return (value < 0 ? "−" : "+") + formatUsd(Math.abs(value));
}

/** 2.35% (the sign is shown by the arrow of the badge, not by the text) */
export function formatPercent(value, digits = 2) {
  return Math.abs(value).toFixed(digits) + "%";
}

export function formatSignedPercent(value, digits = 2) {
  return (value < 0 ? "−" : "+") + Math.abs(value).toFixed(digits) + "%";
}

export function formatQty(value, digits = 4) {
  return number(digits, digits)(value);
}

/** Number of coins without needless zeros: 0.425 -> 0.4250 for BTC, 1250 -> 1,250.00 for a stablecoin. */
export function formatAmount(value, price) {
  return formatQty(value, price >= 100 ? 4 : 2);
}

/** 1.268e12 -> 1.27T */
export function formatCompact(value) {
  const units = [
    [1e12, "T"],
    [1e9, "B"],
    [1e6, "M"],
  ];
  const [divisor, suffix] = units.find(([d]) => value >= d) ?? [1, ""];
  return (value / divisor).toFixed(2).replace(/\.?0+$/, "") + suffix;
}

/** "2026-09-16T09:14" -> "Sep 16, 2026 · 09:14" */
export function formatDateTime(iso) {
  return dayjs(iso).format("MMM D, YYYY · HH:mm");
}

/** Value of <input type="datetime-local"> for a moment in time. */
export function toInputDateTime(date = new Date()) {
  return dayjs(date).format("YYYY-MM-DDTHH:mm");
}

/** Replaces {name} placeholders: interpolate("Hello {user}", { user: "Anna" }). */
export function interpolate(template, vars = {}) {
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

export const roundTo = (value, digits = 2) => Math.round((value + Number.EPSILON) * 10 ** digits) / 10 ** digits;
