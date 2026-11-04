import { html, icon } from "../../utils/dom.js";
import { formatAmount, formatCompact, formatPrice, formatRange, formatSignedPercent, formatSignedPrice, formatSignedUsd, formatUsd } from "../../utils/format.js";
import { t } from "../../i18n.js";
import { badge } from "./common.js";

export const PERIODS = ["1h", "24h", "7d", "1m", "1y", "all"];
export const TX_TYPES = ["buy", "sell", "transfer"];

const hostOf = (url) => new URL(url).hostname.replace(/^www\./, "");

export function assetHeader(coin) {
  const id = encodeURIComponent(coin.id);
  return html`<header class="asset__header">
    <img class="asset__logo" src="./img/coins/${coin.id}.svg" alt="" width="48" height="48">
    <h1 class="asset__title" itemprop="name">${coin.name}</h1>
    <ul class="tags asset__tags">
      <li class="tags__item"><abbr itemprop="currency" title="${coin.name}">${coin.symbol}</abbr></li>
      <li class="tags__item"><span>${t("detail.rank")}</span>${coin.rank}</li>
      ${coin.amount > 0 ? html`<li class="tags__item tags__item--accent">${t("detail.inPortfolio")}</li>` : ""}
    </ul>
    <div class="asset__actions">
      <button class="icon-button asset__watch" type="button" aria-pressed="${String(Boolean(coin.watched))}" data-action="watch">
        ${icon("star")}
        <span class="visually-hidden"><span>${t("asset.watch")}</span> ${coin.name}</span>
      </button>
      <a class="button button--secondary asset__alert" href="./profile.html#notifications">${icon("bell")}<span>${t("detail.alert")}</span></a>
      <a class="button button--secondary asset__action" href="#/item/${id}/trade?type=sell">${t("form.sell")}</a>
      <a class="button button--primary asset__action" href="#/item/${id}/trade?type=buy">${icon("plus")}<span>${t("detail.buyCoin", { symbol: coin.symbol })}</span></a>
    </div>
  </header>`;
}

export function periodSwitch(period) {
  return html`<fieldset class="segmented price__period">
    <legend class="segmented__legend visually-hidden">${t("chart.period")}</legend>
    ${PERIODS.map(
      (p) => html`<input class="segmented__input" type="radio" name="price-period" id="price-period-${p}" value="${p}"${p === period ? html` checked` : ""}>
      <label class="segmented__label" for="price-period-${p}">${t("period." + p)}</label>`,
    )}
  </fieldset>`;
}

export function pricePanel(coin, period) {
  const open = coin.price / (1 + coin.change24h / 100);
  return html`<section class="price card asset__price" aria-labelledby="price-title">
    <h2 class="price__title" id="price-title">${coin.symbol} / USD</h2>
    <p class="price__value" itemprop="currentExchangeRate" itemscope itemtype="https://schema.org/UnitPriceSpecification">
      <data itemprop="price" value="${coin.price}">${formatPrice(coin.price)}</data>
      <meta itemprop="priceCurrency" content="USD">
    </p>
    <p class="price__change">${badge(coin.change24h)}<data value="${coin.price - open}">${formatSignedPrice(coin.price - open)}</data><span>${t("dash.today")}</span></p>
    ${periodSwitch(period)}
    <figure class="chart price__chart">
      <div data-slot="chart"></div>
      <div data-slot="chart-data"></div>
      <figcaption class="chart__caption" data-slot="chart-caption"></figcaption>
    </figure>
  </section>`;
}

export function chartDataTable(rows, caption) {
  return html`<details class="chart__data">
    <summary class="chart__summary">${t("chart.data")}</summary>
    <table class="data-table">
      <caption class="data-table__caption">${caption}</caption>
      <thead><tr><th scope="col">${t("chart.date")}</th><th scope="col">${t("chart.value")}</th></tr></thead>
      <tbody>${rows.map((row) => html`<tr><th scope="row">${row.label}</th><td><data value="${row.value}">${row.text}</data></td></tr>`)}</tbody>
    </table>
  </details>`;
}

