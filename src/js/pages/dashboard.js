import dayjs from "dayjs";
import { coinService, portfolioService, profileService, transactionService } from "../services/index.js";
import { ListView } from "../views/ListView.js";
import { toggleWatch } from "../components/watch.js";
import { showToast } from "../components/Toast.js";
import { createQueryState } from "../utils/queryState.js";
import { $, html, render } from "../utils/dom.js";
import { formatSignedUsd, formatUsd } from "../utils/format.js";
import { summarize } from "../utils/portfolio.js";
import { downloadCsv } from "../utils/csv.js";
import { t } from "../i18n.js";
import { chartRows, donut, formatTick, lineChart } from "../views/charts.js";
import { assetRow, assetSkeleton, coinCard, txItem, txSkeleton } from "../views/templates/coins.js";
import { badge, statCard, statSkeleton, stateBlock } from "../views/templates/common.js";
import { chartDataTable } from "../views/templates/asset.js";

const PERIODS = ["1d", "1w", "1m", "1y", "all"];
const RANGE_KEY = { "1d": "24h", "1w": "7d", "1m": "1m", "1y": "1y", all: "all" };
const queries = createQueryState({ period: "1m" }, { allowed: { period: PERIODS } });

/** Dashboard: everything on it is calculated from the coins, transactions and charts of the API. */
class DashboardPage {
  constructor() {
    this.state = queries.read();
    this.summary = null;
    this.series = null;
    this.wide = window.matchMedia("(min-width: 768px)");
    this.sections = {
      balance: $(".balance"),
      allocation: $(".allocation"),
      kpis: $('[data-slot="kpis"]'),
    };
  }

  start() {
    this.holdings = new ListView($(".holdings .asset-table__body"), {
      tag: "tr",
      columns: 8,
      busy: $(".holdings .asset-table"),
      renderItem: (coin, index) => assetRow(coin, { rank: index + 1, share: this.summary?.total ? (coin.value / this.summary.total) * 100 : 0, mod: "holding" }),
      renderSkeleton: assetSkeleton,
      onRetry: () => this.loadPortfolio(),
    });
    this.recent = new ListView($(".tx-list"), { tag: "li", renderItem: (tx) => txItem(tx, tx.coin), renderSkeleton: txSkeleton, onRetry: () => this.loadRecent() });
    this.watchlist = new ListView($(".watchlist__list"), {
      tag: "li",
      renderItem: (coin) => html`<li class="watchlist__item">${coinCard(coin)}</li>`,
      renderSkeleton: () => html`<li class="watchlist__item" aria-hidden="true"><span class="skeleton skeleton--lg"></span></li>`,
      onRetry: () => this.loadWatchlist(),
    });

    $(".balance").addEventListener("change", (event) => {
      if (event.target.name === "balance-period") {
        this.state = { period: event.target.value };
        queries.write(this.state);
        this.renderChart();
      }
    });
    document.addEventListener("click", (event) => this.handleClick(event));
    this.wide.addEventListener("change", () => this.renderChart());
    window.addEventListener("popstate", () => {
      this.state = queries.read();
      $(`#balance-period-${this.state.period}`).checked = true;
      this.renderChart();
    });
    $(`#balance-period-${this.state.period}`).checked = true;

    this.loadGreeting();
    this.loadPortfolio();
    this.loadRecent();
    this.loadWatchlist();
  }

  async handleClick(event) {
    const watch = event.target.closest('[data-action="watch"]');
    if (watch) {
      const card = watch.closest("[data-asset-id]");
      const name = card.querySelector(".coin-card__link, .asset-row__name").textContent;
      if (await toggleWatch(watch, { id: card.dataset.assetId, name })) {
        // the watchlist is a list of the starred coins: it is read again
        this.loadWatchlist();
      }
      return;
    }
    if (event.target.closest("#export-transactions")) {
      this.exportTransactions(event.target.closest("button"));
      return;
    }
    if (event.target.closest('.balance [data-action="retry"], .allocation [data-action="retry"], .kpis [data-action="retry"]')) {
      this.loadPortfolio();
    }
  }

  async loadGreeting() {
    const slot = $('[data-slot="greeting"]');
    try {
      const profile = await profileService.get();
      const hour = dayjs().hour();
      const part = hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";
      slot.textContent = t(`dash.greeting${part}`, { name: profile.firstName });
    } catch {
      slot.textContent = "";
    }
  }

  // --- balance, allocation, KPIs and holdings all come from the coins in the portfolio -------------------
  async loadPortfolio() {
    const { balance, allocation, kpis } = this.sections;
    balance.setAttribute("aria-busy", "true");
    allocation.setAttribute("aria-busy", "true");
    kpis.setAttribute("aria-busy", "true");
    $('[data-slot="balance-value"]').innerHTML = '<span class="skeleton skeleton--value"></span>';
    $('[data-slot="balance-change"]').textContent = "";
    render(kpis, html`${[0, 1, 2, 3].map(() => statSkeleton("kpis__item"))}`);
    this.holdings.renderLoading(5);

    try {
      const [{ items }, portfolio] = await Promise.all([coinService.holdings(), portfolioService.get().catch(() => null)]);
      this.summary = summarize(items);
      this.series = portfolio;
      this.renderBalance();
      this.renderAllocation();
      this.renderKpis();
      if (items.length) {
        this.holdings.render(items.slice(0, 5));
      } else {
        this.holdings.renderEmpty(t("dash.noHoldingsTitle"), t("dash.noHoldingsText"));
      }
      $('[data-slot="holdings-subtitle"]').textContent = t("dash.holdingsSubN", { shown: Math.min(5, items.length), total: items.length });
      this.renderChart();
    } catch (error) {
      const failed = stateBlock({ kind: "error", title: t("state.errorTitle"), text: error.message, action: t("state.retry") });
      $('[data-slot="balance-value"]').textContent = "—";
      render($('[data-slot="chart"]'), failed);
      render($('[data-slot="allocation"]'), failed);
      render(kpis, failed);
      this.holdings.renderError(error.message);
    } finally {
      balance.setAttribute("aria-busy", "false");
      allocation.setAttribute("aria-busy", "false");
      kpis.setAttribute("aria-busy", "false");
    }
  }

