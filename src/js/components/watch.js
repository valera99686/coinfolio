import { coinService } from "../services/index.js";
import { showToast } from "./Toast.js";
import { t } from "../i18n.js";

export function applyWatch(button, watched) {
  button.setAttribute("aria-pressed", String(watched));
  button.classList.toggle("icon-button--active", watched);
}

/**
 * Optimistic update of the star: the button changes at once, the request goes to the API in the background,
 * and if it fails the button goes back to its previous state and the user is told why.
 * Resolves with true when the server confirmed the change.
 */
export async function toggleWatch(button, { id, name }) {
  const was = button.getAttribute("aria-pressed") === "true";
  applyWatch(button, !was);
  button.disabled = true;
  try {
    await coinService.setWatched(id, !was);
    showToast(t(was ? "watch.removed" : "watch.added", { name }), { tone: "success", timeout: 3000 });
    return true;
  } catch (error) {
    applyWatch(button, was);
    showToast(t("watch.failed", { name }) + " " + error.message, { tone: "error" });
    return false;
  } finally {
    button.disabled = false;
  }
}
