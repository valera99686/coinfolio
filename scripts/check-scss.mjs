// Source-level rules for src/scss that stylelint has no rule for.
// In components/, layout/ and pages/ a value must come from a design token:
//   - no literal HEX colours (use color(...))
//   - no raw lengths in spacing properties (use space(...))
//   - no font-size / line-height / letter-spacing (use text-style(...))
//   - no numeric z-index (use z(...)) and no literal durations (use duration(...))
//   - no @import (use @use / @forward)
// main.scss must contain @use only; the abstracts layer must not emit CSS rules by itself.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "src/scss";
const STRICT = ["components", "layout", "pages"];
const problems = [];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : path.endsWith(".scss") ? [path] : [];
  });
}

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const SPACING = /^(margin|padding)(-(top|right|bottom|left|inline|block)(-(start|end))?)?$|^(gap|row-gap|column-gap)$/;
const LENGTH = /(?<![\w.#-])-?\d*\.?\d+(px|rem|em)\b/;

for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file).replaceAll("\\", "/");
  const code = stripComments(readFileSync(file, "utf8"));
  const lines = code.split("\n");
  const top = rel.split("/")[0];
  const fail = (n, msg) => problems.push(`${rel}:${n + 1}  ${msg}`);

  lines.forEach((line, n) => {
    if (/@import\b/.test(line)) {
      fail(n, "@import is deprecated, use @use / @forward");
    }
    if (!STRICT.includes(top)) {
      return;
    }
    if (/#[0-9a-fA-F]{3,8}\b/.test(line.replace(/\burl\([^)]*\)/g, ""))) {
      fail(n, "literal HEX colour, use color(role) from the palette");
    }
    const decl = line.match(/^\s*([a-z-]+)\s*:\s*(.+?);?\s*$/);
    if (!decl) {
      return;
    }
    const [, prop, value] = decl;
    if (SPACING.test(prop) && LENGTH.test(value.replace(/\b(space|rem)\([^)]*\)/g, ""))) {
      fail(n, `magic spacing value in "${prop}: ${value}", use space(n)`);
    }
    if (SPACING.test(prop) && /\brem\(/.test(value)) {
      fail(n, `rem() inside spacing "${prop}: ${value}", use space(n)`);
    }
    if (["font-size", "line-height", "letter-spacing"].includes(prop)) {
      fail(n, `"${prop}" in a component, use @include text-style(...)`);
    }
    if (prop === "z-index" && !/\bz\(/.test(value)) {
      fail(n, "numeric z-index, use z(layer)");
    }
    if (/transition|animation/.test(prop) && /(?<![\w(])\d*\.?\d+m?s\b/.test(value) && !/duration\(/.test(value)) {
      fail(n, `literal duration in "${prop}", use duration(...)`);
    }
  });
}

// main.scss: only @use / @forward and comments.
const main = stripComments(readFileSync(join(ROOT, "main.scss"), "utf8"))
  .split("\n")
  .filter((l) => l.trim() && !/^@(use|forward)\b/.test(l.trim()));
if (main.length) {
  problems.push(`main.scss must contain only @use, found: ${main[0].trim()}`);
}

// abstracts: no top-level rule that would compile to CSS (placeholders, @keyframes, :root, classes).
for (const file of walk(join(ROOT, "abstracts"))) {
  const code = stripComments(readFileSync(file, "utf8"));
  const topLevel = code.split("\n").filter((l) => /^[.#:@%[a-z*]/.test(l) && /\{\s*$/.test(l) && !/^@(mixin|function|if|else|each|for)/.test(l));
  for (const l of topLevel) {
    if (!l.startsWith("%")) {
      problems.push(`${relative(ROOT, file).replaceAll("\\", "/")}  abstracts must not emit CSS: "${l.trim()}"`);
    }
  }
}

const folders = ["abstracts", "base", "components", "layout", "pages", "themes", "vendors"];
for (const f of folders) {
  try {
    statSync(join(ROOT, f));
  } catch {
    problems.push(`missing 7-1 folder: ${f}/`);
  }
}

if (problems.length) {
  console.error(`SCSS rules: ${problems.length} problem(s)`);
  console.error(problems.map((p) => "  " + p).join("\n"));
  process.exit(1);
}
console.log(`SCSS rules: ok (${walk(ROOT).length} files, 7 folders, no HEX / magic spacing / @import in components, layout, pages)`);
