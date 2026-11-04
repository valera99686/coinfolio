import { html, icon } from "../../utils/dom.js";
import { formatPercent, trendOf } from "../../utils/format.js";
import { t } from "../../i18n.js";

const BADGE_ICON = { up: "arrow-up-right", down: "arrow-down-right", flat: "minus" };

/** Price-change pill. The direction is carried by the arrow and the hidden text, not by the colour alone. */
export function badge(change, { cls = "", digits = 2 } = {}) {
  const trend = trendOf(change);
  return html`<span class="badge badge--${trend}${cls ? " " + cls : ""}">${icon(BADGE_ICON[trend], { size: 16 })}<span class="visually-hidden">${t("change." + trend)}</span><data class="badge__value" value="${change}">${formatPercent(change, digits)}</data></span>`;
}

/** One KPI tile (a <dl> item): label with an icon, big value, change and a note. */
export function statCard({ label, icon: iconName, value, change, note, cls = "" }) {
  return html`<div class="stat-card stat-card--${trendOf(change)}${cls ? " " + cls : ""}">
    <dt class="stat-card__label"><span>${label}</span>${icon(iconName)}</dt>
    <dd class="stat-card__value">${value}</dd>
    <dd class="stat-card__meta">${badge(change)}<span class="stat-card__note">${note}</span></dd>
  </div>`;
}

export const statSkeleton = (cls = "") => html`<div class="stat-card stat-card--skeleton${cls ? " " + cls : ""}" aria-hidden="true"><span class="skeleton skeleton--text"></span><span class="skeleton skeleton--value"></span><span class="skeleton skeleton--text"></span></div>`;

/** A message block (error, empty) used outside of lists: forms, details, whole pages. */
export function stateBlock({ kind = "error", title, text, action = "", href = "" }) {
  const live = kind === "error" ? 'role="alert"' : 'role="status"';
  return html`<div class="state state--${kind}" ${live}>
    ${icon(kind === "error" ? "alert" : "search", { size: 32, cls: "state__icon" })}
    <h2 class="state__title">${title}</h2>
    <p class="state__text">${text}</p>
    ${action && !href ? html`<button class="button button--secondary state__action" type="button" data-action="retry">${action}</button>` : ""}
    ${action && href ? html`<a class="button button--secondary state__action" href="${href}">${action}</a>` : ""}
  </div>`;
}
