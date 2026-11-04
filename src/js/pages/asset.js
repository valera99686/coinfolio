import dayjs from "dayjs";
import { chartService, coinService, detailsService, marketService, transactionService } from "../services/index.js";
import { FormView } from "../views/FormView.js";
import { ListView } from "../views/ListView.js";
import { HashRouter } from "../router/HashRouter.js";
import { createQueryState } from "../utils/queryState.js";
import { $, $$, html, render, replaceNode } from "../utils/dom.js";
import { formatAmount, formatQty, formatUsd, roundTo, toInputDateTime } from "../utils/format.js";
import { feeOf, netAmount } from "../utils/portfolio.js";
import { toggleWatch } from "../components/watch.js";
import { showToast } from "../components/Toast.js";
import { t } from "../i18n.js";
import { chartRows, formatTick, lineChart } from "../views/charts.js";
import { historyRow, historySkeleton } from "../views/templates/coins.js";
import { stateBlock } from "../views/templates/common.js";
import { PERIODS, aboutPanel, assetHeader, assetLoading, chartDataTable, historyPanel, positionPanel, pricePanel, statsPanel, tradePanel } from "../views/templates/asset.js";

const queries = createQueryState({ period: "7d", tx: "" }, { allowed: { period: PERIODS, tx: ["", "buy", "sell"] } });

/** Asset details: one coin from the API, addressed as asset.html#/item/<id>. */
class AssetPage {
  constructor() {
    this.root = $(".asset");
    this.stateBox = $(".asset-page__state");
    this.crumb = $("[data-crumb]");
    this.state = queries.read();
    this.coinId = null;
    this.data = null;
    this.controller = null;
    this.form = null;
    this.history = null;
    this.wide = window.matchMedia("(min-width: 768px)");
  }

  start() {
    // asset.html?id=btc (the old address) and an empty hash both lead to a coin
    const legacy = new URLSearchParams(window.location.search).get("id");
    if (!window.location.hash) {
      const target = legacy ? `/item/${encodeURIComponent(legacy)}` : "/item/btc";
      window.history.replaceState(null, "", `${window.location.pathname}${queries.toSearch(this.state)}#${target}`);
    }

    this.root.addEventListener("click", (event) => this.handleClick(event));
    this.root.addEventListener("change", (event) => this.handleChange(event));
    this.root.addEventListener("input", (event) => this.handleInput(event));
    this.stateBox.addEventListener("click", (event) => event.target.closest('[data-action="retry"]') && this.load());
    this.wide.addEventListener("change", () => this.renderChart());
    window.addEventListener("popstate", () => this.handlePopState());

    new HashRouter(
      [
        { path: "/item/:id", handler: (id) => this.open(id) },
        { path: "/item/:id/trade", handler: (id) => this.open(id, { trade: true }) },
        { path: "/list", handler: () => window.location.replace("./assets.html") },
      ],
      {
        fallback: "/item/btc",
        notFound: (path) => this.showState(stateBlock({ kind: "empty", title: t("route.notFoundTitle"), text: t("route.notFoundText", { path }), action: t("route.backToAssets"), href: "./assets.html" })),
      },
    ).start();
  }

  // --- routing and loading -------------------------------------------------------------------------------
  async open(id, { trade = false } = {}) {
    const type = new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("type");
    if (this.coinId === id && this.data) {
      if (trade) {
        this.focusTrade(type);
      }
      return;
    }
    this.coinId = id;
    await this.load();
    if (trade && this.data) {
      this.focusTrade(type);
    }
  }

  showState(fragment) {
    this.root.hidden = true;
    this.stateBox.hidden = false;
    render(this.stateBox, fragment);
    this.crumb.textContent = "—";
    this.data = null;
  }

  async load() {
    this.controller?.abort();
    const current = new AbortController();
    this.controller = current;
    const { signal } = current;
    const id = this.coinId;
    this.root.hidden = false;
    this.stateBox.hidden = true;
    this.root.setAttribute("aria-busy", "true");
    render(this.root, assetLoading());
    try {
      const [coin, details, chart, market, holdings, all] = await Promise.all([
        coinService.getById(id, {}, { signal }),
        detailsService.getById(id, {}, { signal }).catch((error) => (error.canceled ? Promise.reject(error) : null)),
        chartService.getById(id, {}, { signal }).catch((error) => (error.canceled ? Promise.reject(error) : null)),
        marketService.get({ signal }).catch((error) => (error.canceled ? Promise.reject(error) : null)),
        coinService.holdings({ signal }).catch((error) => (error.canceled ? Promise.reject(error) : null)),
        transactionService.list({ coinId: id, limit: 100 }, { signal }).catch((error) => (error.canceled ? Promise.reject(error) : null)),
      ]);
      if (signal.aborted) {
        return;
      }
      this.data = { coin, details, chart, market, holdings, all };
      this.render();
    } catch (error) {
      if (error.canceled) {
        return;
      }
      this.data = null;
      this.showState(
        error.status === 404
          ? stateBlock({ kind: "empty", title: t("asset.notFoundTitle"), text: t("asset.notFoundText", { id }), action: t("route.backToAssets"), href: "./assets.html" })
          : stateBlock({ kind: "error", title: t("state.errorTitle"), text: error.message, action: t("state.retry") }),
      );
    }
  }

