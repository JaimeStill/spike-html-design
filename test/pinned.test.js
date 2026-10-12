import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileUrl, openPage, serve } from "./harness.js";
import { LAYERS, LOADED, layersLoaded } from "./layers.js";

const root = dirname(import.meta.dir);
const PINNED = "https://cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@v0.1.0/baseline.css";
const pinnedPath = join(root, "pinned", "v0.1.0.html");
const specimenPath = join(root, "index.html");
// The repository served under a project subpath, as GitHub Pages serves the pinned page.
const server = serve(root, { prefix: "/spike-html-design/" });
const pages = [];

// HERMETIC answers the pinned URL, and the layer files its imports resolve to under the same
// tag, from the working tree, since the tag is cut after merge, and answers every other https://
// request 404 from a file that does not exist, so no test of the pinned page reaches the network.
// The harness takes the first matching prefix.
const HERMETIC = {
  [PINNED]: join(root, "baseline.css"),
  ...Object.fromEntries(
    LAYERS.map((layer) => [
      new URL(`layers/${layer}.css`, PINNED).href,
      join(root, "layers", `${layer}.css`),
    ]),
  ),
  "https://": join(import.meta.dir, "fixtures", "absent"),
};

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

// markup is a page's source without its comments, title text, and link elements: what the
// pinned page must share with the specimen it stands in for.
async function markup(path) {
  return (await Bun.file(path).text())
    .replace(/\n[ \t]*<!--[\s\S]*?-->/g, "")
    .replace(/<title>[^<]*<\/title>/g, "<title>")
    .replace(/<link\s[^>]*>/g, "<link>");
}

describe("pinned v0.1.0", () => {
  test("has the specimen's markup apart from its title and stylesheet link", async () => {
    expect(await markup(pinnedPath)).toBe(await markup(specimenPath));
  });

  test("links exactly one stylesheet, the baseline at its pinned jsDelivr URL", async () => {
    const page = await open(fileUrl(pinnedPath), { scheme: "light", intercept: HERMETIC });
    const links = await page.evaluate(`[...document.querySelectorAll("link")]
      .map((l) => [l.rel, l.getAttribute("href")])`);
    expect(links).toEqual([["stylesheet", PINNED]]);
    // Inline <style> sheets have no href; any @import or second link would add one.
    const sheets = await page.evaluate(`[...document.styleSheets].map((s) => s.href)
      .filter(Boolean)`);
    expect(sheets).toEqual([PINNED]);
  });

  for (const scheme of ["light", "dark"]) {
    test(`renders as the specimen from file:// and a local server, in ${scheme}`, async () => {
      const options = { scheme, intercept: HERMETIC };
      const fromFile = await open(fileUrl(pinnedPath), options);
      const fromServer = await open(`${server.url}pinned/v0.1.0.html`, options);
      const specimen = await open(fileUrl(specimenPath), { scheme });
      // The baseline and every layer file it imports loaded, so two runs that lost the same
      // stylesheet or the same import cannot pass for equal renders.
      for (const page of [fromFile, fromServer]) expect(await layersLoaded(page)).toEqual(LOADED);
      const print = await specimen.fingerprint();
      expect(await fromFile.fingerprint()).toEqual(print);
      expect(await fromServer.fingerprint()).toEqual(print);
    });
  }
});
