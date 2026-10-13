// size reports what each CSS entry the package exports costs to fetch: per file, its raw bytes
// and its brotli bytes at quality 11, and per entry the totals of both. An entry's files are the
// entry itself and the files its @import rules name, one hop deep, as the browser fetches them;
// each is fetched and compressed on its own, so the brotli total is the sum of each file's size,
// not the size of the files compressed together. It enforces no number: the budget is enforced
// from profiles on. It reads the working tree and writes nothing but its report.
//
// Usage: bun scripts/size.js   (mise run size; mise run check runs it after the tests)
//
// It is a plain script, not a *.test.js file, so `bun test` never collects it; test/size.test.js
// imports its functions.

import { dirname, join, normalize } from "node:path";
import { brotliCompressSync, constants } from "node:zlib";

const root = dirname(import.meta.dir);

// entries returns the package's CSS entries, as repository paths: every target its exports map
// names that ends in .css, whatever the map's nesting of conditions, once each, but the profiles.
// A profile export (./profiles/<name>) is one file a page imports beside an entry, not an entry,
// so its size counts where an entry imports it.
export async function entries(dir = root) {
  const pkg = await Bun.file(join(dir, "package.json")).json();
  const targets = (exports) =>
    typeof exports === "string" ? [exports] : Object.values(exports).flatMap(targets);
  const exported = Object.entries(pkg.exports).filter(([key]) => !key.startsWith("./profiles/"));
  const css = exported
    .flatMap(([, target]) => targets(target))
    .filter((path) => path.endsWith(".css"));
  return [...new Set(css.map((path) => normalize(path)))];
}

// imports returns the files a stylesheet's @import rules name, in order, as repository paths
// resolved against the stylesheet's own directory. Comments are dropped first, so an @import a
// comment mentions is never counted.
export function imports(path, css) {
  const rules = css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .matchAll(/@import\s+(?:url\()?\s*["']?([^"')\s]+)/g);
  return [...rules].map(([, url]) => normalize(join(dirname(path), url)));
}

// brotli returns bytes' length compressed with brotli at quality 11, the highest, as a CDN
// serves a static file it compresses ahead of time.
export function brotli(bytes) {
  return brotliCompressSync(bytes, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }).length;
}

// measure returns entry's report: its files, the entry first, each with its raw and brotli
// sizes, and the totals of both.
export async function measure(entry, dir = root) {
  const css = await Bun.file(join(dir, entry)).text();
  const files = [];
  for (const path of [entry, ...imports(entry, css)]) {
    const bytes = new Uint8Array(await Bun.file(join(dir, path)).arrayBuffer());
    files.push({ path, raw: bytes.length, brotli: brotli(bytes) });
  }
  const sum = (key) => files.reduce((total, file) => total + file[key], 0);
  return { entry, files, raw: sum("raw"), brotli: sum("brotli") };
}

// table renders a report as aligned plain text: a header, one row per file, and the total.
export function table({ entry, files, raw, brotli }) {
  const rows = [
    ["file", "raw", "brotli"],
    ...files.map((file) => [file.path, file.raw, file.brotli]),
    ["total", raw, brotli],
  ].map((row) => row.map(String));
  const widths = [0, 1, 2].map((i) => Math.max(...rows.map((row) => row[i].length)));
  const line = ([path, ...sizes]) =>
    `  ${path.padEnd(widths[0])}  ${sizes.map((size, i) => size.padStart(widths[i + 1])).join("  ")}`;
  return [`size: ${entry} (bytes; brotli is quality 11, per file, summed)`, ...rows.map(line)].join(
    "\n",
  );
}

if (import.meta.main) {
  for (const entry of await entries()) console.log(table(await measure(entry)));
}
