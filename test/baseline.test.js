import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileUrl, openPage, serve } from "./harness.js";
import { LAYERS, LOADED, layerPath, layersLoaded, PACKAGE } from "./layers.js";

const root = dirname(import.meta.dir);
const specimen = fileUrl(join(root, "index.html"));
const fixture = fileUrl(join(import.meta.dir, "fixtures", "baseline.html"));
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

const SANS =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif';
const MONO =
  'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace';

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

// FLUID are the fluid tokens, name to [smallest, largest] value in rem: the space base and each
// step's multiple of it, and each text step from 1rem × 1.2^n to 1.125rem × 1.25^n, rounded to
// the four decimals the type facet states them in.
const FLUID = {
  "--space-base": SPACE_BASE,
  ...Object.fromEntries(
    Object.entries(SPACE_STEPS).map(([name, k]) => [name, SPACE_BASE.map((rem) => rem * k)]),
  ),
  ...Object.fromEntries(
    Object.entries(TEXT_STEPS).map(([name, n]) => [
      name,
      [1.2 ** n, 1.125 * 1.25 ** n].map((rem) => Number(rem.toFixed(4))),
    ]),
  ),
};

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
  "--measure": "length",
};

// FIXED are the type and space tokens no display size changes, name to declared value.
const FIXED = {
  "--font-body": SANS,
  "--font-heading": MONO,
  "--font-ui": MONO,
  "--font-code": MONO,
  "--leading-body": "1.5",
  "--leading-heading": "1.2",
  "--leading-ui": "1.25",
  "--leading-code": "1.5",
  "--measure": "68ch",
  "--line-s": "1px",
  "--line-m": "2px",
  "--radius-base": "0.375rem",
  "--radius-full": "9999px",
};

// rgb converts a #rrggbb hex to the rgb() a computed color reads as.
const rgb = (hex) =>
  `rgb(${[1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)).join(", ")})`;

// TIERS are the surface, border and text tokens, name to Flexoki's [light, dark] values.
const TIERS = {
  "--bg": ["#fffcf0", "#100f0f"],
  "--bg-2": ["#f2f0e5", "#1c1b1a"],
  "--border": ["#e6e4d9", "#282726"],
  "--border-2": ["#dad8ce", "#343331"],
  "--border-3": ["#cecdc3", "#403e3c"],
  "--fg": ["#100f0f", "#e6e4d9"],
  "--fg-2": ["#575653", "#b7b5ac"],
  "--fg-3": ["#878580", "#6f6e69"],
};

// HUES are the hue tokens, each named for its color, name to Flexoki's [light, dark] values: its
// 600 step in light, its 400 step in dark.
const HUES = {
  "--red": ["#af3029", "#d14d41"],
  "--orange": ["#bc5215", "#da702c"],
  "--yellow": ["#ad8301", "#d0a215"],
  "--green": ["#66800b", "#879a39"],
  "--cyan": ["#24837b", "#3aa99f"],
  "--blue": ["#205ea6", "#4385be"],
  "--purple": ["#5e409d", "#8b7ec8"],
  "--magenta": ["#a02f6f", "#ce5d97"],
};

// SURFACES are the color tokens text sits over, the contrast matrices' columns, in order.
const SURFACES = ["--bg", "--bg-2", "--border", "--border-2", "--border-3"];

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

// RETIRED are the v0.1.0 and v0.2.0 token names the facets dropped: the color tiers, the role
// tokens, and herald's text tiers; herald's numbered space steps, its font stacks, and the text
// steps the type facet renamed. None may be declared or read anywhere in the working tree. The
// kept text names (--text-xs, --text-xl, --text-2xl to --text-4xl) are not among them.
const RETIRED = [
  "--bg-1",
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
];

// SOURCES are the working tree's CSS: the stylesheet, its layer files, the specimen and its
// pinned page, whose style elements read the tokens too, and the test fixtures.
const SOURCES = [
  "baseline.css",
  ...LAYERS.map(layerPath),
  "index.html",
  "pinned/v0.3.0.html",
  "test/fixtures/baseline.html",
  "test/fixtures/index.html",
];

