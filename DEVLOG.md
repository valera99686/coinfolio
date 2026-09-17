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

## Week 3
-

## Week 4
-
