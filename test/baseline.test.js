import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { FINGERPRINT_PROPERTIES, fileUrl, openPage, serve } from "./harness.js";
import { ENTRIES, LAYERS, LOADED, layerPath, layersLoaded, PACKAGE } from "./layers.js";
import {
  ADDED,
  COLOR_PROFILES,
  FACET_PROFILES,
  MONO,
  profileColors,
  profilePath,
  SANS,
  SCHEMES,
  SPACE_PROFILES,
  TYPE_PROFILES,
} from "./profiles.js";

const root = dirname(import.meta.dir);
const specimen = fileUrl(join(root, "index.html"));
const fixture = fileUrl(join(import.meta.dir, "fixtures", "baseline.html"));
const whitespaceFixture = fileUrl(join(import.meta.dir, "fixtures", "whitespace.html"));
const previewFixture = fileUrl(join(import.meta.dir, "fixtures", "preview.html"));
const consumerFixture = fileUrl(join(import.meta.dir, "fixtures", "consumer.html"));
// The repository served under a project subpath, as GitHub Pages serves the specimen.
const server = serve(root, { prefix: "/spike-html-design/" });
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

// squash collapses runs of whitespace, since a custom property's computed value keeps the
// line breaks of its declaration.
const squash = (value) => value.replace(/\s+/g, " ");

// SPACE_STEPS are the space scale's steps, name to its multiple of the fluid space base.
const SPACE_STEPS = {
  "--space-3xs": 0.25,
  "--space-2xs": 0.5,
  "--space-xs": 0.75,
  "--space-s": 1,
  "--space-m": 1.5,
  "--space-l": 2,
  "--space-xl": 3,
  "--space-2xl": 4,
  "--space-3xl": 6,
};

// SPACE_BASE is the fluid space base's [smallest, largest] value, in rem.
const SPACE_BASE = [1, 1.125];

// TEXT_STEPS are the text scale's tokens, name to its step on the modular scale.
const TEXT_STEPS = {
  "--text-xs": -2,
  "--text-s": -1,
  "--text-m": 0,
  "--text-l": 1,
  "--text-xl": 2,
  "--text-2xl": 3,
  "--text-3xl": 4,
  "--text-4xl": 5,
};

// TEXT_FIXED are the text steps no display size changes, --text-m and the steps below it, name
// to rem: 1rem × 1.125^n, the scale's narrow ratio, rounded to the four decimals the type facet
// states them in.
const TEXT_FIXED = Object.fromEntries(
  Object.entries(TEXT_STEPS)
    .filter(([, n]) => n <= 0)
    .map(([name, n]) => [name, Number((1.125 ** n).toFixed(4))]),
);

// FLUID are the fluid tokens, name to [smallest, largest] value in rem: the space base and each
// step's multiple of it, and each text step above --text-m from 1rem × 1.125^n to 1rem × 1.2^n,
// rounded to the four decimals the type facet states them in.
const FLUID = {
  "--space-base": SPACE_BASE,
  ...Object.fromEntries(
    Object.entries(SPACE_STEPS).map(([name, k]) => [name, SPACE_BASE.map((rem) => rem * k)]),
  ),
  ...Object.fromEntries(
    Object.entries(TEXT_STEPS)
      .filter(([name]) => !(name in TEXT_FIXED))
      .map(([name, n]) => [name, [1.125 ** n, 1.2 ** n].map((rem) => Number(rem.toFixed(4)))]),
  ),
};

// textSize is the px a text step resolves to in a viewport, with a root font size of rem px: a
// fixed step's own size, or a fluid step's formula.
function textSize(name, viewport, rem = 16) {
  return name in TEXT_FIXED ? TEXT_FIXED[name] * rem : fluid(FLUID[name], viewport, rem);
}

// SPACE is the space facet's token set, name to kind: how a test resolves the token's value.
const SPACE = {
  "--space-fluid": "number",
  "--space-base": "length",
  ...Object.fromEntries(Object.keys(SPACE_STEPS).map((name) => [name, "length"])),
  "--line-s": "length",
  "--line-m": "length",
  "--radius-base": "length",
  "--radius-sm": "length",
  "--radius-md": "length",
  "--radius-lg": "length",
  "--radius-full": "length",
};

// TYPE is the type facet's token set, name to kind.
const TYPE = {
  "--type-fluid": "number",
  ...Object.fromEntries(Object.keys(TEXT_STEPS).map((name) => [name, "length"])),
  "--font-body": "raw",
  "--font-heading": "raw",
  "--font-ui": "raw",
  "--font-code": "raw",
  "--leading-body": "number",
  "--leading-heading": "number",
  "--leading-ui": "number",
  "--leading-code": "number",
};

// FIXED are the type and space tokens no display size changes, name to declared value.
const FIXED = {
  "--text-xs": "0.7901rem",
  "--text-s": "0.8889rem",
  "--text-m": "1rem",
  "--font-body": SANS,
  "--font-heading": MONO,
  "--font-ui": MONO,
  "--font-code": MONO,
  "--leading-body": "1.5",
  "--leading-heading": "1.2",
  "--leading-ui": "1.25",
  "--leading-code": "1.5",
  "--line-s": "1px",
  "--line-m": "2px",
  "--radius-base": "0.375rem",
  "--radius-full": "9999px",
};

// rgb converts a #rrggbb hex to the rgb() a computed color reads as.
const rgb = (hex) =>
  `rgb(${[1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;

// FLEXOKI is the default profile's tokens, in the facet's order, name to its [light, dark] hex
// values, from the profiles record.
const FLEXOKI = Object.entries(COLOR_PROFILES.flexoki.tokens).map(([name, [light, dark]]) => [
  name,
  [light[1], dark[1]],
]);

// TIERS are the surface, border and text tokens, name to Flexoki's [light, dark] values: the
// base, the first elevated surface, the element surface, the border and the control boundary,
// then the text weights.
const TIERS = Object.fromEntries(FLEXOKI.slice(0, 8));

// HUES are the hue tokens, each named for its color, name to Flexoki's [light, dark] values: its
// 600 step in light, its 400 step in dark.
const HUES = Object.fromEntries(FLEXOKI.slice(8));

// SURFACES are the color tokens text sits over, the contrast matrices' columns, in order.
const SURFACES = ["--bg", "--bg-1", "--bg-2", "--border", "--border-2"];

// TEXT are the color tokens drawn as text, the contrast matrices' rows, in order: the text tiers,
// then the hues.
const TEXT = [
  ...Object.keys(TIERS).filter((name) => !SURFACES.includes(name)),
  ...Object.keys(HUES),
];

// COLORS are the color facet's tokens, name to the color each resolves to in light and in dark.
const COLORS = Object.fromEntries(
  Object.entries({ ...TIERS, ...HUES }).map(([name, pair]) => [name, pair.map(rgb)]),
);

// FACETS are the tokens layer's facets, sub-layer to its token set, name to kind.
const FACETS = {
  "tokens.color": Object.fromEntries(Object.keys(COLORS).map((name) => [name, "color"])),
  "tokens.space": SPACE,
  "tokens.type": TYPE,
};

// TOKENS are every token the baseline declares, name to kind.
const TOKENS = Object.assign({}, ...Object.values(FACETS));

// RETIRED are the token names the facets dropped: from v0.1.0 and v0.2.0, the color tiers but
// --bg-1, which v0.6.0 takes back as the first elevated surface, the role tokens, and herald's text tiers; herald's numbered space steps, its font stacks, and the
// text steps the type facet renamed; and --measure, since line length is layout's. None may be
// declared or read anywhere in the working tree. The kept text names (--text-xs, --text-xl,
// --text-2xl to --text-4xl) are not among them.
const RETIRED = [
  "--divider",
  "--fg-1",
  "--color",
  "--color-1",
  "--color-2",
  "--accent",
  "--success",
  "--warning",
  "--danger",
  ...[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((step) => `--space-${step}`),
  "--font-sans",
  "--font-mono",
  "--text-sm",
  "--text-base",
  "--text-lg",
  "--measure",
];

// RENAMED are the color names v0.4.0 dropped: --border-3, whose readers now read --border-2. The
// v0.3.0 pinned page still reads it, since it renders against its own tag, so the names are held
// out of every other source.
const RENAMED = ["--border-3"];

// PINNED_V030 is the v0.3.0 pinned page, the one source RENAMED's names may remain in.
const PINNED_V030 = "pinned/v0.3.0.html";

// DROPPED are the color names v0.6.0 dropped, with no alias: --bg-0, the pane, whose readers now
// read --bg-1. The v0.4.0 pinned page still reads it, since it renders against its own tag, so the
// name is held out of every other source.
const DROPPED = ["--bg-0"];

// PINNED_V040 is the v0.4.0 pinned page, the one source DROPPED's names may remain in.
const PINNED_V040 = "pinned/v0.4.0.html";

// SOURCES are the working tree's CSS: the stylesheet, its layer files, the profile files, the
// specimen and its pinned pages since v0.3.0, whose style elements read the tokens too, and the
// test fixtures.
const SOURCES = [
  ...Object.keys(ENTRIES),
  ...LAYERS.map(layerPath),
  ...Object.entries(FACET_PROFILES).flatMap(([facet, { names }]) =>
    names.map((name) => profilePath(facet, name)),
  ),
  "index.html",
  "pinned/v0.3.0.html",
  "pinned/v0.4.0.html",
  "test/fixtures/baseline.html",
  "test/fixtures/consumer.html",
  "test/fixtures/extension.html",
  "test/fixtures/index.html",
  "test/fixtures/preview.html",
];

// TOOLS are the tools classes, by family: the button base and its eight hue variants, the scroll
// helpers, the form helpers and the table helpers.
const TOOLS = [
  "button",
  "button-red",
  "button-orange",
  "button-yellow",
  "button-green",
  "button-cyan",
  "button-blue",
  "button-purple",
  "button-magenta",
  "scroll-y",
  "scroll-x",
  "field",
  "field-grow",
  "table-full",
  "table-striped",
];

// rootTokens resolves to every custom property declared on :root, name to computed value.
function rootTokens(page) {
  return page.evaluate(`(() => {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries([...style].filter((name) => name.startsWith("--"))
      .map((name) => [name, style.getPropertyValue(name).trim()]));
  })()`);
}

// resolveColor resolves to the color a color token computes to on an element in the page: a new
// child of the element matching within, the body by default.
function resolveColor(page, token, within = "body") {
  return page.evaluate(`(() => {
    const probe = document.querySelector(${JSON.stringify(within)})
      .appendChild(document.createElement("i"));
    probe.style.color = "var(${token})";
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  })()`);
}

// resolveToken resolves to a token's value as an element in the page computes it, by its kind:
// a color to its rgb(), a length to px and a number to a number, each through a registered
// custom property, so viewport units, rem, progress() and calc() are all resolved, and any other
// token to its declared value with whitespace squashed.
async function resolveToken(page, name, kind = TOKENS[name]) {
  if (kind === "color") return resolveColor(page, name);
  if (kind === "raw") return squash(await page.style(":root", name));
  return resolveAs(page, kind, `var(${name})`);
}

// resolveAs resolves a CSS value of kind "length" (to px) or "number" in the page, as an element
// in the root, outside the body, computes it, and resolves to the number. Outside the body, a
// font the type facet sets on the body never changes a ch or em length.
function resolveAs(page, kind, value) {
  const syntax = kind === "length" ? "<length>" : "<number>";
  const property = `--resolved-${kind}`;
  return page.evaluate(`(() => {
    // A property registers once per document; a second resolve finds it registered.
    try {
      CSS.registerProperty({ name: "${property}", syntax: "${syntax}", inherits: false,
        initialValue: "0" });
    } catch {}
    const probe = document.documentElement.appendChild(document.createElement("i"));
    probe.style.setProperty("${property}", ${JSON.stringify(value)});
    const value = Number.parseFloat(getComputedStyle(probe).getPropertyValue("${property}"));
    probe.remove();
    return value;
  })()`);
}

// resolveAll resolves every token of tokens, name to kind, to its value in the page.
async function resolveAll(page, tokens = TOKENS) {
  const values = {};
  for (const [name, kind] of Object.entries(tokens)) {
    values[name] = await resolveToken(page, name, kind);
  }
  return values;
}

// fluid is the px a fluid token of [smallest, largest] rem resolves to in a viewport of width by
// height px, with a root font size of rem px: the range 22.5rem to 80rem, measured as
// min(100vi, 100svb * 16 / 9), with progress clamped to 0..1.
function fluid([min, max], { width, height }, rem = 16) {
  const size = Math.min(width, (height * 16) / 9);
  const progress = Math.min(Math.max((size - 22.5 * rem) / (57.5 * rem), 0), 1);
  return (min + (max - min) * progress) * rem;
}

// addAppStyle appends css to the page in a style element, after the baseline, as an artifact's
// own app layer would sit.
function addAppStyle(page, css) {
  return page.evaluate(`(() => {
    const style = document.head.appendChild(document.createElement("style"));
    style.textContent = ${JSON.stringify(css)};
  })()`);
}

// tint parses a computed color(srgb r g b / a) into the rgb() of its opaque hue and its alpha,
// the form chromium computes a color-mix() of a hue with transparent to. It is null for any
// other color, so a bare rgb() hue or transparent never passes for a tint.
function tint(value) {
  const match = value.match(/^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+) \/ ([\d.]+)\)$/);
  if (!match) return null;
  const [r, g, b] = match.slice(1, 4).map((c) => Math.round(Number(c) * 255));
  return { hue: `rgb(${r}, ${g}, ${b})`, alpha: Number(match[4]) };
}

// luminance is the WCAG 2 relative luminance of a computed rgb() color: each sRGB channel
// linearized, then weighted.
function luminance(color) {
  const [r, g, b] = color
    .match(/^rgb\((\d+), (\d+), (\d+)\)$/)
    .slice(1)
    .map((channel) => {
      const c = Number(channel) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// contrast is the WCAG 2 contrast ratio of two computed rgb() colors, lighter over darker.
function contrast(a, b) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

// MARKS are the short marks a contrast ratio earns in the specimen's records, in the legend's
// order, each with the least ratio that earns it: AA at 4.5 for body text, AA-L at 3 for large
// text, fail below 3.
const MARKS = { AA: 4.5, "AA-L": 3, fail: 0 };

// mark is the mark a contrast ratio earns, judged on the unrounded ratio.
function mark(ratio) {
  return Object.keys(MARKS).find((name) => ratio >= MARKS[name]);
}

// ENTRY_PAGES are a page per entry, served over http, that links it: the baseline fixture links
// the lean entry, and the specimen the full entry.
const ENTRY_PAGES = {
  "baseline.css": `${server.url}test/fixtures/baseline.html`,
  "full.css": server.url,
};

// linkedEntry is a page-side expression for the entry the page links, whichever one it is.
const linkedEntry = `[...document.styleSheets]
  .find((s) => ${JSON.stringify(Object.keys(ENTRIES))}.some((e) => s.href?.endsWith("/" + e)))`;

// layerSheets resolves to a page-side expression for the sheets a nested layer's imports load,
// in order, from the entry linked by a page served over http, since chromium hides a file://
// stylesheet's rules from the page. Most layers import one file; the color sub-layer imports the
// facet's own file, then the profiles' the entry holds.
function layerSheets(layer) {
  return `[...${linkedEntry}.cssRules]
    .filter((r) => r.layerName === ${JSON.stringify(`${PACKAGE}.${layer}`)})
    .map((r) => r.styleSheet)`;
}

// layerRules resolves to every style rule in the files of the nested layers named, rules nested
// in at-rules included, each as { selector, declarations }: its selector text, absent for a rule
// without one, and its declarations as [name, value] pairs. It reads the entry linked by a page
// served over http, as layerSheets does: on the specimen, the full entry, so every profile.
function layerRules(page, ...layers) {
  return page.evaluate(`(() => {
    const rules = [];
    const walk = (list) => {
      for (const rule of list) {
        if (rule.style) {
          rules.push({
            selector: rule.selectorText,
            declarations: [...rule.style].map((name) => [name, rule.style.getPropertyValue(name)]),
          });
        }
        if (rule.cssRules) walk(rule.cssRules);
      }
    };
    for (const sheet of [${layers.map(layerSheets)}].flat()) walk(sheet.cssRules);
    return rules;
  })()`);
}

// selectorsOf and propertiesOf return layerRules' selectors, and the distinct properties its
// rules set.
const selectorsOf = (rules) => rules.map((rule) => rule.selector).filter(Boolean);
const propertiesOf = (rules) => [
  ...new Set(rules.flatMap((rule) => rule.declarations.map(([name]) => name))),
];

// hover moves the mouse, a trusted CDP event, to the center of the element matching selector,
// scrolled into view first, so it alone takes :hover.
async function hover(page, selector) {
  await page.evaluate(
    `document.querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: "center" })`,
  );
  const center = await page.evaluate(`(() => {
    const { x, y, width, height } = document.querySelector(${JSON.stringify(selector)})
      .getBoundingClientRect();
    return { x: x + width / 2, y: y + height / 2 };
  })()`);
  await page.view.cdp("Input.dispatchMouseEvent", { type: "mouseMoved", ...center });
}

// tabTo presses Tab, a trusted keyboard event, until the element matching selector has focus,
// and throws if it never does.
async function tabTo(page, selector) {
  for (let i = 0; i < 50; i++) {
    await page.view.press("Tab");
    if (await page.evaluate(`document.activeElement.matches(${JSON.stringify(selector)})`)) return;
  }
  throw new Error(`no Tab reached ${selector}`);
}

describe("layers", () => {
  for (const [entry, imported] of Object.entries(ENTRIES)) {
    test(`${entry} declares the package layer's nested layers, then imports each one's file and its profiles`, async () => {
      // Over http, since chromium hides a file:// stylesheet's rules from the page.
      const page = await open(ENTRY_PAGES[entry], { scheme: "light" });
      const rules = await page.evaluate(`(() => {
        const sheet = ${linkedEntry};
        return [...sheet.cssRules].map((rule) => ({
          type: rule.constructor.name,
          names: rule.nameList && [...rule.nameList],
          layer: rule.layerName,
          href: rule.href,
          // An import whose file failed to load has a sheet with no rules.
          loaded: rule.styleSheet ? rule.styleSheet.cssRules.length > 0 : undefined,
        }));
      })()`);
      expect(await page.evaluate(`${linkedEntry}.href.split("/").at(-1)`)).toBe(entry);
      // An exact match: the entry holds the statement and one import per file, each straight
      // into its layer, its profiles after the color facet's own file, and no rule of its own.
      // The lean entry's profile is Flexoki; the full entry's are every profile, Flexoki first.
      expect(rules).toEqual([
        { type: "CSSLayerStatementRule", names: LAYERS.map((layer) => `${PACKAGE}.${layer}`) },
        ...imported.map(([layer, path]) => ({
          type: "CSSImportRule",
          layer: `${PACKAGE}.${layer}`,
          href: `./${path}`,
          loaded: true,
        })),
      ]);
    });

    test(`${entry} imports every file one hop deep: no file it imports imports another`, async () => {
      const page = await open(ENTRY_PAGES[entry], { scheme: "light" });
      const imports = await page.evaluate(
        `[${LAYERS.map(layerSheets)}].flat()
          .map((sheet) => [...sheet.cssRules].filter((r) => r.href !== undefined).length)`,
      );
      expect(imports).toEqual(imported.map(() => 0));
    });
  }

  test("the page's layers cascade as the package layer, its nested layers in order, then app", async () => {
    // A rule in each layer sets the same custom property to the layer's name, in reverse cascade
    // order, so only the cascade, never source order, decides which one wins.
    const page = await open(fixture, { scheme: "light" });
    const order = [...LAYERS.map((layer) => `${PACKAGE}.${layer}`), "app"];
    const winners = [];
    for (const index of order.keys()) {
      const css = order
        .slice(0, index + 1)
        .reverse()
        .map((name) => `@layer ${name} { #equal { --winner: "${name}"; } }`)
        .join("\n");
      await addAppStyle(page, css);
      winners.push(JSON.parse(await page.style("#equal", "--winner")));
    }
    expect(winners).toEqual(order);
  });

  test("a page's app layer overrides tools rules of equal and higher specificity", async () => {
    const page = await open(fixture, { scheme: "light" });
    expect(await page.style("#equal", "color")).toBe("rgb(0, 128, 0)");
    expect(await page.style("#specific", "color")).toBe("rgb(0, 128, 0)");
  });

  test("a page's app layer overrides the elements layer", async () => {
    const page = await open(fixture, { scheme: "light" });
    expect(await page.style("body", "background-color")).toBe("rgb(0, 0, 255)");
  });
});

