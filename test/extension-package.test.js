import { afterAll, afterEach, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { GITHUB, install as installFixture, MANIFEST, PACKAGE, rendered } from "./extension.js";
import { fileUrl, openPage, serve } from "./harness.js";
import { git, modules, pageScripts, show, stylesheets } from "./tags.js";

// The extension fixture package, test/fixtures/extension-package: a consumer that depends on the
// baseline by git tag, as a real one writes it in package.json, github:<owner>/<repo>#<tag>, and
// adds its own color profile, Harbor. The suite installs it with bun into a scratch directory,
// serves that directory over http, and opens its page.
//
// The install is offline. bun fetches a github: dependency as a tarball over HTTPS from GitHub,
// which no git setting redirects, so the suite rewrites the one dependency's source, and nothing
// else, to the local repository at the same tag, git+file://<repository>#<tag>: bun then clones
// the tag from the local repository's own refs, resolves it to its commit, and installs that
// commit's tree, as it would GitHub's tarball of the same tag. Proxies pointed at a closed port
// and a cache inside the scratch directory hold it there: a request to any registry or host
// fails, and no earlier install's cache answers it. The live pin check installs the unrewritten
// dependency from GitHub.
//
// v0.6.0 ships no ./conformance, which v0.7.0 adds, so the conformance test imports the working
// tree's modules/conformance.js into the page. It reads computed values and the registry's shared
// store, at its well-known global key, so it checks a profile against any tag's CSS and modules.

const root = dirname(import.meta.dir);
// TAG is the tag the fixture pins.
const TAG = "v0.6.0";
const CDN = `https://cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@${TAG}/`;
const KEY = "spike-html-design.preferences";

const scratch = mkdtempSync(join(tmpdir(), "spike-html-design-extension-"));
const project = join(scratch, "extension-package");
const installed = join(project, "node_modules", PACKAGE);
let install;
let server;
const pages = [];

// open opens a page and closes it after the test, so bun test exits with no tab left open.
async function open(url, options) {
  const page = await openPage(url, options);
  pages.push(page);
  return page;
}

beforeAll(() => {
  // The one rewrite: GitHub's source for the local repository's, the tag kept.
  const closed = "http://127.0.0.1:9";
  install = installFixture(scratch, project, {
    source: `git+${pathToFileURL(root).href}`,
    tag: TAG,
    env: { HTTP_PROXY: closed, HTTPS_PROXY: closed, http_proxy: closed, https_proxy: closed },
  });
  server = serve(project);
});

afterEach(() => {
  for (const page of pages.splice(0)) page.close();
});

afterAll(() => {
  server?.stop();
  rmSync(scratch, { recursive: true, force: true });
});

// The tag's published files, read with git show into the scratch directory, which answer the
// pinned page's jsDelivr URLs: the reference the installed package is compared against.
function tagFiles() {
  const dir = join(scratch, "tag");
  const files = [...stylesheets(TAG), ...modules(TAG), ...pageScripts(TAG)];
  for (const path of files) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), show(TAG, path));
  }
  return { dir, files };
}

// HERMETIC answers every other https:// request 404 from a file that does not exist, so neither
// page reaches the network.
const HERMETIC = { "https://": join(import.meta.dir, "fixtures", "absent") };

// resolved resolves to the color token resolves to inside the element matching selector.
function resolved(page, token, selector) {
  return page.evaluate(`(() => {
    const probe = document.querySelector(${JSON.stringify(selector)})
      .appendChild(document.createElement("i"));
    probe.style.color = "var(${token})";
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  })()`);
}

// openMenu opens the page's menu from its Theme button and resolves to the names its color row
// lists.
async function openMenu(page) {
  return page.evaluate(`(async () => {
    const menu = document.querySelector("theme-menu");
    document.querySelector('button[command="--open"][commandfor="theme"]').click();
    const end = performance.now() + 5000;
    while (!menu.querySelector("dialog")?.open) {
      if (performance.now() > end) throw new Error("menu: timed out opening");
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    return [...menu.querySelectorAll('dialog [data-section="color"] input')]
      .map((input) => input.value);
  })()`);
}

// HARBOR is Harbor's --bg and --fg as chromium computes them, light then dark, from harbor.css.
const HARBOR = {
  light: { "--bg": "rgb(247, 249, 251)", "--fg": "rgb(20, 33, 46)" },
  dark: { "--bg": "rgb(13, 22, 32)", "--fg": "rgb(221, 230, 239)" },
};

