// Post-build check of the COMPILED css: size budget and duplicated declaration blocks.
// The same block of 3+ declarations repeated in 3+ separate rules should be a mixin or a placeholder.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import postcss from "postcss";

const assets = "dist/assets";
const file = readdirSync(assets).find((f) => f.endsWith(".css"));
if (!file) {
  console.error("CSS check: no compiled stylesheet in dist/assets");
  process.exit(1);
}
const css = readFileSync(join(assets, file), "utf8");
const raw = Buffer.byteLength(css);
const gz = gzipSync(css).length;

const MIN_DECLS = 3;
const MAX_REPEATS = 2; // a block may appear at most this many times
const GZIP_BUDGET = 30 * 1024;

const seen = new Map();
let rules = 0;
postcss.parse(css).walkRules((rule) => {
  if (rule.parent?.type === "atrule" && /keyframes$/.test(rule.parent.name)) {
    return;
  }
  rules += 1;
  const decls = [];
  rule.each((node) => {
    if (node.type === "decl") {
      decls.push(`${node.prop}:${node.value}`);
    }
  });
  if (decls.length < MIN_DECLS) {
    return;
  }
  const context = rule.parent?.type === "atrule" ? `${rule.parent.name} ${rule.parent.params}` : "";
  const key = `${context}|${[...decls].sort().join(";")}`;
  seen.set(key, [...(seen.get(key) ?? []), rule.selector.split(",")[0].trim()]);
});

const duplicates = [...seen.entries()].filter(([, selectors]) => selectors.length > MAX_REPEATS);
const important = (css.match(/!important/g) ?? []).length;

console.log(`CSS: ${file}  ${(raw / 1024).toFixed(1)} kB  gzip ${(gz / 1024).toFixed(1)} kB  ${rules} rules  !important x${important}`);
let failed = false;
if (gz > GZIP_BUDGET) {
  console.error(`  over budget: gzip ${(gz / 1024).toFixed(1)} kB > ${GZIP_BUDGET / 1024} kB`);
  failed = true;
}
if (duplicates.length) {
  failed = true;
  console.error(`  duplicated blocks (${MIN_DECLS}+ declarations in more than ${MAX_REPEATS} rules): ${duplicates.length}`);
  for (const [key, selectors] of duplicates.slice(0, 8)) {
    console.error(`   - ${selectors.length}x  ${selectors.slice(0, 4).join(", ")}${selectors.length > 4 ? ", ..." : ""}`);
    console.error(`       ${key.split("|")[1].slice(0, 110)}`);
  }
}
if (failed) {
  process.exit(1);
}
console.log("CSS check: ok (within budget, no repeated declaration blocks)");
