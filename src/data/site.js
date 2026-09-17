// Build-time data for the EJS templates (the same numbers as the Figma mockups).
// In Lab 4 the pages will read these values from json-server (api/db.json).
import { readFileSync } from "node:fs";

const en = JSON.parse(readFileSync(new URL("../../public/locales/en.json", import.meta.url), "utf8"));

/** English text for an i18n key; the key itself goes to data-i18n. */
const t = (key) => {
  if (!(key in en)) {
    throw new Error(`Missing i18n key: ${key}`);
  }
  return en[key];
};

const usd = (n, digits = 2) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const signedUsd = (n) => (n < 0 ? "−" : "+") + usd(Math.abs(n));
const pct = (n) => Math.abs(n).toFixed(2) + "%";
const qty = (n, digits) => n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const compact = (n) => {
  const units = [[1e12, "T"], [1e9, "B"], [1e6, "M"]];
  const [div, suffix] = units.find(([d]) => n >= d) || [1, ""];
  return (n / div).toFixed(2).replace(/\.?0+$/, "") + suffix;
};
const trendOf = (change) => (change > 0.005 ? "up" : change < -0.005 ? "down" : "flat");

// rank, symbol, name, price, 24h change, market cap, 24h volume, held amount, amount decimals
const rows = [
  [1, "BTC", "Bitcoin", 64218.4, 2.35, 1.268e12, 31.8e9, 0.425, 4],
  [2, "ETH", "Ethereum", 3142.75, -1.12, 3.78e11, 15.2e9, 3.2, 4],
  [3, "USDT", "Tether", 1.0001, 0.01, 1.18e11, 48.6e9, 1250, 2],
  [4, "SOL", "Solana", 148.36, 5.87, 6.9e10, 3.4e9, 28.5, 2],
  [5, "XRP", "XRP", 0.5873, 0.92, 3.3e10, 1.3e9, 0, 2],
  [6, "ADA", "Cardano", 0.4521, -0.64, 1.63e10, 0.41e9, 5200, 2],
  [7, "DOGE", "Dogecoin", 0.1242, 0.87, 1.59e10, 0.9e9, 0, 2],
  [8, "AVAX", "Avalanche", 27.9, -2.48, 1.14e10, 0.52e9, 0, 2],
  [9, "DOT", "Polkadot", 6.84, 1.93, 9.8e9, 0.23e9, 310, 2],
  [10, "LINK", "Chainlink", 14.27, 3.41, 8.7e9, 0.38e9, 120, 2],
];

const assets = rows.map(([rank, symbol, name, price, change24h, marketCap, volume24h, amount, dec]) => {
  // 1250 × 1.0001 = 1250.125 is rounded half-up to $1,250.13, as in the Figma mockups
  const value = symbol === "USDT" ? 1250.13 : Math.round(price * amount * 100) / 100;
  return {
    id: rank,
    rank,
    symbol,
    slug: symbol.toLowerCase(),
    name,
    price,
    priceText: usd(price, price < 10 ? 4 : 2),
    change24h,
    changeText: pct(change24h),
    trend: trendOf(change24h),
    marketCap,
    marketCapText: "$" + compact(marketCap),
    volumeText: "$" + compact(volume24h),
    amount,
    amountText: amount ? `${qty(amount, dec)} ${symbol}` : "",
    value: amount ? value : 0,
    valueText: amount ? usd(value) : "",
    watched: ["SOL", "AVAX", "XRP", "DOGE"].includes(symbol),
  };
});

const total = assets.reduce((sum, a) => sum + a.value, 0);
for (const a of assets) {
  a.share = a.value ? (a.value / total) * 100 : 0;
  a.shareText = a.value ? a.share.toFixed(1) + "%" : "";
}
const bySymbol = Object.fromEntries(assets.map((a) => [a.symbol, a]));

const holdings = assets.filter((a) => a.value).sort((a, b) => b.value - a.value);
const others = holdings.slice(3);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-09-16T09:14" -> "Sep 16, 2026 · 09:14" */
const dateText = (iso) => {
  const [, y, m, d, time] = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})$/);
  return `${MONTHS[Number(m) - 1]} ${Number(d)}, ${y} · ${time}`;
};

