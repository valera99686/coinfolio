import { CATEGORIES, DEFAULT_ORDER, FILTERS } from "../services/CoinService.js";
import { coinService, marketService } from "../services/index.js";
import { ListView } from "../views/ListView.js";
import { Paginator } from "../components/Paginator.js";
import { toggleWatch } from "../components/watch.js";
import { showToast } from "../components/Toast.js";
import { HashRouter } from "../router/HashRouter.js";
import { createQueryState } from "../utils/queryState.js";
import { $, $$, debounce, html, render } from "../utils/dom.js";
import { formatCompact } from "../utils/format.js";
import { t } from "../i18n.js";
import { PAGE_SIZE, SEARCH_DEBOUNCE } from "../config.js";
import { assetRow, assetSkeleton } from "../views/templates/coins.js";
import { stateBlock, statCard, statSkeleton } from "../views/templates/common.js";
import { downloadCsv } from "../utils/csv.js";

const SORTS = Object.keys(DEFAULT_ORDER);

const queries = createQueryState(
  { q: "", filter: "all", category: "", sort: "marketCap", order: "desc", page: 1 },
  {
    numeric: ["page"],
    allowed: { filter: Object.keys(FILTERS), category: ["", ...CATEGORIES], sort: SORTS, order: ["asc", "desc"] },
  },
);