// TOOLS are the tools classes: v0.2.0's scroll helpers.
const TOOLS = ["scroll-y", "scroll-x"];

// rootTokens resolves to every custom property declared on :root, name to computed value.
function rootTokens(page) {
  return page.evaluate(`(() => {
    const style = getComputedStyle(document.documentElement);
    return Object.fromEntries([...style].filter((name) => name.startsWith("--"))
      .map((name) => [name, style.getPropertyValue(name).trim()]));
  })()`);
}

// resolveColor resolves to the color a color token computes to on an element in the page.
function resolveColor(page, token) {
  return page.evaluate(`(() => {
    const probe = document.body.appendChild(document.createElement("i"));
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

// mark is the mark a contrast ratio earns in the specimen's matrices: AA at 4.5 for body text,
// AA large at 3 for large text, fail below 3.
function mark(ratio) {
  if (ratio >= 4.5) return "AA";
  if (ratio >= 3) return "AA large";
  return "fail";
}

// layerSheet resolves to a page-side expression for the sheet a nested layer's import loads,
// from the baseline linked by a page served over http, since chromium hides a file:// stylesheet's
// rules from the page.
function layerSheet(layer) {
  return `[...[...document.styleSheets].find((s) => s.href?.endsWith("/baseline.css")).cssRules]
    .find((r) => r.layerName === ${JSON.stringify(`${PACKAGE}.${layer}`)}).styleSheet`;
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
  test("the stylesheet declares the package layer's nested layers, then imports each one's file", async () => {
    // Over http, since chromium hides a file:// stylesheet's rules from the page.
    const page = await open(server.url, { scheme: "light" });
    const rules = await page.evaluate(`(() => {
      const sheet = [...document.styleSheets].find((s) => s.href?.endsWith("/baseline.css"));
      return [...sheet.cssRules].map((rule) => ({
        type: rule.constructor.name,
        names: rule.nameList && [...rule.nameList],
        layer: rule.layerName,
        href: rule.href,
        // An import whose file failed to load has a sheet with no rules.
        loaded: rule.styleSheet ? rule.styleSheet.cssRules.length > 0 : undefined,
      }));
    })()`);
    // An exact match: the root holds the statement and one import per nested layer, each
    // straight into its layer, and no rule of its own.
    const nested = LAYERS.map((layer) => `${PACKAGE}.${layer}`);
    expect(rules).toEqual([
      { type: "CSSLayerStatementRule", names: nested },
      ...LAYERS.map((layer, index) => ({
        type: "CSSImportRule",
        layer: nested[index],
        href: `./${layerPath(layer)}`,
        loaded: true,
      })),
    ]);
  });

  test("every layer file is imported one hop deep: no layer file imports another", async () => {
    const page = await open(server.url, { scheme: "light" });
    const imports = await page.evaluate(
      `[${LAYERS.map(
        (layer) => `[...${layerSheet(layer)}.cssRules].filter((r) => r.href !== undefined).length`,
      )}]`,
    );
    expect(imports).toEqual(LAYERS.map(() => 0));
  });

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

  test("the fonts, leadings, measure, lines and radius base carry their declared values", async () => {
    const page = await open(specimen, { scheme: "light" });
    const tokens = await rootTokens(page);
    for (const [name, value] of Object.entries(FIXED)) {
      expect([name, squash(tokens[name])]).toEqual([name, value]);
    }
  });

  for (const [index, scheme] of ["light", "dark"].entries()) {
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
      const { names, reads } = await page.evaluate(`(() => {
        const names = [];
        const reads = [];
        const walk = (rules) => {
          for (const rule of rules) {
            if (rule.style) {
              for (const name of rule.style) {
                if (!name.startsWith("--")) continue;
                names.push(name);
                const value = rule.style.getPropertyValue(name);
                reads.push(...[...value.matchAll(/var\\((--[\\w-]+)/g)].map((m) => m[1]));
              }
            }
            if (rule.cssRules) walk(rule.cssRules);
          }
        };
        walk(${layerSheet(facet)}.cssRules);
        return { names, reads };
      })()`);
      expect(names.sort()).toEqual(Object.keys(tokens).sort());
      // A facet that read another facet's token would change when that facet's profile swaps.
      expect(reads.filter((name) => !(name in tokens))).toEqual([]);
    });
  }

  test("the color facet holds sixteen tokens", () => {
    expect(Object.keys(COLORS)).toHaveLength(16);
  });

  test("every fluid token's bounds are rem, never px, and it interpolates with progress()", async () => {
    const page = await open(server.url, { scheme: "light" });
    const declared = await page.evaluate(`(() => {
      const declared = {};
      for (const sheet of [${["tokens.space", "tokens.type"].map(layerSheet)}]) {
        for (const rule of sheet.cssRules) {
          for (const name of rule.style ?? []) declared[name] = rule.style.getPropertyValue(name);
        }
      }
      return declared;
    })()`);
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

  test("no v0.1.0 or v0.2.0 token name remains in the working tree's CSS", async () => {
    for (const path of SOURCES) {
      const text = await Bun.file(join(root, path)).text();
      // A name ends where the next character can't continue it, so --bg-1 never matches --bg-10.
      const found = RETIRED.filter((name) => new RegExp(`${name}(?![\\w-])`).test(text));
      expect([path, found]).toEqual([path, []]);
    }
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

  for (const [index, forced] of ["light", "dark"].entries()) {
    for (const scheme of ["light", "dark"]) {
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

  for (const [index, scheme] of ["light", "dark"].entries()) {
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

  test("makes media blocks no wider than their container", async () => {
    const page = await open(fixture, { scheme: "light" });
    for (const selector of ["img", "picture", "video", "canvas", "svg"]) {
      expect(await page.style(selector, "display")).toBe("block");
      expect(await page.style(selector, "max-width")).toBe("100%");
    }
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

describe("elements", () => {
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
      ["#prose h3", "--leading-heading"],
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
        "#prose h1": "--text-4xl",
        "#prose h2": "--text-3xl",
        "#prose h3": "--text-2xl",
        "#prose h4": "--text-xl",
        "#prose h5": "--text-l",
        "#prose h6": "--text-m",
      };
      for (const [selector, token] of Object.entries(sizes)) {
        const size = Number.parseFloat(await page.style(selector, "font-size"));
        expect([selector, size]).toEqual([
          selector,
          expect.closeTo(fluid(FLUID[token], viewport), 2),
        ]);
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
    expect(await page.style("#prose table", "border-collapse")).toBe("collapse");
    for (const cell of ["th", "td"]) {
      expect(await page.style(`#prose ${cell}`, "border-top")).toBe(`1px solid ${divider}`);
    }
    expect(await page.style("#prose blockquote", "border-left")).toBe(`2px solid ${divider}`);
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

  test("spaces adjacent prose blocks", async () => {
    // Above the range, so --space-s is its largest value, 18px.
    const page = await open(specimen, { scheme: "light", viewport: display("16:9", "large") });
    expect(await page.style("#prose h1", "margin-top")).toBe("18px");
    expect(await page.style("#prose hr + p", "margin-top")).toBe("18px");
  });

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
    const styles = (await page.fingerprint(["box-shadow", "background-image"])).map(([, s]) => s);
    expect(new Set(styles.map((s) => s["box-shadow"]))).toEqual(new Set(["none"]));
    expect(new Set(styles.map((s) => s["background-image"]))).toEqual(new Set(["none"]));
  });
});

