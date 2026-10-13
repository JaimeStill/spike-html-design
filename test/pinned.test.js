import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileUrl, openPage, serve } from "./harness.js";
import { LAYERS, layerPath, layersLoaded, loaded } from "./layers.js";
import { show, stylesheets, tagExists } from "./tags.js";

const root = dirname(import.meta.dir);
const CDN = "https://cdn.jsdelivr.net/gh/JaimeStill/spike-html-design";
// The repository served under a project subpath, as GitHub Pages serves the pinned page.
const server = serve(root, { prefix: "/spike-html-design/" });
// Each cut tag's specimen and stylesheet files, read from the tag into a scratch directory the
// suite removes when it ends.
const scratch = mkdtempSync(join(tmpdir(), "spike-html-design-pinned-"));
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
afterAll(() => {
  server.stop();
  rmSync(scratch, { recursive: true, force: true });
});

// markup is a page's source without its comments, title text, and link elements: what the
// pinned page must share with the specimen it stands in for.
async function markup(path) {
  return (await Bun.file(path).text())
    .replace(/\n[ \t]*<!--[\s\S]*?-->/g, "")
    .replace(/<title>[^<]*<\/title>/g, "<title>")
    .replace(/<link\s[^>]*>/g, "<link>");
}

// reference returns the directory holding the specimen and stylesheet files a page pinned to tag
// is compared against, and those stylesheet files. Once the tag is cut they are the tag's own,
// read with git show, so later changes to the working tree's tokens, layers, or specimen never
// reach a pinned page's test. Until then they are the working tree's, since the tag is cut from
// it after merge.
function reference(tag) {
  if (!tagExists(tag)) {
    return { dir: root, files: ["baseline.css", ...LAYERS.map(layerPath)] };
  }
  const dir = join(scratch, tag);
  const files = stylesheets(tag);
  for (const path of ["index.html", ...files]) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), show(tag, path));
  }
  return { dir, files };
}

// Every pinned page, one per tag, as pinned/<tag>.html.
const PINNED = [...new Bun.Glob("*.html").scanSync(join(root, "pinned"))].sort();

test("there is at least one pinned page", () => {
  expect(PINNED.length).toBeGreaterThan(0);
});

for (const name of PINNED) {
  const tag = basename(name, ".html");
  const pinnedPath = join(root, "pinned", name);
  const pinned = `${CDN}@${tag}/baseline.css`;
  const { dir, files } = reference(tag);
  const specimenPath = join(dir, "index.html");
  const against = dir === root ? "the working tree" : `tag ${tag}`;

  // hermetic answers the pinned URL, and the layer files its imports resolve to under the same
  // tag, from the reference files, and answers every other https:// request 404 from a file that
  // does not exist, so no test of the pinned page reaches the network. The harness takes the
  // first matching prefix.
  const hermetic = {
    ...Object.fromEntries(files.map((path) => [new URL(path, pinned).href, join(dir, path)])),
    "https://": join(import.meta.dir, "fixtures", "absent"),
  };

  describe(`pinned ${tag}, against ${against}`, () => {
    test("has the specimen's markup apart from its title and stylesheet link", async () => {
      expect(await markup(pinnedPath)).toBe(await markup(specimenPath));
    });

    test("links exactly one stylesheet, the baseline at its pinned jsDelivr URL", async () => {
      const page = await open(fileUrl(pinnedPath), { scheme: "light", intercept: hermetic });
      const links = await page.evaluate(`[...document.querySelectorAll("link")]
        .map((l) => [l.rel, l.getAttribute("href")])`);
      expect(links).toEqual([["stylesheet", pinned]]);
      // document.styleSheets lists linked and inline sheets but not the baseline's imported layer
      // files; inline sheets have no href, so a second linked stylesheet is the only way to add
      // one.
      const sheets = await page.evaluate(`[...document.styleSheets].map((s) => s.href)
        .filter(Boolean)`);
      expect(sheets).toEqual([pinned]);
    });

    for (const scheme of ["light", "dark"]) {
      test(`renders as the specimen from file:// and a local server, in ${scheme}`, async () => {
        const options = { scheme, intercept: hermetic };
        const fromFile = await open(fileUrl(pinnedPath), options);
        const fromServer = await open(`${server.url}pinned/${name}`, options);
        const specimen = await open(fileUrl(specimenPath), { scheme });
        // The baseline and every layer file it imports loaded, with the tag's own probe values,
        // so two runs that lost the same stylesheet or the same import cannot pass for equal
        // renders, and neither can a specimen that read the working tree's stylesheet.
        for (const page of [fromFile, fromServer, specimen]) {
          expect(await layersLoaded(page, tag)).toEqual(loaded(tag));
        }
        const print = await specimen.fingerprint();
        expect(await fromFile.fingerprint()).toEqual(print);
        expect(await fromServer.fingerprint()).toEqual(print);
      });
    }
  });
}