describe("tokens", () => {
  test("declares exactly the color, space and type tokens, without role, shadow and tint tokens", async () => {
    const page = await open(specimen, { scheme: "light" });
    const names = Object.keys(await rootTokens(page)).sort();
    // An exact match, so role tokens, shadow tokens, --*-bg tints, and bright, black, white or
    // ANSI hues cannot slip in.
    expect(names).toEqual(Object.keys(TOKENS).sort());
  });

  test("the fixed text steps, fonts, leadings, lines and radius base carry their declared values", async () => {
    const page = await open(specimen, { scheme: "light" });
    const tokens = await rootTokens(page);
    for (const [name, value] of Object.entries(FIXED)) {
      expect([name, squash(tokens[name])]).toEqual([name, value]);
    }
  });

  for (const [index, scheme] of SCHEMES.entries()) {
    test(`every tier and hue resolves to its ${scheme} value`, async () => {
      const page = await open(specimen, { scheme });
      for (const [name, pair] of Object.entries(COLORS)) {
        expect([name, await resolveColor(page, name)]).toEqual([name, pair[index]]);
      }
    });
  }

  for (const [facet, tokens] of Object.entries(FACETS)) {
    test(`the ${facet} sub-layer declares exactly its facet's tokens, and reads only those`, async () => {
      // Over http, since chromium hides a file:// stylesheet's rules from the page.
      const page = await open(server.url, { scheme: "light" });
      const declarations = (await layerRules(page, facet))
        .flatMap((rule) => rule.declarations)
        .filter(([name]) => name.startsWith("--"));
      const names = declarations.map(([name]) => name);
      const reads = declarations.flatMap(([, value]) =>
        [...value.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]),
      );
      // Each name once: several profile blocks declare the same sixteen color tokens.
      expect([...new Set(names)].sort()).toEqual(Object.keys(tokens).sort());
      // A facet that read another facet's token would change when that facet's profile swaps.
      expect(reads.filter((name) => !(name in tokens))).toEqual([]);
    });
  }

  test("every fluid token's bounds are rem, never px, and it interpolates with progress()", async () => {
    const page = await open(server.url, { scheme: "light" });
    const declared = Object.fromEntries(
      (await layerRules(page, "tokens.space", "tokens.type")).flatMap((rule) => rule.declarations),
    );
    // Each fluid token reads its facet's progress, or the space base that does; the progress
    // tokens measure the two-axis bound over the range.
    for (const facet of ["space", "type"]) {
      expect(squash(declared[`--${facet}-fluid`])).toBe(
        "progress(min(100vi, 100svb * 16 / 9), 22.5rem, 80rem)",
      );
    }
    for (const name of Object.keys(FLUID)) {
      expect([
        name,
        /var\(--(space|type)-fluid\)|var\(--space-base\)/.test(declared[name]),
      ]).toEqual([name, true]);
      expect([name, declared[name].includes("px")]).toEqual([name, false]);
    }
  });

  test("no retired token name remains in the working tree's CSS", async () => {
    for (const path of SOURCES) {
      const text = await Bun.file(join(root, path)).text();
      // A name ends where the next character can't continue it, so --bg-1 never matches --bg-10.
      const found = RETIRED.filter((name) => new RegExp(`${name}(?![\\w-])`).test(text));
      expect([path, found]).toEqual([path, []]);
    }
  });

  test("no name v0.4.0 renamed remains outside the v0.3.0 pinned page", async () => {
    for (const path of SOURCES.filter((path) => path !== PINNED_V030)) {
      const text = await Bun.file(join(root, path)).text();
      const found = RENAMED.filter((name) => new RegExp(`${name}(?![\\w-])`).test(text));
      expect([path, found]).toEqual([path, []]);
    }
    // The pin still reads them, so the filter above holds out a page that needs it.
    const pinned = await Bun.file(join(root, PINNED_V030)).text();
    expect(RENAMED.filter((name) => pinned.includes(`var(${name})`))).toEqual(RENAMED);
  });

  test("no name v0.6.0 dropped remains outside the v0.4.0 pinned page", async () => {
    for (const path of SOURCES.filter((path) => path !== PINNED_V040)) {
      const text = await Bun.file(join(root, path)).text();
      const found = DROPPED.filter((name) => new RegExp(`${name}(?![\\w-])`).test(text));
      expect([path, found]).toEqual([path, []]);
    }
    // The pin still reads them, so the filter above holds out a page that needs it.
    const pinned = await Bun.file(join(root, PINNED_V040)).text();
    expect(DROPPED.filter((name) => pinned.includes(`var(${name})`))).toEqual(DROPPED);
  });

  test("a hue's app layer override reaches only that hue", async () => {
    const page = await open(specimen, { scheme: "light" });
    await addAppStyle(page, "@layer app { :root { --blue: rgb(1, 2, 3); } }");
    expect(await resolveColor(page, "--blue")).toBe("rgb(1, 2, 3)");
    for (const name of Object.keys(COLORS).filter((name) => name !== "--blue")) {
      expect([name, await resolveColor(page, name)]).toEqual([name, COLORS[name][0]]);
    }
  });

  test("with no data-scheme the page follows a live change of the system scheme", async () => {
    const page = await open(specimen, { scheme: "dark" });
    expect(await page.evaluate("document.documentElement.hasAttribute('data-scheme')")).toBe(false);
    expect(await page.style(":root", "color-scheme")).toBe("light dark");
    expect(await resolveColor(page, "--bg")).toBe(COLORS["--bg"][1]);
    expect(await resolveColor(page, "--fg")).toBe(COLORS["--fg"][1]);
    // A marker on the window survives only if the page is never reloaded or navigated.
    await page.evaluate("window.unreloaded = true");
    await page.setScheme("light");
    expect(await resolveColor(page, "--bg")).toBe(COLORS["--bg"][0]);
    expect(await resolveColor(page, "--fg")).toBe(COLORS["--fg"][0]);
    expect(await page.style("body", "background-color")).toBe(COLORS["--bg"][0]);
    expect(await page.style("body", "color")).toBe(COLORS["--fg"][0]);
    expect(await page.evaluate("window.unreloaded === true")).toBe(true);
  });

  for (const [index, forced] of SCHEMES.entries()) {
    for (const scheme of SCHEMES) {
      test(`data-scheme="${forced}" forces the ${forced} scheme under a ${scheme} system`, async () => {
        const page = await open(specimen, { scheme });
        await page.evaluate(`document.documentElement.dataset.scheme = "${forced}"`);
        expect(await page.style(":root", "color-scheme")).toBe(forced);
        // Every color token, so one that answered the system scheme by a media query rather
        // than through color-scheme would fail.
        for (const [name, pair] of Object.entries(COLORS)) {
          expect([name, await resolveColor(page, name)]).toEqual([name, pair[index]]);
        }
        expect(await page.style("body", "background-color")).toBe(COLORS["--bg"][index]);
        expect(await page.style("body", "color")).toBe(COLORS["--fg"][index]);
      });
    }
  }

  for (const [index, scheme] of SCHEMES.entries()) {
    test(`data-theme no longer forces a scheme, under a ${scheme} system`, async () => {
      const page = await open(specimen, { scheme });
      await page.evaluate(`document.documentElement.dataset.theme = "${index ? "light" : "dark"}"`);
      expect(await page.style(":root", "color-scheme")).toBe("light dark");
      expect(await resolveColor(page, "--bg")).toBe(COLORS["--bg"][index]);
    });
  }

  test("an app layer's token override still wins under a forced scheme", async () => {
    const page = await open(specimen, { scheme: "light" });
    await page.evaluate(`document.documentElement.dataset.scheme = "dark"`);
    // A plain :root rule, less specific than :root[data-scheme]: the later layer wins anyway.
    await addAppStyle(page, "@layer app { :root { --bg: rgb(1, 2, 3); } }");
    expect(await page.style(":root", "color-scheme")).toBe("dark");
    expect(await resolveColor(page, "--bg")).toBe("rgb(1, 2, 3)");
    expect(await page.style("body", "background-color")).toBe("rgb(1, 2, 3)");
    // The tokens it leaves alone keep the forced scheme.
    expect(await resolveColor(page, "--fg")).toBe(COLORS["--fg"][1]);
  });
});

// PROBE_PALETTE is a test profile, "probe": a distinct color for each of the sixteen tokens, name
// to rgb(). Its block goes into the color sub-layer after the baseline's, as a later profile's
// would, at the zero specificity a profile's selector has.
const PROBE_PALETTE = Object.fromEntries(
  Object.keys(COLORS).map((name, index) => [name, `rgb(1, 2, ${index + 3})`]),
);

// addProbePalette adds PROBE_PALETTE to the page's color sub-layer, as a profile block.
function addProbePalette(page) {
  const tokens = Object.entries(PROBE_PALETTE).map(([name, value]) => `${name}: ${value};`);
  return addAppStyle(
    page,
    `@layer ${PACKAGE}.tokens.color { :where([data-palette="probe"]) { ${tokens.join(" ")} } }`,
  );
}

// addScopes appends html to the specimen's main, so its elements sit in the page's flow.
function addScopes(page, html) {
  return page.evaluate(
    `document.querySelector("main").insertAdjacentHTML("beforeend", ${JSON.stringify(html)})`,
  );
}

// resolveColors resolves every color token on a new child of the element matching within, name
// to rgb().
async function resolveColors(page, within) {
  const values = {};
  for (const name of Object.keys(COLORS)) values[name] = await resolveColor(page, name, within);
  return values;
}

// schemeColors are COLORS' values in the scheme at index, 0 for light and 1 for dark.
const schemeColors = (index) =>
  Object.fromEntries(Object.entries(COLORS).map(([name, pair]) => [name, pair[index]]));

// paint resolves to an element's computed [color, background-color].
function paint(page, selector) {
  return page.evaluate(`(() => {
    const style = getComputedStyle(document.querySelector(${JSON.stringify(selector)}));
    return [style.color, style.backgroundColor];
  })()`);
}

// whereOnly reports whether a selector is a single :where() and nothing else: its first
// parenthesis closes at the selector's last character, so its specificity is zero.
function whereOnly(selector) {
  if (!selector.startsWith(":where(")) return false;
  let depth = 0;
  for (const [index, char] of [...selector].entries()) {
    if (char === "(") depth++;
    if (char === ")" && --depth === 0) return index === selector.length - 1;
  }
  return false;
}

describe("color interface", () => {
  test("the color facet is exactly sixteen tokens, the five surfaces, three text weights and eight hues, with no --border-3", async () => {
    // Over http, since chromium hides a file:// stylesheet's rules from the page. The names are
    // read from what the color sub-layer declares, every profile's block included, and held to
    // the brief's list, not to the profiles record the other tests derive their names from.
    const page = await open(server.url, { scheme: "light" });
    const names = (await layerRules(page, "tokens.color"))
      .flatMap((rule) => rule.declarations.map(([name]) => name))
      .filter((name) => name.startsWith("--"));
    expect([...new Set(names)].sort()).toEqual(
      [
        ...["--bg", "--bg-1", "--bg-2", "--border", "--border-2", "--fg", "--fg-2", "--fg-3"],
        ...["--red", "--orange", "--yellow", "--green", "--cyan", "--blue", "--purple"],
        "--magenta",
      ].sort(),
    );
    expect(await page.style(":root", "--border-3")).toBe("");
  });

  // Behavior 19: --bg is the base and --bg-1 and --bg-2 step toward the text, each raised over
  // the one before, so their luminance falls in light and rises in dark, strictly, and --bg-2
  // stops short of the text. Read from the colors chromium resolves in each profile's card.
  for (const [index, scheme] of SCHEMES.entries()) {
    test(`in every profile, --bg, --bg-1 and --bg-2 step toward the text, ${index ? "darkest to lightest" : "lightest to darkest"} in ${scheme}`, async () => {
      const page = await open(previewFixture, { scheme });
      for (const name of Object.keys(COLOR_PROFILES)) {
        const colors = await resolveColors(page, card(name, scheme));
        const [bg, bg1, bg2, fg] = ["--bg", "--bg-1", "--bg-2", "--fg"].map((token) =>
          luminance(colors[token]),
        );
        const steps = index ? [bg < bg1, bg1 < bg2] : [bg > bg1, bg1 > bg2];
        expect([name, steps]).toEqual([name, [true, true]]);
        expect([name, Math.sign(fg - bg2)]).toEqual([name, Math.sign(bg2 - bg)]);
      }
    });
  }

  test("every rule in the color sub-layer has zero specificity", async () => {
    // Over http, since chromium hides a file:// stylesheet's rules from the page.
    const page = await open(server.url, { scheme: "light" });
    const selectors = selectorsOf(await layerRules(page, "tokens.color"));
    expect(selectors.length).toBeGreaterThan(0);
    expect(selectors.filter((selector) => !whereOnly(selector))).toEqual([]);
  });

  test("with no data-palette anywhere Flexoki applies, and a profile named on the root overrides it", async () => {
    const page = await open(specimen, { scheme: "light" });
    expect(
      await page.evaluate("document.querySelector(':root[data-palette], body[data-palette]')"),
    ).toBe(null);
    expect(await resolveColors(page, "body")).toEqual(schemeColors(0));
    // A later profile block of the same zero specificity: the default's :where(:root) must not
    // outrank it on the root.
    await addProbePalette(page);
    expect(await resolveColors(page, "body")).toEqual(schemeColors(0));
    await page.evaluate(`document.documentElement.dataset.palette = "probe"`);
    expect(await resolveColors(page, "body")).toEqual(PROBE_PALETTE);
    // Naming Flexoki on the root restores it.
    await page.evaluate(`document.documentElement.dataset.palette = "flexoki"`);
    expect(await resolveColors(page, "body")).toEqual(schemeColors(0));
  });

  test("a data-palette scope applies its profile to its subtree and paints as the root does", async () => {
    const page = await open(specimen, { scheme: "light" });
    await addProbePalette(page);
    await addScopes(page, '<div id="scope" data-palette="probe"><p id="inside">Text</p></div>');
    expect(await resolveColors(page, "#inside")).toEqual(PROBE_PALETTE);
    // The scope re-sets its own text and surface from the tokens it now holds, and its subtree
    // inherits the text.
    expect(await paint(page, "#scope")).toEqual([PROBE_PALETTE["--fg"], PROBE_PALETTE["--bg"]]);
    expect((await paint(page, "#inside"))[0]).toBe(PROBE_PALETTE["--fg"]);
    // Outside it, the page keeps Flexoki.
    expect(await resolveColors(page, "body")).toEqual(schemeColors(0));
  });

  test("nested data-palette scopes: the nearest wins", async () => {
    const page = await open(specimen, { scheme: "light" });
    await addProbePalette(page);
    await page.evaluate(`document.documentElement.dataset.palette = "probe"`);
    await addScopes(
      page,
      `<div id="outer" data-palette="flexoki"><p id="in-outer">Flexoki</p>
        <div id="inner" data-palette="probe"><p id="in-inner">Probe</p></div></div>`,
    );
    expect(await resolveColors(page, "body")).toEqual(PROBE_PALETTE);
    expect(await resolveColors(page, "#in-outer")).toEqual(schemeColors(0));
    expect(await paint(page, "#outer")).toEqual([COLORS["--fg"][0], COLORS["--bg"][0]]);
    expect(await resolveColors(page, "#in-inner")).toEqual(PROBE_PALETTE);
    expect(await paint(page, "#inner")).toEqual([PROBE_PALETTE["--fg"], PROBE_PALETTE["--bg"]]);
  });

  for (const [index, forced] of SCHEMES.entries()) {
    const page = index ? "light" : "dark";
    test(`data-scheme="${forced}" on a nested element forces the ${forced} scheme for its subtree in a ${page} page`, async () => {
      const view = await open(specimen, { scheme: page });
      await addScopes(
        view,
        `<div id="forced" data-scheme="${forced}"><p id="in-forced">Forced</p>
          <div id="back" data-scheme="${page}"><p id="in-back">Back</p></div></div>`,
      );
      expect(await view.style("#forced", "color-scheme")).toBe(forced);
      expect(await view.style("#in-forced", "color-scheme")).toBe(forced);
      // The tokens are declared on the root alone, yet every one resolves in the forced scheme:
      // light-dark() resolves where it is read, not where the token is declared.
      expect(await resolveColors(view, "#in-forced")).toEqual(schemeColors(index));
      expect(await paint(view, "#forced")).toEqual([COLORS["--fg"][index], COLORS["--bg"][index]]);
      expect((await paint(view, "#in-forced"))[0]).toBe(COLORS["--fg"][index]);
      // The page outside keeps the system scheme, and a scope nested inside forces it back.
      expect(await resolveColors(view, "body")).toEqual(schemeColors(1 - index));
      expect(await resolveColors(view, "#in-back")).toEqual(schemeColors(1 - index));
      expect(await paint(view, "#back")).toEqual([
        COLORS["--fg"][1 - index],
        COLORS["--bg"][1 - index],
      ]);
    });
  }

  test("a consumer's later layer beats the profile, on the root and on a scope", async () => {
    const page = await open(specimen, { scheme: "light" });
    await page.evaluate(`document.documentElement.dataset.palette = "flexoki"`);
    await addScopes(page, '<div id="scope" data-palette="flexoki"><p id="inside">Text</p></div>');
    // Zero specificity too: the later layer wins by order alone.
    await addAppStyle(page, "@layer app { :where([data-palette]) { --bg: rgb(1, 2, 3); } }");
    expect(await resolveColor(page, "--bg")).toBe("rgb(1, 2, 3)");
    expect(await resolveColor(page, "--bg", "#inside")).toBe("rgb(1, 2, 3)");
    expect(await paint(page, "#scope")).toEqual([COLORS["--fg"][0], "rgb(1, 2, 3)"]);
    // The tokens it leaves alone keep the profile's values.
    expect(await resolveColor(page, "--fg", "#inside")).toBe(COLORS["--fg"][0]);
  });
});

// card returns the selector of the preview card, in the preview fixture, for a profile and scheme.
const card = (name, scheme) => `.preview-card[data-palette="${name}"][data-scheme="${scheme}"]`;

// profileRgb returns a profile's values in the scheme at index as the rgb() a computed color
// reads as, token name to rgb().
const profileRgb = (name, index) =>
  Object.fromEntries(
    Object.entries(profileColors(name, index)).map(([token, hex]) => [token, rgb(hex)]),
  );

// profileRules resolves to every rule of a facet's profile's file, as the full entry the preview
// fixture links, served over http, imports it: each as { type, selector, declarations, nested }, its rule
// type, its selector text, its declarations as [name, value] pairs, and the count of rules nested
// in it.
function profileRules(page, facet, name) {
  return page.evaluate(`(() => {
    const rules = [...document.styleSheets].flatMap((sheet) => [...sheet.cssRules]);
    const sheet = rules.find((rule) => rule.href?.endsWith(${JSON.stringify(`/${profilePath(facet, name)}`)}))
      .styleSheet;
    return [...sheet.cssRules].map((rule) => ({
      type: rule.constructor.name,
      selector: rule.selectorText,
      declarations: [...(rule.style ?? [])].map((n) => [n, rule.style.getPropertyValue(n).trim()]),
      nested: rule.cssRules?.length ?? 0,
    }));
  })()`);
}

// COLOR_PROPERTIES are the computed properties the equivalence test compares: every property
// that holds a color, or paints one, and the color scheme native controls render in.
const COLOR_PROPERTIES = [
  "color-scheme",
  "color",
  "background-color",
  "background-image",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "outline-color",
  "caret-color",
  "accent-color",
  "text-decoration-color",
  "text-emphasis-color",
  "column-rule-color",
  "-webkit-text-fill-color",
  "-webkit-text-stroke-color",
  "fill",
  "stroke",
  "box-shadow",
  "text-shadow",
];

// colorsOf resolves to the computed colors of every element inside the element matching selector,
// in document order: its own COLOR_PROPERTIES, and those of its selected text.
function colorsOf(page, selector) {
  return page.evaluate(`(() => {
    const properties = ${JSON.stringify(COLOR_PROPERTIES)};
    const read = (style) => Object.fromEntries(properties.map((n) => [n, style.getPropertyValue(n)]));
    return [...document.querySelector(${JSON.stringify(selector)}).querySelectorAll("*")]
      .map((el) => ({
        element: el.localName,
        own: read(getComputedStyle(el)),
        selection: read(getComputedStyle(el, "::selection")),
      }));
  })()`);
}