export function statsPanel(coin, { dominance, updated }) {
  const item = (label, value) => html`<div class="stats__item"><dt>${label}</dt><dd>${value}</dd></div>`;
  return html`<section class="stats card asset__stats" aria-labelledby="stats-title">
    <h2 class="stats__title" id="stats-title">${t("stats.title")}</h2>
    <p class="stats__updated"><span>${t("stats.updated")}</span> <time datetime="${updated.iso}">${updated.text}</time></p>
    <dl class="stats__list">
      ${item(t("stats.cap"), html`<data value="${coin.marketCap}">$${formatCompact(coin.marketCap)}</data>`)}
      ${item(t("stats.volume"), "$" + formatCompact(coin.volume24h))}
      ${item(t("stats.supply"), `${formatCompact(coin.supply)} ${coin.symbol}`)}
      ${item(t("stats.ath"), formatPrice(coin.ath))}
      ${item(t("stats.range"), formatRange(coin.low24h, coin.high24h))}
      ${item(t("stats.dominance"), dominance === null ? "—" : `${dominance.toFixed(1)}%`)}
    </dl>
  </section>`;
}

export function aboutPanel(coin, details) {
  return html`<section class="about card asset__about" aria-labelledby="about-title">
    <h2 class="about__title" id="about-title">${t("about.titleCoin", { name: coin.name })}</h2>
    <p class="about__text" itemprop="description">${details?.about ?? ""}</p>
    <ul class="about__links">
      ${details?.website ? html`<li class="about__link-item"><a class="link-button" href="${details.website}" rel="external noopener">${icon("globe")} ${hostOf(details.website)}</a></li>` : ""}
      ${details?.whitepaper ? html`<li class="about__link-item"><a class="link-button" href="${details.whitepaper}" rel="external noopener">${icon("download")}<span>${t("about.paper")}</span></a></li>` : ""}
    </ul>
  </section>`;
}

/** "Your position" card; `share` is the part of the whole portfolio in percent. */
export function positionPanel(coin, share) {
  const held = coin.amount > 0;
  const pnl = coin.value - coin.costBasis;
  const ret = coin.costBasis ? (pnl / coin.costBasis) * 100 : 0;
  const tone = pnl >= 0 ? "up" : "down";
  return html`<aside class="position card asset__position" aria-labelledby="position-title">
    <h2 class="position__title" id="position-title">${t("position.title")}</h2>
    ${held
      ? html`<p class="position__value"><data value="${coin.value}">${formatUsd(coin.value)}</data></p>
        <p class="position__amount">${t("position.shareOf", { amount: formatAmount(coin.amount, coin.price), symbol: coin.symbol, share: share.toFixed(1) })}</p>
        <meter class="position__meter" min="0" max="100" value="${share.toFixed(1)}">${share.toFixed(1)}%</meter>
        <dl class="position__list">
          <div class="position__row"><dt>${t("position.avg")}</dt><dd>${formatPrice(coin.avgBuy)}</dd></div>
          <div class="position__row"><dt>${t("position.cost")}</dt><dd>${formatUsd(coin.costBasis)}</dd></div>
          <div class="position__row position__row--${tone}"><dt>${t("position.pnl")}</dt><dd>${formatSignedUsd(pnl)}</dd></div>
          <div class="position__row position__row--${tone}"><dt>${t("position.return")}</dt><dd>${formatSignedPercent(ret)}</dd></div>
        </dl>`
      : html`<p class="position__value">${t("position.empty", { name: coin.name })}</p><p class="position__amount">${t("position.emptyHint")}</p>`}
  </aside>`;
}

