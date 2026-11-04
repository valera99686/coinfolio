import { roundTo } from "./format.js";

/**
 * Portfolio arithmetic. The API stores the position of every coin (amount, average buy price, cost basis, value),
 * everything shown on the dashboard is calculated from those fields.
 */
export function summarize(holdings) {
  const total = roundTo(holdings.reduce((sum, coin) => sum + coin.value, 0));
  const cost = roundTo(holdings.reduce((sum, coin) => sum + coin.costBasis, 0));
  // value now = value yesterday * (1 + change), so yesterday's value is value / (1 + change / 100)
  const dayChange = roundTo(holdings.reduce((sum, coin) => sum + (coin.value * coin.change24h) / (100 + coin.change24h), 0));
  const sorted = [...holdings].sort((a, b) => b.value - a.value);
  const byChange = [...holdings].sort((a, b) => b.change24h - a.change24h);

  const top = sorted.slice(0, 3);
  const rest = sorted.slice(3);
  const share = (value) => (total ? (value / total) * 100 : 0);
  const allocation = [
    ...top.map((coin) => ({ id: coin.id, label: coin.name, value: coin.value, share: share(coin.value) })),
    ...(rest.length
      ? [
          {
            id: "others",
            label: "",
            count: rest.length,
            value: roundTo(rest.reduce((sum, coin) => sum + coin.value, 0)),
            share: share(rest.reduce((sum, coin) => sum + coin.value, 0)),
          },
        ]
      : []),
  ];

  return {
    total,
    cost,
    profit: roundTo(total - cost),
    profitPct: cost ? ((total - cost) / cost) * 100 : 0,
    dayChange,
    dayChangePct: total - dayChange ? (dayChange / (total - dayChange)) * 100 : 0,
    best: byChange[0] ?? null,
    worst: byChange.at(-1) ?? null,
    count: holdings.length,
    allocation,
  };
}

/**
 * Position of a coin after a transaction. A buy and a transfer in raise the amount and the cost basis,
 * a sell lowers the amount and keeps the average buy price.
 */
export function nextPosition(coin, { type, amount, price }) {
  let held = coin.amount;
  let cost = coin.costBasis;
  if (type === "sell") {
    const average = held ? cost / held : 0;
    held = Math.max(0, held - amount);
    cost = average * held;
  } else {
    held += amount;
    cost += amount * price;
  }
  return {
    amount: roundTo(held, 8),
    costBasis: roundTo(cost),
    avgBuy: held ? roundTo(cost / held, coin.price < 10 ? 4 : 2) : 0,
    value: roundTo(held * coin.price + 1e-9),
  };
}

/** Quantity of a coin after a list of transactions (used for the "net amount" of the history). */
export function netAmount(transactions) {
  return roundTo(
    transactions.reduce((sum, tx) => sum + (tx.type === "sell" ? -tx.amount : tx.amount), 0),
    8,
  );
}

/** Fee of a transaction: 0.1% of its total. */
export const FEE_RATE = 0.001;
export const feeOf = (amount, price) => roundTo(amount * price * FEE_RATE);
