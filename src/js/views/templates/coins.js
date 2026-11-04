import { html, icon } from "../../utils/dom.js";
import { formatAmount, formatDateTime, formatPrice, formatQty, formatUsd, trendOf } from "../../utils/format.js";
import { t } from "../../i18n.js";
import { sparkline } from "../charts.js";
import { badge } from "./common.js";

export const coinHref = (id) => `./asset.html#/item/${encodeURIComponent(id)}`;

const watchButton = (coin, cls) => html`<button class="icon-button icon-button--plain ${cls}${coin.watched ? " icon-button--active" : ""}" type="button" aria-pressed="${String(Boolean(coin.watched))}" data-action="watch">${icon("star")}<span class="visually-hidden">${t("asset.watch")} ${coin.name}</span></button>`;

/** A row of the asset table (a card below 1280 px). `mod: "holding"` is the dashboard variant. */
export function assetRow(coin, { rank = coin.rank, share = 0, mod = "" } = {}) {
  const held = coin.amount > 0;
  return html`<tr class="asset-row${mod ? " asset-row--" + mod : ""}" data-asset-id="${coin.id}" itemscope itemtype="https://schema.org/ExchangeRateSpecification">
    <td class="asset-row__rank">${rank}</td>
    <th class="asset-row__asset" scope="row">
      <a class="asset-row__link" href="${coinHref(coin.id)}">
        <img class="asset-row__logo" src="./img/coins/${coin.id}.svg" alt="" width="32" height="32">
        <span class="asset-row__name" itemprop="name">${coin.name}</span>
        <abbr class="asset-row__symbol" itemprop="currency" title="${coin.name}">${coin.symbol}</abbr>
      </a>
    </th>
    <td class="asset-row__price" itemprop="currentExchangeRate" itemscope itemtype="https://schema.org/UnitPriceSpecification">
      <data itemprop="price" value="${coin.price}">${formatPrice(coin.price)}</data>
      <meta itemprop="priceCurrency" content="USD">
    </td>
    <td class="asset-row__change">${badge(coin.change24h)}</td>
    <td class="asset-row__holdings">${held
      ? html`<data class="asset-row__value" value="${coin.value}">${formatUsd(coin.value)}</data>
        <span class="asset-row__amount">${formatAmount(coin.amount, coin.price)} ${coin.symbol}</span>`
      : html`<span class="asset-row__empty">${t("asset.notHeld")}</span>`}</td>
    <td class="asset-row__allocation">${held
      ? html`<meter class="asset-row__meter" min="0" max="100" value="${share.toFixed(1)}">${share.toFixed(1)}%</meter>
        <span class="asset-row__share">${share.toFixed(1)}%</span>`
      : html`<span class="asset-row__empty">—</span>`}</td>
    <td class="asset-row__chart">${sparkline(coin.spark, { cls: "asset-row__sparkline" })}</td>
    <td class="asset-row__actions">${watchButton(coin, "asset-row__watch")}</td>
  </tr>`;
}

export const assetSkeleton = () => html`<tr class="asset-skeleton" aria-hidden="true"><td class="asset-skeleton__cell" colspan="8"><span class="skeleton"></span></td></tr>`;

/** A coin of the watchlist on the dashboard. */
export function coinCard(coin) {
  return html`<article class="coin-card coin-card--${trendOf(coin.change24h)}" data-asset-id="${coin.id}" itemscope itemtype="https://schema.org/ExchangeRateSpecification">
    <header class="coin-card__header">
      <img class="coin-card__logo" src="./img/coins/${coin.id}.svg" alt="" width="32" height="32">
      <h3 class="coin-card__title" itemprop="name"><a class="coin-card__link" href="${coinHref(coin.id)}">${coin.name}</a></h3>
      <abbr class="coin-card__symbol" itemprop="currency" title="${coin.name}">${coin.symbol}</abbr>
      ${watchButton(coin, "coin-card__watch")}
    </header>
    <p class="coin-card__price" itemprop="currentExchangeRate" itemscope itemtype="https://schema.org/UnitPriceSpecification">
      <data itemprop="price" value="${coin.price}">${formatPrice(coin.price)}</data>
      <meta itemprop="priceCurrency" content="USD">
    </p>
    ${badge(coin.change24h, { cls: "coin-card__badge" })}
    ${sparkline(coin.spark, { cls: "coin-card__sparkline" })}
  </article>`;
}

const TX_ICON = { buy: "plus", sell: "minus", transfer: "swap" };
const sign = (tx) => (tx.type === "sell" ? -tx.amount : tx.amount);

/** An item of the "Recent transactions" list. `coin` is the expanded coin of the transaction. */
export function txItem(tx, coin) {
  const total = Math.round(tx.amount * tx.price * 100) / 100;
  const amount = (tx.type === "sell" ? "−" : "+") + formatAmount(tx.amount, coin.price) + " " + coin.symbol;
  return html`<li class="tx tx--${tx.type}">
    <span class="tx__icon">${icon(TX_ICON[tx.type])}</span>
    <p class="tx__title"><span>${t("tx." + tx.type)}</span> ${coin.symbol}</p>
    <time class="tx__date" datetime="${tx.date}">${formatDateTime(tx.date)}</time>
    <p class="tx__amount"><data value="${sign(tx)}">${amount}</data></p>
    <p class="tx__value"><data value="${total}">${formatUsd(total)}</data></p>
  </li>`;
}

export const txSkeleton = () => html`<li class="tx tx--skeleton" aria-hidden="true"><span class="skeleton"></span></li>`;

/** A row of the transaction history of one coin. */
export function historyRow(tx, coin) {
  const total = Math.round(tx.amount * tx.price * 100) / 100;
  const amount = (tx.type === "sell" ? "−" : "+") + formatQty(tx.amount, coin.price >= 100 ? 4 : 2) + " " + coin.symbol;
  return html`<tr class="history__row history__row--${tx.type}">
    <th class="history__date" scope="row"><time datetime="${tx.date}">${formatDateTime(tx.date)}</time></th>
    <td class="history__type">${t("form." + tx.type)}</td>
    <td class="history__amount"><data value="${sign(tx)}">${amount}</data></td>
    <td class="history__price"><data value="${tx.price}">${formatPrice(tx.price)}</data></td>
    <td class="history__total"><data value="${total}">${formatUsd(total)}</data></td>
  </tr>`;
}

export const historySkeleton = () => html`<tr class="history__skeleton" aria-hidden="true"><td class="history__skeleton-cell" colspan="5"><span class="skeleton"></span></td></tr>`;
