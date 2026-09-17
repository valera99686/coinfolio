// Lightweight i18n: markup is English; other languages are applied from
// data-i18n (text) and data-i18n-attr ("attr:key;attr:key") attributes.
const SUPPORTED = ["en", "uk"];
const STORAGE_KEY = "coinfolio:lang";

function readStoredLang() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeLang(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // storage may be unavailable (private mode) — the language still applies to this page
  }
}

export function applyTranslations(dict, root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    const value = dict[el.dataset.i18n];
    if (value) {
      el.textContent = value;
    }
  });
  root.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    el.dataset.i18nAttr.split(";").forEach((pair) => {
      const [attr, key] = pair.split(":").map((part) => part.trim());
      if (dict[key]) {
        el.setAttribute(attr, dict[key]);
      }
    });
  });
}

export async function initI18n() {
  const requested = new URLSearchParams(window.location.search).get("lang") || readStoredLang() || "en";
  const lang = SUPPORTED.includes(requested) ? requested : "en";
  storeLang(lang);
  if (lang === "en") {
    return;
  }
  const response = await fetch(new URL(`./locales/${lang}.json`, document.baseURI));
  if (!response.ok) {
    return;
  }
  applyTranslations(await response.json());
  document.documentElement.lang = lang;
}