  // --- rendering ---------------------------------------------------------------------------------------
  portfolioShare() {
    const { coin, holdings } = this.data;
    const total = holdings ? holdings.items.reduce((sum, item) => sum + item.value, 0) : 0;
    return total ? (coin.value / total) * 100 : 0;
  }

  historySummary() {
    const { coin, all } = this.data;
    if (!all) {
      return "";
    }
    return t("history.summaryCoin", { count: all.total, net: formatQty(netAmount(all.items), coin.price >= 100 ? 4 : 2), symbol: coin.symbol });
  }

  render() {
    const { coin, details, chart, market } = this.data;
    const dominance = market ? (coin.marketCap / market.cap) * 100 : null;
    const updated = chart ? dayjs(chart.asOf) : dayjs();
    const now = toInputDateTime();
    const type = new URLSearchParams(window.location.hash.split("?")[1] ?? "").get("type");

    render(
      this.root,
      html`${assetHeader(coin)}
        <div class="asset__main">${pricePanel(coin, this.state.period)}${statsPanel(coin, { dominance, updated: { iso: updated.format("YYYY-MM-DDTHH:mm"), text: updated.format("HH:mm") } })}${aboutPanel(coin, details)}</div>
        <div class="asset__side">${positionPanel(coin, this.portfolioShare())}${tradePanel(coin, { now, type: ["buy", "sell", "transfer"].includes(type) ? type : "buy" })}</div>
        ${historyPanel(coin, { tx: this.state.tx, summary: this.historySummary() })}`,
    );
    this.root.setAttribute("aria-busy", "false");
    this.crumb.textContent = coin.name;
    document.title = t("title.assetCoin", { name: coin.name, symbol: coin.symbol });
    $('meta[name="description"]')?.setAttribute("content", t("desc.assetCoin", { name: coin.name }));

    this.renderChart();
    this.mountForm();
    this.mountHistory();
  }

  renderChart() {
    const slot = $('[data-slot="chart"]', this.root);
    if (!slot || !this.data) {
      return;
    }
    const { coin, chart } = this.data;
    const series = chart?.series?.[this.state.period];
    if (!series) {
      render(slot, stateBlock({ kind: "empty", title: t("state.errorTitle"), text: t("state.emptyText") }));
      return;
    }
    const wide = this.wide.matches;
    const caption = t("chart.caption", { symbol: coin.symbol, range: t("chart.range." + this.state.period) });
    render(slot, lineChart(series, { period: this.state.period, asOf: chart.asOf, ratio: wide ? [744, 300] : [328, 180], labels: wide ? 7 : 3 }));
    render($('[data-slot="chart-data"]', this.root), chartDataTable(chartRows(series, { period: this.state.period, asOf: chart.asOf }).map((row) => ({ ...row, text: formatTick(row.value) })), caption));
    $('[data-slot="chart-caption"]', this.root).textContent = caption;
  }

  // --- history ---------------------------------------------------------------------------------------------
  mountHistory() {
    this.history = new ListView($('[data-slot="history-list"]', this.root), {
      tag: "tr",
      columns: 5,
      tableFrom: "md",
      busy: $(".history__table", this.root),
      renderItem: (tx) => historyRow(tx, this.data.coin),
      renderSkeleton: historySkeleton,
      onRetry: () => this.loadHistory(),
    });
    this.loadHistory();
  }

  async loadHistory() {
    const { coin } = this.data;
    const id = coin.id;
    this.history.renderLoading(3);
    try {
      const { items } = await transactionService.list({ coinId: id, type: this.state.tx, limit: 100 });
      if (this.coinId !== id) {
        return;
      }
      if (items.length) {
        this.history.render(items);
      } else {
        this.history.renderEmpty(t("history.emptyTitle"), t("history.emptyText", { symbol: coin.symbol }));
      }
    } catch (error) {
      this.history.renderError(error.message);
    }
  }

