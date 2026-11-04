/**
 * Safe HTML building. Everything that comes from the API goes through escapeHtml() unless it is wrapped
 * in raw(), so a coin name or a note typed by a user can never inject markup (XSS).
 */
export const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

class SafeHtml {
  constructor(value) {
    this.value = value;
  }

  toString() {
    return this.value;
  }
}

/** Marks a string as trusted markup (the output of another html`` template). */
export const raw = (value) => new SafeHtml(String(value));

const part = (value) => {
  if (value instanceof SafeHtml) {
    return value.value;
  }
  if (Array.isArray(value)) {
    return value.map(part).join("");
  }
  return value === null || value === undefined || value === false ? "" : escapeHtml(value);
};

/** Tagged template: html`<li>${name}</li>` escapes every interpolated value. */
export function html(strings, ...values) {
  return new SafeHtml(strings.reduce((out, chunk, i) => out + chunk + (i < values.length ? part(values[i]) : ""), ""));
}

export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

/** Replaces the content of an element with a trusted fragment. */
export function render(element, fragment) {
  element.innerHTML = String(fragment);
}

/** Swaps an element for a fragment of markup (the element is gone, the fragment's nodes take its place). */
export function replaceNode(element, fragment) {
  const template = document.createElement("template");
  template.innerHTML = String(fragment);
  element.replaceWith(template.content);
}

export function icon(name, { size = 20, cls = "" } = {}) {
  return html`<svg class="icon icon--${name}${cls ? " " + cls : ""}" width="${size}" height="${size}" aria-hidden="true" focusable="false"><use href="./img/icons.svg#${name}"></use></svg>`;
}

export function debounce(fn, delay) {
  let timer;
  const wrapped = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
  wrapped.cancel = () => clearTimeout(timer);
  return wrapped;
}
