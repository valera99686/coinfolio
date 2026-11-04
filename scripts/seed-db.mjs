// Generates api/db.json for json-server (and the logos of the extra coins).
//   node scripts/seed-db.mjs
// The numbers of the first ten coins, the BTC position and the portfolio totals are the ones from the Figma mockups;
// the other coins and the price history are demo data produced by a seeded random walk, so the file is reproducible.
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const NOW = "2026-09-16T09:14";

// ---- seeded random numbers ------------------------------------------------
function hash(text) {
  let h = 2166136261;
  for (const ch of text) {
    h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  }
  return h >>> 0;
}

function rngFor(seedText) {
  let a = hash(seedText);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const round = (n, digits = 2) => Math.round((n + Number.EPSILON) * 10 ** digits) / 10 ** digits;
const sig = (n) => Number(n.toPrecision(6));

/** Random walk from `start` to `end` (Brownian bridge), `vol` is the step size relative to `start`. */
function walk(rng, points, start, end, vol) {
  const noise = [0];
  for (let i = 1; i < points; i += 1) {
    noise.push(noise[i - 1] + (rng() - 0.5) * 2 * vol);
  }
  const last = noise[points - 1];
  return noise.map((value, i) => {
    const t = i / (points - 1);
    const v = start + (end - start) * t + (value - last * t) * start;
    return sig(Math.max(v, Math.min(start, end) * 0.35));
  });
}

// ---- coins ----------------------------------------------------------------
// symbol, name, price, 24h change %, market cap, 24h volume, category, held amount, average buy price, watched, website, about
const COINS = [
  ["BTC", "Bitcoin", 64218.4, 2.35, 1.268e12, 31.8e9, "Layer 1", 0.425, 52430.44, false, "https://bitcoin.org/",
    "Bitcoin is the first decentralised digital currency, launched in 2009. It runs on a public proof-of-work blockchain with a hard cap of 21 million coins, which is why it is often called “digital gold”. Transactions are verified by a global network of miners without any central authority."],
  ["ETH", "Ethereum", 3142.75, -1.12, 3.78e11, 15.2e9, "Layer 1", 3.2, 2700, false, "https://ethereum.org/",
    "Ethereum is a programmable blockchain. Smart contracts let developers build lending, trading and NFT apps on top of it, and validators secure the network by staking ETH."],
  ["USDT", "Tether", 1.0001, 0.01, 1.18e11, 48.6e9, "Stablecoin", 1250, 1, false, "https://tether.to/",
    "Tether is a stablecoin pegged to the US dollar. It is the most traded asset on crypto exchanges and is used to move value between markets without leaving the dollar."],
  ["SOL", "Solana", 148.36, 5.87, 6.9e10, 3.4e9, "Layer 1", 28.5, 118, true, "https://solana.com/",
    "Solana is a high-throughput layer 1 chain that combines proof of stake with proof of history. Low fees and fast finality make it popular for payments, trading and games."],
  ["XRP", "XRP", 0.5873, 0.92, 3.3e10, 1.3e9, "Payments", 0, 0, true, "https://xrpl.org/",
    "XRP is the native asset of the XRP Ledger, built for fast and cheap cross-border payments. Transfers settle in a few seconds."],
  ["ADA", "Cardano", 0.4521, -0.64, 1.63e10, 0.41e9, "Layer 1", 5200, 0.4278, false, "https://cardano.org/",
    "Cardano is a proof-of-stake blockchain developed through peer-reviewed research. It supports smart contracts and a native token standard."],
  ["DOGE", "Dogecoin", 0.1242, 0.87, 1.59e10, 0.9e9, "Meme", 0, 0, true, "https://dogecoin.com/",
    "Dogecoin started as a joke in 2013 and grew into one of the largest meme coins. It is mostly used for tips and small payments."],
  ["AVAX", "Avalanche", 27.9, -2.48, 1.14e10, 0.52e9, "Layer 1", 0, 0, true, "https://www.avax.network/",
    "Avalanche is a layer 1 platform with sub-second finality. Developers can launch their own application-specific chains called subnets."],
  ["DOT", "Polkadot", 6.84, 1.93, 9.8e9, 0.23e9, "Infrastructure", 310, 6.41, false, "https://polkadot.network/",
    "Polkadot connects many specialised blockchains (parachains) into one network that shares security through a central relay chain."],
  ["LINK", "Chainlink", 14.27, 3.41, 8.7e9, 0.38e9, "Infrastructure", 120, 12.52, false, "https://chain.link/",
    "Chainlink is a network of oracles that brings real-world data, such as prices, onto blockchains so smart contracts can use it."],
  ["BCH", "Bitcoin Cash", 412.6, -0.37, 8.1e9, 0.29e9, "Payments", 0, 0, false, "https://bitcoincash.org/",
    "Bitcoin Cash split from Bitcoin in 2017 with larger blocks, aiming at cheap everyday payments."],
  ["UNI", "Uniswap", 8.95, 2.14, 7.6e9, 0.21e9, "DeFi", 0, 0, false, "https://uniswap.org/",
    "Uniswap is the largest decentralised exchange. Liquidity providers fund pools and traders swap tokens against them with no order book."],
  ["XLM", "Stellar", 0.1186, 0.42, 7.1e9, 0.12e9, "Payments", 0, 0, false, "https://stellar.org/",
    "Stellar is an open network for moving money. It connects banks, payment systems and people with low-cost transfers."],
  ["ATOM", "Cosmos", 7.62, -1.08, 6.7e9, 0.19e9, "Infrastructure", 0, 0, false, "https://cosmos.network/",
    "Cosmos is an “internet of blockchains”: independent chains talk to each other through the IBC protocol."],
  ["NEAR", "NEAR Protocol", 6.31, 3.76, 6.2e9, 0.34e9, "Layer 1", 0, 0, false, "https://near.org/",
    "NEAR is a sharded proof-of-stake chain with human-readable account names and a focus on easy onboarding for developers."],
  ["ICP", "Internet Computer", 11.84, -2.31, 5.8e9, 0.11e9, "Infrastructure", 0, 0, false, "https://internetcomputer.org/",
    "The Internet Computer runs web apps and backends fully on-chain, without traditional cloud hosting."],
  ["FIL", "Filecoin", 5.48, 1.12, 5.4e9, 0.17e9, "Infrastructure", 0, 0, false, "https://filecoin.io/",
    "Filecoin is a decentralised storage market. Providers rent out disk space and are paid in FIL for proving they store the data."],
  ["APT", "Aptos", 8.17, -0.93, 5e9, 0.2e9, "Layer 1", 0, 0, false, "https://aptoslabs.com/",
    "Aptos is a layer 1 blockchain built with the Move language, designed for safe and parallel transaction execution."],
  ["ETC", "Ethereum Classic", 24.36, 0.58, 4.6e9, 0.14e9, "Layer 1", 0, 0, false, "https://ethereumclassic.org/",
    "Ethereum Classic is the original Ethereum chain that kept proof of work after the 2016 fork."],
  ["HBAR", "Hedera", 0.0718, 1.64, 4.3e9, 0.08e9, "Layer 1", 0, 0, false, "https://hedera.com/",
    "Hedera uses a hashgraph consensus run by a council of large companies, aiming at high throughput and predictable fees."],
  ["ARB", "Arbitrum", 1.04, -1.77, 4e9, 0.26e9, "Layer 2", 0, 0, false, "https://arbitrum.io/",
    "Arbitrum is an optimistic rollup that scales Ethereum: transactions run off-chain and are settled on Ethereum."],
  ["OP", "Optimism", 2.31, 2.89, 3.7e9, 0.23e9, "Layer 2", 0, 0, false, "https://www.optimism.io/",
    "Optimism is an Ethereum layer 2 rollup and the home of the OP Stack, a toolkit for launching new rollups."],
  ["VET", "VeChain", 0.0334, -0.45, 3.4e9, 0.06e9, "Infrastructure", 0, 0, false, "https://www.vechain.org/",
    "VeChain tracks products across supply chains. Companies record the origin and journey of goods on the blockchain."],
  ["INJ", "Injective", 24.7, 4.12, 3.1e9, 0.15e9, "DeFi", 0, 0, false, "https://injective.com/",
    "Injective is a chain built for finance, with an on-chain order book for spot and derivatives markets."],
  ["MKR", "Maker", 1812, -0.66, 2.8e9, 0.05e9, "DeFi", 0, 0, false, "https://makerdao.com/",
    "Maker issues the DAI stablecoin against crypto collateral. MKR holders vote on the risk rules of the protocol."],
  ["AAVE", "Aave", 136.4, 1.93, 2.6e9, 0.12e9, "DeFi", 0, 0, false, "https://aave.com/",
    "Aave is a lending market where users deposit assets to earn interest or borrow against collateral."],
  ["GRT", "The Graph", 0.2043, -1.26, 2.4e9, 0.07e9, "Infrastructure", 0, 0, false, "https://thegraph.com/",
    "The Graph indexes blockchain data so apps can query it quickly, like a search engine for on-chain information."],
  ["ALGO", "Algorand", 0.1672, 0.71, 2.2e9, 0.05e9, "Layer 1", 0, 0, false, "https://algorand.co/",
    "Algorand is a pure proof-of-stake chain with instant finality and low, fixed transaction fees."],
  ["STX", "Stacks", 1.69, 3.05, 2e9, 0.09e9, "Layer 2", 0, 0, false, "https://www.stacks.co/",
    "Stacks brings smart contracts to Bitcoin: contracts run on a separate layer and settle on the Bitcoin chain."],
  ["SAND", "The Sandbox", 0.4018, -2.04, 1.85e9, 0.08e9, "Gaming", 0, 0, false, "https://www.sandbox.game/",
    "The Sandbox is a virtual world where players build, own and trade game assets and land as NFTs."],
  ["MANA", "Decentraland", 0.3891, -1.52, 1.7e9, 0.06e9, "Gaming", 0, 0, false, "https://decentraland.org/",
    "Decentraland is a 3D virtual world owned by its users. MANA pays for land, avatars and wearables."],
  ["EGLD", "MultiversX", 31.12, 0.34, 1.55e9, 0.04e9, "Layer 1", 0, 0, false, "https://multiversx.com/",
    "MultiversX is a sharded layer 1 chain that processes transactions in parallel across several shards."],
  ["FLOW", "Flow", 0.5214, -0.88, 1.4e9, 0.03e9, "Layer 1", 0, 0, false, "https://flow.com/",
    "Flow is a chain designed for games and collectibles, where NFTs and apps reach mainstream users."],
  ["XTZ", "Tezos", 0.8127, 0.19, 1.25e9, 0.03e9, "Layer 1", 0, 0, false, "https://tezos.com/",
    "Tezos is a self-amending blockchain: holders vote on protocol upgrades, which then roll out without hard forks."],
  ["AXS", "Axie Infinity", 6.28, 2.47, 1.12e9, 0.07e9, "Gaming", 0, 0, false, "https://axieinfinity.com/",
    "Axie Infinity is a play-to-earn game where players breed and battle creatures called Axies."],
  ["SHIB", "Shiba Inu", 0.00001927, 1.31, 1.05e9, 0.05e9, "Meme", 0, 0, false, "https://shibatoken.com/",
    "Shiba Inu is a meme token that grew an ecosystem around it, including its own decentralised exchange."],
];

const SERIES = {
  "1h": { points: 13, vol: 0.0012 },
  "24h": { points: 25, vol: 0.0035 },
  "7d": { points: 29, vol: 0.011 },
  "1m": { points: 31, vol: 0.02 },
  "1y": { points: 53, vol: 0.05 },
  all: { points: 61, vol: 0.09 },
};

const coins = [];
const charts = [];
const details = [];
const WHITEPAPERS = { btc: "https://bitcoin.org/bitcoin.pdf", eth: "https://ethereum.org/en/whitepaper/" };

COINS.forEach(([symbol, name, price, change24h, marketCap, volume24h, category, amount, avgBuy, watched, website, about], index) => {
  const id = symbol.toLowerCase();
  const rng = rngFor(id);
  const amountHeld = amount;
  const value = amountHeld ? round(price * amountHeld + 1e-9) : 0;
  const costBasis = amountHeld ? round(amountHeld * avgBuy) : 0;
  const open24h = price / (1 + change24h / 100);

  const series = {};
  for (const [period, { points, vol }] of Object.entries(SERIES)) {
    let start;
    if (period === "1h") {
      start = price * (1 + (rng() - 0.5) * 0.004);
    } else if (period === "24h") {
      start = open24h;
    } else if (period === "7d") {
      start = id === "btc" ? 58400 : price / (1 + (change24h / 100) * 1.2 + (rng() - 0.5) * 0.08);
    } else if (period === "1m") {
      start = price / (1 + (rng() - 0.45) * 0.36);
    } else if (period === "1y") {
      start = price / (1 + (rng() - 0.3) * 1.6);
    } else {
      start = price * (0.2 + rng() * 2.4);
    }
    series[period] = walk(rng, points, start, price, vol);
  }

  // The 24h range of the stats panel is taken from the 24h series; Bitcoin keeps the numbers of the mockup.
  if (id === "btc") {
    series["24h"] = series["24h"].map((v) => Math.min(Math.max(v, 62480.1), 64231.9));
    series["24h"][series["24h"].length - 1] = price;
  }
  const low24h = id === "btc" ? 62480.1 : sig(Math.min(...series["24h"]) * 0.9985);
  const high24h = id === "btc" ? 64231.9 : sig(Math.max(...series["24h"]) * 1.0015);
  coins.push({
    id,
    rank: index + 1,
    symbol,
    name,
    category,
    price,
    change24h,
    marketCap,
    volume24h,
    supply: id === "btc" ? 19750000 : Math.round(marketCap / price),
    ath: id === "btc" ? 73750.07 : sig(price * (1.15 + rng() * 1.8)),
    low24h,
    high24h,
    amount: amountHeld,
    avgBuy,
    costBasis,
    value,
    watched,
    spark: series["7d"],
  });
  // Long texts live in their own collection, so that the full-text search (?q=) of the list only sees short fields.
  details.push({ id, website, ...(WHITEPAPERS[id] ? { whitepaper: WHITEPAPERS[id] } : {}), about });
  charts.push({ id, asOf: NOW, series });
});

// ---- transactions ---------------------------------------------------------
const FIXED = [
  ["buy", "btc", "2026-09-16T09:14", 0.025, 64218.4],
  ["sell", "eth", "2026-09-15T18:40", 0.5, 3142.75],
  ["transfer", "usdt", "2026-09-14T12:02", 250, 1.0001],
  ["buy", "sol", "2026-09-12T21:37", 4, 148.36],
  ["buy", "ada", "2026-09-10T08:25", 1000, 0.4521],
  ["buy", "btc", "2026-08-28T16:05", 0.1, 58410],
  ["sell", "btc", "2026-07-03T11:20", 0.05, 61020],
  ["buy", "btc", "2026-03-14T10:02", 0.35, 49880],
];

const rngTx = rngFor("transactions");
const GENERATED_FOR = [["eth", 8], ["usdt", 5], ["sol", 7], ["ada", 6], ["dot", 7], ["link", 7]];
const generated = [];
for (const [coinId, count] of GENERATED_FOR) {
  const coin = coins.find((c) => c.id === coinId);
  for (let i = 0; i < count; i += 1) {
    const day = 1 + Math.floor(rngTx() * 560); // between 2025-03-01 and 2026-09-09
    const date = new Date(Date.UTC(2025, 2, 1 + day, 6 + Math.floor(rngTx() * 14), Math.floor(rngTx() * 60)));
    const type = i > 0 && rngTx() < 0.22 ? "sell" : "buy";
    const unit = coinId === "usdt" ? 1 : coin.avgBuy * (0.88 + rngTx() * 0.24);
    const size = coinId === "usdt" ? 50 + Math.round(rngTx() * 400) : round((coin.amount / count) * (0.4 + rngTx() * 1.2), coin.price < 10 ? 0 : 3);
    generated.push([type, coinId, date.toISOString().slice(0, 16), size || 1, coinId === "usdt" ? 1 : round(unit, unit < 10 ? 4 : 2)]);
  }
}

const NOTES = { "2026-09-16T09:14": "Weekly DCA", "2026-08-28T16:05": "Bought the dip", "2026-07-03T11:20": "Took some profit" };

const transactions = [...FIXED, ...generated]
  .sort((a, b) => (a[2] < b[2] ? -1 : 1))
  .map(([type, coinId, date, amount, price], i) => ({
    id: i + 1,
    coinId,
    type,
    date,
    amount,
    price,
    fee: round(amount * price * 0.001),
    note: NOTES[date] && coinId === "btc" ? NOTES[date] : "",
  }));

// ---- portfolio history ----------------------------------------------------
const total = round(coins.reduce((sum, c) => sum + c.value, 0));
const rngPf = rngFor("portfolio");
const portfolio = {
  asOf: NOW,
  series: {
    "1d": walk(rngPf, 25, total / 1.0172, total, 0.003),
    "1w": walk(rngPf, 29, total / 1.036, total, 0.008),
    "1m": walk(rngPf, 31, 45600, total, 0.016),
    "1y": walk(rngPf, 53, total / 1.9, total, 0.04),
    all: walk(rngPf, 61, total / 3.1, total, 0.07),
  },
};

// ---- the rest ---------------------------------------------------------------
const market = { cap: 2.31e12, capChange: 1.42, volume: 86.2e9, volumeChange: -3.05, dominance: 54.9, dominanceChange: 0.3 };

const profile = {
  firstName: "Valerii",
  lastName: "Povzun",
  email: "valera@coinfolio.app",
  username: "vpovzun",
  memberSince: "2025-03-01",
  currency: "USD",
  language: "en",
  timezone: "Europe/Kyiv",
  theme: "dark",
  priceAlerts: true,
  weeklyReport: true,
  productNews: false,
  twoFactor: true,
};

const wallets = [
  { id: 1, name: "MetaMask", address: "0x3f…9a2c", status: "synced" },
  { id: 2, name: "Ledger Nano X", address: "bc1q…7k4d", status: "synced" },
];

const db = { coins, details, transactions, charts, wallets, profile, market, portfolio };

// Arrays of numbers stay on one line, everything else is indented.
const json = JSON.stringify(db, null, 2).replace(/\[\s*(-?[\d.eE+-]+(?:,\s*-?[\d.eE+-]+)*)\s*\]/g, (_, list) => `[${list.replace(/\s+/g, " ")}]`);
mkdirSync(join(root, "api"), { recursive: true });
writeFileSync(join(root, "api", "db.json"), json + "\n");

// ---- logos of the extra coins -----------------------------------------------
const COLORS = ["#E6A817", "#8247E5", "#2E9CCA", "#E04F5F", "#1FA67A", "#5B6EE1", "#D9822B", "#7B61C1", "#3AA0B8", "#C45A9E"];
for (const coin of coins) {
  const file = join(root, "public", "img", "coins", `${coin.id}.svg`);
  if (existsSync(file)) {
    continue;
  }
  const color = COLORS[hash(coin.id) % COLORS.length];
  const letter = coin.symbol[0];
  writeFileSync(
    file,
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="${color}"/><text x="16" y="21.5" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="700" fill="#fff">${letter}</text></svg>\n`,
  );
}

const held = coins.filter((c) => c.value);
const cost = round(held.reduce((sum, c) => sum + c.costBasis, 0));
console.log(`coins: ${coins.length}, transactions: ${transactions.length}, held: ${held.length}`);
console.log(`portfolio value $${total}, cost basis $${cost}, profit $${round(total - cost)}`);
