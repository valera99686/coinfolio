// Theme switcher: "dark" (default, the Figma design), "light" or "system" (follows the OS).
// The colours themselves are CSS custom properties switched by <html data-theme> (src/scss/themes).
const KEY = "coinfolio-theme";
const lightQuery = window.matchMedia("(prefers-color-scheme: light)");

export function getTheme() {
  try {
    return localStorage.getItem(KEY) || "dark";
  } catch {
    return "dark";
  }
}

function resolve(choice) {
  if (choice === "system") {
    return lightQuery.matches ? "light" : "dark";
  }
  return choice === "light" ? "light" : "dark";
}

export function applyTheme(choice = getTheme()) {
  document.documentElement.dataset.theme = resolve(choice);
}

export function initTheme() {
  applyTheme();
  lightQuery.addEventListener("change", () => {
    if (getTheme() === "system") {
      applyTheme("system");
    }
  });

  // The profile page has a Dark / Light / System switch (radio inputs named "theme").
  for (const radio of document.querySelectorAll('input[name="theme"]')) {
    radio.checked = radio.value === getTheme();
    radio.addEventListener("change", () => {
      try {
        localStorage.setItem(KEY, radio.value);
      } catch {
        // storage can be blocked; the theme still changes for this visit
      }
      applyTheme(radio.value);
    });
  }
}
