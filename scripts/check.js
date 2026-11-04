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

// Text that JavaScript renders: t("key") with a literal key must exist in every dictionary, and a key built at
// run time (t("period." + name)) must have at least one entry with that prefix.
const jsFiles = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(path);
    } else if (path.endsWith(".js")) {
      jsFiles.push(path);
    }
  }
};
walk("src/js");
const jsKeys = new Set();
const jsPrefixes = new Set();
for (const file of jsFiles) {
  const code = readFileSync(file, "utf8");
  for (const [, key] of code.matchAll(/\bt\(\s*["'`]([\w.]+)["'`]\s*[,)]/g)) {
    jsKeys.add(key);
  }
  for (const [, prefix] of code.matchAll(/\bt\(\s*["'`]([\w.]+\.)["'`]\s*\+/g)) {
    jsPrefixes.add(prefix);
  }
  for (const [, prefix] of code.matchAll(/\bt\(`([\w.]+?)\$\{/g)) {
    jsPrefixes.add(prefix);
  }
}
jsKeys.forEach((key) => keys.add(key));
const missingPrefix = Object.entries(locales).flatMap(([file, dict]) =>
  [...jsPrefixes].filter((prefix) => !Object.keys(dict).some((key) => key.startsWith(prefix))).map((prefix) => `${file}: ${prefix}*`),
);

const missing = Object.entries(locales).flatMap(([file, dict]) =>
  [...keys].filter((key) => !(key in dict)).map((key) => `${file}: ${key}`),
);

console.log(`pages: ${pages.length}`);
console.log(`relative links and images checked: ${links}, broken: ${broken.length}`);
console.log(`i18n keys used: ${keys.size} (${jsKeys.size} from scripts), locales: ${Object.keys(locales).join(", ")}, missing: ${missing.length + missingPrefix.length}`);
[...broken, ...missing, ...missingPrefix].forEach((line) => console.log("  " + line));
process.exitCode = broken.length || missing.length || missingPrefix.length ? 1 : 0;