describe("color profiles", () => {
  for (const name of Object.keys(COLOR_PROFILES)) {
    const { title, source, license, version, variants } = COLOR_PROFILES[name];
    // The default's block also matches the root, so it applies with no attribute anywhere.
    const selector =
      name === "flexoki"
        ? ':where(:root, [data-palette="flexoki"])'
        : `:where([data-palette="${name}"])`;

    test(`${name}'s file opens with its credit: source, license and upstream version`, async () => {
      const text = await Bun.file(join(root, profilePath("color", name))).text();
      expect(text.startsWith(`/*\n * Colors from ${title} (${license}, `)).toBe(true);
      const credit = squash(text.slice(0, text.indexOf("*/")).replace(/\n \*/g, " "));
      // Flexoki, the default, names no upstream version, and its variants are its light and dark.
      const parts = version
        ? [source, `at ${version}`, `${variants[0]} in light and ${variants[1]} in dark`]
        : [source];
      for (const part of parts) {
        expect([part, credit.includes(part)]).toEqual([part, true]);
      }
    });

    test(`${name}'s file declares one zero-specificity block of the sixteen tokens as light-dark() pairs, and nothing else`, async () => {
      // Over http, since chromium hides a file:// stylesheet's rules from the page.
      const page = await open(`${server.url}test/fixtures/preview.html`, { scheme: "light" });
      const tokens = COLOR_PROFILES[name].tokens;
      expect(await profileRules(page, "color", name)).toEqual([
        {
          type: "CSSStyleRule",
          selector,
          declarations: Object.entries(tokens).map(([token, [light, dark]]) => [
            token,
            `light-dark(${light[1]}, ${dark[1]})`,
          ]),
          nested: 0,
        },
      ]);
    });

    test(`${name}'s file names the upstream swatch of each value`, async () => {
      const text = await Bun.file(join(root, profilePath("color", name))).text();
      const cited = Object.fromEntries(
        [...text.matchAll(/^ {2}(--[\w-]+): light-dark\(#\w+, #\w+\); \/\* (.+) \*\/$/gm)].map(
          ([, token, swatches]) => [token, swatches],
        ),
      );
      // One name when both variants share it, else light / dark.
      expect(cited).toEqual(
        Object.fromEntries(
          Object.entries(COLOR_PROFILES[name].tokens).map(([token, [[light], [dark]]]) => [
            token,
            light === dark ? light : `${light} / ${dark}`,
          ]),
        ),
      );
    });
  }

  test("the preview fixture shows one card per profile and scheme, each a preview container", async () => {
    const page = await open(previewFixture, { scheme: "light" });
    const cards = await page.evaluate(`[...document.querySelectorAll(".preview-card")]
      .map((card) => [card.dataset.palette, card.dataset.scheme,
        card.querySelector(":scope > .preview-label").textContent])`);
    expect(cards.map(([name, scheme]) => [name, scheme])).toEqual(
      Object.keys(COLOR_PROFILES).flatMap((name) => SCHEMES.map((scheme) => [name, scheme])),
    );
    // Each label names its profile and its scheme.
    for (const [name, scheme, label] of cards) {
      const named = label.includes(COLOR_PROFILES[name].title) && label.includes(scheme);
      expect([label, named]).toEqual([label, true]);
    }
  });

  test("every preview card holds the same markup, its label, attributes and ids apart", async () => {
    const page = await open(previewFixture, { scheme: "light" });
    const shapes = await page.evaluate(`[...document.querySelectorAll(".preview-card")]
      .map((card) => {
        const copy = card.cloneNode(true);
        copy.querySelector(".preview-label").textContent = "";
        for (const el of [copy, ...copy.querySelectorAll("*")]) {
          for (const name of ["data-palette", "data-scheme", "id", "for"]) el.removeAttribute(name);
        }
        return copy.outerHTML;
      })`);
    expect(new Set(shapes).size).toBe(1);
  });

  test("a preview card shows a heading, a paragraph, three buttons, a field, a striped table and every color token", async () => {
    const page = await open(previewFixture, { scheme: "light" });
    const parts = await page.evaluate(`(() => {
      const card = document.querySelector(".preview-card");
      const paragraph = [...card.querySelectorAll(":scope > p")]
        .find((p) => p.querySelector("a[href]") && p.querySelector("code") && p.querySelector("kbd"));
      const field = card.querySelector(".field");
      const input = field?.querySelector("input[type=text]");
      const table = card.querySelector("table.table-striped");
      return {
        heading: !!card.querySelector(":scope > h3"),
        paragraph: !!paragraph,
        buttons: [...card.querySelectorAll("button")].map((b) => b.className),
        field: !!input && field.querySelector("label").htmlFor === input.id,
        table: table && [table.querySelectorAll("thead th").length > 0,
          table.querySelectorAll("tbody > tr").length],
        swatches: [...card.querySelectorAll(".preview-swatches > li")]
          .map((li) => li.style.getPropertyValue("--sample")),
      };
    })()`);
    expect(parts).toEqual({
      heading: true,
      paragraph: true,
      // A neutral button and two hue variants.
      buttons: ["", "button-blue", "button-red"],
      field: true,
      table: [true, 3],
      swatches: Object.keys(COLORS).map((token) => `var(${token})`),
    });
  });

  for (const [index, scheme] of SCHEMES.entries()) {
    test(`every profile's preview card resolves each token to its ${scheme} value, under a ${SCHEMES[1 - index]} system`, async () => {
      const page = await open(previewFixture, { scheme: SCHEMES[1 - index] });
      for (const name of Object.keys(COLOR_PROFILES)) {
        expect([name, await resolveColors(page, card(name, scheme))]).toEqual([
          name,
          profileRgb(name, index),
        ]);
      }
    });
  }

  // Behavior 5: a preview container renders as its profile and scheme do at the root. The card
  // is read in its container, then stripped of its attributes, with the root naming them instead.
  for (const name of Object.keys(COLOR_PROFILES)) {
    for (const [index, scheme] of SCHEMES.entries()) {
      test(`a ${name} ${scheme} preview container renders its card with the colors the root gives it`, async () => {
        // The system scheme is the other one, so a container that failed to force its own would
        // differ.
        const page = await open(previewFixture, { scheme: SCHEMES[1 - index] });
        const selector = card(name, scheme);
        const contained = await colorsOf(page, selector);
        const containerPaint = await paint(page, selector);
        await page.evaluate(`(() => {
          const card = document.querySelector(${JSON.stringify(selector)});
          card.id = "at-root";
          card.removeAttribute("data-palette");
          card.removeAttribute("data-scheme");
          document.documentElement.dataset.palette = ${JSON.stringify(name)};
          document.documentElement.dataset.scheme = ${JSON.stringify(scheme)};
        })()`);
        const atRoot = await colorsOf(page, "#at-root");
        expect(atRoot.length).toBeGreaterThan(30);
        expect(atRoot).toEqual(contained);
        // The container paints as the root does, in the profile's own text and page colors.
        const { "--fg": fg, "--bg": bg } = profileRgb(name, index);
        expect(containerPaint).toEqual([fg, bg]);
        expect(await paint(page, "body")).toEqual([fg, bg]);
      });
    }
  }

  test("a consumer linking the lean entry and importing one profile export per facet selects each on the root", async () => {
    const pkg = await Bun.file(join(root, "package.json")).json();
    const keys = [
      ["color", "./profiles/color/catppuccin"],
      ["space", "./profiles/space/compact"],
      ["type", "./profiles/type/sans"],
    ];
    for (const [index, scheme] of SCHEMES.entries()) {
      const page = await open(consumerFixture, { scheme, viewport: MEDIUM });
      // The page imports the file each nested export names, relative to the entry, into its
      // facet's sub-layer.
      const imported = await page.evaluate(`[...document.querySelector("style").sheet.cssRules]
        .map((rule) => [rule.layerName, rule.href])`);
      expect(imported).toEqual(
        keys.map(([facet, key]) => [
          `${PACKAGE}.tokens.${facet}`,
          `../../${pkg.exports[key].slice(2)}`,
        ]),
      );
      const catppuccin = profileRgb("catppuccin", index);
      expect(await resolveColors(page, "body")).toEqual(catppuccin);
      expect(await paint(page, "body")).toEqual([catppuccin["--fg"], catppuccin["--bg"]]);
      expect(pick(await resolveIn(page, "body", SPACE), compactValues(MEDIUM))).toEqual(
        compactValues(MEDIUM),
      );
      expect(pick(await resolveIn(page, "body", TYPE), SANS_FONTS)).toEqual(SANS_FONTS);
      // A profile the page didn't import names nothing: its scope keeps the root's tokens.
      expect(await resolveColors(page, "#everforest p")).toEqual(catppuccin);
    }
  });
});

// RATIOS are the display shapes the fluid tests run at, name to [inline, block] proportion: the
// landscape shapes from the widest down to square, then their portrait mirrors. No one monitor
// is a target: a shape at a size stands for every display of it.
const RATIOS = {
  "21:9": [21, 9],
  "16:9": [16, 9],
  "16:10": [16, 10],
  "4:3": [4, 3],
  "1:1": [1, 1],
  "3:4": [3, 4],
  "10:16": [10, 16],
  "9:16": [9, 16],
  "9:21": [9, 21],
};

// LANDSCAPE and PORTRAIT split RATIOS: shapes at least as wide as tall, and shapes taller than
// wide.
const LANDSCAPE = Object.keys(RATIOS).filter((ratio) => RATIOS[ratio][0] >= RATIOS[ratio][1]);
const PORTRAIT = Object.keys(RATIOS).filter((ratio) => !LANDSCAPE.includes(ratio));

// SIZES are the inline sizes, in CSS px, each shape runs at: small below the range's 22.5rem,
// medium inside it, large above its 80rem. Both ends clamp every token, so only the medium size
// shows the block size's bound at work.
const SIZES = { small: 320, medium: 1024, large: 2560 };

// display returns the viewport of a shape at a size, as { width, height } in CSS px: the size's
// inline size, and the block size the ratio gives, rounded to a whole px.
function display(ratio, size) {
  const [inline, block] = RATIOS[ratio];
  const width = SIZES[size];
  return { width, height: Math.round((width * block) / inline) };
}

// widthAlone returns the viewport the formula reads as width alone: no block size bounds it.
const widthAlone = ({ width }) => ({ width, height: Number.POSITIVE_INFINITY });

// resolveFluid resolves every fluid token on page, name to px.
async function resolveFluid(page) {
  const values = {};
  for (const name of Object.keys(FLUID)) values[name] = await resolveToken(page, name, "length");
  return values;
}

// expectFluid expects each fluid token's resolved px to be its formula's value at viewport and
// root font size rem, to a hundredth of a px.
function expectFluid(values, viewport, rem = 16) {
  for (const [name, bounds] of Object.entries(FLUID)) {
    expect([name, values[name]]).toEqual([name, expect.closeTo(fluid(bounds, viewport, rem), 2)]);
  }
}

describe("fluid space and type, by display shape", () => {
  for (const ratio of Object.keys(RATIOS)) {
    test(`stay within their bounds at ${ratio}, small, medium and large, as the formula gives`, async () => {
      const page = await open(specimen, { scheme: "light", viewport: display(ratio, "small") });
      for (const size of Object.keys(SIZES)) {
        const viewport = display(ratio, size);
        await page.setViewport(viewport);
        const values = await resolveFluid(page);
        for (const [name, [min, max]] of Object.entries(FLUID)) {
          const value = values[name];
          expect([ratio, size, name, value >= min * 16 - 0.01 && value <= max * 16 + 0.01]).toEqual(
            [ratio, size, name, true],
          );
          // Below the range every token holds its smallest value, above it its largest.
          if (size === "small") {
            expect([ratio, size, name, value]).toEqual([
              ratio,
              size,
              name,
              expect.closeTo(min * 16, 2),
            ]);
          }
          if (size === "large") {
            expect([ratio, size, name, value]).toEqual([
              ratio,
              size,
              name,
              expect.closeTo(max * 16, 2),
            ]);
          }
        }
        expectFluid(values, viewport);
      }
    });
  }

  test("at 16:9 and narrower, depend on the width alone", async () => {
    // Every shape no wider than 16:9 at the same inline size, where it sits inside the range,
    // reads the same values, and they are the formula's for that width with no block bound.
    const narrower = Object.keys(RATIOS).filter(
      (ratio) => RATIOS[ratio][0] / RATIOS[ratio][1] <= 16 / 9,
    );
    const reads = {};
    for (const ratio of narrower) {
      reads[ratio] = await resolveFluid(
        await open(specimen, { scheme: "light", viewport: display(ratio, "medium") }),
      );
    }
    for (const ratio of narrower) expect([ratio, reads[ratio]]).toEqual([ratio, reads["16:9"]]);
    expectFluid(reads["16:9"], widthAlone(display("16:9", "medium")));
    for (const [name, [min, max]] of Object.entries(FLUID)) {
      const value = reads["16:9"][name];
      expect([name, value > min * 16 && value < max * 16]).toEqual([name, true]);
    }
  });

  for (const size of Object.keys(SIZES)) {
    test(`at 21:9, ${size}, read what a 16:9 window of the same height reads`, async () => {
      // A shape wider than 16:9 is bounded by its height: it measures 16/9 of its block size, so
      // the extra width reads nothing. The 16:9 window is the 21:9 window's height, and a width
      // rounded up so its own bound stays the height's.
      const wide = display("21:9", size);
      const matched = { width: Math.ceil((wide.height * 16) / 9), height: wide.height };
      const values = await resolveFluid(await open(specimen, { scheme: "light", viewport: wide }));
      const reference = await resolveFluid(
        await open(specimen, { scheme: "light", viewport: matched }),
      );
      expect(values).toEqual(reference);
      expectFluid(values, wide);
      if (size === "medium") {
        // Inside the range, the height's bound reads strictly smaller than the width alone gives.
        for (const [name, bounds] of Object.entries(FLUID)) {
          expect([name, values[name] < fluid(bounds, widthAlone(wide)) - 0.01]).toEqual([
            name,
            true,
          ]);
        }
      }
    });
  }

  for (const ratio of PORTRAIT) {
    test(`at ${ratio}, track the width`, async () => {
      // A portrait shape's height never bounds it: at each size it reads the width alone, and
      // grows with the width from the smallest value to the largest.
      const page = await open(specimen, { scheme: "light", viewport: display(ratio, "small") });
      const reads = [];
      for (const size of Object.keys(SIZES)) {
        await page.setViewport(display(ratio, size));
        const values = await resolveFluid(page);
        expectFluid(values, widthAlone(display(ratio, size)));
        reads.push(values);
      }
      const [small, medium, large] = reads;
      for (const name of Object.keys(FLUID)) {
        expect([name, small[name] < medium[name] && medium[name] < large[name]]).toEqual([
          name,
          true,
        ]);
      }
    });
  }

  test("leave --text-m, --text-s and --text-xs fixed at every shape and size", async () => {
    // The fixed steps are rem, so only the root font size moves them: every display case reads
    // the same px, 1rem × 1.125^n at a 16px root.
    const page = await open(specimen, { scheme: "light", viewport: display("9:16", "small") });
    const fixed = Object.fromEntries(Object.keys(TEXT_FIXED).map((name) => [name, "length"]));
    const expected = Object.fromEntries(
      Object.entries(TEXT_FIXED).map(([name, rem]) => [name, expect.closeTo(rem * 16, 2)]),
    );
    for (const ratio of Object.keys(RATIOS)) {
      for (const size of Object.keys(SIZES)) {
        await page.setViewport(display(ratio, size));
        expect([ratio, size, await resolveAll(page, fixed)]).toEqual([ratio, size, expected]);
      }
    }
  });

  test("follow a resize without a reload", async () => {
    const page = await open(specimen, { scheme: "light", viewport: display("9:16", "small") });
    await page.setViewport(display("4:3", "medium"));
    expectFluid(await resolveFluid(page), display("4:3", "medium"));
  });

  test("scale with the root font size, which shifts the range, as browser zoom does", async () => {
    // Browser zoom by z shrinks the viewport, in CSS px, by z and scales every CSS px by z on
    // screen, while 1rem stays 16 CSS px. Scaling the root font size by z at a fixed viewport
    // gives the same tokens in screen px, since every bound is rem: at 250% zoom a large 16:9
    // window, 2560 by 1440, is a medium 16:9 viewport, 1024 by 576, and a token there, times
    // 2.5, is the token at 2560 by 1440 with a 40px root. So a 40px root stands for 250% zoom,
    // and for a user's 40px default font size alike.
    const large = display("16:9", "large");
    const zoomed = await open(specimen, { scheme: "light", viewport: large });
    await zoomed.evaluate(`document.documentElement.style.fontSize = "40px"`);
    const values = await resolveFluid(zoomed);
    expectFluid(values, large, 40);
    const medium = await resolveFluid(
      await open(specimen, { scheme: "light", viewport: display("16:9", "medium") }),
    );
    for (const [name, [min, max]] of Object.entries(FLUID)) {
      expect([name, values[name]]).toEqual([name, expect.closeTo(medium[name] * 2.5, 2)]);
      // The range shifted: 2560px is past 80rem at 16px but inside it at 40px, so each token is
      // more than 2.5 times its smallest value and less than 2.5 times its largest.
      expect([name, values[name] > min * 40 && values[name] < max * 40]).toEqual([name, true]);
    }
  });
});

describe("radius", () => {
  test("derives sm, md and lg from the radius base, and full from none", async () => {
    const page = await open(specimen, { scheme: "light" });
    const radii = () =>
      resolveAll(
        page,
        Object.fromEntries(
          ["sm", "md", "lg", "full"].map((size) => [`--radius-${size}`, "length"]),
        ),
      );
    expect(await radii()).toEqual({
      "--radius-sm": expect.closeTo(4, 2),
      "--radius-md": 6,
      "--radius-lg": expect.closeTo(8, 2),
      "--radius-full": 9999,
    });
    await addAppStyle(page, "@layer app { :root { --radius-base: 0.75rem; } }");
    expect(await radii()).toEqual({
      "--radius-sm": expect.closeTo(8, 2),
      "--radius-md": 12,
      "--radius-lg": expect.closeTo(16, 2),
      "--radius-full": 9999,
    });
  });
});

// PROFILES are test profiles, one per fluid facet: css that restates some of a facet's values in
// its own sub-layer, after the baseline's rules there, as a profile would, and the tokens it
// changes, directly or through what they read.
const PROFILES = {
  "tokens.space": {
    changes: [
      "--space-base",
      ...Object.keys(SPACE_STEPS),
      "--line-s",
      "--radius-base",
      "--radius-sm",
      "--radius-md",
      "--radius-lg",
    ],
    css: `:root {
    --space-base: calc(2rem + (3rem - 2rem) * var(--space-fluid));
    --line-s: 3px;
    --radius-base: 1rem;
  }`,
  },
  "tokens.type": {
    changes: ["--text-m", "--text-4xl", "--font-body", "--leading-body"],
    css: `:root {
    --text-m: calc(2rem + (3rem - 2rem) * var(--type-fluid));
    --text-4xl: calc(4rem + (6rem - 4rem) * var(--type-fluid));
    --font-body: serif;
    --leading-body: 2;
  }`,
  },
};

describe("facet independence", () => {
  for (const [facet, { css, changes }] of Object.entries(PROFILES)) {
    test(`a profile in ${facet} changes only that facet's tokens`, async () => {
      const page = await open(specimen, { scheme: "light", viewport: display("4:3", "medium") });
      const before = await resolveAll(page);
      await addAppStyle(page, `@layer ${PACKAGE}.${facet} { ${css} }`);
      const after = await resolveAll(page);
      const changed = Object.keys(TOKENS).filter((name) => after[name] !== before[name]);
      // Exactly what the profile restated, and what reads it, moved: every other token of its
      // own facet, and every color, space or type token of the others, kept its value.
      expect(changed.sort()).toEqual([...changes].sort());
      expect(changed.filter((name) => !(name in FACETS[facet]))).toEqual([]);
    });
  }
});

// resolveIn resolves every token of tokens, name to kind, as a new child of the element matching
// within computes it, name to value: a length to px and a number to a number through a
// registered custom property, and any other token to its computed value with whitespace squashed.
function resolveIn(page, within, tokens) {
  return page.evaluate(`(() => {
    for (const [kind, syntax] of [["length", "<length>"], ["number", "<number>"]]) {
      try {
        CSS.registerProperty({ name: "--resolved-" + kind, syntax, inherits: false,
          initialValue: "0" });
      } catch {}
    }
    const probe = document.querySelector(${JSON.stringify(within)})
      .appendChild(document.createElement("i"));
    const values = {};
    for (const [name, kind] of Object.entries(${JSON.stringify(tokens)})) {
      if (kind === "length" || kind === "number") {
        probe.style.setProperty("--resolved-" + kind, "var(" + name + ")");
        values[name] = Number.parseFloat(getComputedStyle(probe).getPropertyValue("--resolved-" + kind));
      } else {
        values[name] = getComputedStyle(probe).getPropertyValue(name).trim().replace(/\\s+/g, " ");
      }
    }
    probe.remove();
    return values;
  })()`);
}

// MEDIUM is a display inside the fluid range, where a fluid token sits between its bounds, so a
// profile that changed only one bound would still read apart.
const MEDIUM = display("4:3", "medium");

// SWAPS are, per facet, the profile past the default and the tokens swapping
// to it on the root changes: the base, every step and every radius but full for compact, whose
// lines are regular's; the heading and interface fonts for sans, whose body and code fonts and
// leadings are mono's.
const SWAPS = {
  space: {
    name: "compact",
    tokens: SPACE,
    changes: [
      "--space-base",
      ...Object.keys(SPACE_STEPS),
      "--radius-base",
      "--radius-sm",
      "--radius-md",
      "--radius-lg",
    ],
  },
  type: { name: "sans", tokens: TYPE, changes: ["--font-heading", "--font-ui"] },
};

// compactValues is what compact resolves the space tokens it changes to in a viewport, name to
// px: a base from 0.75rem to 0.875rem over the fluid range, each step its multiple, and radii
// from a 0.25rem base.
function compactValues(viewport) {
  const base = fluid([0.75, 0.875], viewport);
  return {
    "--space-base": expect.closeTo(base, 2),
    ...Object.fromEntries(
      Object.entries(SPACE_STEPS).map(([name, k]) => [name, expect.closeTo(base * k, 2)]),
    ),
    "--line-s": 1,
    "--line-m": 2,
    "--radius-base": 4,
    "--radius-sm": expect.closeTo(8 / 3, 2),
    "--radius-md": 4,
    "--radius-lg": expect.closeTo(16 / 3, 2),
  };
}

// SANS_FONTS are sans's fonts, name to its stack.
const SANS_FONTS = {
  "--font-body": SANS,
  "--font-heading": SANS,
  "--font-ui": SANS,
  "--font-code": MONO,
};

// pick returns values' entries for the names of keys alone.
const pick = (values, keys) =>
  Object.fromEntries(Object.keys(keys).map((name) => [name, values[name]]));

// SCOPED_PROPERTIES are the computed properties the space and type equivalence test compares:
// every property the harness fingerprints, the box and text properties a space or type token
// reaches, plus the gaps and outline the elements and tools layers draw from the space tokens.
// Width and height are left out: a container's size is its surroundings', and a compact root
// tightens the page around the card too.
const SCOPED_PROPERTIES = [
  ...FINGERPRINT_PROPERTIES.filter((name) => name !== "width" && name !== "height"),
  "row-gap",
  "column-gap",
  "outline-width",
  "outline-offset",
];

// scopedStyles resolves to every element inside the element matching selector, in document
// order: its SCOPED_PROPERTIES, and every space and type token it holds, as computed.
function scopedStyles(page, selector) {
  const names = [...SCOPED_PROPERTIES, ...Object.keys(SPACE), ...Object.keys(TYPE)];
  return page.evaluate(`[...document.querySelector(${JSON.stringify(selector)})
    .querySelectorAll("*")].map((el) => {
      const style = getComputedStyle(el);
      return [el.localName, ...${JSON.stringify(names)}.map((n) => style.getPropertyValue(n).trim())];
    })`);
}

describe("space and type profiles", () => {
  for (const [facet, profiles] of Object.entries({ space: SPACE_PROFILES, type: TYPE_PROFILES })) {
    const { attribute, names } = FACET_PROFILES[facet];

    for (const name of names) {
      // The default's block also matches the root, so it applies with no attribute anywhere.
      const selector =
        name === names[0]
          ? `:where(:root, [${attribute}="${name}"])`
          : `:where([${attribute}="${name}"])`;

      test(`${facet}'s ${name} file declares one zero-specificity block of its values, and nothing else`, async () => {
        // Over http, since chromium hides a file:// stylesheet's rules from the page.
        const page = await open(`${server.url}test/fixtures/preview.html`, { scheme: "light" });
        const rules = await profileRules(page, facet, name);
        expect(
          rules.map((rule) => ({
            ...rule,
            declarations: rule.declarations.map(([token, value]) => [token, squash(value)]),
          })),
        ).toEqual([
          {
            type: "CSSStyleRule",
            selector,
            declarations: Object.entries(profiles[name]),
            nested: 0,
          },
        ]);
      });
    }

    test(`the ${facet} facet's own file declares no token a ${facet} profile sets`, async () => {
      const page = await open(server.url, { scheme: "light" });
      // The sub-layer's first sheet is the facet's own file; the profiles' follow it.
      const own = (
        await page.evaluate(`[...${layerSheets(`tokens.${facet}`)}[0].cssRules]
          .flatMap((rule) => [...rule.style])`)
      ).filter((n) => n.startsWith("--"));
      const set = Object.keys(profiles[names[0]]);
      expect(own.length).toBeGreaterThan(0);
      expect(own.filter((n) => set.includes(n))).toEqual([]);
    });

    const { name, tokens, changes } = SWAPS[facet];

    test(`with no ${attribute} anywhere ${names[0]} applies, and ${name} named on the root overrides it, changing only ${facet} tokens`, async () => {
      const page = await open(specimen, { scheme: "light", viewport: MEDIUM });
      expect(
        await page.evaluate(`document.querySelector(':root[${attribute}], body[${attribute}]')`),
      ).toBe(null);
      const before = await resolveAll(page);
      await page.evaluate(`document.documentElement.setAttribute("${attribute}", "${name}")`);
      const after = await resolveAll(page);
      const changed = Object.keys(TOKENS).filter((token) => after[token] !== before[token]);
      // Exactly the tokens the profile sets apart from the default, and what reads them: no
      // token of another facet moved.
      expect(changed.sort()).toEqual([...changes].sort());
      expect(pick(after, tokens)).toEqual(
        facet === "space"
          ? { ...pick(before, tokens), ...compactValues(MEDIUM) }
          : { ...pick(before, tokens), ...SANS_FONTS },
      );
      // Naming the default on the root restores it.
      await page.evaluate(`document.documentElement.setAttribute("${attribute}", "${names[0]}")`);
      expect(await resolveAll(page)).toEqual(before);
    });

    test(`nested ${attribute} scopes apply their profile to their subtree: the nearest wins`, async () => {
      const page = await open(specimen, { scheme: "light", viewport: MEDIUM });
      const defaults = await resolveIn(page, "body", tokens);
      await page.evaluate(`document.documentElement.setAttribute("${attribute}", "${name}")`);
      await addScopes(
        page,
        `<div id="outer" ${attribute}="${names[0]}"><p id="in-outer">Default</p>
          <div id="inner" ${attribute}="${name}"><p id="in-inner">Added</p></div></div>`,
      );
      const added = await resolveIn(page, "body", tokens);
      expect(added).not.toEqual(defaults);
      expect(await resolveIn(page, "#in-outer", tokens)).toEqual(defaults);
      expect(await resolveIn(page, "#in-inner", tokens)).toEqual(added);
    });

    test(`a consumer's later layer beats every ${facet} profile, on the root and on a scope`, async () => {
      const page = await open(specimen, { scheme: "light" });
      const [token, value, read] =
        facet === "space" ? ["--space-base", "3rem", 48] : ["--font-heading", "fantasy", "fantasy"];
      await page.evaluate(`document.documentElement.setAttribute("${attribute}", "${names[0]}")`);
      await addScopes(page, `<div id="scope" ${attribute}="${name}"><p id="inside">Text</p></div>`);
      // Zero specificity too: the later layer wins by order alone.
      await addAppStyle(page, `@layer app { :where([${attribute}]) { ${token}: ${value}; } }`);
      const only = { [token]: tokens[token] };
      expect(await resolveIn(page, "body", only)).toEqual({ [token]: read });
      expect(await resolveIn(page, "#inside", only)).toEqual({ [token]: read });
    });
  }

  for (const size of ["small", "large"]) {
    test(`compact stays fluid between its rem bounds, at 16:9, ${size}`, async () => {
      const viewport = display("16:9", size);
      const page = await open(specimen, { scheme: "light", viewport });
      const values = await resolveIn(page, '[data-space="compact"]', SPACE);
      expect(values["--space-base"]).toBeCloseTo(size === "small" ? 12 : 14, 2);
      expect(pick(values, compactValues(viewport))).toEqual(compactValues(viewport));
    });
  }

  test("a data-type scope sets its text in its profile's body font and leading, as the body does", async () => {
    const page = await open(specimen, { scheme: "light" });
    // A test profile whose body font and leading differ from mono's, in the type sub-layer.
    await addAppStyle(
      page,
      `@layer ${PACKAGE}.tokens.type { :where([data-type="probe"]) { --font-body: fantasy; --leading-body: 2; } }`,
    );
    await addScopes(page, '<div id="scope" data-type="probe"><p id="inside">Text</p></div>');
    const text = (selector) =>
      page.evaluate(`(() => {
        const style = getComputedStyle(document.querySelector(${JSON.stringify(selector)}));
        return [style.fontFamily, style.lineHeight];
      })()`);
    const size = await page.evaluate(
      `Number.parseFloat(getComputedStyle(document.querySelector("#inside")).fontSize)`,
    );
    expect(await text("#scope")).toEqual(["fantasy", `${size * 2}px`]);
    expect(await text("#inside")).toEqual(["fantasy", `${size * 2}px`]);
    // A data-space scope sets nothing but its tokens: its text is the page's.
    await addScopes(page, '<div id="space" data-space="compact"><p id="dense">Text</p></div>');
    expect(await text("#dense")).toEqual(await text("main > section > header > p"));
  });

  test("every rule in the space and type sub-layers has zero specificity", async () => {
    // Over http, since chromium hides a file:// stylesheet's rules from the page.
    const page = await open(server.url, { scheme: "light" });
    const selectors = selectorsOf(await layerRules(page, "tokens.space", "tokens.type"));
    expect(selectors.length).toBeGreaterThan(0);
    expect(selectors.filter((selector) => !whereOnly(selector))).toEqual([]);
  });

  // Behavior 4: a preview container carrying data-space and data-type renders its subtree as
  // those profiles render at the root. A compact, sans card is read in its container, then
  // stripped of the attributes, with the root naming them instead.
  test("a compact, sans preview container renders its card as the root gives it", async () => {
    const page = await open(previewFixture, { scheme: "light", viewport: MEDIUM });
    const selector = card("flexoki", "light");
    const plain = await scopedStyles(page, selector);
    await page.evaluate(`(() => {
      const card = document.querySelector(${JSON.stringify(selector)});
      card.dataset.space = "compact";
      card.dataset.type = "sans";
    })()`);
    const contained = await scopedStyles(page, selector);
    // The profiles reached the card: its steps and heading font moved.
    expect(contained).not.toEqual(plain);
    await page.evaluate(`(() => {
      const card = document.querySelector(${JSON.stringify(selector)});
      card.removeAttribute("data-space");
      card.removeAttribute("data-type");
      document.documentElement.dataset.space = "compact";
      document.documentElement.dataset.type = "sans";
    })()`);
    const atRoot = await scopedStyles(page, selector);
    expect(atRoot.length).toBeGreaterThan(30);
    expect(atRoot).toEqual(contained);
  });
});

describe("reset", () => {
  test("sizes every box, pseudo-elements included, by its border", async () => {
    const page = await open(fixture, { scheme: "light" });
    // chromium resolves no computed style for a track element, so it is left out; the
    // pseudo-elements are checked on elements that render them.
    const sizing = await page.evaluate(`[
      ...[...document.querySelectorAll(":not(track)")].map((el) => getComputedStyle(el).boxSizing),
      ...[...document.querySelectorAll("body, p")].flatMap((el) => [
        getComputedStyle(el, "::before").boxSizing,
        getComputedStyle(el, "::after").boxSizing,
      ]),
    ]`);
    expect(new Set(sizing)).toEqual(new Set(["border-box"]));
  });

  test("zeroes margins and sets the body's line height and minimum height", async () => {
    // Below the range, so the body's text is --text-m's smallest value, 16px.
    const page = await open(fixture, { scheme: "light", viewport: display("9:16", "small") });
    for (const selector of ["body", "p", "button"]) {
      expect(await page.style(selector, "margin")).toBe("0px");
    }
    expect(await page.style("body", "line-height")).toBe("24px");
    const viewport = await page.evaluate("innerHeight");
    expect(await page.style("body", "min-height")).toBe(`${viewport}px`);
  });

  test("makes media blocks no wider than their container, keeping their aspect ratio", async () => {
    const page = await open(fixture, { scheme: "light" });
    for (const selector of ["img", "picture", "video", "canvas", "svg"]) {
      expect(await page.style(selector, "display")).toBe("block");
      expect(await page.style(selector, "max-width")).toBe("100%");
    }
    // A canvas of 300 by 150 in a 150px container narrows to 150 by 75, not 150 by 150.
    const size = await page.evaluate(`(() => {
      const box = document.body.appendChild(document.createElement("div"));
      box.style.width = "150px";
      const canvas = box.appendChild(document.createElement("canvas"));
      const { width, height } = canvas.getBoundingClientRect();
      box.remove();
      return [width, height];
    })()`);
    expect(size).toEqual([150, 75]);
  });

  test("sets form controls in the interface font and leading", async () => {
    const page = await open(fixture, { scheme: "light" });
    await addAppStyle(page, "@layer app { :root { --font-ui: serif; --leading-ui: 3; } }");
    for (const selector of ["button", "input", "select", "textarea", "option"]) {
      expect([selector, await page.style(selector, "font-family")]).toEqual([selector, "serif"]);
    }
    const size = await page.style("button", "font-size");
    const leading = await page.style("button", "line-height");
    expect(Number.parseFloat(leading)).toBeCloseTo(Number.parseFloat(size) * 3, 2);
    // Each control inherits the page's font size, not chromium's smaller system font.
    const body = await page.style("body", "font-size");
    for (const selector of ["button", "input", "select", "textarea"]) {
      expect([selector, await page.style(selector, "font-size")]).toEqual([selector, body]);
    }
  });

  test("gives an anchor's target room above it, and holds text at the page's size", async () => {
    const page = await open(`${fixture}#target`, { scheme: "light" });
    // 5ex in the target's own font, from a box sized in it.
    const ex = await page.evaluate(`(() => {
      const probe = document.querySelector("#target").appendChild(document.createElement("i"));
      probe.style.display = "inline-block";
      probe.style.width = "5ex";
      const width = probe.getBoundingClientRect().width;
      probe.remove();
      return width;
    })()`);
    expect(Number.parseFloat(await page.style("#target", "scroll-margin-top"))).toBeCloseTo(ex, 1);
    expect(await page.style("#equal", "scroll-margin-top")).toBe("0px");
    expect(await page.style("html", "text-size-adjust")).toBe("100%");
  });

  test("scrolls to anchors smoothly only without reduced motion", async () => {
    const untargeted = await open(fixture, { scheme: "light" });
    expect(await untargeted.style("html", "scroll-behavior")).toBe("auto");
    const page = await open(`${fixture}#target`, { scheme: "light" });
    expect(await page.style("html", "scroll-behavior")).toBe("smooth");
    await page.setMedia("prefers-reduced-motion", "reduce");
    expect(await page.style("html", "scroll-behavior")).toBe("auto");
  });
});

// ALLOWED matches the properties the elements layer may set, as the longhands a rule's style
// lists: colors and backgrounds, font and text properties, borders (radius, a table's collapse
// and spacing included) and outlines, margins and paddings, accent-color and caret-color.
const ALLOWED =
  /^(color|background-color|accent-color|caret-color|line-height|letter-spacing|word-spacing|font-[\w-]+|text-(align|transform|wrap-style|decoration-[\w-]+|underline-[\w-]+)|border-[\w-]+|outline-[\w-]+|margin-[\w-]+|padding-[\w-]+)$/;

// splitList splits a selector list at its top-level commas, never at a comma inside parentheses.
function splitList(list) {
  const parts = [""];
  let depth = 0;
  for (const char of list) {
    if (char === "(") depth++;
    if (char === ")") depth--;
    if (char === "," && depth === 0) parts.push("");
    else parts[parts.length - 1] += char;
  }
  return parts.map((part) => part.trim());
}

// stripWhere returns a selector with every :where() group, nested parentheses and all, taken
// out.
function stripWhere(selector) {
  let out = "";
  let index = 0;
  while (index < selector.length) {
    if (selector.startsWith(":where(", index)) {
      let depth = 0;
      for (index += ":where".length; index < selector.length; index++) {
        if (selector[index] === "(") depth++;
        if (selector[index] === ")" && --depth === 0) break;
      }
      index++;
    } else {
      out += selector[index++];
    }
  }
  return out;
}

describe("elements", () => {
  test("every elements rule has zero specificity, apart from a pseudo-element's own", async () => {
    // Over http, since chromium hides a file:// stylesheet's rules from the page.
    const page = await open(server.url, { scheme: "light" });
    const selectors = selectorsOf(await layerRules(page, "elements"));
    expect(selectors.length).toBeGreaterThan(0);
    // With every :where() group taken out, a selector holds only combinators and, last, at most
    // one pseudo-element: nothing left to carry specificity but the pseudo-element's (0,0,1).
    const specific = selectors
      .flatMap(splitList)
      .filter((selector) => !/^[\s>+~]*(::[\w-]+)?$/.test(stripWhere(selector)));
    expect(specific).toEqual([]);
  });

  test("the elements layer sets only paint, type, border, radius, margin and padding", async () => {
    const page = await open(server.url, { scheme: "light" });
    const properties = propertiesOf(await layerRules(page, "elements"));
    expect(properties.length).toBeGreaterThan(0);
    expect(properties.filter((name) => !ALLOWED.test(name))).toEqual([]);
  });

  test("the native button, the button inputs and the file button are neutral, from tiers alone", async () => {
    const page = await open(specimen, { scheme: "light" });
    const controls = [
      ["#forms button", ""],
      ['#forms input[type="submit"]', ""],
      ['#forms input[type="reset"]', ""],
      ['#forms input[type="button"]', ""],
      ['#forms input[type="file"]', "::file-selector-button"],
    ];
    const paint = (selector, pseudo) =>
      page.evaluate(`(() => {
        const style = getComputedStyle(document.querySelector(${JSON.stringify(selector)}),
          ${JSON.stringify(pseudo || null)});
        return [style.color, style.backgroundColor, style.borderTopColor];
      })()`);
    const tiers = ["--fg", "--bg-2", "--border-2"].map((name) => COLORS[name][0]);
    for (const [selector, pseudo] of controls) {
      expect([selector, await paint(selector, pseudo)]).toEqual([selector, tiers]);
    }
    // No hue reaches them: overriding every hue leaves each control's paint as it was.
    const hues = Object.keys(HUES).map((name) => `${name}: rgb(1, 2, 3);`);
    await addAppStyle(page, `@layer app { :root { ${hues.join(" ")} } }`);
    for (const [selector, pseudo] of controls) {
      expect([selector, await paint(selector, pseudo)]).toEqual([selector, tiers]);
    }
    // Hovered, the native button fills one tier up, with --border.
    await hover(page, "#forms button");
    expect(await page.style("#forms button", "background-color")).toBe(COLORS["--border"][0]);
  });

  test("sets the body, headings, and code, pre and kbd in their role fonts", async () => {
    const page = await open(specimen, { scheme: "light" });
    expect(await page.style("body", "font-family")).toBe(SANS);
    for (const selector of ["pre", "code", "kbd", "#prose h1", "#prose h6"]) {
      expect([selector, await page.style(selector, "font-family")]).toEqual([selector, MONO]);
    }
    // Each reads its role's token by name, not a stack that happens to match.
    await addAppStyle(
      page,
      "@layer app { :root { --font-body: serif; --font-heading: cursive; --font-code: fantasy; } }",
    );
    expect(await page.style("body", "font-family")).toBe("serif");
    expect(await page.style("#prose h2", "font-family")).toBe("cursive");
    for (const selector of ["pre", "code", "kbd"]) {
      expect([selector, await page.style(selector, "font-family")]).toEqual([selector, "fantasy"]);
    }
  });

  test("sets the body, headings and pre at their role leadings", async () => {
    const page = await open(specimen, { scheme: "light" });
    for (const [selector, token] of [
      ["body", "--leading-body"],
      ["#prose .cell h3", "--leading-heading"],
      ["#prose pre", "--leading-code"],
    ]) {
      const [size, leading] = [
        await page.style(selector, "font-size"),
        await page.style(selector, "line-height"),
      ];
      const ratio = Number.parseFloat(leading) / Number.parseFloat(size);
      expect([selector, ratio]).toEqual([
        selector,
        expect.closeTo(await resolveToken(page, token), 2),
      ]);
    }
  });

  for (const [ratio, size] of [
    ["9:16", "small"],
    ["4:3", "medium"],
    ["21:9", "large"],
  ]) {
    test(`sets the body and headings on the text scale, at ${ratio}, ${size}`, async () => {
      const viewport = display(ratio, size);
      const page = await open(specimen, { scheme: "light", viewport });
      const sizes = {
        body: "--text-m",
        "#prose h1": "--text-3xl",
        "#prose h2": "--text-2xl",
        "#prose .cell h3": "--text-xl",
        "#prose h4": "--text-l",
        "#prose h5": "--text-m",
        "#prose h6": "--text-s",
      };
      for (const [selector, token] of Object.entries(sizes)) {
        const size = Number.parseFloat(await page.style(selector, "font-size"));
        expect([selector, size]).toEqual([selector, expect.closeTo(textSize(token, viewport), 2)]);
        if (selector !== "body") expect(await page.style(selector, "font-weight")).toBe("600");
      }
    });
  }

  test("styles links, lists, tables, blockquotes and rules in outline", async () => {
    const page = await open(specimen, { scheme: "light" });
    const [blue] = COLORS["--blue"];
    const [divider] = COLORS["--border"];
    expect(await page.style("#prose a", "color")).toBe(blue);
    expect(await page.style("#prose a", "text-decoration-line")).toBe("underline");
    const indent = `${await resolveToken(page, "--space-m")}px`;
    expect(await page.style("#prose ul", "padding-inline-start")).toBe(indent);
    expect(await page.style("#prose ol", "padding-inline-start")).toBe(indent);
    // Cells are outlined, and the table collapses their borders into one grid.
    expect(await page.style("#prose table", "border-collapse")).toBe("collapse");
    for (const cell of ["th", "td"]) {
      expect(await page.style(`#prose ${cell}`, "border-top")).toBe(`1px solid ${divider}`);
    }
    // A quotation's edge is neutral, the control boundary's step, not the interaction color.
    expect(await page.style("#prose blockquote", "border-left")).toBe(
      `2px solid ${COLORS["--border-2"][0]}`,
    );
    expect(await page.style("#prose hr", "border-top")).toBe(`1px solid ${divider}`);
    expect(await page.style("#prose hr", "border-bottom-width")).toBe("0px");
    expect(await page.style("#prose pre", "border-top")).toBe(`1px solid ${divider}`);
  });

  test("links, focus outlines, the caret and accent-color read --blue by name", async () => {
    const page = await open(specimen, { scheme: "light" });
    // Override the hue alone: a rule that read any other token, or a literal, keeps its color.
    await addAppStyle(page, "@layer app { :root { --blue: rgb(1, 2, 3); } }");
    expect(await page.style("#prose a", "color")).toBe("rgb(1, 2, 3)");
    expect(await page.style("#prose p", "caret-color")).toBe("rgb(1, 2, 3)");
    expect(await page.style("#prose p", "accent-color")).toBe("rgb(1, 2, 3)");
    await tabTo(page, "#prose a");
    expect(await page.evaluate(`getComputedStyle(document.activeElement).outline`)).toBe(
      "rgb(1, 2, 3) solid 2px",
    );
  });

  test("selected text sits on a 30% mix of --blue", async () => {
    const page = await open(specimen, { scheme: "light" });
    const selection = () =>
      page.evaluate(`getComputedStyle(document.querySelector("#prose p"), "::selection")
        .backgroundColor`);
    const fill = tint(await selection());
    expect(fill?.hue).toBe(COLORS["--blue"][0]);
    expect(fill.alpha).toBeCloseTo(0.3);
    // The mix reads the hue: overriding --blue alone moves it.
    await addAppStyle(page, "@layer app { :root { --blue: rgb(1, 2, 3); } }");
    expect(tint(await selection())?.hue).toBe("rgb(1, 2, 3)");
  });

  for (const size of ["small", "large"]) {
    test(`spaces the flow by proximity, at 16:9, ${size}`, async () => {
      // The whitespace fixture names, on each element, the space token its gap above must equal:
      // headings far from what precedes them by level and close to what follows, blocks
      // --space-s apart, items --space-3xs apart, a container's first child flush with its top.
      const page = await open(whitespaceFixture, {
        scheme: "light",
        viewport: display("16:9", size),
      });
      const gaps = await page.evaluate(`[...document.querySelectorAll("[data-gap]")].map((el) => {
        const above = el.previousElementSibling;
        const edge = above
          ? above.getBoundingClientRect().bottom
          : el.parentElement.getBoundingClientRect().top;
        return [el.localName + ": " + el.textContent.trim().slice(0, 24), el.dataset.gap,
          el.getBoundingClientRect().top - edge];
      })`);
      expect(gaps.length).toBeGreaterThan(20);
      for (const [element, token, gap] of gaps) {
        const want = token === "0" ? 0 : await resolveToken(page, token, "length");
        expect([element, token, gap]).toEqual([element, token, expect.closeTo(want, 1)]);
      }
    });
  }

  test("draws borders and outlines at the line widths", async () => {
    const page = await open(specimen, { scheme: "light" });
    await addAppStyle(page, "@layer app { :root { --line-s: 3px; --line-m: 5px; } }");
    for (const selector of ["#prose th", "#prose td", "#prose pre", "#prose kbd"]) {
      expect([selector, await page.style(selector, "border-top-width")]).toEqual([selector, "3px"]);
    }
    expect(await page.style("#prose hr", "border-top-width")).toBe("3px");
    expect(await page.style("#prose blockquote", "border-left-width")).toBe("5px");
    await tabTo(page, "#prose a");
    expect(await page.evaluate(`getComputedStyle(document.activeElement).outlineWidth`)).toBe(
      "5px",
    );
  });

  test("draws no shadows and no gradients, on prose or tools", async () => {
    const page = await open(specimen, { scheme: "light" });
    // The check is only as wide as the page: it must hold every tools class.
    const shown = TOOLS.map((name) => `!!document.querySelector("#tools .${name}")`);
    expect(await page.evaluate(`[${shown}].every(Boolean)`)).toBe(true);
    // chromium resolves no computed style for a track element, so the video's and audio's
    // tracks are left out.
    const styles = (await page.fingerprint(["display", "box-shadow", "background-image"]))
      .map(([, s]) => s)
      .filter((s) => s.display !== "");
    expect(new Set(styles.map((s) => s["box-shadow"]))).toEqual(new Set(["none"]));
    expect(new Set(styles.map((s) => s["background-image"]))).toEqual(new Set(["none"]));
  });
});

// HOOKS are the custom properties the elements layer reads with a fallback and never declares.
const HOOKS = ["--interaction-color", "--code-color", "--kbd-color"];

// HOVERED are the controls whose boundary takes the interaction color on hover, as markup, each
// with the pseudo-element its boundary is drawn on, if any; DISABLED are their disabled twins.
const HOVERED = [
  ['<input type="text" id="h-text" />', "#h-text", ""],
  ['<input type="search" id="h-search" />', "#h-search", ""],
  ['<input type="number" id="h-number" />', "#h-number", ""],
  ['<select id="h-select"><option>One</option></select>', "#h-select", ""],
  ['<textarea id="h-textarea"></textarea>', "#h-textarea", ""],
  ['<button type="button" id="h-button">Button</button>', "#h-button", ""],
  ['<input type="button" id="h-input-button" value="Input" />', "#h-input-button", ""],
  ['<input type="submit" id="h-submit" />', "#h-submit", ""],
  ['<input type="reset" id="h-reset" />', "#h-reset", ""],
  ['<input type="file" id="h-file" />', "#h-file", "::file-selector-button"],
  ['<a class="button" id="h-base" href="#hooks">Base</a>', "#h-base", ""],
];
const DISABLED = [
  ['<input type="text" id="d-text" disabled />', "#d-text", ""],
  ['<select id="d-select" disabled><option>One</option></select>', "#d-select", ""],
  ['<textarea id="d-textarea" disabled></textarea>', "#d-textarea", ""],
  ['<button type="button" id="d-button" disabled>Button</button>', "#d-button", ""],
  ['<input type="submit" id="d-submit" disabled />', "#d-submit", ""],
  ['<input type="file" id="d-file" disabled />', "#d-file", "::file-selector-button"],
  ['<button type="button" class="button" id="d-base" disabled>Base</button>', "#d-base", ""],
];

// addControls puts html, one sample per line, in a container of its own first in the body, so
// the first Tab reaches its first focusable element and nothing in the specimen's layout lays it
// out.
function addControls(page, html, attributes = "") {
  return page.evaluate(`document.body.insertAdjacentHTML("afterbegin",
    ${JSON.stringify(`<div id="hooks" ${attributes}>${html.map((line) => `<p>${line}</p>`).join("")}</div>`)})`);
}

// boundary resolves to the computed [border-top-color, background-color] of the element matching
// selector, or of its pseudo-element.
function boundary(page, selector, pseudo = "") {
  return page.evaluate(`(() => {
    const style = getComputedStyle(document.querySelector(${JSON.stringify(selector)}),
      ${JSON.stringify(pseudo || null)});
    return [style.borderTopColor, style.backgroundColor];
  })()`);
}

// interaction resolves to the interaction paint inside the element matching within: a link's
// color, a text field's caret, a checkbox's accent, and selected text's mix, as a tint.
async function interaction(page, within) {
  const read = await page.evaluate(`(() => {
    const scope = document.querySelector(${JSON.stringify(within)});
    return {
      link: getComputedStyle(scope.querySelector("a")).color,
      caret: getComputedStyle(scope.querySelector("input[type=text]")).caretColor,
      accent: getComputedStyle(scope.querySelector("input[type=checkbox]")).accentColor,
      selection: getComputedStyle(scope.querySelector("p"), "::selection").backgroundColor,
    };
  })()`);
  return { ...read, selection: tint(read.selection)?.hue };
}

// channels parses a computed opaque color, rgb() or color(srgb), into its 0..255 channels.
function channels(value) {
  const srgb = value.match(/^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)\)$/);
  if (srgb) return srgb.slice(1).map((c) => Number(c) * 255);
  return value
    .match(/^rgb\((\d+), (\d+), (\d+)\)$/)
    .slice(1)
    .map(Number);
}