const tx = (type, symbol, date, amount, price, dec) => ({
  type,
  symbol,
  name: bySymbol[symbol].name,
  date,
  dateText: dateText(date),
  amount,
  amountText: (type === "sell" ? "−" : "+") + qty(amount, dec) + " " + symbol,
  price,
  priceText: usd(price),
  total: Math.round(amount * price * 100) / 100,
  totalText: usd(Math.round(amount * price * 100) / 100),
  title: { buy: "Bought", sell: "Sold", transfer: "Received" }[type] + " " + symbol,
});

const transactions = [
  tx("buy", "BTC", "2026-09-16T09:14", 0.025, 64218.4, 4),
  tx("sell", "ETH", "2026-09-15T18:40", 0.5, 3142.75, 4),
  tx("transfer", "USDT", "2026-09-14T12:02", 250, 1.0001, 2),
  tx("buy", "SOL", "2026-09-12T21:37", 4, 148.36, 2),
  tx("buy", "ADA", "2026-09-10T08:25", 1000, 0.4521, 2),
];

const btcTransactions = [
  tx("buy", "BTC", "2026-09-16T09:14", 0.025, 64218.4, 4),
  tx("buy", "BTC", "2026-08-28T16:05", 0.1, 58410, 4),
  tx("sell", "BTC", "2026-07-03T11:20", 0.05, 61020, 4),
  tx("buy", "BTC", "2026-03-14T10:02", 0.35, 49880, 4),
];

export const site = {
  t,
  fmt: { usd, signedUsd, pct, qty },
  brand: { name: "Coinfolio", year: 2026 },
  nav: [
    { id: "index", href: "./index.html", key: "nav.dashboard", icon: "dashboard" },
    { id: "assets", href: "./assets.html", key: "nav.assets", icon: "assets" },
    { id: "watchlist", href: "./assets.html?filter=watchlist", key: "nav.watchlist", icon: "star" },
    { id: "profile", href: "./profile.html", key: "nav.profile", icon: "user" },
  ],
  user: {
    firstName: "Valerii",
    lastName: "Povzun",
    initials: "VP",
    email: "valera@coinfolio.app",
    username: "vpovzun",
    memberSince: "2025-03-01",
  },
  portfolio: {
    total,
    totalText: usd(total),
    change: 828.78,
    changeText: signedUsd(828.78),
    changePct: 1.72,
    profitText: signedUsd(7761.73),
    profitPct: 18.82,
    assetsCount: holdings.length,
    allocation: [
      ...holdings.slice(0, 3).map((a) => ({ label: a.name, share: a.share, valueText: a.valueText, slug: a.slug })),
      {
        label: `Others (${others.length})`,
        share: others.reduce((s, a) => s + a.share, 0),
        valueText: usd(others.reduce((s, a) => s + a.value, 0)),
        slug: "others",
      },
    ],
    // weekly points of the 1M chart (text alternative for the chart image)
    chartPoints: [["Aug 17", 45.9], ["Aug 24", 46.8], ["Aug 31", 47.6], ["Sep 7", 48.4], ["Sep 14", 49.0]],
  },
  market: { capText: "$2.31T", capChange: 1.42, volumeText: "$86.2B", volumeChange: -3.05, dominance: "54.9%" },
  btc: {
    ...bySymbol.BTC,
    changeValueText: signedUsd(1474.48),
    avgBuyText: usd(52430.44),
    costBasisText: usd(22282.94),
    pnlText: signedUsd(5009.88),
    returnText: "+22.48%",
    supplyText: "19.75M BTC",
    athText: usd(73750.07),
    rangeText: "$62,480 – $64,232",
    chartPoints: [["Sep 10", 58.4], ["Sep 12", 60.1], ["Sep 14", 61.9], ["Sep 16", 64.2]],
  },
  assets,
  holdings,
  topHoldings: holdings.slice(0, 5),
  watchlist: assets.filter((a) => a.watched),
  transactions,
  btcTransactions,
};
