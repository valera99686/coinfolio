// Dev tool: screenshot a page of the running Vite dev server at a given viewport width.
//   node scripts/shot.mjs <page> <width> <out.png> [--dpr=1] [--theme=light] [--lang=uk]
//        [--selector=".balance"] [--height=900] [--viewport-only]
// Needs `npm run dev` on http://localhost:5173 and a local Chrome.
// Also reports horizontal overflow and Vite/Sass compile errors.
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import puppeteer from "puppeteer-core";

const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ORIGIN = process.env.DEV_URL || "http://localhost:5173";

const [page = "index", width = "1280", out = "shot.png", ...flags] = process.argv.slice(2);
const opt = Object.fromEntries(
  flags.map((f) => {
    const [k, v = "true"] = f.replace(/^--/, "").split("=");
    return [k, v];
  }),
);

mkdirSync(dirname(out), { recursive: true });
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
try {
  const tab = await browser.newPage();
  await tab.setViewport({
    width: Number(width),
    height: Number(opt.height || 900),
    deviceScaleFactor: Number(opt.dpr || 1),
  });
  if (opt.theme) {
    await tab.evaluateOnNewDocument((theme) => localStorage.setItem("coinfolio-theme", theme), opt.theme);
  }
  const query = opt.lang ? `?lang=${opt.lang}` : "";
  await tab.goto(`${ORIGIN}/${page}.html${query}`, { waitUntil: "networkidle0", timeout: 60000 });
  await tab.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 400));

  const overlay = await tab.evaluate(() => document.querySelector("vite-error-overlay")?.shadowRoot?.textContent?.slice(0, 1500));
  if (overlay) {
    console.error("VITE/SASS ERROR:\n" + overlay.trim());
    process.exitCode = 2;
  }

  const report = await tab.evaluate(() => {
    const doc = document.documentElement;
    const vw = doc.clientWidth;
    const offenders = [];
    for (const el of document.body.querySelectorAll("*")) {
      const box = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (style.position === "fixed" || box.width === 0) {
        continue;
      }
      if (box.right > vw + 1 || box.left < -1) {
        const parentScroll = el.closest("[data-scroll], .scroll-x");
        if (!parentScroll) {
          offenders.push(`${el.tagName.toLowerCase()}.${[...el.classList].join(".")} [${Math.round(box.left)}..${Math.round(box.right)}]`);
        }
      }
    }
    return {
      vw,
      scrollWidth: doc.scrollWidth,
      height: doc.scrollHeight,
      stylesheets: document.styleSheets.length,
      offenders: offenders.slice(0, 8),
    };
  });
  console.log(`${page} @${width}px  page height ${report.height}px  stylesheets ${report.stylesheets}`);
  if (report.scrollWidth > report.vw) {
    console.log(`HORIZONTAL OVERFLOW: scrollWidth ${report.scrollWidth} > viewport ${report.vw}`);
  }
  if (report.offenders.length) {
    console.log("elements outside viewport:\n  " + report.offenders.join("\n  "));
  }

  if (opt.selector) {
    const el = await tab.$(opt.selector);
    if (!el) {
      console.error(`selector not found: ${opt.selector}`);
      process.exitCode = 3;
    } else {
      await el.screenshot({ path: out });
    }
  } else {
    await tab.screenshot({ path: out, fullPage: !opt["viewport-only"] });
  }
  console.log(`saved ${out}`);
} finally {
  await browser.close();
}
