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

async function open(browser, path, { width = 1280, height = 900, offline = false } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height });
  page.errors = [];
  page.on("pageerror", (error) => page.errors.push(error.message));
  await page.goto(WEB + path, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(400);
  return page;
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
