// End-to-end check of the running app in a real Chrome (puppeteer-core): the dev server and the API must be up
// (`npm start`). It clicks through the pages the way a user does and fails on the first broken expectation.
//   node scripts/e2e.mjs [scenario ...]        scenarios: assets asset dashboard profile
import puppeteer from "puppeteer-core";

const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const WEB = process.env.DEV_URL || "http://localhost:5173";
const API = process.env.API_URL || "http://localhost:3001";

const results = [];
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function check(name, ok, detail = "") {
  results.push({ name, ok });
  console.log(`${ok ? "  ok  " : " FAIL "} ${name}${ok ? "" : detail ? "  -> " + detail : ""}`);
}

async function open(browser, path, { width = 1280, height = 900 } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  page.errors = [];
  page.on("pageerror", (error) => page.errors.push((error.stack || error.message).split("\n").slice(0, 3).join(" | ")));
  await page.goto(WEB + path, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(400);
  return page;
}

async function fill(page, selector, value) {
  await page.focus(selector);
  await page.keyboard.down("Control");
  await page.keyboard.press("a");
  await page.keyboard.up("Control");
  if (value === "") {
    await page.keyboard.press("Backspace");
  } else {
    await page.keyboard.type(value);
  }
}

const text = (page, selector) => page.$eval(selector, (el) => el.textContent.trim()).catch(() => null);
const count = (page, selector) => page.$$eval(selector, (els) => els.length);
const url = (page) => new URL(page.url());

async function waitForRows(page, selector, predicate, timeout = 8000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = await page.$$eval(selector, (els) => els.map((el) => el.textContent.replace(/\s+/g, " ").trim()));
    if (predicate(value)) {
      return value;
    }
    await sleep(100);
  }
  return page.$$eval(selector, (els) => els.map((el) => el.textContent.replace(/\s+/g, " ").trim()));
}

