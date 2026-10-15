// chain measures a published tag's import chains live from jsDelivr: for each CSS entry,
// baseline.css and full.css, and for keys.js, whose static import keys-grammar.js is a second
// request in sequence, it loads a page holding only that entry, in headless chromium with its
// cache disabled, and counts the chain's files and hops from chromium's Network events, as the
// hermetic chain test counts them. Over several runs it takes the median of two timings: the span,
// from the entry's response to its last import's, and the page's first paint, from navigation.
// It prints a table with the date, the runs, and the jsDelivr edges the entries' responses name. It reads
// the network and writes nothing.
//
// Usage: bun scripts/chain.js <tag> [runs]   (mise run chain <tag> [--runs <n>]; runs default 5)
//
// Each run opens a new tab in one chromium, so the first run opens the connection to jsDelivr
// and the later ones reuse it: the median is a warm connection's, an uncached fetch over it. A
// module script never blocks paint, so keys.js's row gives no first paint. The figures are one
// place and time's; the counts are the tag's. It exits non-zero when any file in a chain answers
// other than 200 or the counts differ between runs. It is a plain script, not a *.test.js file,
// so the hermetic `bun test` in `mise run check` never collects it.

import { cdn, count, ENTRIES, edge, median, record } from "../test/chain.js";
import { tagExists } from "../test/tags.js";

const [tag, runsArg = "5"] = process.argv.slice(2);
const runs = Number(runsArg);
if (!tag || !Number.isInteger(runs) || runs < 1) {
  console.error("usage: mise run chain <tag> [--runs <n>]   (e.g. mise run chain v0.6.0)");
  process.exit(2);
}
if (!tagExists(tag)) {
  console.error(`✗ ${tag} is not a tag in this repository`);
  process.exit(1);
}

const base = cdn(tag);
let failures = 0;
// edges counts the runs each edge answered an entry in; jsDelivr spreads requests over more than
// one CDN, so a tag's runs can name several.
const edges = new Map();
const rows = [];

for (const entry of ENTRIES) {
  const url = `${base}${entry}`;
  const shapes = new Set();
  const spans = [];
  const paints = [];
  for (let run = 0; run < runs; run++) {
    const { requests, paint } = await record(url);
    const chain = count(requests, url);
    if (chain.failed.length) {
      failures++;
      console.error(`✗ ${entry}, run ${run + 1}: not served: ${chain.failed.join(", ")}`);
    }
    shapes.add(`${chain.files}/${chain.hops}`);
    spans.push(chain.span);
    paints.push(paint);
    const served = edge(requests.find((request) => request.url === url)?.headers);
    if (served) edges.set(served, (edges.get(served) ?? 0) + 1);
  }
  if (shapes.size > 1) {
    failures++;
    console.error(`✗ ${entry}: files/hops differ between runs: ${[...shapes].join(", ")}`);
  }
  const [files, hops] = [...shapes][0].split("/");
  const css = entry.endsWith(".css");
  rows.push([
    entry,
    files,
    hops,
    format(median(spans)),
    css ? format(median(paints)) : "–",
    `${format(Math.min(...spans))}–${format(Math.max(...spans))}`,
  ]);
}

// format renders ms to one decimal, or "–" for no figure.
function format(ms) {
  return ms === null || !Number.isFinite(ms) ? "–" : ms.toFixed(1);
}

const header = ["entry", "files", "hops", "span ms", "first paint ms", "span range ms"];
const widths = header.map((name, i) => Math.max(name.length, ...rows.map((row) => row[i].length)));
const line = (cells) =>
  cells
    .map((cell, i) => cell.padEnd(widths[i]))
    .join("  ")
    .trimEnd();
console.log(`chain ${tag} from ${base}`);
console.log(`date ${new Date().toISOString()}`);
const named = [...edges].map(([name, times]) => `${name} (${times} of ${runs * ENTRIES.length})`);
console.log(`edge ${named.join("; ") || "unnamed: no cf-ray or x-served-by header"}`);
console.log(`runs ${runs}, median, chromium's cache disabled`);
console.log("");
console.log(line(header));
for (const row of rows) console.log(line(row));
process.exit(failures ? 1 : 0);
