// size reports what each entry the package exports costs to fetch: per file, its raw bytes and
// its brotli bytes at quality 11, and per entry the totals of both. An entry is a CSS stylesheet
// or a JS module. Its files are the entry itself and every file it statically imports, as the
// browser fetches them before the entry applies or runs: a stylesheet's @import rules, which in
// this package reach one hop deep, and a module's static import and export-from statements,
// followed through every module they reach, each file once. A dynamic import() is fetched later,
// on demand, so it counts toward the module it loads, not the one that calls it: theme-menu.js,
// which preferences.js loads when the menu first opens, is its own entry and not part of
// preferences.js's size, as keys-help.js, which keys.js loads when a help dialog first opens, is
// not part of keys.js's. Each file is fetched and compressed on its own, so the brotli total is
// the sum of each file's size, not the size of the files compressed together. Each entry has a
// budget for that brotli total, in BUDGETS below, and the report gives each entry's budget and
// headroom; the script exits 1 when an entry is over its budget or has none, so the check fails.
// Raw sizes are reported, not budgeted. Beside each entry's per-file totals, the report gives what
// the entry would weigh as one file, its import chain inlined, and as that file with its comments
// stripped: an estimate of what a release build would save, reported and never budgeted, so it
// never fails the check. It reads the working tree and writes nothing but its report.
//
// Usage: bun scripts/size.js   (mise run size; mise run check runs it after the tests)
//
// It is a plain script, not a *.test.js file, so `bun test` never collects it; test/size.test.js
// imports its functions.

import { dirname, join, normalize } from "node:path";
import { brotliCompressSync, constants } from "node:zlib";

const root = dirname(import.meta.dir);

// BUDGETS are the package's entries, each repository path to the most bytes its brotli total may
// reach: the one place the budgets live, read by the report, the check, and the tests. The CSS
// entries come first, then the JS modules, in the exports map's order. Each JS budget is its
// v0.5.0 brotli total with about 13% headroom, rounded up to a clear figure, but the keys
// modules', which are their v0.6.0 totals, and the conformance module's, its v0.7.0 total, each
// with about 13% headroom, rounded the same way.
export const BUDGETS = {
  "baseline.css": 14_000,
  "full.css": 18_000,
  "modules/registry.js": 1_200,
  "modules/preferences.js": 3_800,
  "modules/theme-menu.js": 8_500,
  "modules/register.js": 1_450,
  "modules/register-full.js": 1_550,
  "modules/keys.js": 10_300,
  "modules/keys-grammar.js": 3_500,
  "modules/keys-help.js": 13_200,
  "modules/conformance.js": 4_000,
};

// entries returns the package's entries, as repository paths: every target its exports map names
// that ends in .css or .js, whatever the map's nesting of conditions, once each, except the
// profiles. A profile export (./profiles/<facet>/<name>) is one file a page imports beside an
// entry, not an entry, so its size counts where an entry imports it.
export async function entries(dir = root) {
  const pkg = await Bun.file(join(dir, "package.json")).json();
  const targets = (exports) =>
    typeof exports === "string" ? [exports] : Object.values(exports).flatMap(targets);
  const exported = Object.entries(pkg.exports).filter(([key]) => !key.startsWith("./profiles/"));
  const paths = exported
    .flatMap(([, target]) => targets(target))
    .filter((path) => path.endsWith(".css") || path.endsWith(".js"));
  return [...new Set(paths.map((path) => normalize(path)))];
}

