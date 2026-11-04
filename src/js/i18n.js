// Lightweight i18n. The markup is written in English; for another language the dictionary replaces the text of
// [data-i18n] elements and the attributes listed in [data-i18n-attr="attr:key;attr:key"]. Text that JavaScript
// renders (lists, states, forms) is built with t(key, vars), so it follows the language too.
import { interpolate } from "./utils/format.js";

const SUPPORTED = ["en", "uk"];
const STORAGE_KEY = "coinfolio:lang";

let dictionary = {};
let language = "en";

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
    // storage may be unavailable (private mode): the language still applies to this page
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

/** Text of a dictionary key with {placeholders} filled in; an unknown key is shown as it is. */
export function t(key, vars) {
  return interpolate(dictionary[key] ?? key, vars);
}

export const getLanguage = () => language;

/** Loads the dictionary of the chosen language. Must finish before a page renders its first list. */
export async function initI18n() {
  const requested = new URLSearchParams(window.location.search).get("lang") || readStoredLang() || "en";
  language = SUPPORTED.includes(requested) ? requested : "en";
  storeLang(language);
  try {
    const response = await fetch(new URL(`./locales/${language}.json`, document.baseURI));
    dictionary = response.ok ? await response.json() : {};
  } catch {
    dictionary = {};
  }
  if (language !== "en") {
    applyTranslations(dictionary);
    document.documentElement.lang = language;
  }
  return dictionary;
}
