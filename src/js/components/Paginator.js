import { html, icon, render } from "../utils/dom.js";
import { t } from "../i18n.js";

/**
 * Page links under a list. It only knows about pages: how many there are, which one is current and which
 * links to draw. The links are real anchors (href with the page in the URL), so they can be opened in a
 * new tab; a plain click is intercepted and handed to onChange.
 */
export class Paginator {
  /**
   * @param {HTMLElement} root  <nav class="pagination"> with .pagination__summary and .pagination__list
   * @param {object} options
   * @param {(page: number) => void} options.onChange
   * @param {(page: number) => string} options.hrefFor  URL of a page
   */
  constructor(root, { onChange, hrefFor }) {
    this.root = root;
    this.onChange = onChange;
    this.hrefFor = hrefFor;
    this.summary = root.querySelector(".pagination__summary");
    this.list = root.querySelector(".pagination__list");
    this.root.addEventListener("click", (event) => {
      const link = event.target.closest("a[data-page]");
      if (link && !event.ctrlKey && !event.metaKey && !event.shiftKey) {
        event.preventDefault();
        this.onChange(Number(link.dataset.page));
      }
    });
  }

  static pages(total, limit) {
    return Math.max(1, Math.ceil(total / limit));
  }

  /** 1 … 4 5 6 … 12: the first, the last and the neighbours of the current page. */
  static window(page, pages) {
    if (pages <= 7) {
      return Array.from({ length: pages }, (_, i) => i + 1);
    }
    const wanted = new Set([1, pages, page - 1, page, page + 1]);
    const numbers = [...wanted].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
    return numbers.flatMap((n, i) => (i && n - numbers[i - 1] > 1 ? ["gap", n] : [n]));
  }

  render({ page, total, limit }) {
    const pages = Paginator.pages(total, limit);
    const from = total ? (page - 1) * limit + 1 : 0;
    const to = Math.min(page * limit, total);
    this.summary.textContent = t("pagination.summary", { from, to, total });
    this.root.hidden = total === 0;

    const step = (target, kind, label, chevron) => {
      const disabled = target < 1 || target > pages;
      return html`<li class="pagination__item"><a class="pagination__link pagination__link--${kind}"
        ${disabled ? html`aria-disabled="true"` : html`href="${this.hrefFor(target)}" data-page="${target}" rel="${kind === "next" ? "next" : "prev"}"`}>
        ${icon(chevron)}<span class="visually-hidden">${label}</span></a></li>`;
    };

    const numbered = Paginator.window(page, pages).map((entry) =>
      entry === "gap"
        ? html`<li class="pagination__item pagination__item--gap" aria-hidden="true">…</li>`
        : html`<li class="pagination__item pagination__item--page${entry === page ? " pagination__item--current" : ""}"><a
            class="pagination__link${entry === page ? " pagination__link--active" : ""}" href="${this.hrefFor(entry)}" data-page="${entry}"
            ${entry === page ? html`aria-current="page"` : ""}>${entry}</a></li>`,
    );

    this.list.hidden = pages <= 1;
    render(this.list, html`${step(page - 1, "prev", t("pagination.prev"), "chevron-left")}${numbered}${step(page + 1, "next", t("pagination.next"), "chevron-right")}`);
  }
}
