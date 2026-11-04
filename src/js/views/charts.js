import dayjs from "dayjs";
import { html } from "../utils/dom.js";
import { trendOf } from "../utils/format.js";
import { t } from "../i18n.js";

/** Direction of a series, from its first to its last value. */
export const seriesTrend = (values) => trendOf(((values.at(-1) - values[0]) / values[0]) * 100);

const lineOf = (points) => points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");

/** The small 96 x 32 chart of a table row or a card. Colour comes from CSS (currentColor), the series from the API. */
export function sparkline(values, { cls = "", width = 96, height = 32 } = {}) {
  const trend = seriesTrend(values);
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const step = (width - 2) / (values.length - 1);
  const points = values.map((v, i) => [1 + i * step, 3 + (height - 6) * (1 - (v - min) / span)]);
  const line = lineOf(points);
  return html`<svg class="sparkline sparkline--${trend}${cls ? " " + cls : ""}" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img"
    aria-label="${t("trend." + trend)}"><path class="sparkline__area" d="${line} L${width - 1} ${height} L1 ${height} Z"/><path class="sparkline__line" d="${line}"/></svg>`;
}

/** Span of every chart period; the labels of the time axis are made from it. */
export const SPAN = {
  "1h": [60, "minute", "HH:mm"],
  "24h": [24, "hour", "HH:mm"],
  "1d": [24, "hour", "HH:mm"],
  "7d": [7, "day", "MMM D"],
  "1w": [7, "day", "MMM D"],
  "1m": [30, "day", "MMM D"],
  "1y": [12, "month", "MMM YYYY"],
  all: [60, "month", "MMM YYYY"],
};

function axisLabels(period, asOf, count) {
  const [amount, unit, pattern] = SPAN[period];
  const end = dayjs(asOf);
  const start = end.subtract(amount, unit);
  const total = end.diff(start);
  return Array.from({ length: count }, (_, i) => start.add((total * i) / (count - 1), "millisecond").format(pattern));
}

/** Thin ticks of the vertical axis: 4 round values between the minimum and the maximum of the series. */
function ticksOf(min, max) {
  return Array.from({ length: 4 }, (_, i) => max - ((max - min) * i) / 3);
}

/** $64.2k, $3,142, $0.452: short price for the axis and the data table. */
export const formatTick = (value) => (value >= 1000 ? "$" + (value / 1000).toFixed(1) + "k" : "$" + (value >= 10 ? value.toFixed(1) : value.toPrecision(3)));

/**
 * Area chart drawn from numbers: the same data the "Show chart data" table lists. It scales with its container
 * (viewBox) and keeps the proportion given by the --chart-ratio of the page block.
 */
export function lineChart(values, { period, asOf, ratio = [744, 300], labels = 7, color = null, label = "chart.alt" } = {}) {
  const [width, height] = ratio;
  const left = 8;
  const right = 64; // room for the price axis
  const top = 14;
  const bottom = 34; // room for the time axis
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const trend = color ?? seriesTrend(values);
  const innerWidth = width - left - right;
  const innerHeight = height - top - bottom;
  const points = values.map((v, i) => [left + (innerWidth * i) / (values.length - 1), top + innerHeight * (1 - (v - min) / span)]);
  const line = lineOf(points);
  const last = points.at(-1);
  const ticks = ticksOf(min, max);
  const names = axisLabels(period, asOf, labels);

  return html`<svg class="line-chart line-chart--${trend}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${t(label, {
    from: formatTick(values[0]),
    to: formatTick(values.at(-1)),
  })}">
    <defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop class="line-chart__stop line-chart__stop--top" offset="0"/><stop class="line-chart__stop line-chart__stop--bottom" offset="1"/></linearGradient></defs>
    ${ticks.map((tick) => {
      const y = top + innerHeight * (1 - (tick - min) / span);
      return html`<line class="line-chart__grid" x1="${left}" x2="${width - right}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/><text class="line-chart__tick" x="${width - right + 8}" y="${(y + 4).toFixed(1)}">${formatTick(tick)}</text>`;
    })}
    <path class="line-chart__area" d="${line} L${last[0].toFixed(1)} ${height - bottom} L${left} ${height - bottom} Z" fill="url(#chart-fill)"/>
    <path class="line-chart__line" d="${line}"/>
    <circle class="line-chart__dot" cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="4"/>
    ${names.map((name, i) => html`<text class="line-chart__label" x="${(left + (innerWidth * i) / (labels - 1)).toFixed(1)}" y="${height - 10}" text-anchor="${i === 0 ? "start" : i === labels - 1 ? "end" : "middle"}">${name}</text>`)}
  </svg>`;
}

/** Rows of the "Show chart data" table: a handful of evenly spaced points of the series. */
export function chartRows(values, { period, asOf, count = 5 }) {
  const names = axisLabels(period, asOf, count);
  return names.map((label, i) => ({ label, value: values[Math.round(((values.length - 1) * i) / (count - 1))] }));
}

/** Donut of the allocation: one stroked circle per slice, the colour of the slice is a CSS variable of the coin. */
export function donut(allocation, { size = 176, stroke = 22, cls = "", label = "" } = {}) {
  const radius = (size - stroke) / 2 - 4;
  const circumference = 2 * Math.PI * radius;
  const gap = allocation.length > 1 ? 3 : 0;
  let offset = 0;
  const slices = allocation.map((slice) => {
    const length = Math.max((slice.share / 100) * circumference - gap, 0);
    const circle = html`<circle class="donut__slice donut__slice--${slice.id}" cx="${size / 2}" cy="${size / 2}" r="${radius}" fill="none" stroke-width="${stroke}"
      stroke-dasharray="${length.toFixed(2)} ${(circumference - length).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`;
    offset += (slice.share / 100) * circumference;
    return circle;
  });
  return html`<svg class="donut${cls ? " " + cls : ""}" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${label}">${slices}</svg>`;
}