const INTERACTIVE = [
  '<a href="#hooks" id="i-link">A link</a>',
  '<input type="text" id="i-text" /> <input type="checkbox" id="i-check" />',
];

describe("element hooks", () => {
  test("neither the baseline nor its color profile declares a hook", async () => {
    const page = await open(server.url, { scheme: "light" });
    const declared = (await layerRules(page, ...LAYERS)).flatMap((rule) =>
      rule.declarations.map(([name]) => name).filter((name) => HOOKS.includes(name)),
    );
    expect(declared).toEqual([]);
    for (const hook of HOOKS) expect(await page.style("body", hook)).toBe("");
  });

  test("interaction falls back to --blue: link, caret, accent, selected text and focus outline", async () => {
    const page = await open(specimen, { scheme: "light" });
    await addControls(page, INTERACTIVE);
    const [blue] = COLORS["--blue"];
    expect(await interaction(page, "#hooks")).toEqual({
      link: blue,
      caret: blue,
      accent: blue,
      selection: blue,
    });
    await tabTo(page, "#i-link");
    expect(await page.evaluate(`getComputedStyle(document.activeElement).outlineColor`)).toBe(blue);
  });

  test("a consumer setting --interaction-color on an ancestor re-colors all interaction in its subtree", async () => {
    const page = await open(specimen, { scheme: "light" });
    await addControls(page, [...INTERACTIVE, HOVERED[0][0], HOVERED[5][0]]);
    await addAppStyle(page, "@layer app { #hooks { --interaction-color: rgb(1, 2, 3); } }");
    const hook = "rgb(1, 2, 3)";
    expect(await interaction(page, "#hooks")).toEqual({
      link: hook,
      caret: hook,
      accent: hook,
      selection: hook,
    });
    await tabTo(page, "#i-link");
    expect(await page.evaluate(`getComputedStyle(document.activeElement).outlineColor`)).toBe(hook);
    for (const selector of ["#h-text", "#h-button"]) {
      await hover(page, selector);
      expect([selector, (await boundary(page, selector))[0]]).toEqual([selector, hook]);
    }
    // Outside the subtree, interaction keeps --blue.
    expect(await page.style("#prose a", "color")).toBe(COLORS["--blue"][0]);
    expect(await page.style("#prose p", "caret-color")).toBe(COLORS["--blue"][0]);
  });

  for (const [index, forced] of SCHEMES.entries()) {
    const system = index ? "light" : "dark";
    test(`interaction resolves in a data-scheme="${forced}" container's own scheme, in a ${system} page`, async () => {
      const page = await open(specimen, { scheme: system });
      await addControls(page, [...INTERACTIVE, HOVERED[0][0]], `data-scheme="${forced}"`);
      const blue = COLORS["--blue"][index];
      expect(await interaction(page, "#hooks")).toEqual({
        link: blue,
        caret: blue,
        accent: blue,
        selection: blue,
      });
      await hover(page, "#h-text");
      expect((await boundary(page, "#h-text"))[0]).toBe(blue);
      // The page outside keeps its own scheme's blue.
      expect(await page.style("#prose p", "caret-color")).toBe(COLORS["--blue"][1 - index]);
    });
  }

  test("interaction resolves in a data-palette container's own profile", async () => {
    const page = await open(specimen, { scheme: "light" });
    await addProbePalette(page);
    await addControls(page, INTERACTIVE, 'data-palette="probe"');
    const blue = PROBE_PALETTE["--blue"];
    expect(await interaction(page, "#hooks")).toEqual({
      link: blue,
      caret: blue,
      accent: blue,
      selection: blue,
    });
  });

  for (const [index, scheme] of SCHEMES.entries()) {
    test(`hovered, every enabled field and neutral button takes a boundary in the interaction color, in ${scheme}`, async () => {
      const page = await open(specimen, { scheme });
      await addControls(
        page,
        HOVERED.map(([html]) => html),
      );
      await page.view.cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
      const rest = COLORS["--border-2"][index];
      for (const [, selector, pseudo] of HOVERED) {
        expect([selector, (await boundary(page, selector, pseudo))[0]]).toEqual([selector, rest]);
      }
      for (const [, selector, pseudo] of HOVERED) {
        await hover(page, selector);
        expect([selector, (await boundary(page, selector, pseudo))[0]]).toEqual([
          selector,
          COLORS["--blue"][index],
        ]);
      }
    });
  }

  test("hovered, a disabled control doesn't change", async () => {
    const page = await open(specimen, { scheme: "light" });
    await addControls(
      page,
      DISABLED.map(([html]) => html),
    );
    for (const [, selector, pseudo] of DISABLED) {
      await page.view.cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
      const rest = await boundary(page, selector, pseudo);
      expect([selector, rest[0]]).toEqual([selector, COLORS["--border-2"][0]]);
      await hover(page, selector);
      expect([selector, await boundary(page, selector, pseudo)]).toEqual([selector, rest]);
    }
  });

  test("hovered, a hue variant keeps its own hook color for its boundary", async () => {
    const page = await open(specimen, { scheme: "light" });
    const [red] = COLORS["--red"];
    for (const selector of ["#buttons button.button-red", "#buttons a.button-red"]) {
      await hover(page, selector);
      expect([selector, (await boundary(page, selector))[0]]).toEqual([selector, red]);
    }
  });

  // chip reads, in the page, what would make an element a chip: its background, its paddings,
  // its radius and its border, then its color.
  const chip = (page, selector) =>
    page.evaluate(`(() => {
      const style = getComputedStyle(document.querySelector(${JSON.stringify(selector)}));
      return [style.backgroundColor, style.paddingLeft, style.paddingRight, style.paddingTop,
        style.borderTopLeftRadius, style.borderTopWidth, style.color];
    })()`);
  const PLAIN = ["rgba(0, 0, 0, 0)", "0px", "0px", "0px", "0px", "0px"];

  // linkCode adds a link holding inline code to the prose section's first paragraph, as
  // #code-link, and resolves to its selector.
  const linkCode = async (page) => {
    await page.evaluate(`document.querySelector("#prose p").insertAdjacentHTML("beforeend",
      ' <a id="code-link" href="#prose"><code>mise run check</code></a>')`);
    return "#code-link > code";
  };

  for (const [index, scheme] of SCHEMES.entries()) {
    test(`inline code is green text in the code font, with no chip, and code in a pre is plain, in ${scheme}`, async () => {
      const page = await open(specimen, { scheme });
      const inline = "#prose p > code";
      expect(await chip(page, inline)).toEqual([...PLAIN, COLORS["--green"][index]]);
      expect(await page.style(inline, "font-family")).toBe(MONO);
      expect(await chip(page, "#prose pre > code")).toEqual([
        ...PLAIN,
        await page.style("#prose pre", "color"),
      ]);
    });
  }

  test("a consumer re-colors inline code's text through --code-color, and code in a pre keeps its own", async () => {
    const page = await open(specimen, { scheme: "light" });
    await addAppStyle(page, "@layer app { #prose { --code-color: rgb(1, 2, 3); } }");
    expect(await chip(page, "#prose p > code")).toEqual([...PLAIN, "rgb(1, 2, 3)"]);
    expect(await page.style("#prose pre > code", "color")).toBe(COLORS["--fg"][0]);
  });

  test("code inside a link takes the link's color and runs under its underline", async () => {
    const page = await open(specimen, { scheme: "light" });
    const code = await linkCode(page);
    expect(await chip(page, code)).toEqual([...PLAIN, COLORS["--blue"][0]]);
    // The link's underline propagates to an inline descendant: the code stays inline and sets
    // no decoration of its own.
    expect(await page.style("#code-link", "text-decoration-line")).toBe("underline");
    expect(await page.style(code, "display")).toBe("inline");
    expect(await page.style(code, "text-decoration-line")).toBe("none");
    // The link's color wins over the code hook, and follows the interaction hook.
    await addAppStyle(
      page,
      "@layer app { #prose { --code-color: rgb(1, 2, 3); --interaction-color: rgb(4, 5, 6); } }",
    );
    expect(await page.style(code, "color")).toBe("rgb(4, 5, 6)");
  });

  test("a dialog pads one step tighter, and its actions sit a step further below its content", async () => {
    const page = await open(specimen, { scheme: "light" });
    await page.evaluate(`document.querySelector("#specimen-dialog").showModal()`);
    const s = `${await resolveToken(page, "--space-s", "length")}px`;
    const m = `${await resolveToken(page, "--space-m", "length")}px`;
    expect(await page.style("#specimen-dialog", "padding-top")).toBe(s);
    expect(await page.style("#specimen-dialog", "padding-left")).toBe(s);
    // The close form, after the text, sits --space-m below it, more than a block's --space-s.
    expect(await page.style("#specimen-dialog > form", "margin-top")).toBe(m);
    // Only actions after content: a form that is the dialog's whole content, and a last block
    // that is text, take no such margin.
    const margins = await page.evaluate(`(() => {
      const dialog = document.createElement("dialog");
      dialog.innerHTML = '<form method="dialog"><button>Close</button></form>';
      const text = document.createElement("dialog");
      text.innerHTML = "<p>One.</p><p>Two.</p>";
      document.body.append(dialog, text);
      return [getComputedStyle(dialog.firstChild).marginTop,
        getComputedStyle(text.lastChild).marginTop];
    })()`);
    expect(margins).toEqual(["0px", s]);
  });

  for (const [index, scheme] of SCHEMES.entries()) {
    test(`kbd is an outlined key with a heavier bottom edge over no fill, in ${scheme}`, async () => {
      const page = await open(specimen, { scheme });
      const key = await page.evaluate(`(() => {
        const style = getComputedStyle(document.querySelector("#prose kbd"));
        return {
          widths: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth,
            style.borderLeftWidth],
          colors: [...new Set([style.borderTopColor, style.borderRightColor,
            style.borderBottomColor, style.borderLeftColor])],
          style: style.borderTopStyle,
          fill: style.backgroundColor,
          color: style.color,
          radius: style.borderTopLeftRadius,
        };
      })()`);
      const [s, m] = [
        await resolveToken(page, "--line-s", "length"),
        await resolveToken(page, "--line-m", "length"),
      ];
      expect(key).toEqual({
        widths: [`${s}px`, `${s}px`, `${m}px`, `${s}px`],
        colors: [COLORS["--border-2"][index]],
        style: "solid",
        fill: "rgba(0, 0, 0, 0)",
        color: COLORS["--fg"][index],
        radius: `${await resolveToken(page, "--radius-sm", "length")}px`,
      });
    });
  }

  test("a consumer re-colors kbd's border and text through --kbd-color", async () => {
    const page = await open(specimen, { scheme: "light" });
    await addAppStyle(page, "@layer app { #prose { --kbd-color: rgb(1, 2, 3); } }");
    for (const property of [
      "border-top-color",
      "border-right-color",
      "border-bottom-color",
      "border-left-color",
      "color",
    ]) {
      expect([property, await page.style("#prose kbd", property)]).toEqual([
        property,
        "rgb(1, 2, 3)",
      ]);
    }
  });
});