describe("tools", () => {
  test("the tools layer styles exactly the tools classes", async () => {
    // Over http, since chromium hides a file:// stylesheet's rules from the page.
    const page = await open(server.url, { scheme: "light" });
    const classes = await page.evaluate(`(() => {
      const selectors = [];
      const walk = (rules) => {
        for (const rule of rules) {
          if (rule.selectorText) selectors.push(rule.selectorText);
          if (rule.cssRules) walk(rule.cssRules);
        }
      };
      walk(${layerSheet("tools")}.cssRules);
      return [...new Set(selectors.join(" ").match(/\\.[\\w-]+/g))].map((c) => c.slice(1));
    })()`);
    expect(classes.sort()).toEqual([...TOOLS].sort());
  });

  test("no other layer styles a class", async () => {
    const page = await open(server.url, { scheme: "light" });
    const others = LAYERS.filter((layer) => layer !== "tools");
    const selectors = await page.evaluate(`(() => {
      const selectors = [];
      const walk = (rules) => {
        for (const rule of rules) {
          if (rule.selectorText) selectors.push(rule.selectorText);
          if (rule.cssRules) walk(rule.cssRules);
        }
      };
      for (const sheet of [${others.map(layerSheet)}]) walk(sheet.cssRules);
      return selectors;
    })()`);
    expect(selectors.length).toBeGreaterThan(0);
    expect(selectors.filter((selector) => /\.[A-Za-z_-]/.test(selector))).toEqual([]);
  });

  test("scroll-y and scroll-x scroll their overflow on one axis", async () => {
    // Below the range, so --space-2xs is its smallest value, 8px.
    const page = await open(specimen, { scheme: "light", viewport: display("9:16", "small") });
    for (const [axis, overflow, size, padding] of [
      ["y", "overflow-y", "Height", "padding-right"],
      ["x", "overflow-x", "Width", "padding-bottom"],
    ]) {
      const selector = `#tools .scroll-${axis}`;
      expect(await page.style(selector, overflow)).toBe("auto");
      expect(await page.style(selector, "scrollbar-gutter")).toBe("stable");
      expect(await page.style(selector, padding)).toBe("8px");
      const scrolled = await page.evaluate(`(() => {
        const el = document.querySelector(${JSON.stringify(selector)});
        el.scroll${axis === "y" ? "Top" : "Left"} = 10;
        return el.scroll${size} > el.client${size} && el.scroll${axis === "y" ? "Top" : "Left"};
      })()`);
      expect([axis, scrolled]).toEqual([axis, 10]);
    }
  });
});

