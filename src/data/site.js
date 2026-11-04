// Build-time data of the EJS shells: the translated text of the markup, the brand and the navigation.
// Everything that is data of the app (coins, transactions, profile, charts) lives in api/db.json and is
// read from the API at run time by src/js/pages/*.js, so no number of the interface is written here.
import { readFileSync } from "node:fs";

const en = JSON.parse(readFileSync(new URL("../../public/locales/en.json", import.meta.url), "utf8"));

/** English text for an i18n key; the key itself goes to data-i18n. */
const t = (key) => {
  if (!(key in en)) {
    throw new Error(`Missing i18n key: ${key}`);
  }
  return en[key];
};

export const site = {
  t,
  brand: { name: "Coinfolio", year: 2026 },
  nav: [
    { id: "index", href: "./index.html", key: "nav.dashboard", icon: "dashboard" },
    { id: "assets", href: "./assets.html", key: "nav.assets", icon: "assets" },
    { id: "watchlist", href: "./assets.html?filter=watchlist", key: "nav.watchlist", icon: "star" },
    { id: "profile", href: "./profile.html", key: "nav.profile", icon: "user" },
  ],
};