// The elements fixture over http, so the bare load can answer its one stylesheet 404.
const elementsFixture = `${server.url}test/fixtures/elements.html`;

// LAYOUT are the computed properties that decide an element's layout and behavior, which the
// elements layer must leave at chromium's defaults: display and box, position and insets, float,
// overflow, visibility, sizes with min and max in both their physical and logical forms, flex
// and grid, white-space, list markers, table layout and caption side, appearance, and the
// interaction properties. A table's border-collapse and border-spacing are border properties,
// which the elements layer may set, so they are not among them.
const LAYOUT = [
  "display",
  "box-sizing",
  "position",
  "top",
  "right",
  "bottom",
  "left",
  "z-index",
  "float",
  "clear",
  "overflow-x",
  "overflow-y",
  "visibility",
  "width",
  "height",
  "min-width",
  "min-height",
  "max-width",
  "max-height",
  "inline-size",
  "block-size",
  "min-inline-size",
  "min-block-size",
  "max-inline-size",
  "max-block-size",
  "flex-direction",
  "flex-wrap",
  "flex-grow",
  "flex-shrink",
  "flex-basis",
  "order",
  "justify-content",
  "justify-items",
  "justify-self",
  "align-content",
  "align-items",
  "align-self",
  "row-gap",
  "column-gap",
  "grid-template-columns",
  "grid-template-rows",
  "grid-template-areas",
  "grid-auto-flow",
  "grid-auto-columns",
  "grid-auto-rows",
  "grid-row-start",
  "grid-row-end",
  "grid-column-start",
  "grid-column-end",
  "white-space",
  "white-space-collapse",
  "text-wrap-mode",
  "list-style-position",
  "table-layout",
  "caption-side",
  "vertical-align",
  "appearance",
  "pointer-events",
  "user-select",
  "cursor",
  "resize",
  "transform",
  "contain",
  "content-visibility",
];

// USED are the LAYOUT properties getComputedStyle() answers in used px on a rendered box.
const USED = LAYOUT.filter((name) =>
  /^(top|right|bottom|left|(min-|max-)?(width|height|inline-size|block-size))$/.test(name),
);

// PSEUDOS are the pseudo-elements the elements layer styles, each with the fixture elements that
// render it.
const PSEUDOS = {
  "::marker": "li, summary",
  "::file-selector-button": "input[type=file]",
  "::placeholder": "[placeholder]",
  "::backdrop": "dialog:modal",
};

// MARGINS are the margin longhands, which the reset zeroes and the elements layer sets.
const MARGINS = ["margin-top", "margin-right", "margin-bottom", "margin-left"];

// RESET_COMPARED are the computed properties the reset and elements behavior test compares: the
// layout properties, the margins, and the other non-type properties the reset sets. Type
// properties, fonts and leadings, are the elements layer's to set and are not compared.
const RESET_COMPARED = [
  ...LAYOUT,
  ...MARGINS,
  "overflow-wrap",
  "scroll-margin-top",
  "scroll-margin-bottom",
  "scroll-behavior",
];

// TYPE_PROPERTIES matches the type properties the reset may set besides those it is compared on:
// form controls' font and leading, the body's leading, and text-size-adjust.
const TYPE_PROPERTIES = /^(font-[\w-]+|line-height|(-webkit-)?text-size-adjust)$/;

// RESET_ALLOWANCES are the only differences from no stylesheet that the reset, with the elements
// layer over it, may make, each as [selector, properties]: a difference passes only on an element
// that matches a selector whose properties name it. Every other difference, on any element or
// pseudo-element, fails.
const RESET_ALLOWANCES = [
  // Every box sized by its border.
  ["*", ["box-sizing"]],
  // Every margin, which the reset zeroes and the elements layer spaces, but a dialog's and a
  // popover's: chromium's auto margins center them.
  [":not(dialog, [popover])", MARGINS],
  // Media as blocks no wider than their container.
  ["img, picture, video, canvas, svg", ["display", "max-width", "max-inline-size"]],
  // An image, video or canvas keeps its aspect ratio when narrowed.
  ["img, video, canvas", ["height", "block-size"]],
  // The body fills the viewport.
  ["body", ["min-height", "min-block-size"]],
  // Prose breaks a word longer than its line; overflow-wrap inherits.
  [":is(p, h1, h2, h3, h4, h5, h6), :is(p, h1, h2, h3, h4, h5, h6) *", ["overflow-wrap"]],
  // Form controls take the page's font: chromium sizes an option's gaps and minimum height in
  // em, so they follow it.
  ["option", ["row-gap", "column-gap", "min-height", "min-block-size"]],
  // An anchor's target lands with room above it, and the page scrolls to it smoothly.
  [":target", ["scroll-margin-top", "scroll-margin-bottom"]],
  [":has(:target)", ["scroll-behavior"]],
];

// readLayout runs in the page: it opens the fixture's modal dialog, so its ::backdrop renders,
// and its popover, then reads every rendered element's, and every styled pseudo-element's,
// properties, keyed by tag path, with the properties allow lets that element differ in. An
// element reads its computed values through computedStyleMap(), never its resolved ones:
// getComputedStyle() answers a rendered element's width, height and insets in used px, which
// padding and fonts legitimately change, where the computed value is the auto or the length the
// cascade gave. A pseudo-element has no computedStyleMap(), so it reads getComputedStyle(), which
// answers its sizes and insets in used px, so those are left out of a pseudo-element's read; no
// allowance reaches a pseudo-element.
function readLayout({ properties, pseudos, used, allow }) {
  document.querySelector("#modal").showModal();
  document.querySelector("#popover").showPopover();
  const path = (el) =>
    el.parentElement
      ? `${path(el.parentElement)} > ${el.localName}:nth-child(${[...el.parentElement.children].indexOf(el) + 1})`
      : el.localName;
  const computed = (el) => {
    const map = el.computedStyleMap();
    return Object.fromEntries(
      properties.map((name) => {
        let value;
        try {
          value = map.get(name)?.toString();
        } catch {}
        return [name, value ?? getComputedStyle(el).getPropertyValue(name)];
      }),
    );
  };
  const resolved = (el, pseudo) => {
    const style = getComputedStyle(el, pseudo);
    return Object.fromEntries(
      properties
        .filter((name) => !used.includes(name))
        .map((name) => [name, style.getPropertyValue(name)]),
    );
  };
  const allowed = (el) =>
    allow.filter(([selector]) => el.matches(selector)).flatMap(([, names]) => names);
  const skip = "head, head *, script, noscript, template";
  const entries = [...document.querySelectorAll(`*:not(${skip})`)].map((el) => [
    path(el),
    computed(el),
    allowed(el),
  ]);
  for (const [pseudo, selector] of Object.entries(pseudos)) {
    for (const el of document.querySelectorAll(selector)) {
      entries.push([`${path(el)}${pseudo}`, resolved(el, pseudo), []]);
    }
  }
  return entries;
}