const scenarios = {
  async assets(browser) {
    console.log("assets page");
    const page = await open(browser, "/assets.html");
    check("10 rows of the first page come from the API", (await count(page, ".asset-row")) === 10);
    check("summary shows the total from X-Total-Count", (await text(page, ".pagination__summary")) === "Showing 1–10 of 36 assets");
    check("4 page links for 36 coins", (await count(page, ".pagination__item--page")) === 4);
    check("first coin is Bitcoin (sorted by market cap)", (await text(page, ".asset-row__name")) === "Bitcoin");

    // search with debounce and the URL
    await page.type("#asset-search", "sol");
    await sleep(100);
    check("the URL is not touched before the debounce fires", url(page).search === "");
    const rows = await waitForRows(page, ".asset-row__name", (r) => r.length === 1);
    check("search 'sol' finds Solana only", rows.join() === "Solana", rows.join());
    check("the search is kept in the URL", url(page).searchParams.get("q") === "sol");
    check("the summary follows the search", (await text(page, ".pagination__summary")).includes("of 1 assets"));

    // filter chips reset to page 1 and talk to the server
    await page.$eval("#asset-search", (el) => { el.value = ""; el.dispatchEvent(new Event("input", { bubbles: true })); });
    await waitForRows(page, ".asset-row__name", (r) => r.length === 10);
    await page.click('label[for="filter-holdings"]');
    const held = await waitForRows(page, ".asset-row__name", (r) => r.length === 7);
    check("filter 'Holdings' shows the 7 coins in the portfolio", held.length === 7, String(held.length));
    check("the filter is in the URL", url(page).searchParams.get("filter") === "holdings");
    await page.click('label[for="filter-losers"]');
    const losers = await waitForRows(page, ".asset-row__name", (r) => r.length === 10);
    check("filter 'Losers' gives a full page (14 losers)", losers.length === 10);
    check("losers pagination: 14 coins", (await text(page, ".pagination__summary")).includes("of 14"));
    await page.click('label[for="filter-all"]');
    await waitForRows(page, ".asset-row__name", (r) => r.length === 10 && r[0] === "Bitcoin");

    // sort
    await page.select("#asset-sort", "name");
    const byName = await waitForRows(page, ".asset-row__name", (r) => r[0] === "Aave");
    check("sort by name starts with Aave (A to Z)", byName[0] === "Aave", byName[0]);
    await page.click('[data-sort="price"]');
    const byPrice = await waitForRows(page, ".asset-row__name", (r) => r[0] === "Bitcoin");
    check("sort by price: Bitcoin, Ethereum, Maker ($1,812) are the dearest", byPrice.slice(0, 3).join() === "Bitcoin,Ethereum,Maker", byPrice.slice(0, 3).join());
    check("aria-sort of the price column is descending", (await page.$eval('[data-sort="price"]', (b) => b.closest("th").getAttribute("aria-sort"))) === "descending");
    await page.click('[data-sort="price"]');
    const cheapest = await waitForRows(page, ".asset-row__name", (r) => r[0] === "Shiba Inu");
    check("the same column again flips the order (Shiba Inu is the cheapest)", cheapest[0] === "Shiba Inu", cheapest[0]);

    // category
    await page.select("#asset-category", "Stablecoin");
    const stable = await waitForRows(page, ".asset-row__name", (r) => r.length === 1);
    check("category 'Stablecoin' gives Tether", stable.join() === "Tether", stable.join());
    await page.select("#asset-category", "");

    // pagination, URL state and the Back button
    await page.goto(WEB + "/assets.html", { waitUntil: "networkidle0" });
    await page.click('.pagination__link[data-page="2"]');
    const page2 = await waitForRows(page, ".asset-row__rank", (r) => r[0] === "11");
    check("page 2 starts with rank 11", page2[0] === "11", page2[0]);
    check("page is in the URL", url(page).searchParams.get("page") === "2");
    await page.click('.pagination__link[data-page="3"]');
    await waitForRows(page, ".asset-row__rank", (r) => r[0] === "21");
    await page.goBack();
    const back = await waitForRows(page, ".asset-row__rank", (r) => r[0] === "11");
    check("Back returns to page 2", back[0] === "11" && url(page).searchParams.get("page") === "2");
    check("controls follow the URL after Back", (await page.$eval("#asset-sort", (s) => s.value)) === "marketCap");

    // a shared link opens the same list
    const link = page.url();
    const other = await browser.newPage();
    await other.setViewport({ width: 1280, height: 900 });
    await other.goto(link.replace("page=2", "page=2&filter=gainers"), { waitUntil: "networkidle0" });
    await sleep(500);
    check("a link with filter and page opens that list", (await other.$eval('input[name="filter"]:checked', (el) => el.value)) === "gainers");
    await other.close();

    // a page number beyond the last one is corrected
    const far = await browser.newPage();
    await far.goto(WEB + "/assets.html?page=99", { waitUntil: "networkidle0" });
    await sleep(600);
    check("page=99 falls back to the last page", url(far).searchParams.get("page") === "4" && (await count(far, ".asset-row")) === 6);
    await far.close();

    check("no script errors", page.errors.length === 0, page.errors.join("; "));
    await page.close();
  },

  async asset(browser) {
    console.log("asset details page");
    const page = await open(browser, "/asset.html#/item/btc");
    check("title and breadcrumb come from the coin", (await text(page, ".asset__title")) === "Bitcoin" && (await text(page, "[data-crumb]")) === "Bitcoin");
    check("document title is set from the API data", (await page.title()) === "Bitcoin (BTC) — Coinfolio");
    check("the chart is drawn from the series", (await count(page, "svg.line-chart .line-chart__line")) === 1);
    check("the position is 0.4250 BTC", (await text(page, ".position__amount")).startsWith("0.4250 BTC"));
    const rows = await waitForRows(page, ".history__row", (r) => r.length === 4);
    check("history has 4 BTC transactions", rows.length === 4, String(rows.length));
    check("the summary counts them", (await text(page, '[data-slot="history-summary"]')) === "4 transactions · net 0.4250 BTC");

    // period switch keeps its state in the URL and does not reload the page
    await page.click('label[for="price-period-1m"]');
    await sleep(200);
    check("the period is in the URL", url(page).searchParams.get("period") === "1m");
    check("the chart caption follows the period", (await text(page, '[data-slot="chart-caption"]')).includes("last 30 days"));

    // history tabs filter on the server
    await page.click('a[data-tx="buy"]');
    const buys = await waitForRows(page, ".history__row", (r) => r.length === 3);
    check("tab Buys shows 3 transactions", buys.length === 3, String(buys.length));
    check("the tab is in the URL", url(page).searchParams.get("tx") === "buy");
    await page.click('a[data-tx="sell"]');
    const sells = await waitForRows(page, ".history__row", (r) => r.length === 1);
    check("tab Sells shows 1 transaction", sells.length === 1);
    await page.goBack();
    const again = await waitForRows(page, ".history__row", (r) => r.length === 3);
    check("Back returns to the Buys tab", again.length === 3 && url(page).searchParams.get("tx") === "buy");
    await page.click('a[data-tx=""]');
    await waitForRows(page, ".history__row", (r) => r.length === 4);

    // the form: validation first
    await page.click('#trade-form [type="submit"]');
    check("an empty quantity is refused", (await text(page, '[data-error-for="amount"]')) === "This field is required.");
    check("the field is marked aria-invalid", (await page.$eval("#trade-qty", (el) => el.getAttribute("aria-invalid"))) === "true");
    check("the focus goes to the first wrong field", (await page.evaluate(() => document.activeElement.id)) === "trade-qty");
    await page.click('label[for="trade-sell"]');
    await page.type("#trade-qty", "5");
    await page.click('#trade-form [type="submit"]');
    check("selling more than you hold is refused (setCustomValidity)", (await text(page, '[data-error-for="amount"]')) === "You can sell at most 0.4250 BTC.", await text(page, '[data-error-for="amount"]'));
    await fill(page, "#trade-qty", "0.1");
    await sleep(150);
    check("the message disappears when the value is fixed", (await text(page, '[data-error-for="amount"]')) === "" || (await text(page, '[data-error-for="amount"]')) === null);
    check("live total = 0.1 x 64,218.4 = $6,421.84", (await text(page, "[data-total]")) === "$6,421.84", await text(page, "[data-total]"));
    check("live fee is 0.1% of the total", (await text(page, "[data-fee]")) === "$6.42", await text(page, "[data-fee]"));
    await page.$eval("#trade-date", (el) => {
      el.value = "2999-01-01T10:00";
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.click('#trade-form [type="submit"]');
    check("a date in the future is refused", (await text(page, '[data-error-for="date"]')).length > 0, await text(page, '[data-error-for="date"]'));

    // a valid buy goes to the API
    const before = (await fetch(`${API}/transactions?_limit=1`)).headers.get("x-total-count");
    await page.click('label[for="trade-buy"]');
    await page.$eval("#trade-date", (el) => {
      el.value = el.max;
      el.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await fill(page, "#trade-qty", "0.01");
    await page.type("#trade-note", "e2e <b>note</b>");
    await page.click('#trade-form [type="submit"]');
    await waitForRows(page, ".history__row", (r) => r.length === 5, 10000);
    const afterCount = (await fetch(`${API}/transactions?_limit=1`)).headers.get("x-total-count");
    check("POST /transactions created the record", Number(afterCount) === Number(before) + 1, `${before} -> ${afterCount}`);
    check("the history shows 5 transactions now", (await count(page, ".history__row")) === 5);
    const coin = await (await fetch(`${API}/coins/btc`)).json();
    check("the position of BTC was updated (PATCH /coins/btc)", Math.abs(coin.amount - 0.435) < 1e-9, String(coin.amount));
    check("the position card shows the new amount", (await text(page, ".position__amount")).startsWith("0.4350 BTC"), await text(page, ".position__amount"));
    check("the form is empty again", (await page.$eval("#trade-qty", (el) => el.value)) === "");
    const notes = await (await fetch(`${API}/transactions?coinId=btc&_sort=id&_order=desc&_limit=1`)).json();
    check("the note is stored as text, not as markup", notes[0].note === "e2e <b>note</b>");
    check("the note is not rendered as HTML", (await count(page, ".history__table b")) === 0);

    // draft
    await page.type("#trade-qty", "0.77");
    await page.reload({ waitUntil: "networkidle0" });
    await sleep(500);
    check("the unsent draft survives a reload", (await page.$eval("#trade-qty", (el) => el.value)) === "0.77");

    // optimistic star with a rollback
    const star = ".asset__watch";
    const was = await page.$eval(star, (b) => b.getAttribute("aria-pressed"));
    await page.setRequestInterception(true);
    // the failing request is held back for a moment, so that the optimistic state can be observed
    const failing = (request) => (request.method() === "PATCH" ? setTimeout(() => request.abort("failed"), 700) : request.continue());
    page.on("request", failing);
    await page.click(star);
    const flipped = await page.$eval(star, (b) => b.getAttribute("aria-pressed"));
    check("the star flips at once, before the answer of the server", flipped !== was);
    await sleep(1500);
    check("when the request fails the star goes back", (await page.$eval(star, (b) => b.getAttribute("aria-pressed"))) === was);
    check("the user is told about it", (await text(page, ".toast--error .toast__text")) !== null);
    page.off("request", failing);
    page.on("request", (request) => request.continue());
    await page.click(star);
    await sleep(1200);
    const saved = await (await fetch(`${API}/coins/btc`)).json();
    check("a successful click is saved on the server", String(saved.watched) === (was === "true" ? "false" : "true"));
    await page.click(star);
    await sleep(900);

    // routes
    await page.goto(WEB + "/asset.html#/item/sol", { waitUntil: "networkidle0" });
    await sleep(500);
    check("#/item/sol opens Solana", (await text(page, ".asset__title")) === "Solana");
    await page.goto(WEB + "/asset.html#/item/xrp", { waitUntil: "networkidle0" });
    await sleep(500);
    check("a coin that is not held has an empty position", (await text(page, ".position__value")).includes("do not hold"), await text(page, ".position__value"));
    await page.goto(WEB + "/asset.html#/item/nope", { waitUntil: "networkidle0" });
    await sleep(500);
    check("an unknown coin shows 'Coin not found'", (await text(page, ".state__title")) === "Coin not found");
    await page.goto(WEB + "/asset.html#/nowhere", { waitUntil: "networkidle0" });
    await sleep(300);
    check("an unknown route shows 'Page not found'", (await text(page, ".state__title")) === "Page not found");
    await page.goto(WEB + "/asset.html#/item/btc/trade?type=sell", { waitUntil: "networkidle0" });
    await sleep(900);
    check("#/item/btc/trade?type=sell selects Sell", (await page.$eval("#trade-sell", (el) => el.checked)) === true);
    check("and puts the cursor into the quantity field", (await page.evaluate(() => document.activeElement.id)) === "trade-qty");
    await page.goto(WEB + "/asset.html?id=eth", { waitUntil: "networkidle0" });
    await sleep(500);
    check("the old address asset.html?id=eth still works", (await text(page, ".asset__title")) === "Ethereum");

    check("no script errors", page.errors.length === 0, page.errors.join("; "));
    await page.close();
  },

  async dashboard(browser) {
    console.log("dashboard");
    const held = (await (await fetch(`${API}/coins?amount_gte=0.000001&_sort=value&_order=desc&_limit=100`)).json());
    const total = held.reduce((sum, coin) => sum + coin.value, 0);
    const usd = (n) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const page = await open(browser, "/index.html");
    await sleep(600);
    check("the balance is the sum of the positions in the API", (await text(page, '[data-slot="balance-value"]')) === usd(total), `${await text(page, '[data-slot="balance-value"]')} vs ${usd(total)}`);
    check("greeting uses the name from the profile", /^Good (morning|afternoon|evening), Valerii$/.test(await text(page, '[data-slot="greeting"]')), await text(page, '[data-slot="greeting"]'));
    check("the holdings table shows the 5 biggest positions", (await count(page, ".holdings .asset-row")) === 5);
    const names = await waitForRows(page, ".holdings .asset-row__name", (r) => r.length === 5);
    check("the biggest position comes first", names[0] === held[0].name, names[0]);
    check("the donut has a slice per legend item", (await count(page, ".donut__slice")) === (await count(page, ".legend__item")) && (await count(page, ".legend__item")) === 4);
    check("the allocation says how many assets there are", (await text(page, ".allocation__count")) === String(held.length));
    check("4 KPI cards", (await count(page, ".kpis__item")) === 4);
    const dates = await page.$$eval(".tx-list .tx__date", (els) => els.map((el) => el.getAttribute("datetime")));
    check("5 recent transactions, newest first", dates.length === 5 && dates.every((d, i) => i === 0 || dates[i - 1] >= d), dates.join());
    const watched = (await (await fetch(`${API}/coins?watched=true&_limit=1`)).headers.get("x-total-count"));
    check("the watchlist matches the starred coins of the API", (await count(page, ".watchlist .coin-card")) === Number(watched), `${await count(page, ".watchlist .coin-card")} vs ${watched}`);

    await page.click('label[for="balance-period-1w"]');
    await sleep(200);
    check("the period is kept in the URL", url(page).searchParams.get("period") === "1w");
    check("the chart caption follows the period", (await text(page, '[data-slot="chart-caption"]')) === "Portfolio value, last 7 days");

    // unwatch a coin on the dashboard: optimistic, then the list is read again
    const cards = await count(page, ".watchlist .coin-card");
    await page.click(".watchlist .coin-card__watch");
    await sleep(1500);
    check("the starred coin leaves the watchlist", (await count(page, ".watchlist .coin-card")) === cards - 1, `${cards} -> ${await count(page, ".watchlist .coin-card")}`);
    const now = await (await fetch(`${API}/coins?watched=true&_limit=1`)).headers.get("x-total-count");
    check("and the API knows about it", Number(now) === Number(watched) - 1);
    check("no script errors", page.errors.length === 0, page.errors.join("; "));
    await page.close();
  },

  async states(browser) {
    console.log("loading, error and retry states");
    // 1. the API does not answer at all
    let blocked = true;
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.setRequestInterception(true);
    page.on("request", (request) => (blocked && request.url().startsWith(API) ? request.abort("failed") : request.continue()));
    await page.goto(WEB + "/assets.html", { waitUntil: "networkidle0", timeout: 90000 });
    // a lost GET is tried again twice (0.8 s and 1.6 s later) before the error is shown
    await page.waitForSelector(".asset-table .state--error", { timeout: 15000 }).catch(() => null);
    check("assets: a failed request shows an error with a retry button", (await count(page, ".asset-table .state--error")) === 1 && (await count(page, '.asset-table [data-action="retry"]')) === 1);
    check("the message is readable", (await text(page, ".state__text")).includes("Network error"));
    blocked = false;
    await page.click('.asset-table [data-action="retry"]');
    const rows = await waitForRows(page, ".asset-row__name", (r) => r.length === 10);
    check("Retry loads the list once the API is back", rows.length === 10);
    await page.close();

    // 2. a slow API: skeletons are visible, then replaced
    const slow = await browser.newPage();
    await slow.setViewport({ width: 1280, height: 900 });
    await slow.setRequestInterception(true);
    slow.on("request", (request) => (request.url().startsWith(API) && request.method() === "GET" ? setTimeout(() => request.continue(), 900) : request.continue()));
    await slow.goto(WEB + "/index.html", { waitUntil: "domcontentloaded" });
    await sleep(500);
    check("dashboard: skeletons while the data is on its way", (await count(slow, ".skeleton")) > 3);
    check("the table is marked aria-busy while loading", (await slow.$eval(".holdings .asset-table", (el) => el.getAttribute("aria-busy"))) === "true");
    await sleep(3500);
    check("skeletons are gone when the data has arrived", (await count(slow, ".skeleton")) === 0);
    check("aria-busy is cleared", (await slow.$eval(".holdings .asset-table", (el) => el.getAttribute("aria-busy"))) === "false");
    await slow.close();

    // 3. the cache: the second visit of the same list does not go to the network again
    const cached = await browser.newPage();
    await cached.setViewport({ width: 1280, height: 900 });
    let requests = 0;
    cached.on("request", (request) => request.url().startsWith(API) && request.method() === "GET" && (requests += 1));
    await cached.goto(WEB + "/assets.html", { waitUntil: "networkidle0" });
    const first = requests;
    await cached.click('label[for="filter-gainers"]');
    await waitForRows(cached, ".asset-row__name", (r) => r.length === 10);
    const afterFilter = requests;
    await cached.click('label[for="filter-all"]');
    await waitForRows(cached, ".asset-row__name", (r) => r[0] === "Bitcoin");
    const afterBack = requests;
    check("a new filter goes to the API", afterFilter > first);
    check("the same list again comes from the cache (no list request)", afterBack - afterFilter <= 0, `${afterBack - afterFilter} extra requests`);
    await cached.close();
  },

  async profile(browser) {
    console.log("profile page");
    const page = await open(browser, "/profile.html");
    await sleep(500);
    check("the form is filled from the API", (await page.$eval("#first-name", (el) => el.value)) === "Valerii" && (await page.$eval("#email", (el) => el.value)) === "valera@coinfolio.app");
    check("the card shows the name and the counters", (await text(page, '[data-slot="name"]')) === "Valerii Povzun" && (await text(page, '[data-slot="stat-assets"]')) === "7");
    check("the transactions counter is read from X-Total-Count", Number(await text(page, '[data-slot="stat-transactions"]')) >= 48);
    check("two wallets are listed", (await count(page, ".wallets__item")) >= 2);
    check("the switches follow the settings", (await page.$eval("#priceAlerts", (el) => el.checked)) === true && (await page.$eval("#productNews", (el) => el.checked)) === false);

    // validation
    await fill(page, "#first-name", "");
    await fill(page, "#email", "nope");
    await fill(page, "#username", "ab");
    await page.click('.profile-page__actions [type="submit"]');
    check("an empty name is refused", (await text(page, '[data-error-for="firstName"]')) === "This field is required.");
    check("a wrong e-mail is refused", (await text(page, '[data-error-for="email"]')) === "Please enter a valid value.", await text(page, '[data-error-for="email"]'));
    check("a short username is refused", (await text(page, '[data-error-for="username"]')).length > 0, await text(page, '[data-error-for="username"]'));
    check("the focus goes to the first wrong field", (await page.evaluate(() => document.activeElement.id)) === "first-name");

    // Cancel puts the saved values back
    await page.click('.profile-page__actions [type="reset"]');
    await sleep(200);
    check("Cancel restores the values of the API", (await page.$eval("#first-name", (el) => el.value)) === "Valerii" && (await text(page, '[data-error-for="firstName"]')) === "");

    // a valid save goes to the API
    await fill(page, "#first-name", "Valeriy");
    await page.click("label[for=productNews]");
    await page.click('.profile-page__actions [type="submit"]');
    await sleep(1200);
    const saved = await (await fetch(`${API}/profile`)).json();
    check("PATCH /profile stored the name and the switch", saved.firstName === "Valeriy" && saved.productNews === true, JSON.stringify([saved.firstName, saved.productNews]));
    check("the card shows the new name", (await text(page, '[data-slot="name"]')) === "Valeriy Povzun");
    check("the user is told that it is saved", (await text(page, ".settings__status")) === "Settings saved.", await text(page, ".settings__status"));
    await fetch(`${API}/profile`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ firstName: "Valerii", productNews: false }) });

    // the server validates as well, whatever the browser says
    const refused = await fetch(`${API}/profile`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "x", role: "admin" }) });
    check("the API answers 422 to a bad body", refused.status === 422);
    const forbidden = await fetch(`${API}/coins/btc`, { method: "DELETE" });
    check("the API refuses DELETE", forbidden.status === 405);

    // a draft survives a reload
    await page.reload({ waitUntil: "networkidle0" });
    await sleep(500);
    await fill(page, "#last-name", "Draftov");
    await page.reload({ waitUntil: "networkidle0" });
    await sleep(700);
    check("an unsaved change comes back after a reload (draft)", (await page.$eval("#last-name", (el) => el.value)) === "Draftov");
    await page.click('.profile-page__actions [type="reset"]');

    // wallets
    const wallets = await count(page, ".wallets__item");
    await page.click("#connect-wallet");
    const grown = await waitForRows(page, ".wallets__item", (r) => r.length === wallets + 1);
    check("Connect wallet adds a wallet (POST /wallets)", grown.length === wallets + 1);
    check("no script errors", page.errors.length === 0, page.errors.join("; "));
    await page.close();
  },
};

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(scenarios);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
try {
  for (const name of names) {
    if (!scenarios[name]) {
      console.log(`unknown scenario: ${name}`);
      process.exitCode = 1;
      continue;
    }
    await scenarios[name](browser);
  }
} finally {
  await browser.close();
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed (api ${API})`);
process.exitCode = failed.length ? 1 : process.exitCode;
