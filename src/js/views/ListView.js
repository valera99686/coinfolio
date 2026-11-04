import { html, icon, render } from "../utils/dom.js";
import { t } from "../i18n.js";

/**
 * Draws a list into a <tbody> (tag "tr") or a <ul> (tag "li") and knows its four states: loading (skeletons),
 * error (message and a retry button), empty and ready. It only knows the DOM; where the items come from is
 * none of its business.
 */
export class ListView {
  /**
   * @param {HTMLElement} root  the element that receives the items
   * @param {object} options
   * @param {(item: object, index: number) => object} options.renderItem  returns an html`` fragment
   * @param {() => object} options.renderSkeleton  one placeholder row
   * @param {"tr"|"li"} [options.tag]
   * @param {number} [options.columns]  colspan of the message cell when the tag is "tr"
   * @param {"md"|"lg"} [options.tableFrom]  from which breakpoint the rows of the table are real table rows
   * @param {() => void} [options.onRetry]
   * @param {HTMLElement} [options.busy]  element that gets aria-busy (defaults to root)
   */
  constructor(root, { renderItem, renderSkeleton, tag = "li", columns = 1, tableFrom = "lg", onRetry, busy = root } = {}) {
    this.root = root;
    this.renderItem = renderItem;
    this.renderSkeleton = renderSkeleton;
    this.tag = tag;
    this.columns = columns;
    this.tableFrom = tableFrom;
    this.onRetry = onRetry;
    this.busy = busy;
    this.root.addEventListener("click", (event) => {
      if (event.target.closest('[data-action="retry"]')) {
        this.onRetry?.();
      }
    });
  }

  setBusy(flag) {
    this.busy.setAttribute("aria-busy", String(flag));
  }

  /** A message that takes the place of the items. */
  message(content) {
    return this.tag === "tr"
      ? html`<tr class="state-row state-row--table-${this.tableFrom}"><td class="state-row__cell state-row__cell--${this.tableFrom}" colspan="${this.columns}">${content}</td></tr>`
      : html`<li class="state-row">${content}</li>`;
  }

  renderLoading(count = 6) {
    this.setBusy(true);
    render(this.root, html`${Array.from({ length: count }, () => this.renderSkeleton())}`);
  }

  renderError(message) {
    this.setBusy(false);
    render(
      this.root,
      this.message(html`<div class="state state--error" role="alert">
        ${icon("alert", { size: 32, cls: "state__icon" })}
        <h3 class="state__title">${t("state.errorTitle")}</h3>
        <p class="state__text">${message}</p>
        <button class="button button--secondary state__action" type="button" data-action="retry">${t("state.retry")}</button>
      </div>`),
    );
  }

  renderEmpty(title = t("state.emptyTitle"), text = t("state.emptyText")) {
    this.setBusy(false);
    render(
      this.root,
      this.message(html`<div class="state state--empty" role="status">
        ${icon("search", { size: 32, cls: "state__icon" })}
        <h3 class="state__title">${title}</h3>
        <p class="state__text">${text}</p>
      </div>`),
    );
  }

  render(items) {
    this.setBusy(false);
    if (!items.length) {
      this.renderEmpty();
      return;
    }
    render(this.root, html`${items.map((item, index) => this.renderItem(item, index))}`);
  }
}
