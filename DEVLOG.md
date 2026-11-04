# DEVLOG

## Week 1 — Lab 1 (Figma)
- Picked topic 1 (Crypto Portfolio Tracker), named the product Coinfolio.
- Built the design system: 15 colour variables (dark theme, gold accent), 13 text styles
  (Space Grotesk + Inter), grid styles 12/8/4 columns, 61 components with 193 variants.
- Designed Dashboard, Assets, Asset details and Profile for 1280 px and 360 px.
- Problem: the first accent colour (violet) was rejected — switched to gold; because all
  fills are bound to variables, one change updated every mockup.

## Week 2 — Lab 2 (HTML & semantics)
- Multi-page Vite build; EJS partials rendered by a small Vite plugin (`build/ejs-pages.js`).
- Semantic landmarks, tables with captions and scoped headers, forms with labels, fieldsets
  and hints (`aria-describedby`), breadcrumbs, pagination, skip link.
- Responsive images: `<picture>` with mobile/desktop art direction, WebP + PNG fallbacks.
- schema.org microdata (`ExchangeRateSpecification`) for coins.
- i18n preparation: `data-i18n` / `data-i18n-attr`, English and Ukrainian dictionaries.
- Problem: ESLint 9 from the template no longer reads `.eslintrc.cjs` and rejects `--ext`;
  moved to the flat config (`eslint.config.js`).
- Problem: Vite tried to bundle `<link rel="alternate" href="?lang=…">` and crashed with EISDIR;
  language links stay in the footer instead.
- Problem: Schema Markup Validator read the watchlist cards' `name` as a URL — `itemprop` on
  `<a>` takes the `href`; moved `itemprop="name"` to the card heading.

Snippet I like — one partial renders both the table row and its microdata:

```html
<td itemprop="currentExchangeRate" itemscope itemtype="https://schema.org/UnitPriceSpecification">
  <data itemprop="price" value="64218.4">$64,218.40</data>
  <meta itemprop="priceCurrency" content="USD">
</td>
```

## Week 3 — Lab 3 (SCSS, responsive, BEM)
- Architecture 7-1 with `main.scss` that only contains `@use`; the abstracts layer emits no CSS (checked by
  `scripts/check-scss.mjs`).
- Figma variables became Sass maps, then CSS custom properties per theme, so the light theme is a second set of
  values and no component changed. The light palette is derived with `tint()` / `shade()`.
- Mobile first with three breakpoints from the Figma frames (360 / 768 / 1280). Tables turn into cards below 1280 px;
  the history table keeps real table markup and becomes cards on phones.
- Own 12-column grid (`row()` / `col()` with gutters as `gap`) so a column can be a card with its own background.
- Wrote the quality gates first: Stylelint (BEM pattern, nesting, specificity), a script for HEX and magic numbers,
  and a CSS check for repeated declaration blocks. The check found ten repeated blocks (text styles, grid rows);
  one placeholder per text style fixed it and screenshots stayed pixel-identical.
- Problem: `@extend` inside `@include media-up()` is not allowed, so a style that changes per breakpoint keeps
  `text-style()` there and everything else uses the placeholder.
- Problem: a margin on an element with `clear` is swallowed by the clearance; the fieldset legend gap is the legend's own margin.
- Problem: the list reset `ul[class]` beat every block that set a list margin; wrapping it in `:where()` fixed it.
- Problem: axe found low contrast in the light theme (gold text, green and red badges); added the `accent-text` role
  and darker light green and red.

Snippet I like: one mixin gives the balance (dashboard) and the price (asset page) the same grid:

```scss
.price {
  @include metric-panel('328 / 180', '744 / 300');
}
```

## Week 4 — Lab 4 (JS, API, forms)
- The data moved out of the code: `scripts/seed-db.mjs` writes `api/db.json` (36 coins, 48 transactions, six price
  series per coin, profile, wallets) with a seeded random walk, so the file is reproducible. The numbers of the mockups
  (balance $49,011.73, profit $7,761.73, day change $828.78) come out of the seed by calculation, not by copying.
- Classes with one job each: `HttpClient` (network), `ItemService` / `CoinService` (queries), `ListView` (DOM states),
  `Paginator`, `FormView`, `HashRouter`, `RequestCache`. Replacing json-server would touch the first two only.
- The server does the work: filter chips became `amount_gte`, `change24h_gte`, `watched`, search is `q`, sort is
  `_sort/_order`, the total comes from `X-Total-Count`. The client never filters an array.
- The write protection is part of the API: the public free host must not let anyone delete the coins, so `api/server.js`
  allows four kinds of writes and validates every body (and returns `422` with the fields).
- Problem: the guard read `req.body` before json-server's router had parsed it, so every valid POST was refused.
  The body is parsed in front of the guard now (`jsonServer.bodyParser`), and a test covers it.
- Problem: `aria-pressed="${false}"` printed an empty attribute (the template drops `false`), so the star had no state;
  found by the end-to-end test of the rollback, which could not read it.
- Problem: `q=` searches every field, and the long coin descriptions made `q=eth` match half of the list.
  The texts moved to their own collection (`/details`).
- Problem: the e2e run changed the data of the server it ran against; the checks that depend on the seed
  (counts, balances) run on a fresh API, the others compare with the API itself.
- The free host sleeps: the first request can take a minute, so a lost GET is repeated twice and the interface says
  that the server is waking up instead of failing at once.

Snippet I like: the optimistic update is one function, used by the table, the cards and the details page:

```js
applyWatch(button, !was);              // 1. show the result at once
try { await coinService.setWatched(id, !was); }
catch { applyWatch(button, was); }     // 3. roll back and tell the user
```

## Week 5
-
