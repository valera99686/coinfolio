import{c as G,e as L}from"./common-DCB5gK-q.js";import{s as R,t as $,h as i,u as P,d as Q,n as g,f as b,k as U,g as Z,v as Y,i as A}from"./main-B7_KIXTQ.js";function H(t,a){t.setAttribute("aria-pressed",String(a)),t.classList.toggle("icon-button--active",a)}async function z(t,{id:a,name:s}){const e=t.getAttribute("aria-pressed")==="true";H(t,!e),t.disabled=!0;try{return await G.setWatched(a,!e),R($(e?"watch.removed":"watch.added",{name:s}),{tone:"success",timeout:3e3}),!0}catch(r){return H(t,e),R($("watch.failed",{name:s})+" "+r.message,{tone:"error"}),!1}finally{t.disabled=!1}}function tt(t,{numeric:a=[],allowed:s={}}={}){const e=(r,o)=>{if(a.includes(r)){const n=Number(o);return Number.isInteger(n)&&n>0?n:t[r]}return s[r]&&!s[r].includes(o)?t[r]:String(o)};return{defaults:t,read(r=window.location.search){const o=new URLSearchParams(r),n={...t};for(const c of Object.keys(t))o.has(c)&&(n[c]=e(c,o.get(c)));return n},toSearch(r){const o=new URLSearchParams;for(const[c,l]of Object.entries(r))c in t&&l!==""&&l!==t[c]&&o.set(c,l);const n=o.toString();return n?`?${n}`:""},href(r){return`${window.location.pathname}${this.toSearch(r)}${window.location.hash}`},write(r,{replace:o=!1}={}){const n=this.href(r);n!==`${window.location.pathname}${window.location.search}${window.location.hash}`&&window.history[o?"replaceState":"pushState"](r,"",n)}}}const C=t=>P((t.at(-1)-t[0])/t[0]*100),D=t=>t.map(([a,s],e)=>`${e?"L":"M"}${a.toFixed(1)} ${s.toFixed(1)}`).join(" ");function O(t,{cls:a="",width:s=96,height:e=32}={}){const r=C(t),o=Math.min(...t),n=Math.max(...t)-o||1,c=(s-2)/(t.length-1),l=t.map((p,m)=>[1+m*c,3+(e-6)*(1-(p-o)/n)]),d=D(l);return i`<svg class="sparkline sparkline--${r}${a?" "+a:""}" viewBox="0 0 ${s} ${e}" width="${s}" height="${e}" role="img"
    aria-label="${$("trend."+r)}"><path class="sparkline__area" d="${d} L${s-1} ${e} L1 ${e} Z"/><path class="sparkline__line" d="${d}"/></svg>`}const X={"1h":[60,"minute","HH:mm"],"24h":[24,"hour","HH:mm"],"1d":[24,"hour","HH:mm"],"7d":[7,"day","MMM D"],"1w":[7,"day","MMM D"],"1m":[30,"day","MMM D"],"1y":[12,"month","MMM YYYY"],all:[60,"month","MMM YYYY"]};function j(t,a,s){const[e,r,o]=X[t],n=Q(a),c=n.subtract(e,r),l=n.diff(c);return Array.from({length:s},(d,p)=>c.add(l*p/(s-1),"millisecond").format(o))}function q(t,a){return Array.from({length:4},(s,e)=>a-(a-t)*e/3)}const y=t=>t>=1e3?"$"+(t/1e3).toFixed(1)+"k":"$"+(t>=10?t.toFixed(1):t.toPrecision(3));function at(t,{period:a,asOf:s,ratio:e=[744,300],labels:r=7,color:o=null,label:n="chart.alt"}={}){const[c,l]=e,d=8,p=64,m=14,u=34,f=Math.min(...t),x=Math.max(...t),k=x-f||1,E=o??C(t),M=c-d-p,S=l-m-u,F=t.map((_,h)=>[d+M*h/(t.length-1),m+S*(1-(_-f)/k)]),v=D(F),w=F.at(-1),N=q(f,x),W=j(a,s,r);return i`<svg class="line-chart line-chart--${E}" viewBox="0 0 ${c} ${l}" role="img" aria-label="${$(n,{from:y(t[0]),to:y(t.at(-1))})}">
    <defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop class="line-chart__stop line-chart__stop--top" offset="0"/><stop class="line-chart__stop line-chart__stop--bottom" offset="1"/></linearGradient></defs>
    ${N.map(_=>{const h=m+S*(1-(_-f)/k);return i`<line class="line-chart__grid" x1="${d}" x2="${c-p}" y1="${h.toFixed(1)}" y2="${h.toFixed(1)}"/><text class="line-chart__tick" x="${c-p+8}" y="${(h+4).toFixed(1)}">${y(_)}</text>`})}
    <path class="line-chart__area" d="${v} L${w[0].toFixed(1)} ${l-u} L${d} ${l-u} Z" fill="url(#chart-fill)"/>
    <path class="line-chart__line" d="${v}"/>
    <circle class="line-chart__dot" cx="${w[0].toFixed(1)}" cy="${w[1].toFixed(1)}" r="4"/>
    ${W.map((_,h)=>i`<text class="line-chart__label" x="${(d+M*h/(r-1)).toFixed(1)}" y="${l-10}" text-anchor="${h===0?"start":h===r-1?"end":"middle"}">${_}</text>`)}
  </svg>`}function st(t,{period:a,asOf:s,count:e=5}){return j(a,s,e).map((o,n)=>({label:o,value:t[Math.round((t.length-1)*n/(e-1))]}))}function et(t,{size:a=176,stroke:s=22,cls:e="",label:r=""}={}){const o=(a-s)/2-4,n=2*Math.PI*o,c=t.length>1?3:0;let l=0;const d=t.map(p=>{const m=Math.max(p.share/100*n-c,0),u=i`<circle class="donut__slice donut__slice--${p.id}" cx="${a/2}" cy="${a/2}" r="${o}" fill="none" stroke-width="${s}"
      stroke-dasharray="${m.toFixed(2)} ${(n-m).toFixed(2)}" stroke-dashoffset="${(-l).toFixed(2)}" transform="rotate(-90 ${a/2} ${a/2})"/>`;return l+=p.share/100*n,u});return i`<svg class="donut${e?" "+e:""}" viewBox="0 0 ${a} ${a}" width="${a}" height="${a}" role="img" aria-label="${r}">${d}</svg>`}const B=t=>`./asset.html#/item/${encodeURIComponent(t)}`,I=(t,a)=>i`<button class="icon-button icon-button--plain ${a}${t.watched?" icon-button--active":""}" type="button" aria-pressed="${String(!!t.watched)}" data-action="watch">${A("star")}<span class="visually-hidden">${$("asset.watch")} ${t.name}</span></button>`;function rt(t,{rank:a=t.rank,share:s=0,mod:e=""}={}){const r=t.amount>0;return i`<tr class="asset-row${e?" asset-row--"+e:""}" data-asset-id="${t.id}" itemscope itemtype="https://schema.org/ExchangeRateSpecification">
    <td class="asset-row__rank">${a}</td>
    <th class="asset-row__asset" scope="row">
      <a class="asset-row__link" href="${B(t.id)}">
        <img class="asset-row__logo" src="./img/coins/${t.id}.svg" alt="" width="32" height="32">
        <span class="asset-row__name" itemprop="name">${t.name}</span>
        <abbr class="asset-row__symbol" itemprop="currency" title="${t.name}">${t.symbol}</abbr>
      </a>
    </th>
    <td class="asset-row__price" itemprop="currentExchangeRate" itemscope itemtype="https://schema.org/UnitPriceSpecification">
      <data itemprop="price" value="${t.price}">${g(t.price)}</data>
      <meta itemprop="priceCurrency" content="USD">
    </td>
    <td class="asset-row__change">${L(t.change24h)}</td>
    <td class="asset-row__holdings">${r?i`<data class="asset-row__value" value="${t.value}">${b(t.value)}</data>
        <span class="asset-row__amount">${U(t.amount,t.price)} ${t.symbol}</span>`:i`<span class="asset-row__empty">${$("asset.notHeld")}</span>`}</td>
    <td class="asset-row__allocation">${r?i`<meter class="asset-row__meter" min="0" max="100" value="${s.toFixed(1)}">${s.toFixed(1)}%</meter>
        <span class="asset-row__share">${s.toFixed(1)}%</span>`:i`<span class="asset-row__empty">—</span>`}</td>
    <td class="asset-row__chart">${O(t.spark,{cls:"asset-row__sparkline"})}</td>
    <td class="asset-row__actions">${I(t,"asset-row__watch")}</td>
  </tr>`}const nt=()=>i`<tr class="asset-skeleton" aria-hidden="true"><td class="asset-skeleton__cell" colspan="8"><span class="skeleton"></span></td></tr>`;function ot(t){return i`<article class="coin-card coin-card--${P(t.change24h)}" data-asset-id="${t.id}" itemscope itemtype="https://schema.org/ExchangeRateSpecification">
    <header class="coin-card__header">
      <img class="coin-card__logo" src="./img/coins/${t.id}.svg" alt="" width="32" height="32">
      <h3 class="coin-card__title" itemprop="name"><a class="coin-card__link" href="${B(t.id)}">${t.name}</a></h3>
      <abbr class="coin-card__symbol" itemprop="currency" title="${t.name}">${t.symbol}</abbr>
      ${I(t,"coin-card__watch")}
    </header>
    <p class="coin-card__price" itemprop="currentExchangeRate" itemscope itemtype="https://schema.org/UnitPriceSpecification">
      <data itemprop="price" value="${t.price}">${g(t.price)}</data>
      <meta itemprop="priceCurrency" content="USD">
    </p>
    ${L(t.change24h,{cls:"coin-card__badge"})}
    ${O(t.spark,{cls:"coin-card__sparkline"})}
  </article>`}const J={buy:"plus",sell:"minus",transfer:"swap"},T=t=>t.type==="sell"?-t.amount:t.amount;function ct(t,a){const s=Math.round(t.amount*t.price*100)/100,e=(t.type==="sell"?"−":"+")+U(t.amount,a.price)+" "+a.symbol;return i`<li class="tx tx--${t.type}">
    <span class="tx__icon">${A(J[t.type])}</span>
    <p class="tx__title"><span>${$("tx."+t.type)}</span> ${a.symbol}</p>
    <time class="tx__date" datetime="${t.date}">${Y(t.date)}</time>
    <p class="tx__amount"><data value="${T(t)}">${e}</data></p>
    <p class="tx__value"><data value="${s}">${b(s)}</data></p>
  </li>`}const it=()=>i`<li class="tx tx--skeleton" aria-hidden="true"><span class="skeleton"></span></li>`;function lt(t,a){const s=Math.round(t.amount*t.price*100)/100,e=(t.type==="sell"?"−":"+")+Z(t.amount,a.price>=100?4:2)+" "+a.symbol;return i`<tr class="history__row history__row--${t.type}">
    <th class="history__date" scope="row"><time datetime="${t.date}">${Y(t.date)}</time></th>
    <td class="history__type">${$("form."+t.type)}</td>
    <td class="history__amount"><data value="${T(t)}">${e}</data></td>
    <td class="history__price"><data value="${t.price}">${g(t.price)}</data></td>
    <td class="history__total"><data value="${s}">${b(s)}</data></td>
  </tr>`}const dt=()=>i`<tr class="history__skeleton" aria-hidden="true"><td class="history__skeleton-cell" colspan="5"><span class="skeleton"></span></td></tr>`;export{nt as a,rt as b,ct as c,ot as d,z as e,st as f,y as g,et as h,tt as i,dt as j,lt as k,at as l,it as t};
