// harness is the single test seam: a page loaded in headless chromium and queried for computed
// styles. It wraps Bun.WebView (experimental in bun 1.4.3) with the few capabilities the tests
// use: open a URL, evaluate in the page, read a computed style, fingerprint a page's resolved
// styles, emulate media features such as prefers-color-scheme and the viewport's size, and answer
// a request URL prefix from a local file, with the CORS header a CDN sends and, optionally, its
// latency. serve() is a static server for pages that must load over http://.
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
// `scheme` emulates prefers-color-scheme ("dark" or "light"), `viewport` emulates the viewport's
// size in CSS px, as in { width: 1440, height: 900 }, and `intercept` maps URL prefixes to the
// local files that answer them, as in { "https://cdn.example/x.css": "x.css" }, or to
// { path, delay } to answer after delay ms, as a slow CDN would. It throws when
// chromium is not on PATH or won't start.
export async function openPage(url, { scheme, viewport, intercept } = {}) {
  const page = new Page(spawnView());
  try {
    // about:blank first: a view has no CDP session until its first navigation, and emulation
    // and interception must be in place before the page under test loads.
    await page.view.navigate("about:blank");
    if (scheme) await page.setScheme(scheme);
    if (viewport) await page.setViewport(viewport);
    for (const [prefix, answer] of Object.entries(intercept ?? {})) {
      const { path, delay } = typeof answer === "string" ? { path: answer } : answer;
      await page.intercept(prefix, path, { delay });
    }
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

// FINGERPRINT_PROPERTIES are the computed properties fingerprint() records by default: the ones
// the baseline's layers set, plus the box and text properties a missing or misordered stylesheet
// would change.
export const FINGERPRINT_PROPERTIES = [
  "display",
  "box-sizing",
  "color",
  "background-color",
  "background-image",
  "box-shadow",
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "border-top",
  "border-right",
  "border-bottom",
  "border-left",
  "border-radius",
  "border-collapse",
  "text-align",
  "text-decoration-line",
  "list-style-type",
  "width",
  "height",
];

class Page {
  #cdpQueue = Promise.resolve();
  #media = new Map();
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

  // fingerprint resolves to the page's resolved styles: one entry per element of the document,
  // in document order, keyed by its tag path, with the computed value of each of properties.
  // The root entry also carries every custom property declared on it. Two loads of a page that
  // render the same have equal fingerprints.
  fingerprint(properties = FINGERPRINT_PROPERTIES) {
    return this.evaluate(`(() => {
      const properties = ${JSON.stringify(properties)};
      const path = (el) => el.parentElement
        ? path(el.parentElement) + " > " + el.localName + ":nth-child(" +
          ([...el.parentElement.children].indexOf(el) + 1) + ")"
        : el.localName;
      return [...document.querySelectorAll("*")].map((el) => {
        const style = getComputedStyle(el);
        const names = el === document.documentElement
          ? [...properties, ...[...style].filter((name) => name.startsWith("--")).sort()]
          : properties;
        return [path(el), Object.fromEntries(names.map((n) => [n, style.getPropertyValue(n)]))];
      });
    })()`);
  }

  // setScheme emulates prefers-color-scheme: "dark" or "light", or "" to clear it.
  async setScheme(scheme) {
    await this.setMedia("prefers-color-scheme", scheme);
  }

  // setMedia emulates one media feature, as in ("prefers-reduced-motion", "reduce"), or clears it
  // with "". Features set earlier stay emulated.
  async setMedia(name, value) {
    this.#media.set(name, value);
    // setEmulatedMedia replaces the feature list, so each call sends every feature.
    await this.#cdp("Emulation.setEmulatedMedia", {
      features: [...this.#media].map(([name, value]) => ({ name, value })),
    });
  }

  // setViewport emulates the viewport's size, { width, height } in CSS px at a device scale of 1,
  // as a desktop window of that size would give. Viewport units and media queries follow it at
  // once, without a reload.
  async setViewport({ width, height }) {
    await this.#cdp("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: false,
    });
  }

  // intercept answers every request whose URL starts with prefix with the local file at path,
  // with its content type and Access-Control-Allow-Origin: *. A missing file answers 404, so a
  // wrong path fails a test instead of reaching the network. `delay` holds each answer that many
  // ms, as a CDN's latency would.
  async intercept(prefix, path, { delay = 0 } = {}) {
    if (this.#routes.size === 0) {
      this.view.addEventListener("Fetch.requestPaused", (event) => this.#answer(event.data));
    }
    this.#routes.set(prefix, { path, delay });
    // Fetch.enable replaces the pattern list, so each call sends every route.
    await this.#cdp("Fetch.enable", {
      patterns: [...this.#routes.keys()].map((p) => ({ urlPattern: `${p}*` })),
    });
  }

  async #answer({ requestId, request }) {
    const [, { path, delay }] = [...this.#routes].find(([prefix]) =>
      request.url.startsWith(prefix),
    );
    if (delay) await Bun.sleep(delay);
    const file = Bun.file(path);
    const found = await file.exists();
    await this.#cdp("Fetch.fulfillRequest", {
      requestId,
      responseCode: found ? 200 : 404,
      // Access-Control-Allow-Origin, as jsDelivr sends it, so a file:// page, whose origin is
      // opaque, can run an intercepted cross-origin module script.
      responseHeaders: [
        { name: "Content-Type", value: file.type },
        { name: "Access-Control-Allow-Origin", value: "*" },
      ],
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

// serve starts a static file server for root on localhost and returns its base URL and stop().
// `prefix`, a path ending in "/" such as "/project/", serves root under it, the way GitHub Pages
// serves a project site; the base URL ends in it. `port` fixes the port; the default, 0, takes
// a free one. A directory path answers its index.html; a path outside root or the prefix, or
// with no file, answers 404.
export function serve(root, { prefix = "/", port = 0 } = {}) {
  const base = resolve(root);
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port,
    async fetch(request) {
      const pathname = decodeURIComponent(new URL(request.url).pathname);
      if (!pathname.startsWith(prefix)) return new Response(null, { status: 404 });
      let path = resolve(base, `./${pathname.slice(prefix.length)}`);
      if (path !== base && !path.startsWith(base + sep)) return new Response(null, { status: 404 });
      if (pathname.endsWith("/")) path = resolve(path, "index.html");
      const file = Bun.file(path);
      return (await file.exists()) ? new Response(file) : new Response(null, { status: 404 });
    },
  });
  return { url: `http://127.0.0.1:${server.port}${prefix}`, stop: () => server.stop(true) };
}
