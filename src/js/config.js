// Runtime settings. The API address comes from the build (VITE_API_URL, see .env.production);
// without it the app talks to the local json-server started by `npm run api`.
export const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:3001").replace(/\/$/, "");

// A free hosting plan puts the API to sleep; the first request after a pause can take about a minute.
export const REQUEST_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 20000;
export const CACHE_TTL = 60_000;
export const PAGE_SIZE = 10;
export const SEARCH_DEBOUNCE = 300;
