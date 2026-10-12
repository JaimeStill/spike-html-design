// harness is the single test seam: a page loaded in headless chromium and queried for computed
// styles. It wraps Bun.WebView (experimental in bun 1.4.3) with the few capabilities the tests
// use: open a URL, evaluate in the page, read a computed style, emulate prefers-color-scheme,
// and answer a request URL prefix from a local file. serve() is a static server for pages that
// must load over http://.
//
// Bun.WebView spawns one chromium per bun process and opens each view as a tab in it, so the
// first openPage() fixes the browser for the whole test run.

import { resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";

// fileUrl turns a path into a file:// URL.
export function fileUrl(path) {
  return pathToFileURL(resolve(path)).href;
}

// openPage opens url in a new tab of a headless chromium the harness spawns itself and resolves
// to a Page once the page has loaded. Options set up the tab before the first load:
// `scheme` emulates prefers-color-scheme ("dark" or "light"), and `intercept` maps URL prefixes
// to the local files that answer them, as in { "https://cdn.example/x.css": "x.css" }. Throws when chromium is not on PATH or will not start.
export async function openPage(url, { scheme, intercept } = {}) {
  const page = new Page(spawnView());
  try {
    // about:blank first: a view has no CDP session until its first navigation, and emulation
    // and interception must be in place before the page under test loads.
    await page.view.navigate("about:blank");
    if (scheme) await page.setScheme(scheme);
    for (const [prefix, path] of Object.entries(intercept ?? {}))
      await page.intercept(prefix, path);
    await page.goto(url);
  } catch (error) {
    page.close();
    throw error;
  }
  return page;
}

// spawnView creates the WebView on the chromium found on PATH, the same binary `mise run check`
// requires. Passing `path` and `url: false` forces spawn mode, so the harness never attaches to
// a Chrome already running with remote debugging on.
function spawnView() {
  const path = Bun.which("chromium");
  if (!path) throw new Error("harness: chromium not found on PATH; the browser tests need it");
  try {
    return new Bun.WebView({ backend: { type: "chrome", path, url: false } });
  } catch (error) {
    throw new Error(`harness: chromium at ${path} would not start: ${error.message}`);
  }
}

class Page {
  #cdpQueue = Promise.resolve();
  #routes = new Map();

  constructor(view) {
    this.view = view;
  }

  // goto loads url in this tab and resolves on its load event.
  async goto(url) {
    await this.view.navigate(url);
  }

  // evaluate runs a JS expression in the page and resolves to its JSON round-tripped value.
  evaluate(expression) {
    return this.view.evaluate(expression);
  }

  // style resolves to the computed value of property, a CSS property or custom property, on the
  // first element matching selector, trimmed. It throws when nothing matches.
  async style(selector, property) {
    const value = await this.evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      return el && getComputedStyle(el).getPropertyValue(${JSON.stringify(property)}).trim();
    })()`);
    if (value === null) throw new Error(`harness: no element matches ${selector}`);
    return value;
  }

  // setScheme emulates prefers-color-scheme: "dark" or "light", or "" to clear it.
  async setScheme(scheme) {
    await this.#cdp("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-color-scheme", value: scheme }],
    });
  }

  // intercept answers every request whose URL starts with prefix with the local file at path.
  // A missing file answers 404, so a wrong path fails a test instead of reaching the network.
  async intercept(prefix, path) {
    if (this.#routes.size === 0) {
      this.view.addEventListener("Fetch.requestPaused", (event) => this.#answer(event.data));
    }
    this.#routes.set(prefix, path);
    // Fetch.enable replaces the pattern list, so each call sends every route.
    await this.#cdp("Fetch.enable", {
      patterns: [...this.#routes.keys()].map((p) => ({ urlPattern: `${p}*` })),
    });
  }

  async #answer({ requestId, request }) {
    const [, path] = [...this.#routes].find(([prefix]) => request.url.startsWith(prefix));
    const file = Bun.file(path);
    const found = await file.exists();
    await this.#cdp("Fetch.fulfillRequest", {
      requestId,
      responseCode: found ? 200 : 404,
      responseHeaders: [{ name: "Content-Type", value: file.type }],
      body: found ? Buffer.from(await file.arrayBuffer()).toString("base64") : "",
    });
  }

  // #cdp serializes raw CDP commands: a view allows one cdp() in flight, and paused requests
  // arrive while the test itself may be sending one.
  #cdp(method, params) {
    const result = this.#cdpQueue.then(() => this.view.cdp(method, params));
    this.#cdpQueue = result.catch(() => {});
    return result;
  }

  // close destroys the tab. It is idempotent.
  close() {
    this.view.close();
  }
}

// serve starts a static file server for root on a free localhost port and returns its base URL
// (ending in "/") and stop(). A directory path answers its index.html; a path outside root or
// with no file answers 404.
export function serve(root) {
  const base = resolve(root);
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      let path = resolve(base, `.${decodeURIComponent(new URL(request.url).pathname)}`);
      if (path !== base && !path.startsWith(base + sep)) return new Response(null, { status: 404 });
      if (request.url.endsWith("/")) path = resolve(path, "index.html");
      const file = Bun.file(path);
      return (await file.exists()) ? new Response(file) : new Response(null, { status: 404 });
    },
  });
  return { url: `http://127.0.0.1:${server.port}/`, stop: () => server.stop(true) };
}
