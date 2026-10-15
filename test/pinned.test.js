import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileUrl, openPage, serve } from "./harness.js";
import { ENTRIES, layersLoaded, loaded } from "./layers.js";
import { applyFromMenu } from "./menu.js";
import { driveKeys } from "./shortcuts.js";
import { git, modules, pageScripts, show, stylesheets, tagExists } from "./tags.js";

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

// markup is a page's source without its comments, title text, link elements, and the attributes
// of its external scripts: what the pinned page must share with the specimen it stands in for.
// An inline script keeps its attributes and its text, so the specimen's own scripts stay held.
async function markup(path) {
  return (await Bun.file(path).text())
    .replace(/\n[ \t]*<!--[\s\S]*?-->/g, "")
    .replace(/<title>[^<]*<\/title>/g, "<title>")
    .replace(/<link\s[^>]*>/g, "<link>")
    .replace(/<script\s[^>]*\ssrc="[^"]*"[^>]*>/g, "<script src>");
}

// TREE_STYLESHEETS are the stylesheet files the working tree will publish when cut as a tag, in
// the order a tag's list holds them: the lean entry first, then the other entries and every file
// an entry imports, each once.
const TREE_STYLESHEETS = [
  ...new Set([
    ...Object.keys(ENTRIES),
    ...Object.values(ENTRIES).flatMap((imports) => imports.map(([, path]) => path)),
  ]),
];

// TREE_MODULES are the JavaScript modules the working tree will publish when cut as a tag: every
// module its package exports, which is every .js file in modules/.
const TREE_MODULES = Object.values(
  JSON.parse(readFileSync(join(root, "package.json"), "utf8")).exports,
)
  .filter((path) => path.endsWith(".js"))
  .map((path) => path.replace(/^\.\//, ""))
  .sort();

// TREE_PAGE_SCRIPTS are the specimen's own scripts the working tree will publish when cut as a
// tag: every external script the specimen loads from outside modules/, specimen.js from v0.6.0.
// They are no package export, but jsDelivr serves them from the tag, and the pinned page loads
// them from there.
const TREE_PAGE_SCRIPTS = [
  ...readFileSync(join(root, "index.html"), "utf8").matchAll(/<script\s[^>]*\ssrc="\.\/([^"]+)"/g),
]
  .map(([, path]) => path)
  .filter((path) => !path.startsWith("modules/"))
  .sort();

// reference returns the directory holding the specimen, stylesheet, module, and page script files
// a page pinned to tag is compared against, and those stylesheet, module, and page script files. Once the tag is cut
// they are the tag's own, read with git show, so later changes to the working tree's tokens,
// layers, modules, or specimen never reach a pinned page's test; a tag cut before v0.5.0 has no
// modules, and one cut before v0.6.0 no page scripts. Until then they are the working tree's, since the tag is cut from it after merge.
function reference(tag) {
  if (!tagExists(tag))
    return {
      dir: root,
      files: [...TREE_STYLESHEETS, ...TREE_MODULES, ...TREE_PAGE_SCRIPTS],
    };
  const dir = join(scratch, tag);
  const files = [...stylesheets(tag), ...modules(tag), ...pageScripts(tag)];
  for (const path of ["index.html", ...files]) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), show(tag, path));
  }
  return { dir, files };
}

// specimenEntry returns the entry the specimen at path links, as a repository path: the lean
// entry, baseline.css, through v0.3.0, and the full entry, full.css, from v0.4.0, whose specimen
// selects every profile. The page pinned to the specimen's tag links the same entry at its
// jsDelivr URL.
function specimenEntry(path) {
  const html = readFileSync(path, "utf8");
  const href = html.match(/<link rel="stylesheet" href="\.\/([^"]+)"/)?.[1];
  if (!href) throw new Error(`pinned: no stylesheet link in ${path}`);
  return href;
}

// RESOURCES lists a page's links and external scripts in document order, as [kind, href]: a
// link's rel, or a script's type, and its URL as written.
const RESOURCES = `[...document.querySelectorAll("link, script[src]")].map((el) =>
  el.localName === "link" ? [el.rel, el.getAttribute("href")] : [el.type, el.getAttribute("src")])`;

test("the working tree's stylesheet list is every stylesheet file it would publish", () => {
  // What a tag publishes is every tracked .css file outside test/, as stylesheets() lists a cut
  // tag's; an entry or profile file the entries never import would be missed by the list above.
  const tracked = git("ls-files", "*.css")
    .stdout.toString()
    .split("\n")
    .filter((path) => path && !path.startsWith("test/"));
  expect([...TREE_STYLESHEETS].sort()).toEqual(tracked.sort());
  expect(TREE_STYLESHEETS[0]).toBe("baseline.css");
});

// Every pinned page, one per tag, as pinned/<tag>.html.
const PINNED = [...new Bun.Glob("*.html").scanSync(join(root, "pinned"))].sort();

test("the working tree's module list is every module file it would publish", () => {
  // What a tag publishes is every tracked .js file in modules/, as modules() lists a cut tag's; a
  // module the package never exports would be missed by the list above.
  const tracked = git("ls-files", "modules/*.js").stdout.toString().split("\n").filter(Boolean);
  expect(TREE_MODULES).toEqual(tracked.sort());
});

