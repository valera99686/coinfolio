import { html, icon, render } from "../utils/dom.js";

let host = null;

function ensureHost() {
  if (!host) {
    host = document.createElement("div");
    host.className = "toast-host";
    host.setAttribute("role", "status");
    host.setAttribute("aria-live", "polite");
    document.body.append(host);
  }
  return host;
}

/**
 * A short message in the corner of the screen ("Could not save your like"). It is announced by screen readers
 * through the live region and disappears by itself. tone: "info", "success" or "error".
 */
export function showToast(message, { tone = "info", timeout = 5000 } = {}) {
  const toast = document.createElement("div");
  toast.className = `toast toast--${tone}`;
  render(toast, html`${icon(tone === "error" ? "alert" : "check", { size: 20, cls: "toast__icon" })}<span class="toast__text">${message}</span>`);
  ensureHost().append(toast);
  setTimeout(() => toast.remove(), timeout);
  return toast;
}
