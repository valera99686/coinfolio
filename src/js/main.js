// Entry point of every page: styles (Lab 3), theme and i18n. Data and interactivity come in Lab 4.
import "../scss/main.scss";
import { initI18n } from "./i18n.js";
import { initTheme } from "./theme.js";

initTheme();
initI18n();