describe("extension package", () => {
  test("depends on the baseline by git tag, as a consumer writes it, and is offline-installed at that tag's commit", async () => {
    expect(MANIFEST.dependencies).toEqual({ [PACKAGE]: `${GITHUB}#${TAG}` });
    expect({ exitCode: install.exitCode, stderr: install.stderr }).toMatchObject({
      exitCode: 0,
    });
    // bun names the commit it installed; it is the tag's.
    const commit = git("rev-parse", `${TAG}^{commit}`).stdout.toString().trim();
    expect(install.stdout).toContain(`${PACKAGE}@git+file://`);
    expect(install.stdout).toContain(`#${commit}`);
    const pkg = JSON.parse(readFileSync(join(installed, "package.json"), "utf8"));
    expect([pkg.name, pkg.version]).toEqual([PACKAGE, TAG.slice(1)]);
    // Every stylesheet and module the tag publishes is installed byte for byte.
    for (const path of [...stylesheets(TAG), ...modules(TAG)]) {
      const same = Buffer.compare(readFileSync(join(installed, path)), show(TAG, path)) === 0;
      expect([path, same]).toEqual([path, true]);
    }
  });

  test("its page loads the entry and the modules from node_modules, and nothing from elsewhere", async () => {
    const page = await open(server.url, { intercept: HERMETIC });
    const urls = await page.evaluate(
      `performance.getEntriesByType("resource").map((entry) => entry.name)`,
    );
    const own = ["harbor.css", "register.js"].map((path) => `${server.url}${path}`);
    const fromPackage = urls.filter((url) =>
      url.startsWith(`${server.url}node_modules/${PACKAGE}/`),
    );
    expect(urls.filter((url) => !own.includes(url) && !fromPackage.includes(url))).toEqual([]);
    for (const path of [
      "full.css",
      "modules/registry.js",
      "modules/register-full.js",
      "modules/preferences.js",
      "modules/keys.js",
    ]) {
      expect(fromPackage).toContain(`${server.url}node_modules/${PACKAGE}/${path}`);
    }
    expect(await page.evaluate(`customElements.get("theme-menu") !== undefined`)).toBe(true);
  });

  for (const scheme of ["light", "dark"]) {
    test(`renders as the tag's pinned page renders, with the system in ${scheme}`, async () => {
      // The pinned page from file://, its jsDelivr URLs answered from the tag's own files; the
      // fixture's page served, its files from node_modules. Both header's elements and every
      // token on the root compute alike.
      const { dir, files } = tagFiles();
      const intercept = {
        ...Object.fromEntries(files.map((path) => [`${CDN}${path}`, join(dir, path)])),
        ...HERMETIC,
      };
      const pinned = await open(fileUrl(join(root, "pinned", `${TAG}.html`)), {
        scheme,
        intercept,
      });
      const page = await open(server.url, { scheme, intercept: HERMETIC });
      const expected = await rendered(pinned);
      expect(Object.keys(expected.tokens)).toContain("--bg");
      expect(await rendered(page)).toEqual(expected);
    });
  }

  for (const scheme of ["light", "dark"]) {
    test(`applies Harbor by data-palette, with the system in ${scheme}`, async () => {
      const page = await open(server.url, { scheme, intercept: HERMETIC });
      for (const [token, color] of Object.entries(HARBOR[scheme])) {
        expect([token, await resolved(page, token, "#harbor")]).toEqual([token, color]);
      }
      // Its scope paints from its own tokens, and the root keeps the default, Flexoki.
      expect(await page.style("#harbor", "background-color")).toBe(HARBOR[scheme]["--bg"]);
      expect(await resolved(page, "--bg", "body")).not.toBe(HARBOR[scheme]["--bg"]);
    });
  }

  test("registers Harbor after the built-in profiles, and the theme menu lists it", async () => {
    const page = await open(server.url, { intercept: HERMETIC });
    expect(
      await page.evaluate(`globalThis[Symbol.for("spike-html-design.registry")].color`),
    ).toEqual(["flexoki", "primer", "catppuccin", "everforest", "harbor"]);
    expect(await openMenu(page)).toEqual([
      "flexoki",
      "primer",
      "catppuccin",
      "everforest",
      "harbor",
    ]);
  });

  test("applies Harbor from the menu, and by the reader's stored choice across a reload", async () => {
    const page = await open(server.url, { scheme: "light", intercept: HERMETIC });
    await page.evaluate(`localStorage.removeItem(${JSON.stringify(KEY)})`);
    await openMenu(page);
    const chosen = await page.evaluate(`(async () => {
      const menu = document.querySelector("theme-menu");
      menu.querySelector('dialog [data-section="color"] input[value="harbor"]').click();
      menu.querySelector('dialog [data-action="save"]').click();
      const end = performance.now() + 5000;
      while (menu.hasAttribute("data-open")) {
        if (performance.now() > end) throw new Error("menu: timed out closing");
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      return [document.documentElement.getAttribute("data-palette"),
        JSON.parse(localStorage.getItem(${JSON.stringify(KEY)})).color];
    })()`);
    expect(chosen).toEqual(["harbor", "harbor"]);
    expect(await resolved(page, "--bg", "body")).toBe(HARBOR.light["--bg"]);

    // A new load applies the stored choice before first paint: the registration module listed
    // Harbor before preferences read it.
    await page.goto(server.url);
    expect(await page.evaluate(`document.documentElement.getAttribute("data-palette")`)).toBe(
      "harbor",
    );
    expect(await page.style("body", "background-color")).toBe(HARBOR.light["--bg"]);
    await page.evaluate(`localStorage.removeItem(${JSON.stringify(KEY)})`);
  });

  test("Harbor passes ./conformance, from the working tree, against the tag's CSS", async () => {
    // v0.6.0 has no ./conformance, so the working tree's module answers a URL beside the page.
    const conformance = `${server.url}working-tree/modules/conformance.js`;
    const page = await open(server.url, {
      intercept: { [conformance]: join(root, "modules", "conformance.js"), ...HERMETIC },
    });
    expect(
      await page.evaluate(
        `import(${JSON.stringify(conformance)}).then(({ check }) => check("color", "harbor"))`,
      ),
    ).toEqual([]);
  });
});
