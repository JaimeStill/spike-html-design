import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { openPage, serve } from "./harness.js";

const root = dirname(import.meta.dir);
// The repository served at the root, so a fixture imports the modules by relative URL; chromium
// runs no relative module script from file://. Every page here shares the server's origin, and
// so its one stored choice.
const server = serve(root);
const fixture = (name) => `${server.url}test/fixtures/${name}`;
const pages = [];

// open opens a page and closes it after the test, so bun test exits with no tab left open.
async function open(url, options) {
  const page = await openPage(url, options);
  pages.push(page);
  return page;
}

afterEach(() => {
  for (const page of pages.splice(0)) page.close();
});
afterAll(() => server.stop());

const KEY = "spike-html-design.preferences";
const PREFERENCES = "/modules/preferences.js";
// CHOICE stores a profile other than the default in every facet, and the dark scheme.
const CHOICE = { color: "primer", space: "compact", type: "serif", scheme: "dark" };

// seed opens a page of the server's origin and stores value under KEY, as JSON unless it is a
// string, or clears it when value is null. It returns the page, which can then load a fixture
// with the choice in storage.
async function seed(value) {
  const page = await open(`${server.url}test/fixtures/index.html`);
  await page.evaluate(
    value === null
      ? `localStorage.removeItem(${JSON.stringify(KEY)})`
      : `localStorage.setItem(${JSON.stringify(KEY)}, ${JSON.stringify(
          typeof value === "string" ? value : JSON.stringify(value),
        )})`,
  );
  return page;
}

