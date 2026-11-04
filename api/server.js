// Coinfolio API: json-server 0.17 with a thin layer in front of it.
//   node api/server.js              -> http://localhost:3001  (300 ms artificial delay, see API_DELAY)
// The full REST API of json-server is read-only for everybody: only the writes the app needs are let through
// (new transaction, watchlist star, holdings of a coin, profile settings) and every body is validated.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import jsonServer from "json-server";

const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const DELAY = Number(process.env.API_DELAY ?? 300);

// The working copy lives next to db.json (git-ignored), so the committed seed never changes.
const dataDir = join(here, ".data");
mkdirSync(dataDir, { recursive: true });
const dbFile = join(dataDir, "db.json");
copyFileSync(join(here, "db.json"), dbFile);

const server = jsonServer.create();
const router = jsonServer.router(dbFile);
const logger = process.env.NODE_ENV !== "test";

const isNumber = (v) => typeof v === "number" && Number.isFinite(v);
const isText = (v, max = 80) => typeof v === "string" && v.trim().length > 0 && v.length <= max;

const TYPES = ["buy", "sell", "transfer"];
const COIN_FIELDS = {
  watched: (v) => typeof v === "boolean",
  amount: (v) => isNumber(v) && v >= 0,
  avgBuy: (v) => isNumber(v) && v >= 0,
  costBasis: (v) => isNumber(v) && v >= 0,
  value: (v) => isNumber(v) && v >= 0,
};
const PROFILE_FIELDS = {
  firstName: (v) => isText(v, 40),
  lastName: (v) => isText(v, 40),
  email: (v) => isText(v, 120) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
  username: (v) => typeof v === "string" && /^[A-Za-z0-9]{4,24}$/.test(v),
  currency: (v) => ["USD", "EUR", "UAH"].includes(v),
  language: (v) => ["en", "uk"].includes(v),
  timezone: (v) => isText(v, 40),
  theme: (v) => ["dark", "light", "system"].includes(v),
  priceAlerts: (v) => typeof v === "boolean",
  weeklyReport: (v) => typeof v === "boolean",
  productNews: (v) => typeof v === "boolean",
  twoFactor: (v) => typeof v === "boolean",
};

function checkFields(body, rules) {
  const errors = {};
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length === 0) {
    return { body: "Send a JSON object with the fields to change." };
  }
  for (const [key, value] of Object.entries(body)) {
    if (!(key in rules)) {
      errors[key] = "This field cannot be changed.";
    } else if (!rules[key](value)) {
      errors[key] = "Invalid value.";
    }
  }
  return errors;
}

function checkTransaction(body) {
  const errors = {};
  const coin = router.db.get("coins").find({ id: body?.coinId }).value();
  if (!coin) {errors.coinId = "Unknown coin.";}
  if (!TYPES.includes(body?.type)) {errors.type = "Type must be buy, sell or transfer.";}
  if (!isNumber(body?.amount) || body.amount <= 0) {errors.amount = "Amount must be greater than zero.";}
  if (!isNumber(body?.price) || body.price < 0) {errors.price = "Price must not be negative.";}
  if (!isNumber(body?.fee) || body.fee < 0) {errors.fee = "Fee must not be negative.";}
  if (typeof body?.date !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(body.date)) {errors.date = "Use the format YYYY-MM-DDTHH:mm.";}
  if (body?.note !== undefined && (typeof body.note !== "string" || body.note.length > 140)) {errors.note = "Note is limited to 140 characters.";}
  return errors;
}

/** Everything except the writes the app needs is rejected. */
function guard(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }
  const [, resource, id] = req.path.split("/");
  let errors = null;
  if (req.method === "POST" && resource === "transactions" && !id) {
    errors = checkTransaction(req.body);
    if (!Object.keys(errors).length) {
      req.body = {
        coinId: req.body.coinId,
        type: req.body.type,
        date: req.body.date,
        amount: req.body.amount,
        price: req.body.price,
        fee: req.body.fee,
        note: (req.body.note ?? "").trim(),
      };
    }
  } else if (req.method === "PATCH" && resource === "coins" && id) {
    errors = checkFields(req.body, COIN_FIELDS);
  } else if (req.method === "PATCH" && resource === "profile" && !id) {
    errors = checkFields(req.body, PROFILE_FIELDS);
  } else {
    return res.status(405).json({ error: `${req.method} ${req.path} is not allowed on this demo API.` });
  }
  if (Object.keys(errors).length) {
    return res.status(422).json({ error: "Validation failed.", fields: errors });
  }
  return next();
}

server.use(jsonServer.defaults({ logger, noGzip: false }));
server.get("/health", (_req, res) => res.json({ status: "ok" }));
// Artificial latency, so that the loading states and the optimistic updates can be seen.
server.use((_req, _res, next) => (DELAY > 0 ? setTimeout(next, DELAY) : next()));
server.use(guard);
server.use(router);

server.listen(PORT, () => {
  console.log(`Coinfolio API on http://localhost:${PORT}  (delay ${DELAY} ms)`);
});