/** The "Add transaction" form. `now` is the current time for <input type="datetime-local">. */
export function tradePanel(coin, { now, type = "buy" }) {
  const error = (name) => html`<p class="field__error" id="trade-${name}-error" data-error-for="${name}"></p>`;
  return html`<section class="trade card asset__trade" id="add-transaction" aria-labelledby="trade-title">
    <h2 class="trade__title" id="trade-title">${t("nav.add")}</h2>
    <form class="trade__form" id="trade-form" action="#" method="post">
      <fieldset class="segmented segmented--block">
        <legend class="segmented__legend visually-hidden">${t("form.type")}</legend>
        ${["buy", "sell", "transfer"].map(
          (kind) => html`<input class="segmented__input" type="radio" name="type" id="trade-${kind}" value="${kind}"${kind === type ? html` checked` : ""}>
          <label class="segmented__label" for="trade-${kind}">${t("form." + kind)}</label>`,
        )}
      </fieldset>
      <div class="field">
        <label class="field__label" for="trade-qty">${t("form.qty")}</label>
        <input class="field__input" id="trade-qty" name="amount" type="number" inputmode="decimal" min="0.00000001" step="any"
          placeholder="0.0250" required aria-describedby="trade-qty-hint trade-amount-error" aria-invalid="false">
        <p class="field__hint" id="trade-qty-hint"></p>
        ${error("amount")}
      </div>
      <div class="field">
        <label class="field__label" for="trade-price">${t("form.price")}</label>
        <input class="field__input" id="trade-price" name="price" type="number" inputmode="decimal" min="0" step="any"
          value="${coin.price}" required aria-describedby="trade-price-error" aria-invalid="false" data-no-draft>
        ${error("price")}
      </div>
      <div class="field">
        <label class="field__label" for="trade-date">${t("form.date")}</label>
        <input class="field__input" id="trade-date" name="date" type="datetime-local" value="${now}" max="${now}" required
          aria-describedby="trade-date-error" aria-invalid="false" data-no-draft>
        ${error("date")}
      </div>
      <div class="field">
        <label class="field__label" for="trade-note">${t("form.note")}</label>
        <textarea class="field__textarea" id="trade-note" name="note" rows="2" maxlength="140" aria-describedby="trade-note-error" aria-invalid="false"></textarea>
        ${error("note")}
      </div>
      <dl class="trade__summary">
        <div class="trade__row"><dt>${t("form.fee")}</dt><dd data-fee>${formatUsd(0)}</dd></div>
        <div class="trade__row trade__row--total">
          <dt>${t("form.total")}</dt>
          <dd><output class="trade__total" name="total" for="trade-qty trade-price" data-total>${formatUsd(0)}</output></dd>
        </div>
      </dl>
      <p class="trade__status" role="status" data-status></p>
      <button class="button button--primary button--block" type="submit">${icon("plus")}<span>${t("nav.add")}</span></button>
    </form>
  </section>`;
}

export function historyPanel(coin, { tx, summary }) {
  const id = encodeURIComponent(coin.id);
  const tab = (value, label) => html`<li class="tabs__item"><a class="tabs__link${tx === value ? " tabs__link--active" : ""}" href="?${value ? `tx=${value}` : ""}#/item/${id}"
    data-tx="${value}"${tx === value ? html` aria-current="true"` : ""}>${label}</a></li>`;
  return html`<section class="history card asset__history" id="transactions" aria-labelledby="history-title">
    <header class="section-header">
      <h2 class="section-header__title" id="history-title">${t("history.titleCoin", { symbol: coin.symbol })}</h2>
      <p class="section-header__subtitle" data-slot="history-summary">${summary}</p>
      <nav class="tabs section-header__tabs" aria-label="${t("history.filter")}">
        <ul class="tabs__list">${tab("", t("history.all"))}${tab("buy", t("history.buys"))}${tab("sell", t("history.sells"))}</ul>
      </nav>
    </header>
    <table class="history__table" aria-busy="true">
      <caption class="history__caption visually-hidden">${t("history.captionCoin", { name: coin.name })}</caption>
      <thead>
        <tr>
          <th class="history__heading" scope="col">${t("history.date")}</th>
          <th class="history__heading" scope="col">${t("history.type")}</th>
          <th class="history__heading history__heading--num" scope="col">${t("history.amount")}</th>
          <th class="history__heading history__heading--num" scope="col">${t("form.price")}</th>
          <th class="history__heading history__heading--num" scope="col">${t("history.value")}</th>
        </tr>
      </thead>
      <tbody data-slot="history-list"></tbody>
    </table>
  </section>`;
}

/** Placeholder of the whole page while the coin is loading: the same grid, grey blocks. */
export function assetLoading() {
  const card = (cls, size) => html`<section class="card ${cls}" aria-hidden="true"><span class="skeleton skeleton--${size}"></span></section>`;
  return html`<header class="asset__header" aria-hidden="true">
      <span class="skeleton skeleton--round"></span>
      <span class="skeleton skeleton--value"></span>
    </header>
    <div class="asset__main">${card("asset__price", "xl")}${card("asset__stats", "md")}${card("asset__about", "sm")}</div>
    <div class="asset__side">${card("asset__position", "lg")}${card("asset__trade", "xxl")}</div>
    ${card("asset__history", "lg")}`;
}