// stored resolves to the page's stored choice, parsed.
function stored(page) {
  return page.evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(KEY)}))`);
}

// rooted resolves to the root's four preference attributes, null where one is absent.
function rooted(page) {
  return page.evaluate(`Object.fromEntries(["data-palette", "data-space", "data-type",
    "data-scheme"].map((name) => [name, document.documentElement.getAttribute(name)]))`);
}

const APPLIED = {
  "data-palette": "primer",
  "data-space": "compact",
  "data-type": "serif",
  "data-scheme": "dark",
};
const NONE = { "data-palette": null, "data-space": null, "data-type": null, "data-scheme": null };

// waitFor resolves once expression is truthy in the page, polling each frame, or rejects after
// timeout ms.
function waitFor(page, expression, timeout = 2000) {
  return page.evaluate(`new Promise((resolve, reject) => {
    const end = performance.now() + ${timeout};
    const poll = () => {
      if (${expression}) resolve(true);
      else if (performance.now() > end) reject(new Error("timed out: " + ${JSON.stringify(expression)}));
      else setTimeout(poll, 10);
    };
    poll();
  })`);
}

// call runs one of the preferences module's exports in the page, through the same module the
// page loaded, and resolves to its result.
function call(page, body) {
  return page.evaluate(`import(${JSON.stringify(PREFERENCES)}).then((preferences) => ${body})`);
}

// fetchedMenu resolves to when the page fetched theme-menu.js, in ms since navigation, or null.
function fetchedMenu(page) {
  return page.evaluate(`performance.getEntriesByType("resource")
    .find(({ name }) => name.endsWith("/modules/theme-menu.js"))?.startTime ?? null`);
}

// press dispatches a keydown of key on the element matching selector, or on the document, with
// the modifiers given.
function press(page, key, { selector, ...modifiers } = {}) {
  return page.evaluate(`(${selector ? `document.querySelector(${JSON.stringify(selector)})` : "document"})
    .dispatchEvent(new KeyboardEvent("keydown", ${JSON.stringify({ key, bubbles: true, cancelable: true, ...modifiers })}))`);
}

describe("preferences: apply and storage", () => {
  test("applies the stored choice to the root, under one namespaced key", async () => {
    await seed(CHOICE);
    const page = await open(fixture("preferences.html"));
    expect(await rooted(page)).toEqual(APPLIED);
    expect(await page.style("h1", "font-family")).toStartWith("ui-serif");
    expect(await call(page, "preferences.KEY")).toBe(KEY);
  });

  test("the system scheme sets no data-scheme", async () => {
    await seed({ ...CHOICE, scheme: "system" });
    const page = await open(fixture("preferences.html"));
    expect(await rooted(page)).toEqual({ ...APPLIED, "data-scheme": null });
  });

  test("with nothing stored, or a value that isn't a choice, the page keeps its defaults", async () => {
    for (const value of [null, "not json", "42"]) {
      await seed(value);
      const page = await open(fixture("preferences.html"));
      expect(await rooted(page)).toEqual(NONE);
      expect(await call(page, "preferences.read()")).toBeNull();
    }
  });

  test("a name this page didn't register falls back to its default and stays in storage", async () => {
    await seed(CHOICE);
    const page = await open(fixture("preferences-lean.html"));
    expect(await rooted(page)).toEqual({ ...NONE, "data-scheme": "dark" });
    expect(await page.style(":root", "--space-base")).toBe(
      await (await open(fixture("preferences-lean.html"))).style(":root", "--space-base"),
    );
    expect(await stored(page)).toEqual(CHOICE);
  });

  test("a choice saved on one page applies on another directory's page and after a reload", async () => {
    await seed(null);
    const page = await open(fixture("preferences.html"));
    expect(await call(page, `preferences.save(${JSON.stringify(CHOICE)})`)).toBe(true);
    // save writes storage only; the menu applies a choice itself.
    expect(await rooted(page)).toEqual(NONE);
    const elsewhere = await open(fixture("elsewhere/preferences.html"));
    expect(await rooted(elsewhere)).toEqual(APPLIED);
    await page.goto(fixture("preferences.html"));
    expect(await rooted(page)).toEqual(APPLIED);
  });

  test("save fills a partial choice with the defaults and the system scheme", async () => {
    await seed(null);
    const page = await open(fixture("preferences.html"));
    await call(page, `preferences.save({ type: "serif" })`);
    expect(await stored(page)).toEqual({
      scheme: "system",
      color: "flexoki",
      space: "regular",
      type: "serif",
    });
  });

  test("apply sets a choice on any element without saving it", async () => {
    await seed(null);
    const page = await open(fixture("preferences.html"));
    expect(
      await call(
        page,
        `{
          const el = document.createElement("div");
          preferences.apply(${JSON.stringify(CHOICE)}, el);
          return [...el.attributes].map(({ name, value }) => name + "=" + value).sort();
        }`,
      ),
    ).toEqual(["data-palette=primer", "data-scheme=dark", "data-space=compact", "data-type=serif"]);
    expect(await rooted(page)).toEqual(NONE);
    expect(await stored(page)).toBeNull();
  });

  test("blocked storage reads as nothing stored and saves nothing, without throwing", async () => {
    await seed(CHOICE);
    const page = await open(fixture("preferences.html"));
    expect(
      await call(
        page,
        `{
          Object.defineProperty(window, "localStorage", {
            get() { throw new DOMException("blocked", "SecurityError"); },
          });
          return [preferences.read(), preferences.save(${JSON.stringify(CHOICE)})];
        }`,
      ),
    ).toEqual([null, false]);
  });
});

describe("preferences: the storage event", () => {
  test("another tab's save applies live, except while this page's menu is open", async () => {
    await seed(null);
    const saver = await open(fixture("preferences.html"));
    const page = await open(fixture("elsewhere/preferences.html"));

    await call(saver, `preferences.save(${JSON.stringify(CHOICE)})`);
    await waitFor(page, `document.documentElement.getAttribute("data-palette") === "primer"`);
    expect(await rooted(page)).toEqual(APPLIED);

    // Open: the other tab's save is ignored here, and read() still has it for Cancel.
    await call(page, "preferences.setOpen(true)");
    const next = { color: "everforest", space: "regular", type: "mono", scheme: "light" };
    await call(saver, `preferences.save(${JSON.stringify(next)})`);
    await waitFor(
      page,
      `JSON.parse(localStorage.getItem(${JSON.stringify(KEY)})).color === "everforest"`,
    );
    // A frame for the storage event to have been delivered, had it been followed.
    await page.evaluate("new Promise((resolve) => setTimeout(resolve, 100))");
    expect(await rooted(page)).toEqual(APPLIED);
    expect(await call(page, "preferences.read()")).toEqual(next);

    // Closed again: the next save applies.
    await call(page, "preferences.setOpen(false)");
    await call(saver, `preferences.save(${JSON.stringify({ ...next, color: "catppuccin" })})`);
    await waitFor(page, `document.documentElement.getAttribute("data-palette") === "catppuccin"`);
    expect(await rooted(page)).toEqual({
      "data-palette": "catppuccin",
      "data-space": "regular",
      "data-type": "mono",
      "data-scheme": "light",
    });
  });
});

// The flash: the stored choice reaching the root against first paint, with each module's fetch
// held as a CDN's would be. A fixture records first-paint from a PerformanceObserver and the
// moment data-palette lands from a MutationObserver. The first tab a bun process opens reports
// visibilityState hidden and records no paint, so seed() opens a tab first.
const CDN = "https://cdn.example/spike-html-design/modules/";
const DELAY = 200;

function cdn({ delay = DELAY, missing = false } = {}) {
  const modules = join(root, "modules");
  return Object.fromEntries(
    ["register-full.js", "preferences.js", "registry.js"].map((name) => [
      `${CDN}${name}`,
      { path: missing ? join(modules, "absent.js") : join(modules, name), delay },
    ]),
  );
}

// flash loads a flash fixture with CHOICE stored and resolves to its { paint, applied } times,
// in ms since navigation, once it has painted.
async function flash(name, options) {
  await seed(CHOICE);
  const page = await open(fixture(name), { intercept: cdn(options) });
  await waitFor(page, "window.flash.paint !== null", 5000);
  return { page, ...(await page.evaluate("window.flash")) };
}

describe("preferences: the flash", () => {
  test("render-blocking, the choice applies before first paint; the cost is the fetch", async () => {
    const blocking = await flash("flash-blocking.html");
    const deferred = await flash("flash-deferred.html");
    const undelayed = await flash("flash-blocking.html", { delay: 0 });

    // Blocking: applied before first paint, a 0 ms flash.
    expect(blocking.applied).not.toBeNull();
    expect(blocking.applied).toBeLessThanOrEqual(blocking.paint);
    expect(await rooted(blocking.page)).toEqual(APPLIED);
    // Not blocking: the defaults paint first, and the choice lands after the held fetch.
    const flashed = deferred.applied - deferred.paint;
    expect(flashed).toBeGreaterThan(DELAY / 2);
    // The cost: blocking's first paint waits on the held fetch.
    const cost = blocking.paint - deferred.paint;
    expect(cost).toBeGreaterThan(DELAY / 2);
    expect(blocking.paint).toBeGreaterThanOrEqual(DELAY);

    console.log(
      [
        `flash, module fetch held ${DELAY} ms:`,
        `  render-blocking: first paint ${blocking.paint.toFixed(1)} ms, applied ${blocking.applied.toFixed(1)} ms, flash 0 ms`,
        `  not blocking:    first paint ${deferred.paint.toFixed(1)} ms, applied ${deferred.applied.toFixed(1)} ms, flash ${flashed.toFixed(1)} ms`,
        `  render-blocking, fetch not held: first paint ${undelayed.paint.toFixed(1)} ms`,
        `  cost of blocking: first paint ${cost.toFixed(1)} ms later than not blocking`,
      ].join("\n"),
    );
  });

  test("a failed module load doesn't stall first paint", async () => {
    const failed = await flash("flash-blocking.html", { missing: true });
    expect(failed.applied).toBeNull();
    expect(failed.paint).toBeLessThan(2000);
    expect(await rooted(failed.page)).toEqual(NONE);
    console.log(`flash, module load failed: first paint ${failed.paint.toFixed(1)} ms`);
  });
});

describe("preferences: <theme-menu>", () => {
  test("first paint precedes any fetch of the menu module, which loads on the first open", async () => {
    await seed(null);
    const page = await open(fixture("preferences.html"));
    expect(await page.evaluate(`customElements.get("theme-menu") !== undefined`)).toBe(true);
    await page.evaluate("new Promise((resolve) => setTimeout(resolve, 100))");
    expect(await fetchedMenu(page)).toBeNull();

    await page.evaluate(`document.querySelector("button[commandfor=theme]").click()`);
    await waitFor(page, `document.querySelector("theme-menu").hasAttribute("data-open")`);
    const paint = await page.evaluate(
      `performance.getEntriesByName("first-paint")[0]?.startTime ?? 0`,
    );
    expect(await fetchedMenu(page)).toBeGreaterThan(paint);
    expect(await call(page, "preferences.isOpen()")).toBe(true);
  });

  test("T opens the menu outside fields, with no modifier; T while open goes to the menu", async () => {
    await seed(null);
    const page = await open(fixture("preferences.html"));
    const isOpen = () => call(page, "preferences.isOpen()");
    const settle = () => page.evaluate("new Promise((resolve) => setTimeout(resolve, 100))");

    for (const selector of ["input", "textarea", "select", "[contenteditable]"]) {
      await press(page, "t", { selector });
    }
    for (const modifier of ["ctrlKey", "altKey", "metaKey"]) {
      await press(page, "t", { [modifier]: true });
    }
    await press(page, "y");
    await settle();
    expect(await isOpen()).toBe(false);
    expect(await fetchedMenu(page)).toBeNull();

    await press(page, "t");
    await waitFor(page, `document.querySelector("theme-menu").hasAttribute("data-open")`);
    expect(await isOpen()).toBe(true);

    // T while open: the menu accepts and closes (the stub only closes).
    await press(page, "t", { selector: "h1" });
    await waitFor(page, `!document.querySelector("theme-menu").hasAttribute("data-open")`);
    expect(await isOpen()).toBe(false);

    // Shift is allowed: T opens it as t does.
    await press(page, "T", { shiftKey: true });
    await waitFor(page, `document.querySelector("theme-menu").hasAttribute("data-open")`);
    expect(await isOpen()).toBe(true);
  });
});
