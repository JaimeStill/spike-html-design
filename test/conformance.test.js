import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileUrl, openPage, serve } from "./harness.js";
import { ENTRIES } from "./layers.js";
import { COLOR_PROFILES } from "./profiles.js";

const root = dirname(import.meta.dir);
const fixtures = join(import.meta.dir, "fixtures");
// The repository served at the root, so a fixture imports the modules by relative URL; chromium
// runs no relative module script from file://.
const server = serve(root);
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

// RULES are the color facet's rule names, in the order check() reports them.
const RULES = ["tokens", "color-only", "layer", "specificity", "paints", "surfaces", "registered"];

// BROKEN are the fixture profiles, each to the one rule it breaks. Every rule but paints, which an
// entry's own rule keeps, has one; a consumer's rule breaks paints in its own test below.
const BROKEN = {
  missing: "tokens",
  spacing: "color-only",
  unlayered: "layer",
  specific: "specificity",
  surfaces: "surfaces",
  unregistered: "registered",
};

// checked resolves to the failures check() returns for each of names on page, name to list, with
// the conformance module imported from url.
function checked(page, url, names) {
  return page.evaluate(`import(${JSON.stringify(url)}).then(async ({ check }) => {
    const results = {};
    for (const name of ${JSON.stringify(names)}) results[name] = await check("color", name);
    return results;
  })`);
}

// conforming is the result checked() resolves to when every one of names conforms.
const conforming = (names) => Object.fromEntries(names.map((name) => [name, []]));

describe("conformance", () => {
  const BUILT_IN = Object.keys(COLOR_PROFILES);

  for (const scheme of ["light", "dark"]) {
    test(`the four built-in color profiles conform, served, with the system in ${scheme}`, async () => {
      const page = await open(`${server.url}test/fixtures/conformance.html`, { scheme });
      expect(await checked(page, "/modules/conformance.js", BUILT_IN)).toEqual(
        conforming(BUILT_IN),
      );
    });
  }

  test("the four built-in color profiles conform from file://, with the package on a CDN", async () => {
    // From file:// every sheet is cross-origin, so chromium hides its rules: the check reads
    // computed values alone.
    const cdn = "https://cdn.jsdelivr.net/gh/example/fixture@v0.7.0/";
    const files = [
      "full.css",
      ...ENTRIES["full.css"].map(([, path]) => path),
      "modules/registry.js",
      "modules/register-full.js",
      "modules/conformance.js",
    ];
    const page = await open(fileUrl(join(fixtures, "conformance-cdn.html")), {
      intercept: Object.fromEntries(files.map((path) => [`${cdn}${path}`, join(root, path)])),
    });
    expect(
      await page.evaluate(`[...document.styleSheets].every((sheet) => {
        try { return sheet.cssRules && false; } catch { return true; }
      })`),
    ).toBe(true);
    expect(await checked(page, `${cdn}modules/conformance.js`, BUILT_IN)).toEqual(
      conforming(BUILT_IN),
    );
  });

  test("each fixture profile fails the one rule it breaks, by name", async () => {
    const page = await open(`${server.url}test/fixtures/conformance.html`);
    const results = await checked(page, "/modules/conformance.js", Object.keys(BROKEN));
    for (const [name, rule] of Object.entries(BROKEN)) {
      expect([name, results[name].map((failure) => failure.rule)]).toEqual([name, [rule]]);
      expect(results[name][0].message).toStartWith(`${name}: `);
    }
  });

  test("names the failing tokens and schemes, and an unknown name fails every applying rule", async () => {
    const page = await open(`${server.url}test/fixtures/conformance.html`);
    const results = await checked(page, "/modules/conformance.js", ["missing", "absent"]);
    expect(results.missing[0].message).toBe(
      "missing: sets no color in a scheme for --magenta (light, dark)",
    );
    // A name no stylesheet applies sets no token, so the rules that read tokens are skipped.
    expect(results.absent.map((failure) => failure.rule)).toEqual(["tokens", "registered"]);
  });

  test("a scope painted from other tokens fails paints", async () => {
    // A consumer rule that repaints every flexoki scope breaks paints for flexoki alone.
    const page = await open(`${server.url}test/fixtures/conformance.html`);
    await page.evaluate(`document.head.append(Object.assign(document.createElement("style"), {
      textContent: '[data-palette="flexoki"] { background-color: var(--red); }',
    }))`);
    const results = await checked(page, "/modules/conformance.js", ["flexoki", "primer"]);
    expect(results.flexoki.map((failure) => failure.rule)).toEqual(["paints"]);
    expect(results.primer).toEqual([]);
  });

  test("exports the rules, and rejects an unknown facet, an unchecked facet, or an empty name", async () => {
    const page = await open(`${server.url}test/fixtures/conformance.html`);
    expect(
      await page.evaluate(`import("/modules/conformance.js").then(async ({ check, RULES }) => {
        const rejected = (call) => call.then(() => null, (error) => [error.name, error.message]);
        return [
          Object.keys(RULES),
          RULES.color,
          Object.isFrozen(RULES) && Object.isFrozen(RULES.color),
          await rejected(check("scheme", "dark")),
          await rejected(check("space", "regular")),
          await rejected(check("color", "")),
        ];
      })`),
    ).toEqual([
      ["color"],
      RULES,
      true,
      ["TypeError", "conformance: unknown facet scheme; expected one of color, space, type"],
      ["TypeError", "conformance: no check for the space facet"],
      ["TypeError", "conformance: a color profile's name must be a non-empty string"],
    ]);
  });

  test("leaves the page as it found it, and loads nothing", async () => {
    const page = await open(`${server.url}test/fixtures/conformance.html`);
    const state = `[document.querySelectorAll("*").length, document.styleSheets.length,
      performance.getEntriesByType("resource").length]`;
    const before = await page.evaluate(state);
    await checked(page, "/modules/conformance.js", ["flexoki"]);
    // The module itself is the one resource the check adds.
    const [elements, sheets, resources] = await page.evaluate(state);
    expect([elements, sheets, resources]).toEqual([before[0], before[1], before[2] + 1]);
  });
});
