// chain records and counts an entry's import chain as chromium fetches it, for the networked
// measurement task, scripts/chain.js, and the hermetic chain test, which counts the same records
// with jsDelivr answered from the working tree. An entry is a CSS entry, which a page links, or
// keys.js, which a page loads as a module script; its chain is the entry and every file chromium
// fetches because of it: a stylesheet's @import rules, a module's static imports.
//
// The records come from chromium's CDP Network events, not Resource Timing: a cross-origin
// stylesheet's imports never reach the page's performance timeline, and the events name each
// request's initiator, the stylesheet or module whose import asked for it, which is how the chain
// is counted.

import { openPage } from "./harness.js";

// cdn returns the jsDelivr base URL a tag's files are served from.
export function cdn(tag) {
  return `https://cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@${tag}/`;
}

// ENTRIES are the entries measured, as repository paths: the lean and full CSS entries, and
// keys.js, the one module whose static import, keys-grammar.js, is a second request in sequence.
export const ENTRIES = ["baseline.css", "full.css", "modules/keys.js"];

// pageFor returns a page that loads url and nothing else from the network: a stylesheet link for
// a .css entry, a module script for a .js one, and a line of text for chromium to paint.
export function pageFor(url) {
  const load = url.endsWith(".css")
    ? `<link rel="stylesheet" href="${url}" />`
    : `<script type="module" src="${url}"></script>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8" /><title>chain</title>${load}</head><body><p>The chain's page.</p></body></html>`;
}

// record opens a page that loads url, with chromium's cache disabled, from a server of its own on
// localhost, and resolves to every request the page made, each { url, initiator, status,
// headers, responded }, where initiator is the URL of the document, stylesheet, or module that
// asked for it and responded the response's arrival in ms on chromium's monotonic clock, and to
// the page's first paint in ms from navigation, or null when it has not painted within timeout
// ms. intercept is the harness's: it answers URL prefixes from local files, as the hermetic test
// answers jsDelivr's.
export async function record(url, { intercept, timeout = 10_000 } = {}) {
  const html = pageFor(url);
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch: () => new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } }),
  });
  const requests = new Map();
  const setup = async (page) => {
    page.on("Network.requestWillBeSent", ({ requestId, request, initiator }) => {
      requests.set(requestId, { url: request.url, initiator: initiator.url ?? null });
    });
    page.on("Network.responseReceived", ({ requestId, timestamp, response }) => {
      const request = requests.get(requestId);
      if (!request) return;
      request.status = response.status;
      request.headers = Object.fromEntries(
        Object.entries(response.headers).map(([name, value]) => [name.toLowerCase(), value]),
      );
      request.responded = timestamp * 1000;
    });
    await page.cdp("Network.enable");
    await page.cdp("Network.setCacheDisabled", { cacheDisabled: true });
  };
  let page;
  try {
    page = await openPage(`http://127.0.0.1:${server.port}/`, { intercept, setup });
    // The paint entry lands a frame after the paint, so poll for it.
    const paint = await page.evaluate(`new Promise((resolve) => {
      const end = performance.now() + ${timeout};
      const poll = () => {
        const entry = performance.getEntriesByName("first-paint")[0];
        if (entry) resolve(entry.startTime);
        else if (performance.now() > end) resolve(null);
        else requestAnimationFrame(() => setTimeout(poll, 10));
      };
      poll();
    })`);
    return { requests: [...requests.values()], paint };
  } finally {
    page?.close();
    server.stop(true);
  }
}

// count counts url's chain in requests, as record returns them: its files, the entry and every
// request reached from it through initiators, and its hops, how many imports deep the deepest
// file sits below the entry, so a chain whose entry imports every file directly is one hop. It
// also gives span, the ms from the entry's response to its last import's, the files' URLs, and
// failed, the URL of every file that answered other than 200 or not at all. It throws when the
// page never requested url.
export function count(requests, url) {
  const entry = requests.find((request) => request.url === url);
  if (!entry) throw new Error(`chain: the page never requested ${url}`);
  const files = [];
  let hops = 0;
  let level = [entry];
  while (level.length) {
    files.push(...level);
    const urls = new Set(level.map((request) => request.url));
    const next = requests.filter(
      (request) => urls.has(request.initiator) && !files.includes(request),
    );
    if (next.length) hops++;
    level = next;
  }
  const last = Math.max(...files.map((request) => request.responded ?? Number.NaN));
  return {
    files: files.length,
    hops,
    span: last - entry.responded,
    urls: files.map((request) => request.url),
    failed: files.filter((request) => request.status !== 200).map((request) => request.url),
  };
}

// edge names the CDN edge that answered, from a response's headers: Cloudflare's PoP from cf-ray's
// suffix, or Fastly's caches from x-served-by, the edge last, or null when neither is present.
export function edge(headers = {}) {
  const ray = headers["cf-ray"]?.split("-").pop();
  if (ray) return `Cloudflare ${ray}`;
  const caches = headers["x-served-by"]?.split(",").map((cache) => cache.trim().split("-").pop());
  if (caches?.length) return `Fastly ${caches.toReversed().join(" via ")}`;
  return null;
}

// median returns the median of numbers, the mean of the middle two for an even count, ignoring
// any that are not finite; null when none is.
export function median(numbers) {
  const sorted = numbers.filter(Number.isFinite).toSorted((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = sorted.length >> 1;
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}
