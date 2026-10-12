import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileUrl, openPage, serve } from "./harness.js";
import { LAYERS, LOADED, layersLoaded } from "./layers.js";

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

// TIERS are the surface, divider and text tokens, name to Primer's [light, dark] values.
const TIERS = {
  "--bg": ["#ffffff", "#0d1117"],
  "--bg-1": ["#f6f8fa", "#151b23"],
  "--bg-2": ["#eff2f5", "#262c36"],
  "--divider": ["#d1d9e0", "#3d444d"],
  "--fg": ["#1f2328", "#f0f6fc"],
  "--fg-1": ["#59636e", "#9198a1"],
  "--fg-2": ["#818b98", "#656c76"],
};

// HUES are the hue tokens, each named for its color, name to Primer's [light, dark] values.
const HUES = {
  "--red": ["#c50d28", "#f27d83"],
  "--orange": ["#a24610", "#ed8326"],
  "--yellow": ["#805900", "#d3910d"],
  "--green": ["#2b6e3f", "#41b445"],
  "--cyan": ["#006a80", "#07ace4"],
  "--blue": ["#005fcc", "#4da0ff"],
  "--purple": ["#783ae4", "#b687f7"],
  "--magenta": ["#b12f79", "#e57bb2"],
};

// ROLES are the role tokens, name to the hue each aliases.
const ROLES = {
  "--accent": "--blue",
  "--success": "--green",
  "--warning": "--yellow",
  "--danger": "--red",
};

// COLORS are every color token, name to the color it resolves to in light and in dark; a role
// resolves to its hue's.
const COLORS = Object.fromEntries([
  ...Object.entries({ ...TIERS, ...HUES }).map(([name, pair]) => [name, pair.map(rgb)]),
  ...Object.entries(ROLES).map(([role, hue]) => [role, HUES[hue].map(rgb)]),
]);

// VARIANTS are the hues the button and badge variants take, as they did at v0.1.0.
const VARIANTS = ["blue", "green", "red", "yellow", "orange"];

// BADGE_TOKENS are the badge variants, class to the token it shows: one per hue and one per role.
const BADGE_TOKENS = Object.fromEntries(
  [...Object.keys(HUES), ...Object.keys(ROLES)].map((token) => [`badge-${token.slice(2)}`, token]),
);

// COMPONENTS are the component classes: herald's six and its button variants, as v0.1.0 shipped
// them, and a badge variant per hue and per role.
const BUTTONS = ["btn-blue", "btn-green", "btn-red", "btn-yellow", "btn-muted"];
const BADGES = Object.keys(BADGE_TOKENS);
const COMPONENTS = [
  "btn",
  ...BUTTONS,
  "card",
  "input",
  "label",
  "badge",
  ...BADGES,
  "scroll-y",
  "scroll-x",
];

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

// mark is the badge a contrast ratio earns in the specimen's table: AA at 4.5 for body text,
// AA large at 3 for large text and interface parts, fail below 3.
function mark(ratio) {
  if (ratio >= 4.5) return { text: "AA", badge: "badge-success" };
  if (ratio >= 3) return { text: "AA large", badge: "badge-warning" };
  return { text: "fail", badge: "badge-danger" };
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
  test("the stylesheet declares the four layers, then imports each one's file", async () => {
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
    // An exact match: the root holds the statement and the four imports, and no rule of its own.
    expect(rules).toEqual([
      { type: "CSSLayerStatementRule", names: LAYERS },
      ...LAYERS.map((layer) => ({
        type: "CSSImportRule",
        layer,
        href: `./layers/${layer}.css`,
        loaded: true,
      })),
    ]);
  });

  test("a page's app layer overrides components rules of equal and higher specificity", async () => {
    const page = await open(fixture, { scheme: "light" });
    expect(await page.style("#equal", "color")).toBe("rgb(0, 128, 0)");
    expect(await page.style("#specific", "color")).toBe("rgb(0, 128, 0)");
  });

  test("a page's app layer overrides the theme", async () => {
    const page = await open(fixture, { scheme: "light" });
    expect(await page.style("body", "background-color")).toBe("rgb(0, 0, 255)");
  });
});