// layoutDifferences reads two pages' layouts over properties, with the allowances applied to the
// first, and resolves to every difference no allowance covers, as [path, property, first value,
// second value], and the properties the allowances let differ, as path to names.
async function layoutDifferences(styled, bare, properties, allow = []) {
  const args = JSON.stringify({ properties, pseudos: PSEUDOS, used: USED, allow });
  const read = (page) => page.evaluate(`(${readLayout})(${args})`);
  const [withLayers, without] = [await read(styled), await read(bare)];
  expect(withLayers.map(([path]) => path)).toEqual(without.map(([path]) => path));
  const differences = [];
  const allowed = [];
  for (const [index, [path, style, names]] of withLayers.entries()) {
    for (const name of Object.keys(style)) {
      if (style[name] === without[index][1][name]) continue;
      if (names.includes(name)) allowed.push(name);
      else differences.push([path, name, style[name], without[index][1][name]]);
    }
  }
  return { differences, allowed: new Set(allowed) };
}

// TAGS are every rendered HTML element the elements fixture and the specimen must show: sections
// and headings, grouping, text-level, edits, embedded, tables, forms, and interactive elements.
// Metadata and scripting elements are left out.
const TAGS = [
  ..."body article section nav aside h1 h2 h3 h4 h5 h6 hgroup header footer address".split(" "),
  ..."p hr pre blockquote ol ul menu li dl dt dd figure figcaption main search div".split(" "),
  ..."a em strong small s cite q dfn abbr ruby rt rp data time code var samp kbd sub sup".split(
    " ",
  ),
  ..."i b u mark bdi bdo span br wbr ins del".split(" "),
  ..."img picture source iframe embed object video track audio canvas svg math".split(" "),
  ..."table caption colgroup col thead tbody tfoot tr th td".split(" "),
  ..."form label input button select datalist optgroup option textarea output".split(" "),
  ..."progress meter fieldset legend details summary dialog".split(" "),
];

// INPUT_TYPES are every type an input takes.
const INPUT_TYPES = [
  ..."hidden text search tel url email password date month week time datetime-local".split(" "),
  ..."number range color checkbox radio file submit image reset button".split(" "),
];

// The fixture's test entry, and the reset file it imports, as the fixture requests them.
const elementsEntry = `${server.url}test/fixtures/elements.css`;
const resetFile = `${server.url}layers/reset.css`;
const absent = join(import.meta.dir, "fixtures", "absent");

// openElements opens the elements fixture at a small display, where the body's --text-m is 16px,
// the browser's default: chromium states some native sizes in em (progress, meter, a dialog's
// max size), and their computed px follow the font, which the elements layer may set. Each URL
// of drop is answered 404.
function openElements(drop = []) {
  return open(elementsFixture, {
    scheme: "light",
    viewport: display("9:16", "small"),
    intercept: Object.fromEntries(drop.map((url) => [url, absent])),
  });
}

describe("elements behavior", () => {
  test("the elements fixture holds every rendered element and every input type", async () => {
    const page = await open(elementsFixture, { scheme: "light" });
    const shown = await page.evaluate(`({
      tags: [...new Set([...document.body.querySelectorAll("*")].map((el) => el.localName))],
      types: [...document.querySelectorAll("input")].map((el) => el.type),
    })`);
    expect(TAGS.filter((tag) => tag !== "body" && !shown.tags.includes(tag))).toEqual([]);
    expect(INPUT_TYPES.filter((type) => !shown.types.includes(type))).toEqual([]);
  });

  test("with only the tokens and elements layers, every element lays out as with no stylesheet", async () => {
    // The fixture once with the reset's request answered 404, so only the tokens and elements
    // layers load, and once with the whole entry's.
    const styled = await openElements([resetFile]);
    const bare = await openElements([elementsEntry]);
    // Equal reads prove nothing unless the elements layer loaded in one and not the other, and
    // the reset in neither.
    expect(await styled.style("body", "background-color")).toBe(COLORS["--bg"][0]);
    expect(await styled.style("body", "box-sizing")).toBe("content-box");
    expect(await bare.style("body", "background-color")).toBe("rgba(0, 0, 0, 0)");
    const { differences } = await layoutDifferences(styled, bare, LAYOUT);
    expect(differences).toEqual([]);
  });

  test("with the reset under the elements layer, every element differs from no stylesheet only as the reset allows", async () => {
    const styled = await openElements();
    const bare = await openElements([elementsEntry]);
    expect(await styled.style("body", "box-sizing")).toBe("border-box");
    expect(await bare.style("body", "background-color")).toBe("rgba(0, 0, 0, 0)");
    const { differences, allowed } = await layoutDifferences(
      styled,
      bare,
      RESET_COMPARED,
      RESET_ALLOWANCES,
    );
    expect(differences).toEqual([]);
    // The allowances are not vacuous: the reset's changes reached the read.
    for (const name of ["box-sizing", "margin-top", "display", "max-width", "height"]) {
      expect([name, allowed.has(name)]).toEqual([name, true]);
    }
  });

  test("a universal margin reset that zeroes a dialog's and a popover's margins fails the allowances", async () => {
    // The reset's former rule, * { margin: 0 }, appended to its layer: it wins over the
    // exemption by source order, and the test must catch it.
    const styled = await openElements();
    await addAppStyle(styled, `@layer ${PACKAGE}.reset { * { margin: 0; } }`);
    const bare = await openElements([elementsEntry]);
    const { differences } = await layoutDifferences(styled, bare, RESET_COMPARED, RESET_ALLOWANCES);
    const elements = (selector) =>
      styled.evaluate(`[...document.querySelectorAll(${JSON.stringify(selector)})].length`);
    expect(await elements("dialog, [popover]")).toBe(3);
    expect(new Set(differences.map(([path]) => path.split(" > ").at(-1).split(":")[0]))).toEqual(
      new Set(["dialog", "div"]),
    );
    expect(new Set(differences.map(([, name]) => name))).toEqual(new Set(MARGINS));
    expect(differences).toHaveLength(3 * MARGINS.length);
  });

  test("the reset sets only properties the behavior test compares, and type properties", async () => {
    // Over http, since chromium hides a file:// stylesheet's rules from the page.
    const page = await open(server.url, { scheme: "light" });
    const properties = propertiesOf(await layerRules(page, "reset"));
    expect(properties.length).toBeGreaterThan(0);
    // A logical longhand computes to its physical one, which the test compares.
    const physical = (name) =>
      name.replace("block-start", "top").replace("block-end", "bottom").replace("inline-", "");
    expect(
      properties.filter(
        (name) => !RESET_COMPARED.includes(physical(name)) && !TYPE_PROPERTIES.test(name),
      ),
    ).toEqual([]);
  });

  test("a modal dialog keeps chromium's margins, and centers in the viewport", async () => {
    const styled = await openElements();
    const bare = await openElements([elementsEntry]);
    const read = (page) =>
      page.evaluate(`(() => {
        const dialog = document.querySelector("#modal");
        dialog.showModal();
        const map = dialog.computedStyleMap();
        const { left, top, width, height } = dialog.getBoundingClientRect();
        return {
          margins: ${JSON.stringify(MARGINS)}.map((name) => map.get(name).toString()),
          offsets: [left * 2 + width - document.documentElement.clientWidth,
            top * 2 + height - document.documentElement.clientHeight],
        };
      })()`);
    const [withLayers, without] = [await read(styled), await read(bare)];
    expect(withLayers.margins).toEqual(without.margins);
    expect(withLayers.margins).toEqual(MARGINS.map(() => "auto"));
    // Centered: as much room on each side as on the other, to a px, in the viewport less its
    // scrollbar.
    for (const offset of withLayers.offsets) expect(Math.abs(offset)).toBeLessThanOrEqual(1);
  });
});

// BUTTON_LOOK are the computed properties .button shares with the native button, which a test
// holds equal in each state: display, padding, border, radius, paint, font and alignment.
const BUTTON_LOOK = [
  "display",
  ...["top", "right", "bottom", "left"].flatMap((side) => [
    `padding-${side}`,
    `border-${side}-width`,
    `border-${side}-style`,
    `border-${side}-color`,
  ]),
  ...["top-left", "top-right", "bottom-right", "bottom-left"].map((c) => `border-${c}-radius`),
  "background-color",
  "color",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "line-height",
  "text-align",
];

describe("tools", () => {
  test("the tools layer styles exactly the tools classes", async () => {
    // Over http, since chromium hides a file:// stylesheet's rules from the page.
    const page = await open(server.url, { scheme: "light" });
    const selectors = selectorsOf(await layerRules(page, "tools"));
    const classes = [...new Set(selectors.join(" ").match(/\.[\w-]+/g))].map((c) => c.slice(1));
    expect(classes.sort()).toEqual([...TOOLS].sort());
  });

  test("no other layer styles a class", async () => {
    const page = await open(server.url, { scheme: "light" });
    const others = LAYERS.filter((layer) => layer !== "tools");
    const selectors = selectorsOf(await layerRules(page, ...others));
    expect(selectors.length).toBeGreaterThan(0);
    expect(selectors.filter((selector) => /\.[A-Za-z_-]/.test(selector))).toEqual([]);
  });

  test("scroll-y and scroll-x scroll their overflow on one axis", async () => {
    // Below the range, so --space-2xs is its smallest value, 8px.
    const page = await open(specimen, { scheme: "light", viewport: display("9:16", "small") });
    for (const [axis, overflow, size, padding, gutter] of [
      ["y", "overflow-y", "Height", "padding-right", "stable"],
      ["x", "overflow-x", "Width", "padding-bottom", "auto"],
    ]) {
      const selector = `#tools .scroll-${axis}`;
      expect(await page.style(selector, overflow)).toBe("auto");
      expect([axis, await page.style(selector, "scrollbar-gutter")]).toEqual([axis, gutter]);
      expect(await page.style(selector, padding)).toBe("8px");
      const scrolled = await page.evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        el.scroll${axis === "y" ? "Top" : "Left"} = 10;
        return el.scroll${size} > el.client${size} && el.scroll${axis === "y" ? "Top" : "Left"};
      })()`);
      expect([axis, scrolled]).toEqual([axis, 10]);
    }
  });

  test("a table in scroll-x fills its wrapper, with no gutter, while scroll-y reserves one", async () => {
    const page = await open(specimen, { scheme: "light", viewport: DESKTOP });
    // Each wrapper unbordered and too roomy to overflow, so only a reserved gutter narrows it.
    const widths = await page.evaluate(`(() => {
      document.querySelector("#scroll .cell").insertAdjacentHTML("beforeend",
        '<div class="scroll-x" id="gutter-x"><table class="table-full"><tr><td>Cell</td></tr></table></div>' +
        '<div class="scroll-y" id="gutter-y"><table class="table-full"><tr><td>Cell</td></tr></table></div>');
      return Object.fromEntries(["x", "y"].map((axis) => {
        const wrapper = document.querySelector("#gutter-" + axis);
        const style = getComputedStyle(wrapper);
        const content = wrapper.offsetWidth - Number.parseFloat(style.paddingLeft)
          - Number.parseFloat(style.paddingRight);
        return [axis, {
          short: Math.round(content - wrapper.querySelector("table").offsetWidth),
          reserved: wrapper.offsetWidth - wrapper.clientWidth > 0,
        }];
      }));
    })()`);
    expect(widths).toEqual({
      x: { short: 0, reserved: false },
      y: { short: widths.y.short, reserved: true },
    });
    // The gutter scroll-y reserves is what its table falls short by.
    expect(widths.y.short).toBeGreaterThan(0);
  });

  test(".button computes as the native button, rule for rule: at rest, hovered and disabled", async () => {
    const page = await open(specimen, { scheme: "light" });
    await page.evaluate(`document.querySelector("#buttons .cell").insertAdjacentHTML("beforeend",
      '<p id="sync"><button type="button" id="native">Native</button> ' +
      '<a class="button" id="base" href="#sync">Base</a> ' +
      '<button type="button" id="native-disabled" disabled>Native</button> ' +
      '<button type="button" class="button" id="base-disabled" disabled>Base</button></p>')`);
    const look = (selector) =>
      page.evaluate(`(() => {
        const style = getComputedStyle(document.querySelector(${JSON.stringify(selector)}));
        return Object.fromEntries(${JSON.stringify(BUTTON_LOOK)}
          .map((name) => [name, style.getPropertyValue(name)]));
      })()`);
    // Each state twice: on the baseline's tokens, then with every token the rules read moved, so
    // equal looks prove both read the same tokens, not values that happen to agree.
    for (const round of ["baseline", "moved"]) {
      if (round === "moved") {
        await addAppStyle(
          page,
          `@layer app { :root { --bg: rgb(1, 1, 1); --bg-2: rgb(2, 2, 2); --border: rgb(3, 3, 3);
            --border-2: rgb(4, 4, 4); --fg: rgb(5, 5, 5); --fg-3: rgb(6, 6, 6); --space-3xs: 3px;
            --space-s: 7px; --line-s: 3px; --radius-sm: 5px; --font-ui: fantasy;
            --leading-ui: 2; } }`,
        );
      }
      await page.view.cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
      const rest = await look("#native");
      expect([round, "rest", await look("#base")]).toEqual([round, "rest", rest]);
      expect([round, "disabled", await look("#base-disabled")]).toEqual([
        round,
        "disabled",
        await look("#native-disabled"),
      ]);
      await hover(page, "#native");
      const hovered = await look("#native");
      expect(hovered["background-color"]).not.toBe(rest["background-color"]);
      await hover(page, "#base");
      expect([round, "hover", await look("#base")]).toEqual([round, "hover", hovered]);
    }
  });

  test(".button adds inline-block display, centered text, no underline, a pointer and the focus outline", async () => {
    const page = await open(specimen, { scheme: "light" });
    // A link of its own, in a paragraph: the specimen's sample rows are flex containers, which
    // make every item a block. First in the body, so the first Tab reaches it.
    await page.evaluate(`document.body.insertAdjacentHTML("afterbegin",
      '<p><a class="button" id="lone" href="#buttons">A link</a></p>')`);
    const link = "#lone";
    expect(await page.style(link, "display")).toBe("inline-block");
    expect(await page.style(link, "text-align")).toBe("center");
    expect(await page.style(link, "text-decoration-line")).toBe("none");
    expect(await page.style(link, "cursor")).toBe("pointer");
    await tabTo(page, link);
    expect(await page.evaluate(`getComputedStyle(document.activeElement).outline`)).toBe(
      `${COLORS["--blue"][0]} solid 2px`,
    );
  });

  test("each hue variant sets only the hook, --button-color, to its hue", async () => {
    // On a span, which no button treatment matches, a variant class shows only what it sets
    // itself: every computed property, custom ones included, that differs from a plain span's.
    const page = await open(specimen, { scheme: "light" });
    const variants = await page.evaluate(`(() => {
      const read = (el) => {
        const style = getComputedStyle(el);
        return Object.fromEntries([...style].map((name) => [name, style.getPropertyValue(name)]));
      };
      const span = (className) => {
        const el = document.body.appendChild(document.createElement("span"));
        el.className = className;
        return read(el);
      };
      const plain = span("");
      return Object.fromEntries(${JSON.stringify(Object.keys(HUES))}.map((hue) => {
        const name = "button-" + hue.slice(2);
        const style = span(name);
        return [name, Object.keys(style).filter((key) => style[key] !== plain[key])
          .map((key) => [key, style[key].trim()])];
      }));
    })()`);
    // The hook holds the hue's own value, as the root computes it.
    const tokens = await rootTokens(page);
    expect(variants).toEqual(
      Object.fromEntries(
        Object.keys(HUES).map((hue) => [
          `button-${hue.slice(2)}`,
          [["--button-color", tokens[hue]]],
        ]),
      ),
    );
  });

  for (const [index, scheme] of SCHEMES.entries()) {
    test(`each variant draws its border and text in its hue over no fill, on <button> and <a class="button">, in ${scheme}`, async () => {
      const page = await open(specimen, { scheme });
      for (const hue of Object.keys(HUES)) {
        const values = COLORS[hue];
        for (const element of ["button", "a.button"]) {
          const selector = `#buttons ${element}.button-${hue.slice(2)}`;
          const paint = [
            await page.style(selector, "border-top-color"),
            await page.style(selector, "border-left-color"),
            await page.style(selector, "color"),
            await page.style(selector, "background-color"),
          ];
          expect([selector, paint]).toEqual([
            selector,
            [values[index], values[index], values[index], "rgba(0, 0, 0, 0)"],
          ]);
        }
      }
    });
  }

  test("each variant fills with a 15% tint of its hue on hover", async () => {
    const page = await open(specimen, { scheme: "light" });
    for (const hue of Object.keys(HUES)) {
      const [light] = COLORS[hue];
      for (const element of ["button", "a.button"]) {
        const selector = `#buttons ${element}.button-${hue.slice(2)}`;
        await hover(page, selector);
        const fill = tint(await page.style(selector, "background-color"));
        expect([selector, fill?.hue]).toEqual([selector, light]);
        expect(fill.alpha).toBeCloseTo(0.15);
      }
    }
  });

  test("a variant's treatment reads the hook: setting it alone recolors border, text and hover", async () => {
    const page = await open(specimen, { scheme: "light" });
    await addAppStyle(page, "@layer app { .button-red { --button-color: rgb(1, 2, 3); } }");
    for (const selector of ["#buttons button.button-red", "#buttons a.button-red"]) {
      expect(await page.style(selector, "border-top-color")).toBe("rgb(1, 2, 3)");
      expect(await page.style(selector, "color")).toBe("rgb(1, 2, 3)");
      await hover(page, selector);
      expect(tint(await page.style(selector, "background-color"))?.hue).toBe("rgb(1, 2, 3)");
    }
  });

  test("a disabled variant keeps the neutral disabled look", async () => {
    const page = await open(specimen, { scheme: "light" });
    await page.evaluate(`document.querySelector("#buttons .cell").insertAdjacentHTML("beforeend",
      '<p><button type="button" id="plain" disabled>Plain</button> ' +
      '<button type="button" class="button-red" id="variant" disabled>Variant</button> ' +
      '<button type="button" class="button button-red" id="base-variant" disabled>Base</button></p>')`);
    const paint = async (selector) => [
      await page.style(selector, "border-top-color"),
      await page.style(selector, "color"),
      await page.style(selector, "background-color"),
    ];
    const plain = await paint("#plain");
    expect(await paint("#variant")).toEqual(plain);
    expect(await paint("#base-variant")).toEqual(plain);
  });

  test(".field stacks its label, control and hint --space-3xs apart, each at its own size", async () => {
    const page = await open(specimen, { scheme: "light" });
    expect(await page.style("#fields .field", "display")).toBe("grid");
    const gap = await resolveToken(page, "--space-3xs", "length");
    const boxes = await page.evaluate(`(() => {
      const field = document.querySelector("#fields .field").getBoundingClientRect();
      return [...document.querySelector("#fields .field").children].map((el) => {
        const { top, bottom, left, width } = el.getBoundingClientRect();
        return { top, bottom, left, width, field: { left: field.left, width: field.width } };
      });
    })()`);
    expect(boxes.length).toBe(3);
    for (const [i, box] of boxes.entries()) {
      expect(box.left).toBeCloseTo(box.field.left, 1);
      if (i > 0) expect(box.top - boxes[i - 1].bottom).toBeCloseTo(gap, 1);
    }
    // The control keeps its own width rather than stretching across the field.
    expect(boxes[1].width).toBeLessThan(boxes[1].field.width);
  });

  test(".field-grow sizes its control to its content, from a few characters wide to its container", async () => {
    const page = await open(specimen, { scheme: "light" });
    const control = "#fields .field-grow";
    expect(await page.style(control, "field-sizing")).toBe("content");
    const width = (value) =>
      page.evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(control)});
        el.value = ${JSON.stringify(value)};
        return [el.getBoundingClientRect().width, el.parentElement.getBoundingClientRect().width];
      })()`);
    const [short] = await width("short");
    const [long] = await width("a longer value than the first, by several words");
    expect(long).toBeGreaterThan(short);
    // Empty, it holds its minimum, a few characters wide; past its container, it stops there.
    const [empty] = await width("");
    expect(empty).toBeCloseTo(Number.parseFloat(await page.style(control, "min-inline-size")), 0);
    expect(empty).toBeGreaterThan(0);
    const [huge, container] = await width("x".repeat(500));
    expect(huge).toBeCloseTo(container, 0);
  });

  test(".table-full takes its container's full inline size", async () => {
    const page = await open(specimen, { scheme: "light" });
    const [table, label] = await page.evaluate(`[
      document.querySelector("#tables-tools .table-full").getBoundingClientRect().width,
      document.querySelector("#tables-tools .table-full").previousElementSibling
        .getBoundingClientRect().width,
    ]`);
    expect(table).toBeCloseTo(label, 1);
  });

  for (const [index, scheme] of SCHEMES.entries()) {
    test(`.table-striped's stripe lies between the page and the header surface, apart from both, in ${scheme}`, async () => {
      const page = await open(specimen, { scheme });
      const table = "#tables-tools .table-striped";
      const rows = await page.evaluate(`[...document.querySelectorAll(
        "${table} > tbody > tr")].map((tr) => getComputedStyle(tr).backgroundColor)`);
      const stripe = rows[1];
      expect(rows).toEqual(["rgba(0, 0, 0, 0)", stripe, "rgba(0, 0, 0, 0)", stripe]);
      // The header cells sit on --bg-2, the page on --bg.
      const header = await page.style(`${table} th`, "background-color");
      expect(header).toBe(COLORS["--bg-2"][index]);
      const [mixed, surface, bg] = [stripe, header, COLORS["--bg"][index]].map(channels);
      // Each channel between the page's and the header's, and the stripe at least two levels
      // from either on the channel they differ most in, so each pair is told apart.
      for (const [c, value] of mixed.entries()) {
        expect(value).toBeGreaterThanOrEqual(Math.min(surface[c], bg[c]) - 0.5);
        expect(value).toBeLessThanOrEqual(Math.max(surface[c], bg[c]) + 0.5);
      }
      const apart = (a, b) => Math.max(...a.map((value, c) => Math.abs(value - b[c])));
      expect(apart(mixed, surface)).toBeGreaterThanOrEqual(2);
      expect(apart(mixed, bg)).toBeGreaterThanOrEqual(2);
    });
  }
});

