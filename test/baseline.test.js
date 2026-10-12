import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileUrl, openPage, serve } from "./harness.js";

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

// COLORS are herald's color tokens, name to the color each resolves to in light and in dark.
const COLORS = {
  "--bg": ["rgb(255, 255, 255)", "rgb(18, 18, 18)"],
  "--bg-1": ["rgb(245, 245, 245)", "rgb(31, 31, 31)"],
  "--bg-2": ["rgb(235, 235, 235)", "rgb(46, 46, 46)"],
  "--color": ["rgb(26, 26, 26)", "rgb(237, 237, 237)"],
  "--color-1": ["rgb(77, 77, 77)", "rgb(204, 204, 204)"],
  "--color-2": ["rgb(115, 115, 115)", "rgb(166, 166, 166)"],
  "--divider": ["rgb(204, 204, 204)", "rgb(64, 64, 64)"],
  "--blue": ["rgb(11, 115, 218)", "rgb(102, 179, 255)"],
  "--green": ["rgb(36, 143, 71)", "rgb(60, 221, 113)"],
  "--red": ["rgb(217, 38, 38)", "rgb(242, 90, 90)"],
  "--yellow": ["rgb(184, 143, 20)", "rgb(245, 199, 61)"],
  "--orange": ["rgb(236, 109, 19)", "rgb(251, 152, 81)"],
};

const HUES = ["blue", "green", "red", "yellow", "orange"];

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

describe("layers", () => {
  test("the stylesheet declares tokens, reset, theme, components before any rule", async () => {
    // Over http, since chromium hides a file:// stylesheet's rules from the page.
    const page = await open(server.url, { scheme: "light" });
    const first = await page.evaluate(`(() => {
      const sheet = [...document.styleSheets].find((s) => s.href?.endsWith("/baseline.css"));
      const rule = sheet.cssRules[0];
      return { type: rule.constructor.name, names: [...rule.nameList] };
    })()`);
    expect(first).toEqual({
      type: "CSSLayerStatementRule",
      names: ["tokens", "reset", "theme", "components"],
    });
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
  test("declares exactly herald's token names, without its shadow and tint tokens", async () => {
    const page = await open(specimen, { scheme: "light" });
    const names = Object.keys(await rootTokens(page)).sort();
    expect(names).toEqual([...Object.keys(SCALES), ...Object.keys(COLORS)].sort());
    for (const absent of [
      "--shadow-sm",
      "--shadow-md",
      "--shadow-lg",
      ...HUES.map((h) => `--${h}-bg`),
    ]) {
      expect(await page.style(":root", absent)).toBe("");
    }
  });

  test("the font stacks and scales carry herald's values", async () => {
    const page = await open(specimen, { scheme: "light" });
    const tokens = await rootTokens(page);
    for (const [name, value] of Object.entries(SCALES)) expect(squash(tokens[name])).toBe(value);
  });

  test("every color token is a light-dark() pair of herald's values", async () => {
    const page = await open(specimen, { scheme: "light" });
    const tokens = await rootTokens(page);
    for (const name of Object.keys(COLORS)) expect(tokens[name]).toStartWith("light-dark(");
    for (const [name, [light]] of Object.entries(COLORS)) {
      expect(await resolveColor(page, name)).toBe(light);
    }
    await page.setScheme("dark");
    for (const [name, [, dark]] of Object.entries(COLORS)) {
      expect(await resolveColor(page, name)).toBe(dark);
    }
  });

  test("with no app styles the page follows the system scheme", async () => {
    const page = await open(specimen, { scheme: "dark" });
    expect(await page.style(":root", "color-scheme")).toBe("light dark");
    expect(await page.style("body", "background-color")).toBe(COLORS["--bg"][1]);
    expect(await page.style("body", "color")).toBe(COLORS["--color"][1]);
    await page.setScheme("light");
    expect(await page.style("body", "background-color")).toBe(COLORS["--bg"][0]);
    expect(await page.style("body", "color")).toBe(COLORS["--color"][0]);
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
    const [blue] = COLORS["--blue"];
    const [divider] = COLORS["--divider"];
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

  test("spaces adjacent prose blocks", async () => {
    const page = await open(specimen, { scheme: "light" });
    expect(await page.style("#prose h1", "margin-top")).toBe("16px");
    expect(await page.style("#prose hr + p", "margin-top")).toBe("16px");
  });

  test("draws no shadows and no gradients", async () => {
    const page = await open(specimen, { scheme: "light" });
    const styles = (await page.fingerprint(["box-shadow", "background-image"])).map(([, s]) => s);
    expect(new Set(styles.map((s) => s["box-shadow"]))).toEqual(new Set(["none"]));
    expect(new Set(styles.map((s) => s["background-image"]))).toEqual(new Set(["none"]));
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

  test("renders the same from file:// and from a server under a project subpath", async () => {
    const local = await open(specimen, { scheme: "light" });
    const served = await open(server.url, { scheme: "light" });
    expect(served.view.url).toBe(server.url);
    const fromFile = await local.fingerprint();
    // Equal fingerprints prove nothing if the stylesheet failed to load in both.
    expect(fromFile[0][1]["--bg"]).toStartWith("light-dark(");
    expect(await served.fingerprint()).toEqual(fromFile);
  });
});
