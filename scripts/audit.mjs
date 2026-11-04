/* global axe */
// Accessibility and responsive audit of the running app (dev server + API must be up).
//   node scripts/audit.mjs axe        axe-core (WCAG 2.2 AA + best practice) on every page, both themes, 360 and 1280 px
//   node scripts/audit.mjs overflow   horizontal overflow and touch-target sizes on 14 widths
import { readFileSync } from "node:fs";
import puppeteer from "puppeteer-core";

const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ORIGIN = process.env.DEV_URL || "http://localhost:5173";
const axeSource = readFileSync("node_modules/axe-core/axe.min.js", "utf8");
const pages = ["index", "assets", "asset", "profile"];
const mode = process.argv[2] || "axe";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function open(browser, path, width, theme) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900 });
  if (theme) {
    await page.evaluateOnNewDocument((t) => localStorage.setItem("coinfolio-theme", t), theme);
  }
  await page.goto(`${ORIGIN}/${path}.html`, { waitUntil: "networkidle0", timeout: 60000 });
  await sleep(1500);
  return page;
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
let failed = false;
try {
  if (mode === "axe") {
    for (const theme of ["dark", "light"]) {
      for (const width of [360, 1280]) {
        for (const name of pages) {
          const page = await open(browser, name, width, theme);
          await page.evaluate(axeSource);
          const violations = await page.evaluate(async () => {
            const result = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa", "best-practice"] } });
            return result.violations.map((v) => ({ id: v.id, impact: v.impact, count: v.nodes.length, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(" ") + " :: " + (n.any[0]?.message ?? n.all[0]?.message ?? "").slice(0, 120)) }));
          });
          console.log(`${violations.length ? "FAIL" : "ok  "} ${name} ${theme} ${width}px  ${violations.length} violation(s)`);
          for (const v of violations) {
            console.log(`   - ${v.id} (${v.impact}) x${v.count}: ${v.nodes.join(" | ")}`);
          }
          failed ||= violations.length > 0;
          await page.close();
        }
      }
    }
  } else {
    for (const width of [320, 360, 375, 390, 414, 600, 768, 820, 1024, 1180, 1279, 1280, 1440, 1920]) {
      for (const name of pages) {
        const page = await open(browser, name, width);
        const info = await page.evaluate(() => {
          const doc = document.documentElement;
          const small = [];
          for (const el of document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, summary")) {
            const style = getComputedStyle(el);
            const box = el.getBoundingClientRect();
            if (style.visibility === "hidden" || style.display === "none" || !box.width || !box.height || el.closest(".visually-hidden, .skeleton")) {
              continue;
            }
            if (el.matches("input.segmented__input, input.chips__input, input[type=file], .switch__input, .button--small, .avatar--sm")) {
              continue; // drawn by their labels; switches, small buttons (touch screens) and the avatar have an extended hit area
            }
            if (el.matches("a") && style.display === "inline" && el.closest("p, footer")) {
              continue; // links inside a sentence
            }
            if (box.height < 43.5 && (el.matches("button, summary") || box.width < 43.5)) {
              small.push(`${el.tagName.toLowerCase()}.${[...el.classList].slice(0, 2).join(".")} ${Math.round(box.width)}x${Math.round(box.height)}`);
            }
          }
          return { overflow: doc.scrollWidth > doc.clientWidth, small: [...new Set(small)] };
        });
        if (info.overflow) {
          failed = true;
        }
        console.log(`${info.overflow ? "FAIL" : "ok  "} ${name} ${width}px overflow=${info.overflow}${info.small.length ? "  small targets: " + info.small.join(", ") : ""}`);
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
}
process.exitCode = failed ? 1 : 0;