describe("specimen", () => {
  test("shows every token with a sample that resolves it", async () => {
    const page = await open(specimen, { scheme: "light" });
    const shown = await page.evaluate(`[...document.querySelectorAll("#tokens .specimen > code")]
      .map((code) => [code.textContent, code.nextElementSibling.style.getPropertyValue("--sample")])`);
    expect(shown.map(([name]) => name).sort()).toEqual(Object.keys(TOKENS).sort());
    for (const [name, sample] of shown) expect(sample).toBe(`var(${name})`);
  });

  test("shows every tier and hue with its light and dark values", async () => {
    const page = await open(specimen, { scheme: "light" });
    const shown = await page.evaluate(`[...document.querySelectorAll("#tokens .colors > code")]
      .map((code) => [code.textContent, code.nextElementSibling.nextElementSibling.textContent])`);
    expect(Object.fromEntries(shown)).toEqual(
      Object.fromEntries(
        Object.entries({ ...TIERS, ...HUES }).map(([name, [light, dark]]) => [
          name,
          `${light} / ${dark}`,
        ]),
      ),
    );
  });

  test("shows every prose element the elements layer styles", async () => {
    const page = await open(specimen, { scheme: "light" });
    const tags = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "a", "ul", "ol", "li", "blockquote"];
    tags.push("pre", "code", "kbd", "table", "th", "td", "hr");
    for (const tag of tags) {
      expect(await page.evaluate(`!!document.querySelector("#prose ${tag}")`)).toBe(true);
    }
  });

  test("shows every tools class", async () => {
    const page = await open(specimen, { scheme: "light" });
    for (const name of TOOLS) {
      expect([name, await page.evaluate(`!!document.querySelector("#tools .${name}")`)]).toEqual([
        name,
        true,
      ]);
    }
  });

  // Contrast is graded only where legibility matters, text over a color: each scheme's matrix
  // has a row per text token and hue and a column per surface, and a surface gets no ratio of
  // its own.
  for (const scheme of ["light", "dark"]) {
    test(`the ${scheme} contrast matrix grades every text token and hue over every surface`, async () => {
      const page = await open(specimen, { scheme: "light" });
      const table = `#contrast-${scheme}`;
      const rows = await page.evaluate(`[...document.querySelectorAll("${table} tbody th code")]
        .map((code) => code.textContent)`);
      const columns = await page.evaluate(`[...document.querySelectorAll("${table} thead th code")]
        .map((code) => code.textContent)`);
      // Exact matches, in order, so a new color token without a row or a column fails.
      expect(rows).toEqual(TEXT);
      expect(columns).toEqual(SURFACES);
      expect([...TEXT, ...SURFACES].sort()).toEqual(Object.keys(COLORS).sort());
    });
  }

  for (const [index, scheme] of ["light", "dark"].entries()) {
    test(`the ${scheme} contrast matrix matches each ratio recomputed in chromium`, async () => {
      const page = await open(specimen, { scheme });
      // The matrix is static: each cell is the ratio as written, then its mark.
      const cells =
        await page.evaluate(`[...document.querySelectorAll("#contrast-${scheme} tbody tr")]
        .flatMap((row) => [...row.cells].slice(1).map((cell, column) => ({
          text: row.querySelector("th code").textContent,
          surface: ${JSON.stringify(SURFACES)}[column],
          ratio: cell.firstChild.textContent.trim(),
          mark: cell.querySelector("span")?.textContent,
        })))`);
      expect(cells.length).toBe(TEXT.length * SURFACES.length);
      for (const { text, surface, ...cell } of cells) {
        const fg = await resolveColor(page, text);
        const bg = await resolveColor(page, surface);
        // The emulated scheme took: each token resolves to its value in this scheme.
        expect([fg, bg]).toEqual([COLORS[text][index], COLORS[surface][index]]);
        const ratio = contrast(fg, bg);
        expect([text, surface, cell]).toEqual([
          text,
          surface,
          { ratio: ratio.toFixed(2), mark: mark(ratio) },
        ]);
      }
    });
  }

  for (const ratio of ["9:16", "1:1"]) {
    test(`the contrast matrices scroll inside their wrappers, not the page, at ${ratio}, small`, async () => {
      const page = await open(specimen, { scheme: "light", viewport: display(ratio, "small") });
      const boxes = await page.evaluate(`[...document.querySelectorAll("#contrast table")]
        .map((table) => {
          const wrapper = table.parentElement;
          return {
            wrapped: wrapper.matches(".scroll-x"),
            inside: wrapper.getBoundingClientRect().right <= document.documentElement.clientWidth,
          };
        })`);
      expect(boxes).toEqual([
        { wrapped: true, inside: true },
        { wrapped: true, inside: true },
      ]);
      expect(
        await page.evaluate(`document.querySelector("#contrast").scrollWidth
        <= document.querySelector("#contrast").clientWidth`),
      ).toBe(true);
    });
  }

  test("renders the same from file:// and from a server under a project subpath", async () => {
    const local = await open(specimen, { scheme: "light" });
    const served = await open(server.url, { scheme: "light" });
    expect(served.view.url).toBe(server.url);
    // Equal fingerprints prove nothing if the stylesheet, or one of its layer files, failed to
    // load in both.
    for (const page of [local, served]) expect(await layersLoaded(page)).toEqual(LOADED);
    expect(await served.fingerprint()).toEqual(await local.fingerprint());
  });
});