// The extension fixture: a consumer's own layer after the package layer, extending the tools
// families through their hooks, and overriding foundation rules without !important.
const extensionFixture = fileUrl(join(import.meta.dir, "fixtures", "extension.html"));

describe("extension", () => {
  test("a consumer's variant, setting only --button-color in its own layer, renders the full treatment", async () => {
    const page = await open(extensionFixture, { scheme: "light" });
    const [red] = COLORS["--red"];
    for (const selector of ["#danger", "#danger-link"]) {
      expect([
        selector,
        await page.style(selector, "border-top-color"),
        await page.style(selector, "color"),
        await page.style(selector, "background-color"),
      ]).toEqual([selector, red, red, "rgba(0, 0, 0, 0)"]);
      await hover(page, selector);
      const fill = tint(await page.style(selector, "background-color"));
      expect([selector, fill?.hue]).toEqual([selector, red]);
      expect(fill.alpha).toBeCloseTo(0.15);
    }
  });

  test("a consumer re-colors a striped table through --table-stripe", async () => {
    const page = await open(extensionFixture, { scheme: "light" });
    const rows = await page.evaluate(`[...document.querySelectorAll("#striped > tbody > tr")]
      .map((tr) => getComputedStyle(tr).backgroundColor)`);
    expect(rows[0]).toBe("rgba(0, 0, 0, 0)");
    expect(rows[2]).toBe("rgba(0, 0, 0, 0)");
    const stripe = tint(rows[1]);
    expect(stripe?.hue).toBe(COLORS["--blue"][0]);
    expect(stripe.alpha).toBeCloseTo(0.15);
  });

  test("a later layer and unlayered CSS, at zero specificity, beat a tools variant and an elements rule", async () => {
    // The tools variant's treatment carries (0,2,0) and its hook (0,1,0); every elements rule
    // carries none, so the consumer's zero-specificity rules win by layer alone.
    const page = await open(extensionFixture, { scheme: "light" });
    for (const [selector, color] of [
      ["#app-variant", "rgb(0, 128, 0)"],
      ["#unlayered-variant", "rgb(128, 0, 128)"],
    ]) {
      expect([
        selector,
        await page.style(selector, "border-top-color"),
        await page.style(selector, "color"),
      ]).toEqual([selector, color, color]);
    }
    expect(await page.style("#app-link", "color")).toBe("rgb(0, 128, 0)");
    expect(await page.style("#unlayered-link", "color")).toBe("rgb(128, 0, 128)");
  });
});

// DESKTOP and PHONE are the viewports the specimen's layout is read at: a laptop's window, and a
// phone's width.
const DESKTOP = { width: 1280, height: 800 };
const PHONE = { width: 390, height: 844 };

// COLOR_CELLS reads the specimen's color tables, token to its Light and Dark cells: each cell's
// forced scheme, its dot's sample, the value its text gives, and the color its dot paints, as
// #rrggbb.
const COLOR_CELLS = `Object.fromEntries([...document.querySelectorAll("#color .tokens tbody tr")]
  .map((row) => [row.cells[0].textContent, [...row.cells].slice(2).map((cell) => {
    const dot = cell.querySelector(".dot");
    const channels = getComputedStyle(dot).backgroundColor.match(/\\d+/g).slice(0, 3);
    return {
      scheme: cell.dataset.scheme,
      sample: dot.style.getPropertyValue("--sample"),
      text: cell.textContent.trim(),
      painted: "#" + channels.map((c) => Number(c).toString(16).padStart(2, "0")).join(""),
    };
  })]))`;

// CAPTIONS reads the space and type sections' captions that differ between profiles, token to
// the text of the one shown.
const CAPTIONS = `Object.fromEntries([...document.querySelectorAll(".scale-row:has(> [data-caption])")]
  .map((row) => [row.style.getPropertyValue("--sample"), [...row.querySelectorAll("[data-caption]")]
    .filter((caption) => getComputedStyle(caption).display !== "none")
    .map((caption) => caption.textContent)]))`;

// SHOWN_CAPTIONS are the captions CAPTIONS reads under each facet's default profile and under
// compact and sans.
const SHOWN_CAPTIONS = {
  default: {
    "var(--space-base)": ["1 → 1.125rem, the unit every step multiplies"],
    "var(--radius-base)": ["0.375rem, the radius sm, md and lg scale"],
    "var(--font-heading)": ["ui-monospace, the system mono stack"],
    "var(--font-ui)": ["ui-monospace, the system mono stack"],
  },
  named: {
    "var(--space-base)": ["0.75 → 0.875rem, the unit every step multiplies"],
    "var(--radius-base)": ["0.25rem, the radius sm, md and lg scale"],
    "var(--font-heading)": ["system-ui, the system sans stack"],
    "var(--font-ui)": ["system-ui, the system sans stack"],
  },
};

