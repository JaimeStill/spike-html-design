import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileUrl, openPage, serve } from "./harness.js";

const root = dirname(import.meta.dir);
const fixtures = join(import.meta.dir, "fixtures");
// The repository served at the root, so a fixture imports the modules by relative URL; chromium
// runs no relative module script from file://.
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

// LEAN and FULL are the names each registration module lists, per facet, in registration order:
// the profiles its CSS entry ships.
const LEAN = { color: ["flexoki"], space: ["regular"], type: ["mono"] };
const FULL = {
  color: ["flexoki", "primer", "catppuccin", "everforest"],
  space: ["regular", "compact"],
  type: ["mono", "serif"],
};

// STORE reads the page's registry store at its well-known global key, as JSON.
const STORE = `JSON.parse(JSON.stringify(globalThis[Symbol.for("spike-html-design.registry")]))`;

// listed resolves to what a fixture page lists, per facet: the text of each <li> in its
// <ul id="<facet>">, in order.
function listed(page) {
  return page.evaluate(`Object.fromEntries(["color", "space", "type"].map((facet) =>
    [facet, [...document.querySelectorAll("#" + facet + " li")].map((li) => li.textContent)]))`);
}

// fetched resolves to the path and query of every resource a page fetched after the document.
function fetched(page) {
  return page.evaluate(
    `performance.getEntriesByType("resource").map(({ name }) => new URL(name).pathname + new URL(name).search)`,
  );
}

describe("registry", () => {
  test("the lean registration module lists flexoki, regular, and mono", async () => {
    const page = await open(fixture("register.html"));
    expect(await listed(page)).toEqual(LEAN);
    expect(await page.evaluate(STORE)).toEqual(LEAN);
  });

  test("the full registration module lists every built-in profile, defaults first", async () => {
    const page = await open(fixture("register-full.html"));
    expect(await listed(page)).toEqual(FULL);
    expect(await page.evaluate(STORE)).toEqual(FULL);
  });

  test("registering loads no CSS", async () => {
    for (const name of ["register.html", "register-full.html"]) {
      const page = await open(fixture(name));
      expect(await page.evaluate("document.styleSheets.length")).toBe(0);
      const css = (await fetched(page)).filter((path) => !/\.(js|ico)(\?|$)/.test(path));
      expect(css).toEqual([]);
    }
  });

  test("two copies of the registry from two URLs share one store", async () => {
    const page = await open(fixture("registry.html"));
    expect(await page.evaluate("window.copies")).toBe(true);
    const paths = await fetched(page);
    // Three copies: ?a, ?b, and the one the registration modules import.
    expect(paths.filter((path) => path.startsWith("/modules/registry.js")).sort()).toEqual([
      "/modules/registry.js",
      "/modules/registry.js?a",
      "/modules/registry.js?b",
    ]);
    // Copy b lists what the registration modules and copy a registered, each name once though
    // the lean module ran twice and the extension registered twice.
    const expected = { ...FULL, color: [...FULL.color, "extension"] };
    expect(await listed(page)).toEqual(expected);
    expect(await page.evaluate(STORE)).toEqual(expected);
  });

  test("copies from two tags on a CDN share one store, from file://", async () => {
    const cdn = "https://cdn.jsdelivr.net/gh/example/fixture";
    const page = await open(fileUrl(join(fixtures, "registry-tags.html")), {
      intercept: {
        [`${cdn}@v0.5.0/modules/registry.js`]: join(root, "modules", "registry.js"),
        [`${cdn}@v0.5.0/modules/register.js`]: join(root, "modules", "register.js"),
        [`${cdn}@v0.6.0/modules/registry.js`]: join(root, "modules", "registry.js"),
      },
    });
    expect(await page.evaluate("window.copies")).toBe(true);
    const expected = { ...LEAN, color: ["flexoki", "extension"] };
    expect(await listed(page)).toEqual(expected);
    expect(await page.evaluate(STORE)).toEqual(expected);
  });

  test("the store is a plain object of the three facets' name lists", async () => {
    const page = await open(fixture("register.html"));
    expect(
      await page.evaluate(`(() => {
        const store = globalThis[Symbol.for("spike-html-design.registry")];
        return [Object.getPrototypeOf(store) === Object.prototype, Object.keys(store),
          Object.values(store).every(Array.isArray)];
      })()`),
    ).toEqual([true, ["color", "space", "type"], true]);
  });

  test("names the facets and their defaults, and profiles() returns a copy", async () => {
    const page = await open(fixture("register.html"));
    expect(
      await page.evaluate(`import("/modules/registry.js").then((registry) => {
        registry.profiles("color").push("mutated");
        return [registry.FACETS, registry.DEFAULTS, registry.profiles("color")];
      })`),
    ).toEqual([
      ["color", "space", "type"],
      { color: "flexoki", space: "regular", type: "mono" },
      ["flexoki"],
    ]);
  });

  test("register throws on an unknown facet or an empty name, and registers nothing", async () => {
    const page = await open(fixture("register.html"));
    const thrown = (call) =>
      page.evaluate(`import("/modules/registry.js").then((registry) => {
        try { ${call}; return null; } catch (error) { return [error.name, error.message]; }
      })`);
    expect(await thrown(`registry.register("scheme", "dark")`)).toEqual([
      "TypeError",
      "registry: unknown facet scheme; expected one of color, space, type",
    ]);
    expect(await thrown(`registry.profiles("palette")`)).toEqual([
      "TypeError",
      "registry: unknown facet palette; expected one of color, space, type",
    ]);
    expect(await thrown(`registry.register("color", "")`)).toEqual([
      "TypeError",
      "registry: a color profile's name must be a non-empty string",
    ]);
    expect(await page.evaluate(STORE)).toEqual(LEAN);
  });
});
