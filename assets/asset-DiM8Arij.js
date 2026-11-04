import{h as s,t as a,i as d,n as p,o as u,e as c,p as h,f as n,k as m,a as $,q as b}from"./main-CFzDqIMR.js";import{e as y}from"./common-B4A-HMxj.js";const f=["1h","24h","7d","1m","1y","all"],v=t=>new URL(t).hostname.replace(/^www\./,"");function k(t){const e=encodeURIComponent(t.id);return s`<header class="asset__header">
    <img class="asset__logo" src="./img/coins/${t.id}.svg" alt="" width="48" height="48">
    <h1 class="asset__title" itemprop="name">${t.name}</h1>
    <ul class="tags asset__tags">
      <li class="tags__item"><abbr itemprop="currency" title="${t.name}">${t.symbol}</abbr></li>
      <li class="tags__item"><span>${a("detail.rank")}</span>${t.rank}</li>
      ${t.amount>0?s`<li class="tags__item tags__item--accent">${a("detail.inPortfolio")}</li>`:""}
    </ul>
    <div class="asset__actions">
      <button class="icon-button asset__watch" type="button" aria-pressed="${String(!!t.watched)}" data-action="watch">
        ${d("star")}
        <span class="visually-hidden"><span>${a("asset.watch")}</span> ${t.name}</span>
      </button>
      <a class="button button--secondary asset__alert" href="./profile.html#notifications">${d("bell")}<span>${a("detail.alert")}</span></a>
      <a class="button button--secondary asset__action" href="#/item/${e}/trade?type=sell">${a("form.sell")}</a>
      <a class="button button--primary asset__action" href="#/item/${e}/trade?type=buy">${d("plus")}<span>${a("detail.buyCoin",{symbol:t.symbol})}</span></a>
    </div>
  </header>`}function g(t){return s`<fieldset class="segmented price__period">
    <legend class="segmented__legend visually-hidden">${a("chart.period")}</legend>
    ${f.map(e=>s`<input class="segmented__input" type="radio" name="price-period" id="price-period-${e}" value="${e}"${e===t?s` checked`:""}>
      <label class="segmented__label" for="price-period-${e}">${a("period."+e)}</label>`)}
  </fieldset>`}function P(t,e){const i=t.price/(1+t.change24h/100);return s`<section class="price card asset__price" aria-labelledby="price-title">
    <h2 class="price__title" id="price-title">${t.symbol} / USD</h2>
    <p class="price__value" itemprop="currentExchangeRate" itemscope itemtype="https://schema.org/UnitPriceSpecification">
      <data itemprop="price" value="${t.price}">${p(t.price)}</data>
      <meta itemprop="priceCurrency" content="USD">
    </p>
    <p class="price__change">${y(t.change24h)}<data value="${t.price-i}">${u(t.price-i)}</data><span>${a("dash.today")}</span></p>
    ${g(e)}
    <figure class="chart price__chart">
      <div data-slot="chart"></div>
      <div data-slot="chart-data"></div>
      <figcaption class="chart__caption" data-slot="chart-caption"></figcaption>
    </figure>
  </section>`}function q(t,e){return s`<details class="chart__data">
    <summary class="chart__summary">${a("chart.data")}</summary>
    <table class="data-table">
      <caption class="data-table__caption">${e}</caption>
      <thead><tr><th scope="col">${a("chart.date")}</th><th scope="col">${a("chart.value")}</th></tr></thead>
      <tbody>${t.map(i=>s`<tr><th scope="row">${i.label}</th><td><data value="${i.value}">${i.text}</data></td></tr>`)}</tbody>
    </table>
  </details>`}function C(t,{dominance:e,updated:i}){const l=(r,o)=>s`<div class="stats__item"><dt>${r}</dt><dd>${o}</dd></div>`;return s`<section class="stats card asset__stats" aria-labelledby="stats-title">
    <h2 class="stats__title" id="stats-title">${a("stats.title")}</h2>
    <p class="stats__updated"><span>${a("stats.updated")}</span> <time datetime="${i.iso}">${i.text}</time></p>
    <dl class="stats__list">
      ${l(a("stats.cap"),s`<data value="${t.marketCap}">$${c(t.marketCap)}</data>`)}
      ${l(a("stats.volume"),"$"+c(t.volume24h))}
      ${l(a("stats.supply"),`${c(t.supply)} ${t.symbol}`)}
      ${l(a("stats.ath"),p(t.ath))}
      ${l(a("stats.range"),h(t.low24h,t.high24h))}
      ${l(a("stats.dominance"),e===null?"—":`${e.toFixed(1)}%`)}
    </dl>
  </section>`}function S(t,e){return s`<section class="about card asset__about" aria-labelledby="about-title">
    <h2 class="about__title" id="about-title">${a("about.titleCoin",{name:t.name})}</h2>
    <p class="about__text" itemprop="description">${(e==null?void 0:e.about)??""}</p>
    <ul class="about__links">
      ${e!=null&&e.website?s`<li class="about__link-item"><a class="link-button" href="${e.website}" rel="external noopener">${d("globe")} ${v(e.website)}</a></li>`:""}
      ${e!=null&&e.whitepaper?s`<li class="about__link-item"><a class="link-button" href="${e.whitepaper}" rel="external noopener">${d("download")}<span>${a("about.paper")}</span></a></li>`:""}
    </ul>
  </section>`}function U(t,e){const i=t.amount>0,l=t.value-t.costBasis,r=t.costBasis?l/t.costBasis*100:0,o=l>=0?"up":"down";return s`<aside class="position card asset__position" aria-labelledby="position-title">
    <h2 class="position__title" id="position-title">${a("position.title")}</h2>
    ${i?s`<p class="position__value"><data value="${t.value}">${n(t.value)}</data></p>
        <p class="position__amount">${a("position.shareOf",{amount:m(t.amount,t.price),symbol:t.symbol,share:e.toFixed(1)})}</p>
        <meter class="position__meter" min="0" max="100" value="${e.toFixed(1)}">${e.toFixed(1)}%</meter>
        <dl class="position__list">
          <div class="position__row"><dt>${a("position.avg")}</dt><dd>${p(t.avgBuy)}</dd></div>
          <div class="position__row"><dt>${a("position.cost")}</dt><dd>${n(t.costBasis)}</dd></div>
          <div class="position__row position__row--${o}"><dt>${a("position.pnl")}</dt><dd>${$(l)}</dd></div>
          <div class="position__row position__row--${o}"><dt>${a("position.return")}</dt><dd>${b(r)}</dd></div>
        </dl>`:s`<p class="position__value">${a("position.empty",{name:t.name})}</p><p class="position__amount">${a("position.emptyHint")}</p>`}
  </aside>`}function B(t,{now:e,type:i="buy"}){const l=r=>s`<p class="field__error" id="trade-${r}-error" data-error-for="${r}"></p>`;return s`<section class="trade card asset__trade" id="add-transaction" aria-labelledby="trade-title">
    <h2 class="trade__title" id="trade-title">${a("nav.add")}</h2>
    <form class="trade__form" id="trade-form" action="#" method="post">
      <fieldset class="segmented segmented--block">
        <legend class="segmented__legend visually-hidden">${a("form.type")}</legend>
        ${["buy","sell","transfer"].map(r=>s`<input class="segmented__input" type="radio" name="type" id="trade-${r}" value="${r}"${r===i?s` checked`:""}>
          <label class="segmented__label" for="trade-${r}">${a("form."+r)}</label>`)}
      </fieldset>
      <div class="field">
        <label class="field__label" for="trade-qty">${a("form.qty")}</label>
        <input class="field__input" id="trade-qty" name="amount" type="number" inputmode="decimal" min="0.00000001" step="any"
          placeholder="0.0250" required aria-describedby="trade-qty-hint trade-amount-error" aria-invalid="false">
        <p class="field__hint" id="trade-qty-hint"></p>
        ${l("amount")}
      </div>
      <div class="field">
        <label class="field__label" for="trade-price">${a("form.price")}</label>
        <input class="field__input" id="trade-price" name="price" type="number" inputmode="decimal" min="0" step="any"
          value="${t.price}" required aria-describedby="trade-price-error" aria-invalid="false" data-no-draft>
        ${l("price")}
      </div>
      <div class="field">
        <label class="field__label" for="trade-date">${a("form.date")}</label>
        <input class="field__input" id="trade-date" name="date" type="datetime-local" value="${e}" max="${e}" required
          aria-describedby="trade-date-error" aria-invalid="false" data-no-draft>
        ${l("date")}
      </div>
      <div class="field">
        <label class="field__label" for="trade-note">${a("form.note")}</label>
        <textarea class="field__textarea" id="trade-note" name="note" rows="2" maxlength="140" aria-describedby="trade-note-error" aria-invalid="false"></textarea>
        ${l("note")}
      </div>
      <dl class="trade__summary">
        <div class="trade__row"><dt>${a("form.fee")}</dt><dd data-fee>${n(0)}</dd></div>
        <div class="trade__row trade__row--total">
          <dt>${a("form.total")}</dt>
          <dd><output class="trade__total" name="total" for="trade-qty trade-price" data-total>${n(0)}</output></dd>
        </div>
      </dl>
      <p class="trade__status" role="status" data-status></p>
      <button class="button button--primary button--block" type="submit">${d("plus")}<span>${a("nav.add")}</span></button>
    </form>
  </section>`}function R(t,{tx:e,summary:i}){const l=encodeURIComponent(t.id),r=(o,_)=>s`<li class="tabs__item"><a class="tabs__link${e===o?" tabs__link--active":""}" href="?${o?`tx=${o}`:""}#/item/${l}"
    data-tx="${o}"${e===o?s` aria-current="true"`:""}>${_}</a></li>`;return s`<section class="history card asset__history" id="transactions" aria-labelledby="history-title">
    <header class="section-header">
      <h2 class="section-header__title" id="history-title">${a("history.titleCoin",{symbol:t.symbol})}</h2>
      <p class="section-header__subtitle" data-slot="history-summary">${i}</p>
      <nav class="tabs section-header__tabs" aria-label="${a("history.filter")}">
        <ul class="tabs__list">${r("",a("history.all"))}${r("buy",a("history.buys"))}${r("sell",a("history.sells"))}</ul>
      </nav>
    </header>
    <table class="history__table" aria-busy="true">
      <caption class="history__caption visually-hidden">${a("history.captionCoin",{name:t.name})}</caption>
      <thead>
        <tr>
          <th class="history__heading" scope="col">${a("history.date")}</th>
          <th class="history__heading" scope="col">${a("history.type")}</th>
          <th class="history__heading history__heading--num" scope="col">${a("history.amount")}</th>
          <th class="history__heading history__heading--num" scope="col">${a("form.price")}</th>
          <th class="history__heading history__heading--num" scope="col">${a("history.value")}</th>
        </tr>
      </thead>
      <tbody data-slot="history-list"></tbody>
    </table>
  </section>`}function D(){const t=(e,i)=>s`<section class="card ${e}" aria-hidden="true"><span class="skeleton skeleton--${i}"></span></section>`;return s`<header class="asset__header" aria-hidden="true">
      <span class="skeleton skeleton--round"></span>
      <span class="skeleton skeleton--value"></span>
    </header>
    <div class="asset__main">${t("asset__price","xl")}${t("asset__stats","md")}${t("asset__about","sm")}</div>
    <div class="asset__side">${t("asset__position","lg")}${t("asset__trade","xxl")}</div>
    ${t("asset__history","lg")}`}export{f as P,D as a,k as b,q as c,S as d,U as e,R as h,P as p,C as s,B as t};
