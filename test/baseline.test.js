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

// SCALES are herald's colorless tokens, name to declared value.
const SCALES = {
  "--font-sans": SANS,
  "--font-mono": MONO,
  "--space-1": "0.25rem",
  "--space-2": "0.5rem",
  "--space-3": "0.75rem",
  "--space-4": "1rem",
  "--space-5": "1.25rem",
  "--space-6": "1.5rem",
  "--space-8": "2rem",
  "--space-10": "2.5rem",
  "--space-12": "3rem",
  "--space-16": "4rem",
  "--text-xs": "0.75rem",
  "--text-sm": "0.875rem",
  "--text-base": "1rem",
  "--text-lg": "1.125rem",
  "--text-xl": "1.25rem",
  "--text-2xl": "1.5rem",
  "--text-3xl": "1.875rem",
  "--text-4xl": "2.25rem",
  "--radius-sm": "0.25rem",
  "--radius-md": "0.5rem",
  "--radius-lg": "0.75rem",
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

// COLORS are the color facet's tokens, name to the color each resolves to in light and in dark.
const COLORS = Object.fromEntries(
  Object.entries({ ...TIERS, ...HUES }).map(([name, pair]) => [name, pair.map(rgb)]),
);

// RETIRED are the v0.1.0 and v0.2.0 color token names the color facet dropped: their tiers, the
// role tokens, and herald's text tiers. None may be declared or read anywhere in the working tree.
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

// mark is the mark a contrast ratio earns in the specimen's table: AA at 4.5 for body text,
// AA large at 3 for large text and interface parts, fail below 3.
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
  test("declares exactly the scales, tiers and hues, without role, shadow and tint tokens", async () => {
    const page = await open(specimen, { scheme: "light" });
    const names = Object.keys(await rootTokens(page)).sort();
    // An exact match, so role tokens, shadow tokens, --*-bg tints, and bright, black, white or
    // ANSI hues cannot slip in.
    expect(names).toEqual([...Object.keys(SCALES), ...Object.keys(COLORS)].sort());
  });

  test("the font stacks and scales carry herald's values", async () => {
    const page = await open(specimen, { scheme: "light" });
    const tokens = await rootTokens(page);
    for (const [name, value] of Object.entries(SCALES)) expect(squash(tokens[name])).toBe(value);
  });

  for (const [index, scheme] of ["light", "dark"].entries()) {
    test(`every tier and hue resolves to its ${scheme} value`, async () => {
      const page = await open(specimen, { scheme });
      for (const [name, pair] of Object.entries(COLORS)) {
        expect([name, await resolveColor(page, name)]).toEqual([name, pair[index]]);
      }
    });
  }

  test("the color facet's layer declares exactly the sixteen tiers and hues", async () => {
    // Over http, since chromium hides a file:// stylesheet's rules from the page.
    const page = await open(server.url, { scheme: "light" });
    const names = await page.evaluate(`(() => {
      const names = [];
      const walk = (rules) => {
        for (const rule of rules) {
          if (rule.style) names.push(...[...rule.style].filter((name) => name.startsWith("--")));
          if (rule.cssRules) walk(rule.cssRules);
        }
      };
      walk(${layerSheet("tokens.color")}.cssRules);
      return names;
    })()`);
    expect(Object.keys(COLORS)).toHaveLength(16);
    expect(names.sort()).toEqual(Object.keys(COLORS).sort());
  });

  test("no v0.1.0 or v0.2.0 color token name remains in the working tree's CSS", async () => {
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
    const page = await open(fixture, { scheme: "light" });
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

  test("sets form controls in the mono stack", async () => {
    const page = await open(fixture, { scheme: "light" });
    for (const selector of ["button", "input", "select", "textarea", "option"]) {
      expect(await page.style(selector, "font-family")).toBe(MONO);
    }
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
  test("sets the body in the sans stack and code, pre and kbd in the mono stack", async () => {
    const page = await open(specimen, { scheme: "light" });
    expect(await page.style("body", "font-family")).toBe(SANS);
    for (const selector of ["pre", "code", "kbd"]) {
      expect(await page.style(selector, "font-family")).toBe(MONO);
    }
  });

  test("sets headings on the text scale", async () => {
    const page = await open(specimen, { scheme: "light" });
    const sizes = { h1: "36px", h2: "30px", h3: "24px", h4: "20px", h5: "18px", h6: "16px" };
    for (const [selector, size] of Object.entries(sizes)) {
      expect(await page.style(`#prose ${selector}`, "font-size")).toBe(size);
      expect(await page.style(`#prose ${selector}`, "font-weight")).toBe("600");
    }
  });

  test("styles links, lists, tables, blockquotes and rules in outline", async () => {
    const page = await open(specimen, { scheme: "light" });
    const [blue] = COLORS["--blue"];
    const [divider] = COLORS["--border"];
    expect(await page.style("#prose a", "color")).toBe(blue);
    expect(await page.style("#prose a", "text-decoration-line")).toBe("underline");
    expect(await page.style("#prose ul", "padding-inline-start")).toBe("24px");
    expect(await page.style("#prose ol", "padding-inline-start")).toBe("24px");
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
    const page = await open(specimen, { scheme: "light" });
    expect(await page.style("#prose h1", "margin-top")).toBe("16px");
    expect(await page.style("#prose hr + p", "margin-top")).toBe("16px");
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
    const page = await open(specimen, { scheme: "light" });
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
    const names = [...Object.keys(SCALES), ...Object.keys(COLORS)];
    expect(shown.map(([name]) => name).sort()).toEqual(names.sort());
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

  test("the contrast table has one row per tier and hue but --bg", async () => {
    const page = await open(specimen, { scheme: "light" });
    const rows = await page.evaluate(`[...document.querySelectorAll("#contrast tbody th code")]
      .map((code) => code.textContent)`);
    // An exact match, so a new color token without a row fails.
    expect([...rows].sort()).toEqual(
      Object.keys(COLORS)
        .filter((name) => name !== "--bg")
        .sort(),
    );
    expect(new Set(rows).size).toBe(rows.length);
  });

  for (const [index, scheme] of ["light", "dark"].entries()) {
    test(`the contrast table's ${scheme} column matches each ratio recomputed in chromium`, async () => {
      const page = await open(specimen, { scheme });
      // The table is static: each cell is the ratio as written, then its mark.
      const cells = await page.evaluate(`[...document.querySelectorAll("#contrast tbody tr")]
        .map((row) => {
          const cell = row.cells[${index + 1}];
          return {
            token: row.querySelector("th code").textContent,
            ratio: cell.firstChild.textContent.trim(),
            mark: cell.querySelector("span")?.textContent,
          };
        })`);
      const bg = await resolveColor(page, "--bg");
      expect(bg).toBe(COLORS["--bg"][index]);
      for (const { token, ...cell } of cells) {
        const ratio = contrast(await resolveColor(page, token), bg);
        expect([token, cell]).toEqual([token, { ratio: ratio.toFixed(2), mark: mark(ratio) }]);
      }
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