// imports returns the files a file statically imports, in order, as repository paths resolved
// against the file's own directory: a stylesheet's @import rules, or a module's import and
// export-from statements, by the path's extension. Comments are dropped first, so an import a
// comment mentions is never counted. A module's dynamic import() is not a static import, and a
// bare specifier names no file in the package, so neither is returned.
export function imports(path, text) {
  if (path.endsWith(".js")) {
    const code = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const statements = code.matchAll(
      /^\s*(?:import|export)\s*(?:[\w*{}\s,$]+?\s*from\s*)?["']([^"']+)["']/gm,
    );
    return [...statements]
      .map(([, specifier]) => specifier)
      .filter((specifier) => specifier.startsWith("./") || specifier.startsWith("../"))
      .map((specifier) => normalize(join(dirname(path), specifier)));
  }
  const rules = text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .matchAll(/@import\s+(?:url\()?\s*["']?([^"')\s]+)/g);
  return [...rules].map(([, url]) => normalize(join(dirname(path), url)));
}

// brotli returns bytes' length compressed with brotli at quality 11, the highest, as a CDN
// serves a static file it compresses ahead of time.
export function brotli(bytes) {
  return brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
}

// commentRanges returns the [start, end) offsets of a stylesheet's comments, /* to */, skipping
// any "/*" inside a quoted string, so a url or content string that holds one is kept whole.
export function commentRanges(css) {
  const ranges = [];
  let quote = "";
  for (let i = 0; i < css.length; i++) {
    const char = css[i];
    if (quote) {
      if (char === "\\") i++;
      else if (char === quote) quote = "";
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === "/" && css[i + 1] === "*") {
      const close = css.indexOf("*/", i + 2);
      const end = close === -1 ? css.length : close + 2;
      ranges.push([i, end]);
      i = end - 1;
    }
  }
  return ranges;
}

// strip returns text without its comments, by path's extension. A stylesheet loses every /* */
// comment outside a string. A module loses only the comments that are safe to find without
// parsing JS: a /* */ block that opens a line and every whole-line // comment, so no string,
// regular expression, or template literal is ever cut; a comment after code on its line is kept.
// This package's modules have no comment after code, so for them it strips every comment.
export function strip(path, text) {
  if (path.endsWith(".js")) {
    return text.replace(/^[ \t]*\/\*[\s\S]*?\*\/[ \t]*\n?/gm, "").replace(/^[ \t]*\/\/.*\n?/gm, "");
  }
  let kept = "";
  let from = 0;
  for (const [start, end] of commentRanges(text)) {
    kept += text.slice(from, start);
    from = end;
  }
  return kept + text.slice(from);
}

// concatenate returns entry as one file, its static import chain inlined, each file once, for the
// report's size estimate; it is not a build, and nothing ships it. A stylesheet's @import rule,
// outside a comment, becomes the imported file's text in its place, wrapped in an @layer block
// when the rule names a layer, as the browser cascades it; a media or supports condition on the
// rule is dropped, since this package's imports carry none. A module's imported modules come
// first, depth first, as a bundler orders them, and each module's static import and export-from
// statements of a relative path are dropped; the export keywords stay, so the text estimates
// size and is not meant to run.
export async function concatenate(entry, dir = root) {
  const seen = new Set();
  const read = (path) => Bun.file(join(dir, path)).text();
  if (entry.endsWith(".js")) {
    const parts = [];
    const visit = async (path) => {
      if (seen.has(path)) return;
      seen.add(path);
      const text = await read(path);
      for (const imported of imports(path, text)) await visit(imported);
      parts.push(
        text.replace(
          /^\s*(?:import|export)\s*(?:[\w*{}\s,$]+?\s*from\s*)?["'](\.{1,2}\/[^"']+)["'];?/gm,
          "",
        ),
      );
    };
    await visit(entry);
    return parts.join("\n");
  }
  const inline = async (path) => {
    seen.add(path);
    const text = await read(path);
    const comments = commentRanges(text);
    const rule =
      /@import\s+(?:url\(\s*["']?([^"')\s]+)["']?\s*\)|["']([^"']+)["'])\s*(?:layer\(\s*([^)\s]+)\s*\))?[^;]*;/g;
    let out = "";
    let from = 0;
    for (const match of text.matchAll(rule)) {
      if (comments.some(([start, end]) => match.index >= start && match.index < end)) continue;
      const [whole, url, quoted, layer] = match;
      const imported = normalize(join(dirname(path), url ?? quoted));
      const body = seen.has(imported) ? "" : await inline(imported);
      out += text.slice(from, match.index) + (layer ? `@layer ${layer} {\n${body}\n}` : body);
      from = match.index + whole.length;
    }
    return out + text.slice(from);
  };
  return inline(entry);
}

// measure returns entry's report: its files, the entry first, then each file it imports in the
// order the imports name them, depth first, each once; each with its raw and brotli sizes, and
// the totals of both; and the raw and brotli sizes of the entry as one file (oneFile) and as that
// file with its comments stripped (noComments).
export async function measure(entry, dir = root) {
  const files = [];
  const seen = new Set();
  const visit = async (path) => {
    if (seen.has(path)) return;
    seen.add(path);
    const bytes = new Uint8Array(await Bun.file(join(dir, path)).arrayBuffer());
    files.push({ path, raw: bytes.length, brotli: brotli(bytes) });
    for (const imported of imports(path, new TextDecoder().decode(bytes))) await visit(imported);
  };
  await visit(entry);
  const sum = (key) => files.reduce((total, file) => total + file[key], 0);
  const encoder = new TextEncoder();
  const sizes = (text) => {
    const bytes = encoder.encode(text);
    return { raw: bytes.length, brotli: brotli(bytes) };
  };
  const one = await concatenate(entry, dir);
  return {
    entry,
    files,
    raw: sum("raw"),
    brotli: sum("brotli"),
    oneFile: sizes(one),
    noComments: sizes(strip(entry, one)),
  };
}

// table renders a report as aligned plain text: a header, one row per file, and the total; then
// the entry as one file and as one file without comments, both estimates the header marks as
// unbudgeted; then, when the report carries a budget, the budget and the headroom left under it,
// both of brotli. A module's header says which comments its no-comments row strips.
export function table({ entry, files, raw, brotli, oneFile, noComments, budget, headroom }) {
  const rows = [
    ["file", "raw", "brotli"],
    ...files.map((file) => [file.path, file.raw, file.brotli]),
    ["total", raw, brotli],
    ["one file", oneFile.raw, oneFile.brotli],
    ["one file, no comments", noComments.raw, noComments.brotli],
    ...(budget === undefined
      ? []
      : [
          ["budget", "", budget],
          ["headroom", "", headroom],
        ]),
  ].map((row) => row.map(String));
  const widths = [0, 1, 2].map((i) => Math.max(...rows.map((row) => row[i].length)));
  const line = ([path, ...sizes]) =>
    `  ${path.padEnd(widths[0])}  ${sizes.map((size, i) => size.padStart(widths[i + 1])).join("  ")}`;
  const stripped = entry.endsWith(".js")
    ? "; no comments strips line-leading /* */ and // only"
    : "";
  const header = `size: ${entry} (bytes; brotli is quality 11, per file, summed; one file rows are estimates, not budgeted${stripped})`;
  return [header, ...rows.map(line)].join("\n");
}

// audit measures every entry the package in dir exports against its budget in budgets, and
// returns each entry's report, with its budget and headroom (the budget less the brotli total,
// negative when over), and the failures: an entry over its budget, or one with no budget. The
// check fails on any failure; an entry exactly at its budget passes.
export async function audit(budgets = BUDGETS, dir = root) {
  const reports = [];
  const failures = [];
  for (const entry of await entries(dir)) {
    const report = await measure(entry, dir);
    const budget = budgets[entry];
    if (budget === undefined) {
      failures.push(`${entry} has no budget`);
      reports.push(report);
      continue;
    }
    const headroom = budget - report.brotli;
    if (headroom < 0) {
      failures.push(`${entry} is ${-headroom} bytes over its budget: ${report.brotli} > ${budget}`);
    }
    reports.push({ ...report, budget, headroom });
  }
  return { reports, failures };
}

if (import.meta.main) {
  const { reports, failures } = await audit();
  for (const report of reports) console.log(table(report));
  for (const failure of failures) console.error(`size: ${failure}`);
  if (failures.length > 0) process.exit(1);
}
