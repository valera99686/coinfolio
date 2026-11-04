import dayjs from "dayjs";
import { coinService, profileService, transactionService, walletService } from "../services/index.js";
import { FormView } from "../views/FormView.js";
import { ListView } from "../views/ListView.js";
import { showToast } from "../components/Toast.js";
import { applyTheme } from "../theme.js";
import { getLanguage, setLanguage, t } from "../i18n.js";
import { $, html, icon, render } from "../utils/dom.js";
import { stateBlock } from "../views/templates/common.js";

const THEME_KEY = "coinfolio-theme";
const WALLET_NAMES = ["WalletConnect", "Trust Wallet", "Coinbase Wallet", "Rabby"];
const hex = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");

const walletItem = (wallet) => html`<li class="wallets__item">
  ${icon("wallet", { size: 24, cls: "wallets__icon" })}
  <span class="wallets__name">${wallet.name}</span>
  <code class="wallets__address">${wallet.address}</code>
  <span class="wallets__status">${t("wallets.synced")}</span>
</li>`;

/** Profile & settings: the card, the wallets and the settings form are all stored in the API. */
class ProfilePage {
  constructor() {
    this.form = $("#settings");
    this.profile = null;
    this.view = null;
  }

  start() {
    this.wallets = new ListView($(".wallets__list"), {
      tag: "li",
      renderItem: walletItem,
      renderSkeleton: () => html`<li class="wallets__item" aria-hidden="true"><span class="skeleton"></span></li>`,
      onRetry: () => this.loadWallets(),
    });

    $("#connect-wallet").addEventListener("click", (event) => this.connectWallet(event.currentTarget));
    $("#avatar-upload").addEventListener("change", (event) => this.previewPhoto(event.target));
    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-demo]")) {
        showToast(t("demo.unavailable"), { tone: "info", timeout: 3000 });
      }
    });
    this.form.addEventListener("reset", (event) => {
      event.preventDefault();
      this.fill(this.profile);
      this.view.clearDraft();
      this.view.clearErrors();
    });

    this.loadProfile();
    this.loadStats();
    this.loadWallets();
  }

  // --- profile --------------------------------------------------------------------------------------------
  async loadProfile() {
    try {
      this.profile = await profileService.get();
    } catch (error) {
      render($(".settings"), stateBlock({ kind: "error", title: t("state.errorTitle"), text: error.message, action: t("state.retry") }));
      $(".settings").addEventListener("click", (event) => event.target.closest('[data-action="retry"]') && window.location.reload());
      return;
    }
    this.renderCard(this.profile);
    this.fill(this.profile);
    this.view = new FormView(this.form, {
      storageKey: "draft:profile",
      submit: () => this.save(),
      onSuccess: (updated) => this.afterSave(updated),
    });
    this.form.removeAttribute("aria-busy");
    if (this.view.restoreDraft()) {
      showToast(t("form.draftRestored"), { tone: "info", timeout: 3500 });
    }
  }

  renderCard(profile) {
    const since = dayjs(profile.memberSince);
    $('[data-slot="name"]').textContent = `${profile.firstName} ${profile.lastName}`;
    $('[data-slot="email"]').textContent = profile.email;
    const time = $('[data-slot="since"]');
    time.textContent = since.format("MMM YYYY");
    time.setAttribute("datetime", since.format("YYYY-MM"));
  }

  /** Puts the values of the API into the fields. The theme is local: the chosen one wins over the stored one. */
  fill(profile) {
    const f = this.form.elements;
    for (const name of ["firstName", "lastName", "email", "username", "currency", "timezone"]) {
      f[name].value = profile[name];
    }
    f.language.value = getLanguage();
    for (const name of ["priceAlerts", "weeklyReport", "productNews", "twoFactor"]) {
      f[name].checked = Boolean(profile[name]);
    }
    let stored = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch {
      stored = null;
    }
    const theme = stored || profile.theme;
    this.form.querySelector(`input[name="theme"][value="${theme}"]`).checked = true;
    if (!stored) {
      applyTheme(theme);
    }
  }

  payload() {
    const f = this.form.elements;
    const text = (name) => f[name].value.trim();
    return {
      firstName: text("firstName"),
      lastName: text("lastName"),
      email: text("email"),
      username: text("username"),
      currency: f.currency.value,
      language: f.language.value,
      timezone: f.timezone.value,
      theme: this.form.querySelector('input[name="theme"]:checked').value,
      priceAlerts: f.priceAlerts.checked,
      weeklyReport: f.weeklyReport.checked,
      productNews: f.productNews.checked,
      twoFactor: f.twoFactor.checked,
    };
  }

  save() {
    return profileService.update(this.payload());
  }

  afterSave(updated) {
    const changedLanguage = updated.language !== getLanguage();
    this.profile = updated;
    this.renderCard(updated);
    this.view.clearErrors();
    this.view.setStatus(t("profile.saved"), "success");
    showToast(t("profile.saved"), { tone: "success", timeout: 3500 });
    if (changedLanguage) {
      // the language is applied by reading the dictionary again
      setLanguage(updated.language);
      const url = new URL(window.location.href);
      url.searchParams.delete("lang");
      window.setTimeout(() => window.location.replace(url), 700);
    }
  }

  // --- the numbers of the card -------------------------------------------------------------------------------
  async loadStats() {
    const put = (slot, value) => ($(`[data-slot="${slot}"]`).textContent = String(value));
    const [assets, transactions, watched] = await Promise.allSettled([
      coinService.holdings().then((r) => r.total),
      transactionService.count(),
      coinService.getList({ watched: true, _limit: 1 }).then((r) => r.total),
    ]);
    put("stat-assets", assets.status === "fulfilled" ? assets.value : "–");
    put("stat-transactions", transactions.status === "fulfilled" ? transactions.value : "–");
    put("stat-watchlist", watched.status === "fulfilled" ? watched.value : "–");
  }

  // --- wallets -----------------------------------------------------------------------------------------------
  async loadWallets() {
    this.wallets.renderLoading(2);
    try {
      const { items } = await walletService.getList({ _sort: "id", _order: "asc" });
      if (items.length) {
        this.wallets.render(items);
      } else {
        this.wallets.renderEmpty(t("wallets.emptyTitle"), t("wallets.emptyText"));
      }
    } catch (error) {
      this.wallets.renderError(error.message);
    }
  }

  async connectWallet(button) {
    const name = WALLET_NAMES[Math.floor(Math.random() * WALLET_NAMES.length)];
    button.disabled = true;
    try {
      await walletService.create({ name, address: `0x${hex(2)}…${hex(4)}` });
      showToast(t("wallets.connected", { name }), { tone: "success", timeout: 3500 });
      await this.loadWallets();
    } catch (error) {
      showToast(`${t("wallets.connectFailed")} ${error.fields?.wallets ?? error.message}`, { tone: "error" });
    } finally {
      button.disabled = false;
    }
  }

  // --- photo: only a preview in the browser, nothing is uploaded -----------------------------------------------
  previewPhoto(input) {
    const [file] = input.files;
    if (!file) {
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
      showToast(t("profile.photoInvalid"), { tone: "error" });
      input.value = "";
      return;
    }
    const image = $("#profile-avatar");
    image.closest("picture").querySelector("source")?.remove();
    image.removeAttribute("srcset");
    URL.revokeObjectURL(image.dataset.blob ?? "");
    image.dataset.blob = URL.createObjectURL(file);
    image.src = image.dataset.blob;
    showToast(t("profile.photoPreview"), { tone: "info", timeout: 4000 });
  }
}

export function initProfilePage() {
  new ProfilePage().start();
}
