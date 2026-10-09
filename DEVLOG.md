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

## Week 4
-