/** Assets page: the list of coins from the API with search, filter, sort and pagination kept in the URL. */
export function initAssetsPage() {
  const page = $(".assets-page");
  const form = $(".filters", page);
  const searchInput = $("#asset-search");
  const sortSelect = $("#asset-sort");
  const categorySelect = $("#asset-category");
  const table = $(".asset-table", page);
  const marketList = $(".market__list", page);
  const lead = $(".page-header__lead", page);

  let state = queries.read();
  let controller = null;
  let portfolioTotal = 0;
  let firstLoad = true;

  const list = new ListView($(".asset-table__body", table), {
    tag: "tr",
    columns: 8,
    busy: table,
    renderItem: (coin) => assetRow(coin, { share: portfolioTotal ? (coin.value / portfolioTotal) * 100 : 0 }),
    renderSkeleton: assetSkeleton,
    onRetry: () => load(),
  });

  const paginator = new Paginator($(".pagination", page), {
    onChange: (next) => update({ page: next }),
    hrefFor: (next) => queries.href({ ...state, page: next }),
  });

  categorySelect.innerHTML = [`<option value="">${t("filters.categoryAll")}</option>`, ...CATEGORIES.map((name) => `<option value="${name}">${name}</option>`)].join("");

  /** The controls show the state of the URL (after a reload, a shared link or the Back button). */
  function syncControls() {
    searchInput.value = state.q;
    form.elements.filter.value = state.filter;
    sortSelect.value = state.sort;
    categorySelect.value = state.category;
    $$("[data-sort]", table).forEach((button) => {
      const th = button.closest("th");
      th.setAttribute("aria-sort", state.sort === button.dataset.sort ? (state.order === "asc" ? "ascending" : "descending") : "none");
    });
  }

  /** Any change of a filter starts again from the first page; only the pager keeps the page. */
  function update(changes, { replace = false } = {}) {
    state = { ...state, page: 1, ...changes };
    queries.write(state, { replace });
    syncControls();
    load();
  }

  async function load() {
    controller?.abort();
    const current = new AbortController();
    controller = current;
    // A cached answer arrives at once; the skeleton is only worth showing when the wait is noticeable.
    const skeleton = setTimeout(() => list.renderLoading(PAGE_SIZE), firstLoad ? 0 : 150);
    try {
      const [result, held] = await Promise.all([
        coinService.list({ ...state, limit: PAGE_SIZE }, { signal: current.signal }),
        coinService.holdings({ signal: current.signal }).catch((error) => (error.canceled ? Promise.reject(error) : null)),
      ]);
      if (current.signal.aborted) {
        return;
      }
      clearTimeout(skeleton);
      firstLoad = false;
      portfolioTotal = held ? held.items.reduce((sum, coin) => sum + coin.value, 0) : 0;
      const pages = Paginator.pages(result.total, PAGE_SIZE);
      if (!result.items.length && result.total > 0 && state.page > pages) {
        state = { ...state, page: pages };
        queries.write(state, { replace: true });
        load();
        return;
      }
      list.render(result.items);
      paginator.render({ page: state.page, total: result.total, limit: PAGE_SIZE });
      lead.textContent = t("assets.leadCount", { count: result.total });
      document.title = t("title.assets");
    } catch (error) {
      clearTimeout(skeleton);
      if (error.canceled) {
        return;
      }
      list.renderError(error.message);
      paginator.render({ page: 1, total: 0, limit: PAGE_SIZE });
    }
  }

  async function loadMarket() {
    render(marketList, html`${[0, 1, 2].map(() => statSkeleton("market__item"))}`);
    try {
      const m = await marketService.get();
      render(
        marketList,
        html`${statCard({ label: t("market.cap"), icon: "globe", value: "$" + formatCompact(m.cap), change: m.capChange, note: t("market.capNote"), cls: "market__item" })}
        ${statCard({ label: t("market.volume"), icon: "chart", value: "$" + formatCompact(m.volume), change: m.volumeChange, note: t("kpi.vsYesterday"), cls: "market__item" })}
        ${statCard({ label: t("market.dominance"), icon: "assets", value: `${m.dominance}%`, change: m.dominanceChange, note: t("market.dominanceNote"), cls: "market__item" })}`,
      );
    } catch (error) {
      render(marketList, stateBlock({ kind: "error", title: t("state.errorTitle"), text: error.message }));
    }
  }

  // --- events --------------------------------------------------------------------------------------------
  // The request goes out 300 ms after the last key press; the one that is still running is cancelled.
  const search = debounce((value) => update({ q: value.trim() }), SEARCH_DEBOUNCE);
  searchInput.addEventListener("input", (event) => search(event.target.value));

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    search.cancel();
    update({ q: searchInput.value.trim() });
  });

  form.addEventListener("change", (event) => {
    const { name, value } = event.target;
    if (name === "filter" || name === "category") {
      update({ [name]: value });
    } else if (name === "sort") {
      update({ sort: value, order: DEFAULT_ORDER[value] });
    }
  });

  // Column headers: the same sort field again flips the direction.
  table.addEventListener("click", (event) => {
    const button = event.target.closest("[data-sort]");
    if (button) {
      const sort = button.dataset.sort;
      update({ sort, order: state.sort === sort ? (state.order === "asc" ? "desc" : "asc") : DEFAULT_ORDER[sort] });
    }
  });

  table.addEventListener("click", async (event) => {
    const button = event.target.closest('[data-action="watch"]');
    if (!button) {
      return;
    }
    const row = button.closest("[data-asset-id]");
    const ok = await toggleWatch(button, { id: row.dataset.assetId, name: $(".asset-row__name", row).textContent });
    if (ok && state.filter === "watchlist") {
      load(); // the coin no longer belongs to the list that is on the screen
    }
  });

  $("#export-csv")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const { items } = await coinService.list({ ...state, page: 1, limit: 100 });
      downloadCsv(
        "coinfolio-assets.csv",
        ["rank", "symbol", "name", "category", "price_usd", "change_24h_pct", "market_cap_usd", "amount", "value_usd"],
        items.map((c) => [c.rank, c.symbol, c.name, c.category, c.price, c.change24h, c.marketCap, c.amount, c.value]),
      );
    } catch (error) {
      showToast(error.message, { tone: "error" });
    } finally {
      button.disabled = false;
    }
  });

  window.addEventListener("popstate", () => {
    state = queries.read();
    syncControls();
    load();
  });

  // --- routes: #/list is this page, a coin address belongs to the details page ----------------------------
  new HashRouter(
    [
      { path: "/list", handler: () => undefined },
      { path: "/item/:id", handler: (id) => window.location.replace(`./asset.html#/item/${encodeURIComponent(id)}`) },
    ],
    {
      notFound: (path) => {
        render($(".asset-list", page), stateBlock({ kind: "empty", title: t("route.notFoundTitle"), text: t("route.notFoundText", { path }), action: t("route.backToAssets"), href: "./assets.html" }));
      },
    },
  ).start();

  syncControls();
  load();
  loadMarket();
}