describe("specimen", () => {
  test("shows every token with a sample that resolves it", async () => {
    const page = await open(specimen, { scheme: "light" });
    // A token shows as a row of a .specimen grid, its name then its sample, or as a row of a
    // token table, its name then its swatch.
    const shown = await page.evaluate(`[
      ...[...document.querySelectorAll("#tokens .specimen > code")]
        .map((code) => [code.textContent, code.nextElementSibling]),
      ...[...document.querySelectorAll("#tokens .tokens tbody tr")]
        .map((row) => [row.cells[0].textContent, row.cells[1].firstElementChild]),
    ].map(([name, sample]) => [name, sample.style.getPropertyValue("--sample")])`);
    expect(shown.map(([name]) => name).sort()).toEqual(Object.keys(TOKENS).sort());
    for (const [name, sample] of shown) expect(sample).toBe(`var(${name})`);
  });

  // Behavior 20a: the color tables' Light and Dark cells follow the selected color profile. Each
  // cell forces its scheme and paints its dot from the token, and a specimen-only script writes
  // the value the dot resolves to as its text. The markup gives Flexoki's values, the text a page
  // without the script keeps.
  test("writes Flexoki's light and dark values into the color tables' markup", async () => {
    const page = await open(`${server.url}index.html`, { scheme: "light" });
    const shown = await page.evaluate(`fetch(location.href).then((r) => r.text()).then((html) => {
      const doc = new DOMParser().parseFromString(html, "text/html");
      return Object.fromEntries([...doc.querySelectorAll("#color .tokens tbody tr")]
        .map((row) => [row.cells[0].textContent, [...row.cells].slice(2)
          .map((cell) => cell.textContent.trim())]));
    })`);
    expect(shown).toEqual({ ...TIERS, ...HUES });
  });

  for (const name of Object.keys(COLOR_PROFILES)) {
    test(`shows ${name}'s light and dark values when the root names it, in either scheme`, async () => {
      const page = await open(specimen, { scheme: "light" });
      const expected = Object.fromEntries(
        Object.entries(COLOR_PROFILES[name].tokens).map(([token, pair]) => [
          token,
          SCHEMES.map((scheme, index) => ({
            scheme,
            sample: `var(${token})`,
            text: pair[index][1],
            painted: pair[index][1],
          })),
        ]),
      );
      await page.evaluate(`document.documentElement.dataset.palette = "${name}"`);
      expect(await page.evaluate(COLOR_CELLS)).toEqual(expected);
      // Forcing the root's scheme leaves each column in its own.
      await page.evaluate(`document.documentElement.dataset.scheme = "dark"`);
      expect(await page.evaluate(COLOR_CELLS)).toEqual(expected);
    });
  }

  test("returns the color tables to Flexoki's values when the root drops its palette", async () => {
    const page = await open(specimen, { scheme: "dark" });
    await page.evaluate(`document.documentElement.dataset.palette = "primer"`);
    await page.evaluate(`document.documentElement.removeAttribute("data-palette")`);
    const texts = Object.fromEntries(
      Object.entries(await page.evaluate(COLOR_CELLS)).map(([token, cells]) => [
        token,
        cells.map(({ text }) => text),
      ]),
    );
    expect(texts).toEqual({ ...TIERS, ...HUES });
  });

  // Behavior 20a: the space and type captions describe the profile the nearest scope names, the
  // facet's default under none.
  test("shows the space and type captions of the profile the nearest scope names", async () => {
    const page = await open(specimen, { scheme: "light" });
    const captions = () => page.evaluate(CAPTIONS);
    expect(await captions()).toEqual(SHOWN_CAPTIONS.default);
    await page.evaluate(`Object.assign(document.documentElement.dataset, {
      space: "compact", type: "sans" })`);
    expect(await captions()).toEqual(SHOWN_CAPTIONS.named);
    // A nearer scope naming the defaults wins over the root's.
    await page.evaluate(`(() => {
      document.querySelector("#space").dataset.space = "regular";
      document.querySelector("#type").dataset.type = "mono";
    })()`);
    expect(await captions()).toEqual(SHOWN_CAPTIONS.default);
  });

  for (const [index, scheme] of SCHEMES.entries()) {
    test(`shows a container forced into each scheme, painting it inside a ${scheme} page`, async () => {
      const page = await open(specimen, { scheme });
      for (const [forcedIndex, forced] of SCHEMES.entries()) {
        const selector = `#color .scope-sample[data-scheme="${forced}"]`;
        // Each container paints its forced scheme whatever the page's, so in each page the one
        // forced the other way shows the scope.
        expect([forced, await paint(page, selector)]).toEqual([
          forced,
          [COLORS["--fg"][forcedIndex], COLORS["--bg"][forcedIndex]],
        ]);
        expect([forced, await resolveColors(page, `${selector} p`)]).toEqual([
          forced,
          schemeColors(forcedIndex),
        ]);
      }
      expect(await page.style("body", "background-color")).toBe(COLORS["--bg"][index]);
    });
  }

  test("shows every rendered element and every input type", async () => {
    const page = await open(specimen, { scheme: "light" });
    const shown = await page.evaluate(`({
      tags: [...new Set([...document.querySelectorAll("body, body *")].map((el) => el.localName))],
      types: [...document.querySelectorAll("#forms input")].map((el) => el.type),
    })`);
    expect(TAGS.filter((tag) => !shown.tags.includes(tag))).toEqual([]);
    expect(INPUT_TYPES.filter((type) => !shown.types.includes(type))).toEqual([]);
  });

  test("labels every element sample with the elements it shows, and every element is labeled", async () => {
    const page = await open(specimen, { scheme: "light" });
    const cells = await page.evaluate(`[...document.querySelectorAll("#elements .cell")]
      .map((cell) => {
        const label = cell.querySelector(":scope > .label");
        // A label names a cell's elements, or a row's name its sample's.
        const names = [...(label?.querySelectorAll("code") ?? []),
          ...cell.querySelectorAll(".rows > code")];
        const named = names
          .flatMap((code) => [...code.textContent.matchAll(/<([a-z0-9]+)>/g)].map((m) => m[1]));
        const shown = new Set([...cell.querySelectorAll("*")]
          .filter((el) => !label?.contains(el) && !names.includes(el))
          .map((el) => el.localName));
        return { named, missing: named.filter((tag) => !shown.has(tag)) };
      })`);
    expect(cells.length).toBeGreaterThan(0);
    // Each cell's label names only elements its samples hold.
    expect(cells.flatMap(({ missing }) => missing)).toEqual([]);
    // Every rendered element is named by some label, but the page's own body and main.
    const named = new Set(cells.flatMap(({ named }) => named));
    expect(TAGS.filter((tag) => !["body", "main"].includes(tag) && !named.has(tag))).toEqual([]);
  });

  test("links the full entry alone, and keeps its composition in its own specimen layer, after the package layer, and says so", async () => {
    const page = await open(specimen, { scheme: "light" });
    // The full entry holds every profile, so the page imports none itself. Its one other link
    // preloads the registry its modules import.
    const links = await page.evaluate(`[...document.querySelectorAll("link")]
      .map((l) => [l.rel, l.getAttribute("href")])`);
    expect(links).toEqual([
      ["stylesheet", "./full.css"],
      ["modulepreload", "./modules/registry.js"],
    ]);
    const rules = await page.evaluate(`[...document.querySelector("style").sheet.cssRules]
      .map((rule) => rule.href ? [rule.layerName, rule.href]
        : rule.nameList ? [...rule.nameList] : rule.name)`);
    expect(rules).toEqual([[PACKAGE, "specimen"], "specimen"]);
    // The layer's own comment says so; the page carries no note about it.
    const comment = await page.evaluate(`document.querySelector("style").textContent`);
    expect(squash(comment)).toContain("The arrangement is composition");
    expect(squash(comment)).toContain("is the baseline alone");
  });

  test("carries no note about the workbench: the composition speaks for itself", async () => {
    const page = await open(specimen, { scheme: "light" });
    const text = await page.evaluate(`document.body.textContent`);
    expect(squash(text)).not.toContain("This page is a workbench");
    expect(await page.evaluate(`document.querySelectorAll(".note").length`)).toBe(0);
  });

  test("sets its header close above the first section, with no rule and no meta line beside the title", async () => {
    const page = await open(specimen, { scheme: "light", viewport: DESKTOP });
    const header = await page.evaluate(`(() => {
      const header = document.querySelector("body > header");
      const box = header.getBoundingClientRect();
      return {
        rule: getComputedStyle(header).borderBottomWidth,
        // Each of the header's blocks spans it, but the Theme and Help buttons, which sit side
        // by side on a line of their own beneath the title and above the intro: nothing sits
        // beside the title.
        spans: [...header.children].filter((el) => el.localName !== "button")
          .map((el) => Math.round(el.getBoundingClientRect().width - box.width)),
        order: [...header.children].map((el) => el.localName),
        buttons: (() => {
          const [title, theme, help, intro] = [...header.children]
            .map((el) => el.getBoundingClientRect());
          return theme.top >= title.bottom && intro.top >= theme.bottom &&
            help.top === theme.top && help.left >= theme.right;
        })(),
        gap: document.querySelector("#tokens h2").getBoundingClientRect().top - box.bottom,
      };
    })()`);
    expect(header.rule).toBe("0px");
    expect(new Set(header.spans)).toEqual(new Set([0]));
    expect(header.order).toEqual(["h1", "button", "button", "p"]);
    expect(header.buttons).toBe(true);
    expect(header.gap).toBeLessThanOrEqual(await resolveToken(page, "--space-l", "length"));
  });

  test("sets its headings, banners and cell headings at --text-l or larger, and its labels at --text-s", async () => {
    const page = await open(specimen, { scheme: "light", viewport: DESKTOP });
    const sizes = await page.evaluate(`({
      headings: [...document.querySelectorAll(
        "main > section > header > h2, main > section > section h3, #tokens .cell > h4")]
        .map((el) => [el.textContent, Number.parseFloat(getComputedStyle(el).fontSize)]),
      labels: [...new Set([...document.querySelectorAll(".label")]
        .map((el) => getComputedStyle(el).fontSize))],
    })`);
    expect(sizes.headings.length).toBeGreaterThan(20);
    const large = await resolveToken(page, "--text-l", "length");
    for (const [name, size] of sizes.headings) {
      expect([name, size >= large - 0.01]).toEqual([name, true]);
    }
    const small = await resolveToken(page, "--text-s", "length");
    expect(sizes.labels.map(Number.parseFloat)).toEqual([expect.closeTo(small, 2)]);
  });

  test("its labels' code takes the label's own color, never the code color", async () => {
    for (const scheme of SCHEMES) {
      const page = await open(specimen, { scheme });
      const unlike = await page.evaluate(`[...document.querySelectorAll(".label code")]
        .filter((code) => getComputedStyle(code).color
          !== getComputedStyle(code.closest(".label")).color)
        .map((code) => code.textContent)`);
      expect([scheme, unlike]).toEqual([scheme, []]);
    }
  });

  test("lets text span its panel: no paragraph carries a measure, and each intro fills its column", async () => {
    const page = await open(specimen, { scheme: "light", viewport: DESKTOP });
    const text = await page.evaluate(`({
      measured: [...document.querySelectorAll("p")]
        .filter((p) => getComputedStyle(p).maxWidth !== "none")
        .map((p) => p.textContent.trim().slice(0, 40)),
      // An intro's width less its column's content width: the header's, a section header's, or
      // a subsection banner's.
      intros: [...document.querySelectorAll(
        "body > header > p, main > section > header > p, main > section > section > header > p")]
        .map((p) => {
          const column = p.parentElement;
          const style = getComputedStyle(column);
          const content = column.clientWidth - Number.parseFloat(style.paddingLeft)
            - Number.parseFloat(style.paddingRight);
          return [p.textContent.trim().slice(0, 40), Math.round(p.offsetWidth - content)];
        }),
    })`);
    expect(text.measured).toEqual([]);
    expect(text.intros.length).toBeGreaterThan(8);
    for (const [intro, short] of text.intros) expect([intro, short]).toEqual([intro, 0]);
  });

  test("tops its tier and hue tables on one edge, and sets text above a sample a --space-s apart", async () => {
    const page = await open(specimen, { scheme: "light", viewport: DESKTOP });
    const tops = await page.evaluate(`[...document.querySelectorAll("#color .tokens")]
      .map((table) => Math.round(table.getBoundingClientRect().top))`);
    expect(tops.length).toBe(2);
    expect(tops[1]).toBe(tops[0]);
    // Every paragraph in a cell that a sample follows stands apart from it.
    const gaps = await page.evaluate(`[...document.querySelectorAll(".cell > p")]
      .filter((p) => p.nextElementSibling?.matches("div, table"))
      .map((p) => [p.textContent.trim().slice(0, 40),
        p.nextElementSibling.getBoundingClientRect().top - p.getBoundingClientRect().bottom])`);
    expect(gaps.length).toBeGreaterThan(0);
    const space = await resolveToken(page, "--space-s", "length");
    for (const [text, gap] of gaps) expect([text, gap >= space - 0.5]).toEqual([text, true]);
  });

  // scale resolves the rows of the token scale whose .specimen holds token: each row's token
  // name and the text of its notes.
  const scale = (page, token) =>
    page.evaluate(`[...[...document.querySelectorAll("#tokens .specimen > code")]
      .find((code) => code.textContent === "${token}").parentElement.children]
      .filter((el) => el.localName === "code")
      .map((code) => [code.textContent,
        [...code.nextElementSibling.querySelectorAll("small")].map((note) => note.textContent)])`);

  test("foots each fluid scale with its fluid expansion, as the share of the display range filled", async () => {
    for (const viewport of [DESKTOP, PHONE]) {
      const page = await open(specimen, { scheme: "light", viewport });
      const expansion = fluid([0, 1], viewport) / 16;
      const fills = await page.evaluate(`[...document.querySelectorAll(".fluid-fill")]
        .map((fill) => [fill.closest(".fluid-sample").previousElementSibling.textContent,
          fill.getBoundingClientRect().width / fill.parentElement.clientWidth])`);
      expect(fills.map(([name]) => name)).toEqual(["--space-fluid", "--type-fluid"]);
      for (const [name, share] of fills) {
        expect([name, share]).toEqual([name, expect.closeTo(expansion, 2)]);
      }
    }
    const page = await open(specimen, { scheme: "light", viewport: DESKTOP });
    // The space scale opens on the base each step multiplies, then the steps, and ends on its
    // expansion; the type scale runs its steps, then ends on its expansion.
    const space = await scale(page, "--space-fluid");
    expect(space.map(([name]) => name)).toEqual([
      "--space-base",
      ...Object.keys(SPACE_STEPS),
      "--space-fluid",
    ]);
    const type = await scale(page, "--type-fluid");
    expect(type.map(([name]) => name)).toEqual([...Object.keys(TEXT_STEPS), "--type-fluid"]);
  });

  test("sets each fluid row apart from its scale, at least a --space-m below the last step", async () => {
    for (const viewport of [DESKTOP, PHONE]) {
      const page = await open(specimen, { scheme: "light", viewport });
      // Per scale: the gaps between consecutive rows, each row spanning its name and its sample,
      // the last gap the one above the fluid row.
      const scales = await page.evaluate(`[...document.querySelectorAll("#tokens .fluid-sample")]
        .map((fluid) => {
          const rows = [...fluid.parentElement.children]
            .filter((el) => el.localName === "code")
            .map((code) => [code, code.nextElementSibling].map((el) => el.getBoundingClientRect()))
            .map(([a, b]) => [Math.min(a.top, b.top), Math.max(a.bottom, b.bottom)]);
          return [fluid.previousElementSibling.textContent,
            rows.slice(1).map(([top], i) => top - rows[i][1])];
        })`);
      expect(scales.map(([name]) => name)).toEqual(["--space-fluid", "--type-fluid"]);
      const space = await resolveToken(page, "--space-m", "length");
      for (const [name, gaps] of scales) {
        const fluid = gaps.at(-1);
        const step = Math.max(...gaps.slice(0, -1));
        expect([name, fluid >= space - 0.5, fluid > step]).toEqual([name, true, true]);
      }
    }
  });

  test("notes each scale step's multiple, or its size's range, as the facets state them", async () => {
    const page = await open(specimen, { scheme: "light" });
    const numbers = (note) => [...note.matchAll(/\d+(\.\d+)?/g)].map((m) => Number(m[0]));
    const space = Object.fromEntries(
      (await scale(page, "--space-fluid"))
        .filter(([name]) => name !== "--space-fluid")
        .map(([name, [note]]) => [name, numbers(note)]),
    );
    expect(space).toEqual({
      "--space-base": SPACE_BASE,
      ...Object.fromEntries(Object.entries(SPACE_STEPS).map(([name, k]) => [name, [k]])),
    });
    const type = Object.fromEntries(
      (await scale(page, "--type-fluid"))
        .filter(([name]) => name !== "--type-fluid")
        .map(([name, [note]]) => [name, numbers(note)]),
    );
    expect(type).toEqual(
      Object.fromEntries(
        Object.keys(TEXT_STEPS).map((name) => [
          name,
          name in TEXT_FIXED ? [TEXT_FIXED[name]] : FLUID[name],
        ]),
      ),
    );
  });

  test("draws each line sample as a rule exactly its token's width, in --fg, across its column", async () => {
    for (const [index, scheme] of SCHEMES.entries()) {
      for (const viewport of [DESKTOP, PHONE]) {
        const page = await open(specimen, { scheme, viewport });
        // Each sample's token, the thickness it renders at, its rule's width and color, and how
        // long it runs.
        const lines = await page.evaluate(`[...document.querySelectorAll(".line-sample")]
          .map((line) => {
            const style = getComputedStyle(line);
            return [line.previousElementSibling.textContent, line.getBoundingClientRect().height,
              Number.parseFloat(style.borderTopWidth), style.borderTopColor,
              line.getBoundingClientRect().width];
          })`);
        expect(lines.map(([name]) => name)).toEqual(["--line-s", "--line-m"]);
        const length = await resolveToken(page, "--space-2xl", "length");
        for (const [name, thickness, width, color, run] of lines) {
          const token = await resolveToken(page, name, "length");
          expect([scheme, name, thickness, width, color, run >= length]).toEqual([
            scheme,
            name,
            token,
            token,
            COLORS["--fg"][index],
            true,
          ]);
        }
        expect(lines[1][1]).toBeGreaterThan(lines[0][1]);
      }
    }
  });

  test("its tables example fills its panel, its caption as wide as the table", async () => {
    const page = await open(specimen, { scheme: "light", viewport: DESKTOP });
    const table = await page.evaluate(`(() => {
      const table = document.querySelector("#tables table");
      const cell = table.closest(".cell");
      const style = getComputedStyle(cell);
      const content = cell.clientWidth - Number.parseFloat(style.paddingLeft)
        - Number.parseFloat(style.paddingRight);
      return {
        columns: table.tHead.rows[0].cells.length,
        short: Math.round(table.offsetWidth - content),
        caption: Math.round(table.caption.offsetWidth - table.offsetWidth),
      };
    })()`);
    expect(table.columns).toBeGreaterThanOrEqual(5);
    expect(table).toEqual({ columns: table.columns, short: 0, caption: 0 });
  });

  test("its token and contrast tables' scroll wrappers span their panels with no gutter, and the tables fill them", async () => {
    const page = await open(specimen, { scheme: "light", viewport: DESKTOP });
    const wrappers = await page.evaluate(`[...document.querySelectorAll(
      "#color .cell > .scroll-x:has(> table), #contrast .cell > .scroll-x:has(> table)")]
      .map((wrapper) => {
        const cell = wrapper.closest(".cell");
        const style = getComputedStyle(cell);
        const content = cell.clientWidth - Number.parseFloat(style.paddingLeft)
          - Number.parseFloat(style.paddingRight);
        const table = wrapper.querySelector(":scope > table");
        return {
          name: table.id || cell.querySelector("h4").textContent,
          wrapperShort: Math.round(content - wrapper.offsetWidth),
          gutter: wrapper.offsetWidth - wrapper.clientWidth,
          tableShort: Math.round(content - table.offsetWidth),
        };
      })`);
    // Tiers and Hues, then one contrast record per profile and scheme, each table as wide as its
    // panel's content.
    expect(wrappers.map(({ name }) => name)).toEqual([
      "Tiers",
      "Hues",
      ...Object.keys(COLOR_PROFILES).flatMap((name) =>
        SCHEMES.map((scheme) => `contrast-${name}-${scheme}`),
      ),
    ]);
    expect(wrappers).toEqual(
      wrappers.map(({ name }) => ({ name, wrapperShort: 0, gutter: 0, tableShort: 0 })),
    );
  });

  test("tiles its embedded samples evenly: equal tiles, samples on one bottom edge, names on one line", async () => {
    for (const viewport of [DESKTOP, PHONE]) {
      const page = await open(specimen, { scheme: "light", viewport });
      // Per row of tiles: each tile's height, its sample's bottom edge, and its name's top.
      const rows = await page.evaluate(`[...document.querySelectorAll("#embedded .tiles")]
        .flatMap((tiles) => {
          const rows = new Map();
          for (const tile of tiles.children) {
            const box = tile.getBoundingClientRect();
            const top = Math.round(box.top);
            if (!rows.has(top)) rows.set(top, []);
            rows.get(top).push([
              Math.round(box.height),
              Math.round(tile.querySelector(".tile-sample > *").getBoundingClientRect().bottom),
              Math.round(tile.querySelector(".tile-name").getBoundingClientRect().top),
            ]);
          }
          return [...rows.values()];
        })`);
      expect(rows.length).toBeGreaterThan(3);
      for (const row of rows) {
        for (const index of [0, 1, 2]) {
          expect(new Set(row.map((tile) => tile[index])).size).toBe(1);
        }
      }
      // Every tile's sample area is one height, so rows match from cell to cell.
      expect(new Set(rows.map((row) => row[0][0])).size).toBe(1);
    }
  });

  test("opens each section on a plain h2, and each subsection on a full-width banner on the first elevated surface", async () => {
    for (const scheme of SCHEMES) {
      const page = await open(specimen, { scheme, viewport: DESKTOP });
      // Every computed property of each section's heading that differs from a plain h2's, one
      // the elements layer alone styles, opening a header in a section outside main as the
      // specimen's do inside it. Only the properties a box's size resolves are left out.
      const unlike = await page.evaluate(`(() => {
        const plain = document.createElement("section");
        plain.innerHTML = "<header><h2>Heading</h2></header>";
        document.body.append(plain);
        const reference = getComputedStyle(plain.querySelector("h2"));
        const sized = new Set(["width", "height", "inline-size", "block-size",
          "perspective-origin", "transform-origin"]);
        const unlike = [...document.querySelectorAll("main > section > header > h2")]
          .map((h2) => {
            const style = getComputedStyle(h2);
            return [h2.textContent, [...reference]
              .filter((name) => !sized.has(name)
                && style.getPropertyValue(name) !== reference.getPropertyValue(name))];
          });
        plain.remove();
        return unlike;
      })()`);
      expect(unlike.length).toBe(5);
      for (const [name, properties] of unlike) {
        expect([scheme, name, properties]).toEqual([scheme, name, []]);
      }
    }
    const page = await open(specimen, { scheme: "light", viewport: DESKTOP });
    const banners = await page.evaluate(`[...document.querySelectorAll("main > section > section")]
      .map((section) => [section, section.querySelector(":scope > h3, :scope > header > h3")])
      .map(([section, heading]) => {
        const [outer, inner] = [section.getBoundingClientRect(), heading.getBoundingClientRect()];
        return [section.id, Math.round(outer.width - inner.width),
          getComputedStyle(heading).backgroundColor];
      })`);
    expect(banners.length).toBeGreaterThan(10);
    for (const [id, short, fill] of banners) {
      expect([id, short, fill]).toEqual([id, 0, COLORS["--bg-1"][0]]);
    }
  });

  // panels resolves, per grid of cells, its cells' rows: each row the left edge and width of its
  // cells, with the grid's content width, and whether each row starts where the last ended.
  const panels = (page) =>
    page.evaluate(`[...document.querySelectorAll(".cells")].map((grid) => {
      const rows = new Map();
      for (const cell of grid.children) {
        const box = cell.getBoundingClientRect();
        const top = Math.round(box.top);
        if (!rows.has(top)) rows.set(top, []);
        rows.get(top).push(box);
      }
      const tops = [...rows.keys()];
      const bottoms = [...rows.values()].map((boxes) =>
        Math.round(Math.max(...boxes.map((box) => box.bottom))));
      const style = getComputedStyle(grid);
      const content = grid.clientWidth - Number.parseFloat(style.paddingLeft)
        - Number.parseFloat(style.paddingRight);
      return {
        cells: grid.children.length,
        columns: Math.max(...[...rows.values()].map((boxes) => boxes.length)),
        filled: [...rows.values()].map((boxes) =>
          Math.round(boxes.reduce((sum, box) => sum + box.width, 0) - content)),
        stacked: tops.slice(1).every((top, index) => top === bottoms[index]),
      };
    })`);

  test("lays its samples out in gapless panels, two cells wide on a wide display and one on a phone", async () => {
    const page = await open(specimen, { scheme: "light", viewport: DESKTOP });
    const wide = await panels(page);
    expect(wide.length).toBeGreaterThan(10);
    // Every row fills its grid edge to edge, cells meeting with no gap, and each row starts
    // where the one above it ends.
    for (const grid of wide) {
      expect(grid.columns).toBe(Math.min(2, grid.cells));
      expect(new Set(grid.filled)).toEqual(new Set([0]));
      expect(grid.stacked).toBe(true);
    }
    await page.setViewport(PHONE);
    for (const grid of await panels(page)) {
      expect(grid.columns).toBe(1);
      expect(new Set(grid.filled)).toEqual(new Set([0]));
      expect(grid.stacked).toBe(true);
    }
  });

  for (const scheme of SCHEMES) {
    test(`fits a phone's width with no horizontal page scroll, in ${scheme}`, async () => {
      const page = await open(specimen, { scheme, viewport: PHONE });
      expect(
        await page.evaluate(`document.documentElement.scrollWidth
          <= document.documentElement.clientWidth`),
      ).toBe(true);
    });
  }

  test("sets each input type's name beside its control, in one column of controls per grid", async () => {
    const page = await open(specimen, { scheme: "light", viewport: DESKTOP });
    const grids = await page.evaluate(`[...document.querySelectorAll("#forms .form-grid")]
      .map((grid) => [...grid.querySelectorAll(":scope > label")].map((label) => {
        const [name, control] = [label.getBoundingClientRect(),
          label.control.getBoundingClientRect()];
        return { name: label.textContent, beside: name.right <= control.left,
          row: name.top < control.bottom && control.top < name.bottom,
          left: Math.round(control.left) };
      }))`);
    expect(grids.length).toBe(2);
    for (const rows of grids) {
      expect(rows.length).toBeGreaterThan(5);
      for (const { name, beside, row } of rows) {
        expect([name, beside, row]).toEqual([name, true, true]);
      }
      expect(new Set(rows.map(({ left }) => left)).size).toBe(1);
    }
    // Every type that takes a value has its row.
    const named = grids[0].map(({ name }) => name);
    for (const type of ["text", "email", "date", "datetime-local", "color", "file"]) {
      expect(named).toContain(type);
    }
  });

  test("groups the choices in a fieldset of their own, and the button inputs in one row", async () => {
    const page = await open(specimen, { scheme: "light", viewport: DESKTOP });
    const groups = await page.evaluate(`(() => {
      const kinds = (selector) => [...new Set([...document.querySelectorAll(selector)]
        .map((input) => input.closest("fieldset")))]
        .map((fieldset) => [...new Set([...fieldset.querySelectorAll("input")]
          .map((input) => input.type))].sort());
      const actions = [...document.querySelectorAll(
        "#forms input:is([type=submit], [type=reset], [type=button], [type=image])")]
        .map((input) => input.getBoundingClientRect());
      const center = (box) => Math.round((box.top + box.bottom) / 2);
      return {
        choices: kinds("#forms input:is([type=radio], [type=checkbox])"),
        actions: kinds("#forms input[type=submit]"),
        row: actions.every((box) => Math.abs(center(box) - center(actions[0])) <= 1),
      };
    })()`);
    expect(groups).toEqual({
      choices: [["checkbox", "radio"]],
      actions: [["button", "image", "reset", "submit"]],
      row: true,
    });
  });

  test("its embedded content loads nothing from the network, and its frame follows the page's scheme", async () => {
    for (const scheme of SCHEMES) {
      const page = await open(specimen, { scheme });
      const read = await page.evaluate(`(() => {
        const frame = document.querySelector("#embedded iframe").contentWindow;
        return {
          fetched: performance.getEntriesByType("resource").map((entry) => entry.name)
            .filter((name) => !name.startsWith("file:")),
          dark: frame.matchMedia("(prefers-color-scheme: dark)").matches,
          // The frame's own ground, as the mean of its channels: dark in dark, light in light.
          ground: frame.getComputedStyle(frame.document.body).backgroundColor
            .match(/\\d+/g).slice(0, 3).reduce((sum, c) => sum + Number(c), 0) / 3,
        };
      })()`);
      const { ground, ...rest } = read;
      expect([scheme, rest, scheme === "dark" ? ground < 64 : ground > 192]).toEqual([
        scheme,
        { fetched: [], dark: scheme === "dark" },
        true,
      ]);
    }
  });

  // pairs resolves, per profile in order, the boxes of the light and dark containers matching
  // selector inside within: [name, light box, dark box], each box [left, top, right, bottom].
  const pairs = (page, within, selector) =>
    page.evaluate(`(() => {
      const boxes = [...document.querySelectorAll(${JSON.stringify(`${within} ${selector}`)})]
        .map((el) => el.closest("[data-palette]"));
      const names = [...new Set(boxes.map((el) => el.dataset.palette))];
      return names.map((name) => [name, ...["light", "dark"].map((scheme) => {
        const box = boxes.find((el) => el.dataset.palette === name
          && el.dataset.scheme === scheme).getBoundingClientRect();
        return [box.left, box.top, box.right, box.bottom].map(Math.round);
      })]);
    })()`);

  // expectRows expects, at a desktop width, each profile's light and dark containers to share a
  // row, light first, each profile's row below the last; and at a phone's, dark under light.
  async function expectRows(page, within, selector) {
    await page.setViewport(DESKTOP);
    const wide = await pairs(page, within, selector);
    expect(wide.map(([name]) => name)).toEqual(Object.keys(COLOR_PROFILES));
    for (const [index, [name, light, dark]] of wide.entries()) {
      expect([name, dark[1] === light[1], light[2] <= dark[0]]).toEqual([name, true, true]);
      if (index > 0) expect([name, light[1] >= wide[index - 1][1][3]]).toEqual([name, true]);
    }
    await page.setViewport(PHONE);
    for (const [name, light, dark] of await pairs(page, within, selector)) {
      expect([name, dark[1] >= light[3], dark[0] === light[0]]).toEqual([name, true, true]);
    }
  }

  test("compares every profile in a grid of preview cards, a row per profile, light beside dark", async () => {
    const page = await open(specimen, { scheme: "light" });
    const cards = await page.evaluate(`[...document.querySelectorAll("#profiles .preview-card")]
      .map((card) => [card.dataset.palette, card.dataset.scheme])`);
    expect(cards).toEqual(
      Object.keys(COLOR_PROFILES).flatMap((name) => SCHEMES.map((scheme) => [name, scheme])),
    );
    await expectRows(page, "#profiles", ".preview-card");
  });

  test("its comparison grid's cards are the preview fixture's, markup for markup", async () => {
    const markup = async (url) =>
      (
        await (
          await open(url, { scheme: "light" })
        ).evaluate(`[...document.querySelectorAll(".preview-card")].map((card) => card.outerHTML)`)
      ).map(squash);
    expect(await markup(specimen)).toEqual(await markup(previewFixture));
  });

  test("records contrast a row per profile, its light and dark records side by side", async () => {
    const page = await open(specimen, { scheme: "light" });
    await expectRows(page, "#contrast", "table");
  });

  test("shows every tools class in a labeled cell", async () => {
    const page = await open(specimen, { scheme: "light" });
    for (const name of TOOLS) {
      const labeled = await page.evaluate(`(() => {
        const samples = [...document.querySelectorAll("#tools .${name}")];
        return samples.length > 0 &&
          samples.every((el) => el.closest(".cell")?.querySelector(":scope > .label"));
      })()`);
      expect([name, labeled]).toEqual([name, true]);
    }
    // The variants show on a native button and on a link with the base class.
    for (const hue of Object.keys(HUES)) {
      const variant = `button-${hue.slice(2)}`;
      const shown = await page.evaluate(`[
        !!document.querySelector("#tools button.${variant}:not(.button)"),
        !!document.querySelector("#tools a.button.${variant}"),
      ]`);
      expect([variant, shown]).toEqual([variant, [true, true]]);
    }
  });

  // Contrast is graded only where legibility matters, text over a color: each profile records
  // a matrix per scheme, with a row per text token and hue and a column per surface, and a
  // surface gets no ratio of its own.
  test("the contrast records' legend defines each mark they use", async () => {
    const page = await open(specimen, { scheme: "light" });
    const legend = await page.evaluate(`[...document.querySelectorAll("#contrast-legend dt")]
      .map((dt) => dt.textContent.trim())`);
    expect(legend).toEqual(Object.keys(MARKS));
    const used =
      await page.evaluate(`[...new Set([...document.querySelectorAll("#contrast td span")]
      .map((span) => span.textContent))]`);
    expect(used.filter((name) => !legend.includes(name))).toEqual([]);
  });

  test("records contrast for every profile in each scheme, each in a container naming both", async () => {
    const page = await open(specimen, { scheme: "light" });
    const records = await page.evaluate(`[...document.querySelectorAll("#contrast table")]
      .map((table) => {
        const scope = table.closest("[data-palette]");
        return [table.id, scope?.dataset.palette, scope?.dataset.scheme];
      })`);
    expect(records).toEqual(
      Object.keys(COLOR_PROFILES).flatMap((name) =>
        SCHEMES.map((scheme) => [`contrast-${name}-${scheme}`, name, scheme]),
      ),
    );
  });

  for (const name of Object.keys(COLOR_PROFILES)) {
    for (const [index, scheme] of SCHEMES.entries()) {
      const table = `#contrast-${name}-${scheme}`;

      test(`${name}'s ${scheme} contrast record grades every text token and hue over every surface`, async () => {
        const page = await open(specimen, { scheme: "light" });
        const rows = await page.evaluate(`[...document.querySelectorAll("${table} tbody th code")]
          .map((code) => code.textContent)`);
        const columns =
          await page.evaluate(`[...document.querySelectorAll("${table} thead th code")]
          .map((code) => code.textContent)`);
        // Exact matches, in order, so a new color token without a row or a column fails.
        expect(rows).toEqual(TEXT);
        expect(columns).toEqual(SURFACES);
      });

      test(`${name}'s ${scheme} contrast record matches each ratio recomputed in chromium`, async () => {
        // The system scheme is the other one: the record's container forces its own.
        const page = await open(specimen, { scheme: SCHEMES[1 - index] });
        // The record is static: each cell is the ratio as written, then its mark.
        const cells = await page.evaluate(`[...document.querySelectorAll("${table} tbody tr")]
          .flatMap((row) => [...row.cells].slice(1).map((cell, column) => ({
            text: row.querySelector("th code").textContent,
            surface: ${JSON.stringify(SURFACES)}[column],
            ratio: cell.firstChild.textContent.trim(),
            mark: cell.querySelector("span")?.textContent,
          })))`);
        expect(cells.length).toBe(TEXT.length * SURFACES.length);
        // Each token resolves, inside the record's container, to the profile's value in this
        // scheme.
        const colors = await resolveColors(page, table);
        expect(colors).toEqual(profileRgb(name, index));
        for (const { text, surface, ...cell } of cells) {
          const ratio = contrast(colors[text], colors[surface]);
          expect([text, surface, cell]).toEqual([
            text,
            surface,
            { ratio: ratio.toFixed(2), mark: mark(ratio) },
          ]);
        }
      });
    }
  }

  for (const ratio of ["9:16", "1:1"]) {
    test(`the contrast records scroll inside their wrappers, not the page, at ${ratio}, small`, async () => {
      const page = await open(specimen, { scheme: "light", viewport: display(ratio, "small") });
      const boxes = await page.evaluate(`[...document.querySelectorAll("#contrast table")]
        .map((table) => {
          const wrapper = table.parentElement;
          return {
            wrapped: wrapper.matches(".scroll-x"),
            inside: wrapper.getBoundingClientRect().right <= document.documentElement.clientWidth,
          };
        })`);
      expect(boxes).toEqual(
        Object.keys(COLOR_PROFILES).flatMap(() =>
          SCHEMES.map(() => ({ wrapped: true, inside: true })),
        ),
      );
      expect(
        await page.evaluate(`document.querySelector("#contrast").scrollWidth
        <= document.querySelector("#contrast").clientWidth`),
      ).toBe(true);
    });
  }

  // ADDED_PROBES are the token each facet's profiles past the default set apart from it.
  const ADDED_PROBES = { color: "--bg", space: "--radius-base", type: "--font-heading" };

  test("renders the same from file:// and from a server under a project subpath", async () => {
    const local = await open(specimen, { scheme: "light" });
    const served = await open(server.url, { scheme: "light" });
    // The page's own location: the view's URL follows the last frame to navigate, and the
    // specimen's embedded frames navigate after the page.
    expect(await served.evaluate("location.href")).toBe(server.url);
    // Equal fingerprints prove nothing if the stylesheet, or one of its layer files, failed to
    // load in both.
    for (const page of [local, served]) expect(await layersLoaded(page)).toEqual(LOADED);
    // Nor if the full entry's profiles past each facet's default failed to load in both: a scope
    // added after the fingerprints resolves a token its own profile sets.
    const added = Object.entries(ADDED).flatMap(([facet, names]) =>
      names.map((name) => [FACET_PROFILES[facet].attribute, name, ADDED_PROBES[facet]]),
    );
    const scoped = `${JSON.stringify(added)}.map(([attribute, name, token]) => {
      const el = document.body.appendChild(document.createElement("div"));
      el.setAttribute(attribute, name);
      return getComputedStyle(el).getPropertyValue(token).trim().replace(/\\s+/g, " ");
    })`;
    const backgrounds = added.map(([, name, token]) => {
      if (token !== "--bg") return (SPACE_PROFILES[name] ?? TYPE_PROFILES[name])[token];
      const [[, light], [, dark]] = COLOR_PROFILES[name].tokens["--bg"];
      return `light-dark(${light}, ${dark})`;
    });
    expect(await served.fingerprint()).toEqual(await local.fingerprint());
    for (const page of [local, served]) expect(await page.evaluate(scoped)).toEqual(backgrounds);
  });
});
