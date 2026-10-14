import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileUrl, openPage, serve } from "./harness.js";

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
const CHOICE = { color: "primer", space: "compact", type: "sans", scheme: "dark" };

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
  "data-type": "sans",
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
    expect(await page.style("h1", "font-family")).toStartWith("system-ui");
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
    await call(page, `preferences.save({ type: "sans" })`);
    expect(await stored(page)).toEqual({
      scheme: "system",
      color: "flexoki",
      space: "regular",
      type: "sans",
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
    ).toEqual(["data-palette=primer", "data-scheme=dark", "data-space=compact", "data-type=sans"]);
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

  test("with the registry preloaded, first paint waits on one held fetch, not two", async () => {
    // Both modules import the registry, which the page otherwise fetches only once one of them
    // has arrived: two held fetches in a row. A modulepreload fetches it beside them.
    const chained = await flash("flash-blocking.html");
    const preloaded = await flash("flash-preload.html");
    expect(preloaded.applied).not.toBeNull();
    expect(preloaded.applied).toBeLessThanOrEqual(preloaded.paint);
    expect(chained.paint).toBeGreaterThanOrEqual(2 * DELAY);
    expect(preloaded.paint).toBeGreaterThanOrEqual(DELAY);
    expect(preloaded.paint).toBeLessThan(2 * DELAY);
    console.log(
      [
        `flash, module fetch held ${DELAY} ms, render-blocking:`,
        `  registry fetched after the modules: first paint ${chained.paint.toFixed(1)} ms`,
        `  registry preloaded beside them:     first paint ${preloaded.paint.toFixed(1)} ms`,
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

// The menu, opened on the full-entry fixture. Keys are real key presses (CDP), so the radios'
// native arrow cycling and Tab order are chromium's own.
describe("preferences: the menu", () => {
  // openMenu loads the fixture with value stored (see seed) and opens the menu from its button,
  // resolving to the page once the dialog is up.
  async function openMenu(value = null, options = {}) {
    await seed(value);
    const page = await open(fixture("preferences.html"), options);
    await page.evaluate(`document.querySelector("button[commandfor=theme]").click()`);
    await waitFor(page, `document.querySelector("theme-menu dialog")?.open`);
    return page;
  }

  // state resolves to the open menu's focus, as [section, value] of the focused radio, its
  // selection per section, and the root's and the preview's four preference attributes.
  function state(page) {
    return page.evaluate(`(() => {
      const dialog = document.querySelector("theme-menu dialog");
      const names = ["data-palette", "data-space", "data-type", "data-scheme"];
      const attributes = (el) => Object.fromEntries(names.map((n) => [n, el.getAttribute(n)]));
      const focused = document.activeElement;
      return {
        focus: [focused.closest("fieldset")?.dataset.section ?? null, focused.value ?? null],
        selection: Object.fromEntries([...dialog.querySelectorAll("fieldset")]
          .map((row) => [row.dataset.section, row.querySelector(":checked").value])),
        root: attributes(document.documentElement),
        preview: attributes(dialog.querySelector(".theme-menu-preview")),
      };
    })()`);
  }

  // closed resolves once the menu has closed.
  const closed = (page) =>
    waitFor(page, `!document.querySelector("theme-menu").hasAttribute("data-open")`);

  // countWrites wraps localStorage.setItem so page.evaluate("window.writes") counts its calls.
  const countWrites = (page) =>
    page.evaluate(`(() => {
      window.writes = 0;
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (...args) { window.writes++; return setItem.apply(this, args); };
    })()`);

  const DEFAULT_STATE = {
    "data-palette": "flexoki",
    "data-space": "regular",
    "data-type": "mono",
    "data-scheme": null,
  };

  test("is a modal dialog in light DOM, a radio group per section listing the registry's names", async () => {
    const page = await openMenu();
    const menu = await page.evaluate(`(() => {
      const dialog = document.querySelector("theme-menu > dialog");
      const hidden = (el) => getComputedStyle(el).clipPath === "inset(50%)";
      return {
        modal: dialog.matches(":modal"),
        shadow: document.querySelector("theme-menu").shadowRoot,
        rows: [...dialog.querySelectorAll("fieldset")].map((row) => ({
          section: row.dataset.section,
          legend: row.querySelector("legend").textContent,
          names: [...row.querySelectorAll("input[type=radio]")].map((radio) => radio.value),
          groups: new Set([...row.querySelectorAll("input")].map((radio) => radio.name)).size,
          shown: [...row.querySelectorAll("label")].filter((label) => !hidden(label))
            .map((label) => label.textContent),
          radiosHidden: [...row.querySelectorAll("input")].every(hidden),
          arrows: [...row.querySelectorAll("[aria-hidden=true]")].map((el) => el.textContent),
        })),
        actions: [...dialog.querySelectorAll("footer button")].map((button) => [
          button.textContent.replace(/\\s+/g, " ").trim(),
          button.querySelector("kbd").textContent,
          button.getAttribute("aria-keyshortcuts"),
        ]),
      };
    })()`);
    expect(menu.modal).toBe(true);
    expect(menu.shadow).toBeNull();
    expect(menu.rows).toEqual([
      {
        section: "color",
        legend: "Color",
        names: ["flexoki", "primer", "catppuccin", "everforest"],
        groups: 1,
        shown: ["flexoki"],
        radiosHidden: true,
        arrows: ["◀", "▶"],
      },
      {
        section: "scheme",
        legend: "Scheme",
        names: ["system", "light", "dark"],
        groups: 1,
        shown: ["system"],
        radiosHidden: true,
        arrows: ["◀", "▶"],
      },
      {
        section: "space",
        legend: "Space",
        names: ["regular", "compact"],
        groups: 1,
        shown: ["regular"],
        radiosHidden: true,
        arrows: ["◀", "▶"],
      },
      {
        section: "type",
        legend: "Type",
        names: ["mono", "sans"],
        groups: 1,
        shown: ["mono"],
        radiosHidden: true,
        arrows: ["◀", "▶"],
      },
    ]);
    expect(menu.actions).toEqual([
      ["Cancel Esc", "Esc", "Escape"],
      ["Save T", "T", "T"],
    ]);
    expect(await state(page)).toMatchObject({ focus: ["color", "flexoki"], root: NONE });
  });

  test("two opens while the menu module loads open one menu", async () => {
    await seed(null);
    const page = await open(fixture("preferences.html"));
    await page.evaluate(`(() => {
      const button = document.querySelector("button[commandfor=theme]");
      button.click();
      button.click();
    })()`);
    await waitFor(page, `document.querySelector("theme-menu dialog")?.open`);
    await page.evaluate("new Promise((resolve) => setTimeout(resolve, 100))");
    expect(await page.evaluate(`document.querySelectorAll("theme-menu dialog").length`)).toBe(1);
  });

  test("opens on what applies: the stored choice checked, the preview carrying it", async () => {
    const page = await openMenu(CHOICE);
    expect(await state(page)).toMatchObject({
      focus: ["color", "primer"],
      selection: CHOICE,
      root: APPLIED,
      preview: APPLIED,
    });
  });

  test("the preview holds the card's contents without its frame or token strip", async () => {
    const page = await openMenu();
    const preview = await page.evaluate(`(() => {
      const preview = document.querySelector("theme-menu .theme-menu-preview");
      const input = preview.querySelector("input[type=text]");
      return {
        heading: !!preview.querySelector(":scope > h3"),
        prose: !!preview.querySelector("p a[href]") && !!preview.querySelector("p code") &&
          !!preview.querySelector("p kbd"),
        buttons: [...preview.querySelectorAll("button")].map((button) => button.className),
        labeled: input?.labels.length === 1,
        striped: preview.querySelectorAll("table.table-striped > tbody > tr").length,
        swatches: preview.querySelectorAll(".preview-swatches, .preview-label").length,
      };
    })()`);
    expect(preview).toEqual({
      heading: true,
      prose: true,
      buttons: ["", "button-blue"],
      labeled: true,
      striped: 3,
      swatches: 0,
    });
  });

  test("Up/Down and k/j move between rows; Left/Right and h/l cycle one, applying at once", async () => {
    const page = await openMenu();
    const key = (name) => page.view.press(name);

    // Down moves to the next row without cycling the radios natively.
    await key("ArrowDown");
    expect(await state(page)).toMatchObject({ focus: ["scheme", "system"], root: NONE });
    await key("j");
    expect((await state(page)).focus).toEqual(["space", "regular"]);
    await key("k");
    await key("ArrowUp");
    expect((await state(page)).focus).toEqual(["color", "flexoki"]);
    // Up from the first row stays there.
    await key("ArrowUp");
    expect((await state(page)).focus).toEqual(["color", "flexoki"]);

    // The scheme row cycles system, light, dark, and wraps both ways.
    await key("j");
    await key("ArrowRight");
    expect(await state(page)).toMatchObject({
      focus: ["scheme", "light"],
      root: { "data-scheme": "light" },
      preview: { ...DEFAULT_STATE, "data-scheme": "light" },
    });
    await key("l");
    expect((await state(page)).root["data-scheme"]).toBe("dark");
    await key("l");
    // Once changed, the root names every facet, the defaults included.
    expect(await state(page)).toMatchObject({ focus: ["scheme", "system"], root: DEFAULT_STATE });
    await key("h");
    expect((await state(page)).focus).toEqual(["scheme", "dark"]);
    await key("ArrowLeft");
    await key("ArrowLeft");
    expect((await state(page)).focus).toEqual(["scheme", "system"]);

    // h on the first color wraps to the last, applying to the page and the preview.
    await key("k");
    await key("h");
    expect(await state(page)).toMatchObject({
      focus: ["color", "everforest"],
      root: { "data-palette": "everforest" },
      preview: { "data-palette": "everforest" },
    });
  });

  test("Tab is one stop per row, then the actions", async () => {
    const page = await openMenu();
    const stops = [];
    for (let i = 0; i < 5; i++) {
      await page.view.press("Tab");
      stops.push(
        await page.evaluate(`document.activeElement.closest("fieldset")?.dataset.section ??
          document.activeElement.dataset.action`),
      );
    }
    expect(stops).toEqual(["scheme", "space", "type", "cancel", "save"]);
  });

  test("every key the menu handles stops at the dialog", async () => {
    const page = await openMenu();
    await page.evaluate(`(() => {
      window.seen = [];
      document.addEventListener("keydown", (event) => seen.push(event.key));
    })()`);
    for (const name of ["ArrowDown", "j", "ArrowRight", "l", "h", "ArrowLeft", "k", "ArrowUp"]) {
      await page.view.press(name);
    }
    await page.view.press("Escape");
    await closed(page);
    expect(await page.evaluate("window.seen")).toEqual([]);
  });

  test("T and Save accept: storage written once, the menu closed", async () => {
    for (const accept of ["t", "save"]) {
      const page = await openMenu();
      await countWrites(page);
      await page.view.press("l");
      await page.view.press("j");
      await page.view.press("l");
      if (accept === "t") await page.view.press("t");
      else await page.evaluate(`document.querySelector("[data-action=save]").click()`);
      await closed(page);
      const choice = { color: "primer", scheme: "light", space: "regular", type: "mono" };
      expect(await stored(page)).toEqual(choice);
      expect(await page.evaluate("window.writes")).toBe(1);
      expect(await rooted(page)).toEqual({
        ...NONE,
        "data-palette": "primer",
        "data-space": "regular",
        "data-type": "mono",
        "data-scheme": "light",
      });
      expect(await call(page, "preferences.isOpen()")).toBe(false);
      expect(await page.evaluate(`document.querySelector("dialog[open]")`)).toBeNull();
    }
  });

  test("Escape and Cancel restore what applied at open and write nothing", async () => {
    for (const cancel of ["Escape", "cancel"]) {
      const page = await openMenu(CHOICE);
      await countWrites(page);
      await page.view.press("l");
      await page.view.press("j");
      await page.view.press("l");
      expect((await state(page)).root).not.toEqual(APPLIED);
      if (cancel === "Escape") await page.view.press("Escape");
      else await page.evaluate(`document.querySelector("[data-action=cancel]").click()`);
      await closed(page);
      expect(await rooted(page)).toEqual(APPLIED);
      expect(await stored(page)).toEqual(CHOICE);
      expect(await page.evaluate("window.writes")).toBe(0);
      expect(await call(page, "preferences.isOpen()")).toBe(false);
    }
  });

  test("a backdrop click does nothing", async () => {
    const page = await openMenu();
    for (const type of ["mousePressed", "mouseReleased"]) {
      await page.view.cdp("Input.dispatchMouseEvent", {
        type,
        x: 2,
        y: 2,
        button: "left",
        clickCount: 1,
      });
    }
    await page.evaluate("new Promise((resolve) => setTimeout(resolve, 100))");
    expect(await page.evaluate(`document.querySelector("theme-menu dialog")?.open`)).toBe(true);
    expect(await call(page, "preferences.isOpen()")).toBe(true);
  });

  test("Cancel after another tab saved restores the stored value, the other tab's", async () => {
    const page = await openMenu(CHOICE);
    const saver = await open(fixture("elsewhere/preferences.html"));
    await page.view.press("l");
    const next = { color: "catppuccin", space: "regular", type: "mono", scheme: "light" };
    await call(saver, `preferences.save(${JSON.stringify(next)})`);
    await waitFor(
      page,
      `JSON.parse(localStorage.getItem(${JSON.stringify(KEY)})).color === "catppuccin"`,
    );
    // Ignored while open: the page keeps the menu's selection.
    expect((await state(page)).root["data-palette"]).toBe("catppuccin");
    await page.view.press("l");
    expect((await state(page)).root["data-palette"]).toBe("everforest");
    await page.view.press("Escape");
    await closed(page);
    expect(await rooted(page)).toEqual({
      "data-palette": "catppuccin",
      "data-space": "regular",
      "data-type": "mono",
      "data-scheme": "light",
    });
  });

  test("for every selection, the preview's tokens match what the root resolves for it", async () => {
    const page = await openMenu();
    const mismatches = await page.evaluate(`(() => {
      const dialog = document.querySelector("theme-menu dialog");
      const preview = dialog.querySelector(".theme-menu-preview");
      const radios = (section) => [...dialog.querySelectorAll('[data-section="' + section + '"] input')];
      const tokens = (el) => {
        const style = getComputedStyle(el);
        return Object.fromEntries([...getComputedStyle(document.documentElement)]
          .filter((name) => name.startsWith("--")).map((name) => [name, style.getPropertyValue(name)]));
      };
      const mismatches = [];
      let count = 0;
      for (const color of radios("color")) for (const scheme of radios("scheme"))
        for (const space of radios("space")) for (const type of radios("type")) {
          for (const radio of [color, scheme, space, type]) radio.checked = true;
          dialog.dispatchEvent(new Event("change"));
          count++;
          const root = tokens(document.documentElement);
          const scoped = tokens(preview);
          for (const name in root) {
            if (root[name] !== scoped[name]) mismatches.push([color.value, scheme.value, space.value, type.value, name]);
          }
        }
      return { count, tokens: Object.keys(tokens(preview)).length, mismatches };
    })()`);
    expect(mismatches.count).toBe(4 * 3 * 2 * 2);
    expect(mismatches.tokens).toBeGreaterThan(30);
    expect(mismatches.mismatches).toEqual([]);
  });

  test("its CSS is one adopted sheet in spike-html-design.theme-menu, under consumer layers", async () => {
    const page = await openMenu();
    // Reopened, the sheet is adopted once.
    await page.view.press("Escape");
    await closed(page);
    await page.evaluate(`document.querySelector("button[commandfor=theme]").click()`);
    await waitFor(page, `document.querySelector("theme-menu dialog")?.open`);
    const sheet = await page.evaluate(`(() => {
      const sheets = document.adoptedStyleSheets;
      const rules = [...sheets[0].cssRules];
      return {
        count: sheets.length,
        layers: rules.map((rule) => rule.name),
        colors: /#[0-9a-f]{3,8}\\b|\\b(rgba?|hsla?|hwb|oklch|oklab|lch|lab)\\(/i.test(rules.map((r) => r.cssText).join("")),
      };
    })()`);
    expect(sheet).toEqual({ count: 1, layers: ["spike-html-design.theme-menu"], colors: false });

    // The menu's rule beats the elements layer: a row's legend has the menu's padding, none, not
    // the elements layer's legend padding.
    const legend = ".theme-menu-row > legend";
    expect(await page.style(legend, "padding-left")).toBe("0px");
    // A consumer's layer, declared after the package layer, beats the menu's rule.
    await page.evaluate(`document.head.insertAdjacentHTML("beforeend", "<style>" +
      "@layer spike-html-design, app; @layer app { .theme-menu-row > legend { padding-left: 3px; } }</style>")`);
    expect(await page.style(legend, "padding-left")).toBe("3px");
  });

  test("rows sit beside the preview on a wide viewport and above it on a narrow one", async () => {
    const layout = `(() => {
      const rows = document.querySelector(".theme-menu-rows").getBoundingClientRect();
      const preview = document.querySelector(".theme-menu-preview").getBoundingClientRect();
      return { beside: preview.left >= rows.right, below: preview.top >= rows.bottom };
    })()`;
    const wide = await openMenu(null, { viewport: { width: 1280, height: 900 } });
    expect(await wide.evaluate(layout)).toEqual({ beside: true, below: false });
    const narrow = await openMenu(null, { viewport: { width: 420, height: 860 } });
    expect(await narrow.evaluate(layout)).toEqual({ beside: false, below: true });
  });
});

describe("preferences: the specimen", () => {
  test("served, its header's Theme button opens the menu", async () => {
    await seed(null);
    const page = await open(`${server.url}index.html`);
    const button = await page.evaluate(`(() => {
      const button = document.querySelector("body > header > h1 + *");
      return {
        tag: button.localName,
        text: button.textContent.replace(/\\s+/g, " ").trim(),
        kbd: button.querySelector("kbd")?.textContent,
        shortcut: button.getAttribute("aria-keyshortcuts"),
        command: button.getAttribute("command"),
        target: document.getElementById(button.getAttribute("commandfor"))?.localName,
        menus: document.querySelectorAll("theme-menu").length,
      };
    })()`);
    expect(button).toEqual({
      tag: "button",
      text: "Theme T",
      kbd: "T",
      shortcut: "T",
      command: "--open",
      target: "theme-menu",
      menus: 1,
    });
    await page.evaluate(`document.querySelector("body > header > button").click()`);
    await waitFor(page, `document.querySelector("theme-menu dialog")?.open`);
    expect(await page.evaluate(`document.querySelectorAll("theme-menu fieldset").length`)).toBe(4);
  });

  test("from file://, it has no menu: the recorded gap", async () => {
    // Chromium runs no relative module script from file://, so the working-tree specimen opened
    // as a file defines no <theme-menu> and its Theme button opens nothing. Its CSS still
    // renders as it does served (baseline.test.js, "renders the same from file://"); the pinned
    // page, whose modules come from jsDelivr, has the menu from file:// (pinned.test.js).
    const page = await open(fileUrl(join(root, "index.html")), { scheme: "light" });
    await page.evaluate(`document.querySelector("body > header > button").click()`);
    await page.evaluate("new Promise((resolve) => setTimeout(resolve, 200))");
    expect(
      await page.evaluate(`({
        defined: customElements.get("theme-menu") !== undefined,
        dialog: document.querySelector("theme-menu dialog") !== null,
      })`),
    ).toEqual({ defined: false, dialog: false });
  });
});