test("each cut tag before v0.5.0 publishes no modules, so its checks are the stylesheets' alone", () => {
  // modules() reads a cut tag's list, as stylesheets() does; the pinned test and the live pin
  // check add a module's request and the menu's test only for a tag that holds modules/.
  const cut = ["v0.1.0", "v0.2.0", "v0.3.0", "v0.4.0"].filter(tagExists);
  expect(cut.map((tag) => [tag, modules(tag)])).toEqual(cut.map((tag) => [tag, []]));
});

test("the working tree's page script list is every .js file at its root, specimen.js", () => {
  // What a tag publishes beside its modules is every tracked .js file at its root, as
  // pageScripts() lists a cut tag's; a root script the specimen never loads would be missed by
  // the list above.
  const tracked = git("ls-files", "*.js")
    .stdout.toString()
    .split("\n")
    .filter((path) => path && !path.includes("/"));
  expect(TREE_PAGE_SCRIPTS).toEqual(tracked.sort());
  expect(TREE_PAGE_SCRIPTS).toEqual(["specimen.js"]);
});

test("each cut tag before v0.6.0 publishes no page scripts", () => {
  // pageScripts() reads a cut tag's list, as modules() does; the pinned test and the live pin
  // check add specimen.js's request and the keys' test only for a tag that holds it.
  const cut = ["v0.1.0", "v0.2.0", "v0.3.0", "v0.4.0", "v0.5.0"].filter(tagExists);
  expect(cut.map((tag) => [tag, pageScripts(tag)])).toEqual(cut.map((tag) => [tag, []]));
});

test("there is at least one pinned page", () => {
  expect(PINNED.length).toBeGreaterThan(0);
});

for (const name of PINNED) {
  const tag = basename(name, ".html");
  const pinnedPath = join(root, "pinned", name);
  const { dir, files } = reference(tag);
  const specimenPath = join(dir, "index.html");
  const entry = specimenEntry(specimenPath);
  const pinned = `${CDN}@${tag}/${entry}`;
  const against = dir === root ? "the working tree" : `tag ${tag}`;
  // From v0.5.0 the specimen carries the theming menu, and its pinned page loads the menu's
  // modules from jsDelivr beside the entry.
  const menu = readFileSync(specimenPath, "utf8").includes("<theme-menu");
  // From v0.6.0 the specimen loads keys and binds T and ? with data-keys, and its pinned page
  // loads keys and specimen.js from jsDelivr too.
  const keyed = readFileSync(specimenPath, "utf8").includes("data-keys");

  // hermetic answers every stylesheet, module, and page script file the tag publishes at its URL under the same
  // tag, the pinned entry, the files its imports resolve to, and the modules and specimen.js the page
  // loads among them, from the reference files, with Access-Control-Allow-Origin as jsDelivr sends it, and
  // answers every other https:// request 404 from a file that does not exist, so no test of the
  // pinned page reaches the network. The harness takes the first matching prefix.
  const hermetic = {
    ...Object.fromEntries(files.map((path) => [new URL(path, pinned).href, join(dir, path)])),
    "https://": join(import.meta.dir, "fixtures", "absent"),
  };

  describe(`pinned ${tag}, against ${against}`, () => {
    test("has the specimen's markup apart from its title, links, and module scripts' URLs", async () => {
      expect(await markup(pinnedPath)).toBe(await markup(specimenPath));
    });

    test(`links what the specimen links, ${entry} first, each at its pinned jsDelivr URL`, async () => {
      // The specimen links each file by relative URL; the pinned page links the same files, in
      // the same order and of the same kinds, under the tag's jsDelivr URL.
      const specimen = await open(fileUrl(specimenPath), { scheme: "light" });
      const expected = (await specimen.evaluate(RESOURCES)).map(([kind, href]) => [
        kind,
        new URL(href, `${CDN}@${tag}/`).href,
      ]);
      expect(expected[0]).toEqual(["stylesheet", pinned]);
      const page = await open(fileUrl(pinnedPath), { scheme: "light", intercept: hermetic });
      expect(await page.evaluate(RESOURCES)).toEqual(expected);
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

    if (menu) {
      // The working-tree specimen has no menu from file://, since chromium runs no relative
      // module script there; the pinned page's modules come from jsDelivr, whose CORS header lets
      // a file:// page, whose origin is opaque, run them.
      test("its menu opens and applies a profile from file:// and a local server", async () => {
        for (const url of [fileUrl(pinnedPath), `${server.url}pinned/${name}`]) {
          const page = await open(url, { scheme: "light", intercept: hermetic });
          const result = await applyFromMenu(page);
          expect(result).toEqual({
            opened: true,
            chosen: result.chosen,
            applied: result.chosen,
            stored: result.chosen,
            repainted: true,
          });
          expect(result.chosen).not.toBe("flexoki");
        }
      });
    }

    if (keyed) {
      // The working-tree specimen has no keys from file://, as it has no menu; the pinned page's
      // keys.js and specimen.js come from jsDelivr, and specimen.js's relative import of keys.js
      // resolves to the page's own pinned URL, so the page holds one keys with every binding.
      test("its keys open the menu and the help dialog and move focus, from file:// and a local server", async () => {
        for (const url of [fileUrl(pinnedPath), `${server.url}pinned/${name}`]) {
          const page = await open(url, { scheme: "light", intercept: hermetic });
          expect(await driveKeys(page)).toEqual({
            menu: true,
            help: [
              ["T", "Theme"],
              ["?", "Help"],
              ["J", "Next section"],
              ["K", "Previous section"],
              ["G", "Top"],
            ],
            focused: "tokens",
          });
        }
      });
    }
  });
}
