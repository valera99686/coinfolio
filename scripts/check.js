// Post-build checks: relative links resolve to files in dist/,
// every data-i18n key exists in all locale dictionaries.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dist = "dist";
const pages = readdirSync(dist).filter((f) => f.endsWith(".html"));
const locales = Object.fromEntries(
  readdirSync("public/locales").map((f) => [f, JSON.parse(readFileSync(join("public/locales", f), "utf8"))]),
);

let links = 0;
const broken = [];
const keys = new Set();

for (const page of pages) {
  const html = readFileSync(join(dist, page), "utf8");
  const urls = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const [, srcset] of html.matchAll(/srcset="([^"]+)"/g)) {
    urls.push(...srcset.split(",").map((part) => part.trim().split(/\s+/)[0]));
  }
  for (const url of urls) {
    if (/^(https?:|mailto:|#|\?)/.test(url)) {
      continue;
    }
    const path = url.replace(/&amp;/g, "&").split(/[?#]/)[0];
    links += 1;
    if (!existsSync(join(dist, path))) {
      broken.push(`${page}: ${url}`);
    }
  }
  for (const [, key] of html.matchAll(/data-i18n="([^"]+)"/g)) {
    keys.add(key);
  }
  for (const [, pairs] of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
    pairs.split(";").forEach((pair) => keys.add(pair.split(":")[1].trim()));
  }
}

const missing = Object.entries(locales).flatMap(([file, dict]) =>
  [...keys].filter((key) => !(key in dict)).map((key) => `${file}: ${key}`),
);

console.log(`pages: ${pages.length}`);
console.log(`relative links and images checked: ${links}, broken: ${broken.length}`);
console.log(`i18n keys used: ${keys.size}, locales: ${Object.keys(locales).join(", ")}, missing: ${missing.length}`);
[...broken, ...missing].forEach((line) => console.log("  " + line));
process.exitCode = broken.length || missing.length ? 1 : 0;
