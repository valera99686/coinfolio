# Coinfolio — Crypto Portfolio Tracker

Course project for *Web technologies & web design* (KPI, topic 1).
- Preview (GitHub Pages): <https://valera99686.github.io/coinfolio/>
- Figma design (Lab 1): <https://www.figma.com/design/DU6OArWkxs6AS14xCbzykC>

**Lab 2 — HTML markup & semantics.** Four pages without styles: semantic landmarks,
tables and forms, relative navigation, responsive images, EJS partials,
schema.org microdata and i18n-ready markup.

| Page | File | Main content |
|---|---|---|
| Dashboard | `index.html` | balance + chart, allocation, KPIs, holdings table, recent transactions, watchlist |
| Assets | `assets.html` | market summary, search/filter/sort form, assets table, pagination |
| Asset details | `asset.html` | breadcrumbs, price chart, market stats, position, add-transaction form, history table |
| Profile | `profile.html` | profile card, settings navigation, wallets, settings form |

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # lint + build + HTML validation + link/i18n checks
npm run preview    # serve dist/ on http://localhost:4173
```

## How it is built

- **Vite** multi-page build (`vite.config.js`), `base: "./"` so the build works on any static host.
- **EJS** (`build/ejs-pages.js`): every page is rendered through EJS before Vite parses it.
  Shared blocks live in `src/templates/partials/` — header, footer, asset row, coin card,
  stat card, transaction, responsive picture.
- **Data** for the templates: `src/data/site.js` (same numbers as the Figma mockups).
- **Responsive images**: `<picture>` with art direction (mobile/desktop crops),
  WebP + PNG/JPEG fallback, `srcset` with `w` and `x` descriptors — see `public/img/`.
- **Microdata**: [`ExchangeRateSpecification`](https://schema.org/ExchangeRateSpecification)
  for coins (name, currency, currentExchangeRate → `UnitPriceSpecification`).
- **i18n**: text nodes carry `data-i18n="key"`, attributes carry `data-i18n-attr="attr:key"`.
  Dictionaries: `public/locales/en.json`, `public/locales/uk.json`. The UI is English;
  `?lang=uk` applies the Ukrainian dictionary (`src/js/i18n.js`).
- **BEM** class names everywhere, no inline styles (styles come in Lab 3).

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | ESLint, then production build to `dist/` |
| `npm run validate` | `html-validate` on the built pages |
| `npm run check` | broken relative links + missing i18n keys |
| `npm test` | all of the above |
| `npm run deploy` | tests, then publishes `dist/` to the `gh-pages` branch |

## Structure

```
index.html  assets.html  asset.html  profile.html   pages (EJS inside)
build/ejs-pages.js          Vite plugin that renders EJS
src/templates/partials/     shared blocks
src/data/site.js            template data
src/js/main.js, i18n.js     ES modules
public/img/                 icons sprite, coin logos, charts, avatar
public/locales/             en.json, uk.json
scripts/check.js            post-build checks
```
