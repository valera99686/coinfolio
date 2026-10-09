# Coinfolio — Crypto Portfolio Tracker

Course project for *Web technologies & web design* (KPI, topic 1).
- Preview (GitHub Pages): <https://valera99686.github.io/coinfolio/>
- Figma design (Lab 1): <https://www.figma.com/design/DU6OArWkxs6AS14xCbzykC>

**Lab 2 — HTML markup & semantics.** Four pages without styles: semantic landmarks,
tables and forms, relative navigation, responsive images, EJS partials,
schema.org microdata and i18n-ready markup.

**Lab 3 — SCSS, responsive layout, architecture 7-1, BEM.** The same four pages, styled to the
Figma mockups at 360 / 768 / 1280 px, with a dark theme (the design) and a light theme.
See [Lab 3](#lab-3--scss-and-responsive-layout) below.

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
- **BEM** class names everywhere, no inline styles.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | ESLint, then production build to `dist/` |
| `npm run validate` | `html-validate` on the built pages |
| `npm run check` | broken relative links + missing i18n keys |
| `npm run lint` | ESLint + Stylelint (BEM, nesting, specificity) + `scripts/check-scss.mjs` (no HEX / magic numbers in blocks) |
| `npm run check:css` | size budget (30 kB gzip) and repeated declaration blocks in the compiled CSS |
| `npm run shot -- <page> <width> <out.png>` | screenshot of the dev server page, reports horizontal overflow |
| `npm test` | lint, build, HTML validation, links/i18n, CSS check |
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

## Lab 3 — SCSS and responsive layout

### Functionality

- **Four responsive pages** (mobile first, breakpoints 360 / 768 / 1280 px, nothing overflows from 320 to 1920 px):
  phones get a fixed bottom tab bar with a centre "+", cards instead of tables and swipeable strips;
  from 1280 px the header has pill navigation and search, tables replace cards and the asset page and
  profile become two columns (8 + 4 columns of the grid).
- **Dark and light theme.** `data-theme` on `<html>` swaps the CSS custom properties; the choice
  (dark / light / system) is stored in `localStorage` and can be changed on the profile page.
- **Interactions without JavaScript:** period switches, filter chips, type switch and theme switch are
  radio inputs; the settings toggles are `role="switch"` checkboxes; hover, focus and entrance animations
  use only `opacity` / `transform` and respect `prefers-reduced-motion`.
- **Own 12-column grid** (`row()` / `col()` mixins with real gutters) next to CSS Grid where a layout needs it
  (profile page areas, header, forms).

### Style structure (architecture 7-1)

```
src/scss/
  main.scss        only @use, no rules
  abstracts/       _variables (tokens from Figma), _functions, _mixins, _placeholders; emits no CSS
  vendors/         self-hosted variable fonts (Inter, Space Grotesk)
  themes/          _default (dark), _light: colour roles as CSS custom properties
  base/            reset, typography, utilities, animations, print
  layout/          grid, header, nav (tab bar / pills), search, footer, page shell
  components/      one file per BEM block (48 blocks): button, card, field, switch, price, history, ...
  pages/           page-level composition only: dashboard, assets, asset-details, profile
```

- **Variables:** colours, type scale, spacing (4 px steps), radii, shadows, durations and breakpoints are
  Sass maps in `_variables.scss`; components never contain HEX values or raw pixel spacing.
- **Functions:** `rem()`, `space()`, `radius()`, `color()`, `duration()`, `breakpoint()`, `z()`,
  `col-width()`, `tint()` / `shade()` (the light palette is derived from the dark one).
- **Mixins:** `media-up()`, `flex()`, `row()` / `col()`, `text-style()`, `transition()`, `hover()`,
  `focus-ring()`, `scroll-strip()`, `metric-panel()`, `meter-bar()`, `tx-tones()`, `reveal()`.
- **Placeholders + `@extend`:** `%surface`, `%overline`, `%visually-hidden`, `%list-reset`, `%row`,
  `%col-12` and one `%type-*` placeholder per Figma text style, so repeated blocks are compiled once.
- **BEM** (`block__element--modifier`, mixes such as `balance card`) is enforced by Stylelint together with
  nesting depth <= 2, <= 2 compound selectors, no IDs, no `!important` in blocks, alphabetical properties.

### Checks run before delivery

| Check | Result |
|---|---|
| `npm run lint` (ESLint, Stylelint, `check-scss`) | clean |
| `npm run check:css` | 63 kB raw, 10.3 kB gzip, no repeated declaration blocks |
| `html-validate`, links, i18n keys | clean, 295 links, 205 keys |
| axe-core (WCAG 2.2 AA + best practice), 4 pages x 2 themes x 360 / 1280 px | 0 violations |
| horizontal overflow, 4 pages x 14 widths (320 ... 1920 px) | none |

### Known differences from Figma

- The phone layout shows the period switch above the chart (document order) and keeps all four rows of the
  position card; the Figma phone frame hides one row.
- Input icons and the donut centre label come from the design but need extra markup; the donut label was added,
  field icons were left out.
- The chart images are exported dark PNGs, so they stay dark panels in the light theme.