  renderBalance() {
    const { total, dayChange, dayChangePct } = this.summary;
    render($('[data-slot="balance-value"]'), html`<data value="${total.toFixed(2)}">${formatUsd(total)}</data>`);
    render($('[data-slot="balance-change"]'), html`${badge(dayChangePct)}<data value="${dayChange}">${formatSignedUsd(dayChange)}</data><span>${t("dash.today")}</span>`);
  }

  renderChart() {
    const slot = $('[data-slot="chart"]');
    const values = this.series?.series?.[this.state.period];
    if (!values) {
      render(slot, this.summary ? stateBlock({ kind: "empty", title: t("state.errorTitle"), text: t("state.emptyText") }) : "");
      return;
    }
    const wide = this.wide.matches;
    const caption = t("dash.chartCaptionN", { range: t("chart.range." + RANGE_KEY[this.state.period]) });
    render(slot, lineChart(values, { period: this.state.period, asOf: this.series.asOf, ratio: wide ? [744, 220] : [296, 120], labels: wide ? 7 : 3, color: "gold", label: "chart.altValue" }));
    render($('[data-slot="chart-data"]'), chartDataTable(chartRows(values, { period: this.state.period, asOf: this.series.asOf }).map((row) => ({ ...row, text: formatTick(row.value) })), caption));
    $('[data-slot="chart-caption"]').textContent = caption;
  }

  renderAllocation() {
    const { allocation, count } = this.summary;
    const label = (slice) => (slice.id === "others" ? t("dash.others", { count: slice.count }) : slice.label);
    const list = allocation.map((slice) => `${label(slice)} ${slice.share.toFixed(1)}%`).join(", ");
    $('[data-slot="allocation-subtitle"]').textContent = t("dash.assetsCountN", { count });
    render(
      $('[data-slot="allocation"]'),
      html`<figure class="allocation__chart">
          ${donut(allocation, { cls: "allocation__donut", label: t("dash.donutAlt", { list }) })}
          <p class="allocation__total" aria-hidden="true"><strong class="allocation__count">${count}</strong><span class="allocation__unit">${t("dash.assetsUnit")}</span></p>
          <figcaption class="allocation__caption">${t("dash.donutCaption")}</figcaption>
        </figure>
        <ul class="legend">${allocation.map(
          (slice) => html`<li class="legend__item legend__item--${slice.id}">
            <span class="legend__label">${label(slice)}</span>
            <data class="legend__value" value="${slice.value}">${formatUsd(slice.value)}</data>
            <data class="legend__share" value="${slice.share.toFixed(1)}">${slice.share.toFixed(1)}%</data>
          </li>`,
        )}</ul>`,
    );
  }

  renderKpis() {
    const { profit, profitPct, dayChange, dayChangePct, best, worst } = this.summary;
    const cards = [
      statCard({ label: t("kpi.profit"), icon: "wallet", value: formatSignedUsd(profit), change: profitPct, note: t("kpi.allTime"), cls: "kpis__item" }),
      statCard({ label: t("kpi.change"), icon: "chart", value: formatSignedUsd(dayChange), change: dayChangePct, note: t("kpi.vsYesterday"), cls: "kpis__item" }),
    ];
    if (best) {
      cards.push(statCard({ label: t("kpi.best"), icon: "arrow-up-right", value: best.name, change: best.change24h, note: `${best.symbol} · 24h`, cls: "kpis__item" }));
      cards.push(statCard({ label: t("kpi.worst"), icon: "arrow-down-right", value: worst.name, change: worst.change24h, note: `${worst.symbol} · 24h`, cls: "kpis__item" }));
    }
    render(this.sections.kpis, html`${cards}`);
  }

  // --- recent transactions and the watchlist are lists of their own ------------------------------------------
  async loadRecent() {
    this.recent.renderLoading(5);
    try {
      const { items } = await transactionService.recent(5);
      this.recent.render(items);
    } catch (error) {
      this.recent.renderError(error.message);
    }
  }

  async loadWatchlist() {
    this.watchlist.renderLoading(4);
    try {
      const { items } = await coinService.watchlist();
      if (items.length) {
        this.watchlist.render(items);
      } else {
        this.watchlist.renderEmpty(t("dash.watchEmptyTitle"), t("dash.watchEmptyText"));
      }
    } catch (error) {
      this.watchlist.renderError(error.message);
    }
  }

  async exportTransactions(button) {
    button.disabled = true;
    try {
      const { items } = await transactionService.getList({ _sort: "date", _order: "desc", _limit: 500, _expand: "coin" });
      downloadCsv(
        "coinfolio-transactions.csv",
        ["date", "type", "symbol", "amount", "price_usd", "fee_usd", "total_usd", "note"],
        items.map((tx) => [tx.date, tx.type, tx.coin?.symbol ?? tx.coinId, tx.amount, tx.price, tx.fee, Math.round(tx.amount * tx.price * 100) / 100, tx.note]),
      );
    } catch (error) {
      showToast(error.message, { tone: "error" });
    } finally {
      button.disabled = false;
    }
  }
}

export function initDashboardPage() {
  new DashboardPage().start();
}