  syncTabs() {
    $$(".tabs__link", this.root).forEach((link) => {
      const active = link.dataset.tx === this.state.tx;
      link.classList.toggle("tabs__link--active", active);
      if (active) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  // --- the transaction form ---------------------------------------------------------------------------------
  selectedType() {
    return this.root.querySelector('input[name="type"]:checked')?.value ?? "buy";
  }

  mountForm() {
    const form = $("#trade-form", this.root);
    this.form = new FormView(form, {
      storageKey: `draft:transaction:${this.data.coin.id}`,
      rules: (field) => this.tradeRule(field),
      submit: (values) => this.addTransaction(values),
      onSuccess: (result) => this.afterSubmit(result),
    });
    if (this.form.restoreDraft() && form.elements.amount.value) {
      showToast(t("form.draftRestored"), { tone: "info", timeout: 3500 });
    }
    this.updateTrade();
  }

  /** Rules that HTML attributes cannot express. */
  tradeRule(field) {
    const { coin } = this.data;
    if (field.name === "amount" && this.selectedType() === "sell" && Number(field.value) > coin.amount) {
      return t("form.err.sellMax", { max: formatAmount(coin.amount, coin.price), symbol: coin.symbol });
    }
    if (field.name === "date" && dayjs(field.value).isAfter(dayjs().add(1, "minute"))) {
      return t("form.err.future");
    }
    return "";
  }

  /** Hint under the quantity field and the live fee and total. */
  updateTrade() {
    const form = $("#trade-form", this.root);
    const { coin } = this.data;
    const type = this.selectedType();
    const hints = {
      buy: t("form.qtyHintBuy", { symbol: coin.symbol }),
      sell: t("form.qtyHintSell", { amount: formatAmount(coin.amount, coin.price), symbol: coin.symbol }),
      transfer: t("form.qtyHintTransfer", { symbol: coin.symbol }),
    };
    $("#trade-qty-hint", form).textContent = hints[type];
    const amount = Number(form.elements.amount.value) || 0;
    const price = Number(form.elements.price.value) || 0;
    $("[data-fee]", form).textContent = formatUsd(feeOf(amount, price));
    $("[data-total]", form).textContent = formatUsd(roundTo(amount * price));
  }

  focusTrade(type) {
    if (!this.root.querySelector("#trade-form")) {
      return;
    }
    if (["buy", "sell", "transfer"].includes(type)) {
      this.root.querySelector(`#trade-${type}`).checked = true;
      this.updateTrade();
    }
    const section = $("#add-transaction", this.root);
    section.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    $("#trade-qty", this.root).focus({ preventScroll: true });
  }

  async addTransaction(values) {
    const { coin } = this.data;
    const payload = {
      coinId: coin.id,
      type: values.type,
      amount: Number(values.amount),
      price: Number(values.price),
      fee: feeOf(Number(values.amount), Number(values.price)),
      date: values.date,
      note: (values.note ?? "").trim(),
    };
    const created = await transactionService.create(payload);
    let positionFailed = false;
    try {
      await coinService.applyTransaction(coin, payload);
    } catch {
      positionFailed = true;
    }
    return { created, positionFailed };
  }

  async afterSubmit({ positionFailed }) {
    const form = $("#trade-form", this.root);
    showToast(positionFailed ? t("form.positionFailed") : t("form.saved"), { tone: positionFailed ? "error" : "success" });
    form.elements.amount.value = "";
    form.elements.note.value = "";
    this.form.clearErrors();
    await this.refresh();
    this.form.setStatus(t("form.saved"), "success");
    this.updateTrade();
  }

  /** After a transaction: the position, the "in portfolio" tag and the history are read from the API again. */
  async refresh() {
    const id = this.data.coin.id;
    try {
      const [coin, holdings, all] = await Promise.all([
        coinService.getById(id, {}, { fresh: true }),
        coinService.holdings({ fresh: true }).catch(() => this.data.holdings),
        transactionService.list({ coinId: id, limit: 100 }, { fresh: true }).catch(() => this.data.all),
      ]);
      this.data = { ...this.data, coin, holdings, all };
      replaceNode($(".asset__position", this.root), positionPanel(coin, this.portfolioShare()));
      replaceNode($(".asset__header", this.root), assetHeader(coin));
      $('[data-slot="history-summary"]', this.root).textContent = this.historySummary();
      await this.loadHistory();
    } catch (error) {
      showToast(error.message, { tone: "error" });
    }
  }

  // --- events ------------------------------------------------------------------------------------------------
  async handleClick(event) {
    const watch = event.target.closest('[data-action="watch"]');
    if (watch) {
      const { coin } = this.data;
      if (await toggleWatch(watch, { id: coin.id, name: coin.name })) {
        coin.watched = watch.getAttribute("aria-pressed") === "true";
      }
      return;
    }
    const tab = event.target.closest("a[data-tx]");
    if (tab) {
      event.preventDefault();
      this.state = { ...this.state, tx: tab.dataset.tx };
      queries.write(this.state);
      this.syncTabs();
      this.loadHistory();
    }
  }

  handleChange(event) {
    const { name, value } = event.target;
    if (name === "price-period") {
      this.state = { ...this.state, period: value };
      queries.write(this.state);
      this.renderChart();
    } else if (name === "type") {
      this.updateTrade();
      // the sell limit depends on the type, so a quantity that was already checked is checked again
      if (this.form?.touched.has("amount")) {
        this.form.validateField($("#trade-qty", this.root));
      }
    }
  }

  handleInput(event) {
    if (event.target.name === "amount" || event.target.name === "price") {
      this.updateTrade();
    }
  }

  handlePopState() {
    const next = queries.read();
    if (!this.data) {
      this.state = next;
      return;
    }
    const periodChanged = next.period !== this.state.period;
    const txChanged = next.tx !== this.state.tx;
    this.state = next;
    if (periodChanged) {
      const radio = $(`#price-period-${next.period}`, this.root);
      if (radio) {
        radio.checked = true;
      }
      this.renderChart();
    }
    if (txChanged) {
      this.syncTabs();
      this.loadHistory();
    }
  }
}

export function initAssetPage() {
  new AssetPage().start();
}
