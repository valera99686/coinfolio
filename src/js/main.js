// Entry point of every page: styles, theme, language, then the controller of the page.
import "../scss/main.scss";
import { initI18n, t } from "./i18n.js";
import { initTheme } from "./theme.js";
import { http } from "./api/http.js";
import { showToast } from "./components/Toast.js";

initTheme();

// Each page loads only its own code (Vite splits the controllers into separate chunks).
const PAGES = {
  dashboard: () => import("./pages/dashboard.js").then((m) => m.initDashboardPage()),
  assets: () => import("./pages/assets.js").then((m) => m.initAssetsPage()),
  asset: () => import("./pages/asset.js").then((m) => m.initAssetPage()),
  profile: () => import("./pages/profile.js").then((m) => m.initProfilePage()),
};

function pageName() {
  const cls = [...document.body.classList].find((name) => name.startsWith("page--"));
  return cls ? cls.slice("page--".length) : "";
}

/** Ctrl K (or Cmd K) puts the cursor into the search field, as the hint in the header promises. */
function initShortcuts() {
  document.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      const field = document.getElementById("site-search");
      if (field && field.offsetParent !== null) {
        event.preventDefault();
        field.focus();
      }
    }
  });
}

async function start() {
  await initI18n();
  initShortcuts();
  // A free API host goes to sleep; the first requests are retried, so the user is told what is going on.
  let warned = false;
  http.onRetry = () => {
    if (!warned) {
      warned = true;
      showToast(t("state.waking"), { tone: "info", timeout: 12000 });
    }
  };
  await PAGES[pageName()]?.();
}

start();