describe("tokens", () => {
  test("declares exactly the scales, tiers, hues and roles, without shadow and tint tokens", async () => {
    const page = await open(specimen, { scheme: "light" });
    const names = Object.keys(await rootTokens(page)).sort();
    // An exact match, so shadow tokens, --*-bg tints, and bright, black, white or ANSI hues
    // cannot slip in.
    expect(names).toEqual([...Object.keys(SCALES), ...Object.keys(COLORS)].sort());
  });

  test("the font stacks and scales carry herald's values", async () => {
    const page = await open(specimen, { scheme: "light" });
    const tokens = await rootTokens(page);
    for (const [name, value] of Object.entries(SCALES)) expect(squash(tokens[name])).toBe(value);
  });

  for (const [index, scheme] of ["light", "dark"].entries()) {
    test(`every tier, hue and role resolves to its ${scheme} value`, async () => {
      const page = await open(specimen, { scheme });
      for (const [name, pair] of Object.entries(COLORS)) {
        expect([name, await resolveColor(page, name)]).toEqual([name, pair[index]]);
      }
    });
  }

  test("a role follows an app layer's override of its hue", async () => {
    const page = await open(specimen, { scheme: "light" });
    await addAppStyle(page, "@layer app { :root { --blue: rgb(1, 2, 3); } }");
    expect(await resolveColor(page, "--blue")).toBe("rgb(1, 2, 3)");
    expect(await resolveColor(page, "--accent")).toBe("rgb(1, 2, 3)");
    // The other roles keep their own hues.
    for (const role of ["--success", "--warning", "--danger"]) {
      expect([role, await resolveColor(page, role)]).toEqual([role, COLORS[role][0]]);
    }
  });

  test("with no data-theme the page follows a live change of the system scheme", async () => {
    const page = await open(specimen, { scheme: "dark" });
    expect(await page.evaluate("document.documentElement.hasAttribute('data-theme')")).toBe(false);
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

  for (const [index, theme] of ["light", "dark"].entries()) {
    for (const scheme of ["light", "dark"]) {
      test(`data-theme="${theme}" forces the ${theme} theme under a ${scheme} system`, async () => {
        const page = await open(specimen, { scheme });
        await page.evaluate(`document.documentElement.dataset.theme = "${theme}"`);
        expect(await page.style(":root", "color-scheme")).toBe(theme);
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

  test("an app layer's token override still wins under a forced theme", async () => {
    const page = await open(specimen, { scheme: "light" });
    await page.evaluate(`document.documentElement.dataset.theme = "dark"`);
    // A plain :root rule, less specific than :root[data-theme]: the later layer wins anyway.
    await addAppStyle(page, "@layer app { :root { --bg: rgb(1, 2, 3); } }");
    expect(await page.style(":root", "color-scheme")).toBe("dark");
    expect(await resolveColor(page, "--bg")).toBe("rgb(1, 2, 3)");
    expect(await page.style("body", "background-color")).toBe("rgb(1, 2, 3)");
    // The tokens it leaves alone keep the forced theme.
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

describe("theme", () => {
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
    const [accent] = COLORS["--accent"];
    const [divider] = COLORS["--divider"];
    expect(await page.style("#prose a", "color")).toBe(accent);
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

  test("links and focus outlines resolve to --accent, not a hue by name", async () => {
    const page = await open(specimen, { scheme: "light" });
    // Override the role alone: a rule that named --blue would keep Primer's blue.
    await addAppStyle(page, "@layer app { :root { --accent: rgb(1, 2, 3); } }");
    expect(await page.style("#prose a", "color")).toBe("rgb(1, 2, 3)");
    for (const target of ["#prose a", "#components .btn:not(:disabled)", "#components .input"]) {
      await tabTo(page, target);
      expect([
        target,
        await page.evaluate(`getComputedStyle(document.activeElement).outline`),
      ]).toEqual([target, "rgb(1, 2, 3) solid 2px"]);
    }
  });

  test("selected text sits on a translucent mix of --accent", async () => {
    const page = await open(specimen, { scheme: "light" });
    const selection = () =>
      page.evaluate(`getComputedStyle(document.querySelector("#prose p"), "::selection")
        .backgroundColor`);
    const fill = tint(await selection());
    expect(fill?.hue).toBe(COLORS["--accent"][0]);
    expect(fill.alpha).toBeGreaterThan(0);
    expect(fill.alpha).toBeLessThan(1);
    // The mix is of the role: overriding --accent alone moves it.
    await addAppStyle(page, "@layer app { :root { --accent: rgb(1, 2, 3); } }");
    expect(tint(await selection())?.hue).toBe("rgb(1, 2, 3)");
  });

  test("spaces adjacent prose blocks", async () => {
    const page = await open(specimen, { scheme: "light" });
    expect(await page.style("#prose h1", "margin-top")).toBe("16px");
    expect(await page.style("#prose hr + p", "margin-top")).toBe("16px");
  });

  test("draws no shadows and no gradients, on prose or components", async () => {
    const page = await open(specimen, { scheme: "light" });
    // The check is only as wide as the page: it must hold every component class.
    const shown = COMPONENTS.map((name) => `!!document.querySelector("#components .${name}")`);
    expect(await page.evaluate(`[${shown}].every(Boolean)`)).toBe(true);
    const styles = (await page.fingerprint(["box-shadow", "background-image"])).map(([, s]) => s);
    expect(new Set(styles.map((s) => s["box-shadow"]))).toEqual(new Set(["none"]));
    expect(new Set(styles.map((s) => s["background-image"]))).toEqual(new Set(["none"]));
  });
});

describe("components", () => {
  test("the components layer styles exactly the component classes", async () => {
    // Over http, since chromium hides a file:// stylesheet's rules from the page.
    const page = await open(server.url, { scheme: "light" });
    const classes = await page.evaluate(`(() => {
      const sheet = [...document.styleSheets].find((s) => s.href?.endsWith("/baseline.css"));
      // The components layer is the sheet its import loads, not a block in the root.
      const layer = [...sheet.cssRules].find((r) => r.layerName === "components").styleSheet;
      const selectors = [];
      const walk = (rules) => {
        for (const rule of rules) {
          if (rule.selectorText) selectors.push(rule.selectorText);
          if (rule.cssRules) walk(rule.cssRules);
        }
      };
      walk(layer.cssRules);
      return [...new Set(selectors.join(" ").match(/\\.[\\w-]+/g))].map((c) => c.slice(1));
    })()`);
    expect(classes.sort()).toEqual([...COMPONENTS].sort());
  });

  test("buttons, inputs, labels and cards resolve from tokens", async () => {
    const page = await open(specimen, { scheme: "light" });
    const [bg, bg1, color, color1, divider] = ["--bg", "--bg-1", "--fg", "--fg-1", "--divider"].map(
      (token) => COLORS[token][0],
    );
    const expected = {
      ".btn": {
        padding: "4px 12px",
        "border-top": `1px solid ${divider}`,
        "border-radius": "4px",
        "background-color": bg,
        color,
        "font-size": "12px",
        "font-family": MONO,
        cursor: "pointer",
      },
      ".input": {
        padding: "8px 12px",
        "border-top": `1px solid ${divider}`,
        "border-radius": "4px",
        "background-color": bg1,
        color,
        "font-size": "14px",
        "font-family": MONO,
      },
      ".label": {
        "font-size": "12px",
        "font-family": MONO,
        color: color1,
        "text-transform": "uppercase",
      },
      ".card": {
        display: "flex",
        "flex-direction": "column",
        gap: "12px",
        padding: "16px",
        "background-color": bg1,
        "border-top": `1px solid ${divider}`,
        "border-radius": "8px",
      },
    };
    for (const [selector, styles] of Object.entries(expected)) {
      for (const [property, value] of Object.entries(styles)) {
        expect([selector, property, await page.style(`#components ${selector}`, property)]).toEqual(
          [selector, property, value],
        );
      }
    }
  });

  test("each button variant takes its color token, in both schemes", async () => {
    const page = await open(specimen, { scheme: "light" });
    const tokens = {
      ...Object.fromEntries(VARIANTS.map((h) => [`btn-${h}`, `--${h}`])),
      "btn-muted": "--fg-2",
    };
    for (const scheme of [0, 1]) {
      if (scheme) await page.setScheme("dark");
      for (const variant of BUTTONS) {
        const value = COLORS[tokens[variant]][scheme];
        const selector = `#components .${variant}:not(:disabled)`;
        expect([variant, await page.style(selector, "color")]).toEqual([variant, value]);
        expect([variant, await page.style(selector, "border-top-color")]).toEqual([variant, value]);
      }
    }
  });

  test("a disabled button keeps the plain button's colors, dimmed", async () => {
    const page = await open(specimen, { scheme: "light" });
    expect(await page.style("#components .btn:disabled", "color")).toBe(COLORS["--fg"][0]);
    expect(await page.style("#components .btn:disabled", "opacity")).toBe("0.4");
  });

  test("each badge variant is its token on a translucent mix of that token, in both schemes", async () => {
    const page = await open(specimen, { scheme: "light" });
    for (const scheme of [0, 1]) {
      if (scheme) await page.setScheme("dark");
      for (const [variant, token] of Object.entries(BADGE_TOKENS)) {
        const selector = `#components .badge.${variant}`;
        const value = COLORS[token][scheme];
        expect([variant, await page.style(selector, "color")]).toEqual([variant, value]);
        const fill = tint(await page.style(selector, "background-color"));
        expect([variant, fill?.hue]).toEqual([variant, value]);
        expect(fill.alpha).toBeGreaterThan(0);
        expect(fill.alpha).toBeLessThan(1);
      }
    }
    expect(await page.style("#components .badge", "font-weight")).toBe("600");
    expect(await page.style("#components .badge", "padding")).toBe("4px 8px");
  });

  test("a role badge follows an app layer's override of its hue", async () => {
    const page = await open(specimen, { scheme: "light" });
    await addAppStyle(page, "@layer app { :root { --green: rgb(1, 2, 3); } }");
    const selector = "#components .badge.badge-success";
    expect(await page.style(selector, "color")).toBe("rgb(1, 2, 3)");
    expect(tint(await page.style(selector, "background-color"))?.hue).toBe("rgb(1, 2, 3)");
    // A role badge on another hue keeps it.
    expect(await page.style("#components .badge.badge-danger", "color")).toBe(COLORS["--red"][0]);
  });

  test("a hovered color button fills with a translucent mix of its hue", async () => {
    const page = await open(specimen, { scheme: "light" });
    const selector = "#components .btn-red";
    expect(await page.style(selector, "background-color")).toBe(COLORS["--bg"][0]);
    const [x, y] = await page.evaluate(`(() => {
      const button = document.querySelector(${JSON.stringify(selector)});
      button.scrollIntoView({ block: "center" });
      const box = button.getBoundingClientRect();
      return [box.x + box.width / 2, box.y + box.height / 2];
    })()`);
    // A real pointer move through CDP, so :hover matches as it would under a mouse.
    await page.view.cdp("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    // Skip the background transition to its end.
    await page.evaluate(`document.querySelector(${JSON.stringify(selector)})
      .getAnimations().forEach((a) => a.finish())`);
    const fill = tint(await page.style(selector, "background-color"));
    expect(fill?.hue).toBe(COLORS["--red"][0]);
    expect(fill.alpha).toBeLessThan(1);
  });

  for (const selector of [".btn", ".input"]) {
    test(`${selector} shows a 2px accent outline on keyboard focus`, async () => {
      const page = await open(specimen, { scheme: "light" });
      const target = `#components ${selector}:not(:disabled)`;
      expect(await page.style(target, "outline-style")).toBe("none");
      await tabTo(page, target);
      expect(await page.evaluate(`document.activeElement.matches(":focus-visible")`)).toBe(true);
      expect(await page.evaluate(`getComputedStyle(document.activeElement).outline`)).toBe(
        `${COLORS["--accent"][0]} solid 2px`,
      );
      expect(await page.evaluate(`getComputedStyle(document.activeElement).outlineOffset`)).toBe(
        "2px",
      );
    });
  }

  test("scroll-y and scroll-x scroll their overflow on one axis", async () => {
    const page = await open(specimen, { scheme: "light" });
    for (const [axis, overflow, size, padding] of [
      ["y", "overflow-y", "Height", "padding-right"],
      ["x", "overflow-x", "Width", "padding-bottom"],
    ]) {
      const selector = `#components .scroll-${axis}`;
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

  test("shows every prose element the theme styles", async () => {
    const page = await open(specimen, { scheme: "light" });
    const tags = ["h1", "h2", "h3", "h4", "h5", "h6", "p", "a", "ul", "ol", "li", "blockquote"];
    tags.push("pre", "code", "kbd", "table", "th", "td", "hr");
    for (const tag of tags) {
      expect(await page.evaluate(`!!document.querySelector("#prose ${tag}")`)).toBe(true);
    }
  });

  test("shows every component class", async () => {
    const page = await open(specimen, { scheme: "light" });
    for (const name of COMPONENTS) {
      expect([
        name,
        await page.evaluate(`!!document.querySelector("#components .${name}")`),
      ]).toEqual([name, true]);
    }
  });

  test("sets the four roles beside the eight hues under the usage rule", async () => {
    const page = await open(specimen, { scheme: "light" });
    const rule =
      "A role marks state or interaction; a hue marks a category and never implies status. On a " +
      "page that shows status, categories draw first from the hues no role uses (cyan, purple, " +
      "magenta, orange), leaving red, green and yellow for status.";
    expect(
      squash(await page.evaluate(`document.querySelector("#usage p").textContent`)).trim(),
    ).toBe(rule);
    // Each token row names its token and shows that token's badge.
    const rows = await page.evaluate(`[...document.querySelectorAll("#usage .specimen > code")]
      .map((code) => [code.textContent, code.nextElementSibling.querySelector(".badge").className])`);
    expect(rows.map(([token]) => token).sort()).toEqual(
      [...Object.keys(ROLES), ...Object.keys(HUES)].sort(),
    );
    for (const [token, className] of rows) {
      expect([token, className]).toEqual([token, `badge badge-${token.slice(2)}`]);
    }
    // The status sample marks state with roles and categories with hues no role uses.
    const sample = await page.evaluate(`[...document.querySelectorAll("#usage .card .row")]
      .map((row) => [...row.querySelectorAll(".badge")].map((b) => b.classList[1]))`);
    const free = ["badge-cyan", "badge-purple", "badge-magenta", "badge-orange"];
    const roles = Object.keys(ROLES).map((r) => `badge-${r.slice(2)}`);
    expect(sample.length).toBeGreaterThan(0);
    for (const [category, state] of sample) {
      expect(free).toContain(category);
      expect(roles).toContain(state);
    }
  });

  test("the contrast table has one row per color token but --bg", async () => {
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
      // The table is static: each cell is the ratio as written, then its mark badge.
      const cells = await page.evaluate(`[...document.querySelectorAll("#contrast tbody tr")]
        .map((row) => {
          const cell = row.cells[${index + 1}];
          const badge = cell.querySelector(".badge");
          return {
            token: row.querySelector("th code").textContent,
            ratio: cell.firstChild.textContent.trim(),
            text: badge?.textContent,
            badge: badge?.classList[1],
          };
        })`);
      const bg = await resolveColor(page, "--bg");
      expect(bg).toBe(COLORS["--bg"][index]);
      for (const { token, ...cell } of cells) {
        const ratio = contrast(await resolveColor(page, token), bg);
        expect([token, cell]).toEqual([token, { ratio: ratio.toFixed(2), ...mark(ratio) }]);
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
