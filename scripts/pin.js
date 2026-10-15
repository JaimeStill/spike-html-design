// pin checks a published tag live: jsDelivr serves every stylesheet file the tag publishes (its
// entries, baseline.css and from v0.4.0 full.css, each layer file, and each profile file) as an
// immutable, byte-equal stylesheet, and from v0.5.0 every module in its modules/ as an
// immutable, byte-equal JavaScript file, and from v0.6.0 the specimen's own scripts at its root,
// specimen.js, too; and the tag's pinned page renders the same from file://, a local server, and
// GitHub Pages, in light and in dark, from v0.5.0 its menu opens and applies a profile from each
// of them, and from v0.6.0 its keys open the menu and the help dialog and move focus from each.
// From v0.6.0, the first tag holding every module the extension fixture package's page loads, it
// installs that package with bun, its dependency on the baseline by git tag pointed at the tag on
// GitHub, and checks that the installed package's published files are byte-equal to the tag's
// and that the package's page, served, renders as the tag's pinned page renders; an earlier tag
// skips the install with the reason. It reads the network and writes only temporary directories,
// the install's, which it removes.
//
// Usage: bun scripts/pin.js <tag>   (mise run pin <tag>)
//
// It prints one line per assertion and exits non-zero on any failure, or at once with
// "<tag> not published" when the tag is missing locally or on origin. It is a plain script, not
// a *.test.js file, so the hermetic `bun test` in `mise run check` never collects it.

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { GITHUB, install, PACKAGE, rendered, required } from "../test/extension.js";
import { fileUrl, openPage, serve } from "../test/harness.js";
import { layersLoaded, loaded } from "../test/layers.js";
import { applyFromMenu } from "../test/menu.js";
import { driveKeys } from "../test/shortcuts.js";
import { git, modules, pageScripts, show, stylesheets, tagExists } from "../test/tags.js";

const REPO = "JaimeStill/spike-html-design";
const PAGES = "https://jaimestill.github.io/spike-html-design/";
const root = dirname(import.meta.dir);

const tag = process.argv[2];
if (!tag) {
  console.error("usage: mise run pin <tag>   (e.g. mise run pin v0.1.0)");
  process.exit(2);
}

// The tag must exist locally (its stylesheet files are the reference bytes) and on origin
// (jsDelivr and Pages read GitHub, not this checkout).
const local = tagExists(tag);
const remote = git("ls-remote", "--exit-code", "--tags", "origin", `refs/tags/${tag}`).ok;
if (!local || !remote) {
  const where = [!local && "locally", !remote && "on origin"].filter(Boolean).join(" or ");
  console.error(`✗ ${tag} not published: no tag ${where}`);
  process.exit(1);
}

let failures = 0;

// check prints one assertion's result and counts its failure.
function check(ok, label, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${!ok && detail ? ` (${detail})` : ""}`);
}

// served checks that jsDelivr serves path at the tag with 200, a content-type that matches type
// (named by label), immutable caching, and the tag's own bytes.
async function served(path, type, label) {
  const cdn = `https://cdn.jsdelivr.net/gh/${REPO}@${tag}/${path}`;
  try {
    const response = await fetch(cdn);
    const content = response.headers.get("content-type") ?? "";
    const cache = response.headers.get("cache-control") ?? "";
    const body = Buffer.from(await response.arrayBuffer());
    const tagged = git("show", `${tag}:${path}`);
    check(response.status === 200, `jsDelivr serves ${cdn} with 200`, `got ${response.status}`);
    check(type.test(content), `its content-type is ${label}`, `got "${content}"`);
    check(cache.includes("immutable"), "its cache-control is immutable", `got "${cache}"`);
    check(
      tagged.ok && body.equals(tagged.stdout),
      `its body is byte-equal to ${tag}:${path}`,
      tagged.ok ? "" : `no ${path} at ${tag}`,
    );
  } catch (error) {
    check(false, `jsDelivr serves ${cdn}`, error.message);
  }
}

// Every published stylesheet file at its pinned jsDelivr URL: the entries and every file they
// import, which the browser fetches from the same tag, and any other .css file the tag holds
// outside test/. The list is the tag's, not the working tree's.
const FILES = stylesheets(tag);
for (const path of FILES) await served(path, /^text\/css/, "text/css");

// Every published module at its pinned jsDelivr URL: the pinned page's module scripts, the
// registry they import, and the menu module they fetch on first open among them. A tag cut before
// v0.5.0 holds none, and its check is the stylesheets' alone.
const MODULES = modules(tag);
for (const path of MODULES) {
  await served(path, /^(text|application)\/javascript/, "JavaScript");
}

// Every page script at its pinned jsDelivr URL: specimen.js, which the pinned page loads beside
// keys. It is no package export, but jsDelivr serves it from the tag. A tag cut before v0.6.0
// holds none.
const PAGE_SCRIPTS = pageScripts(tag);
for (const path of PAGE_SCRIPTS) {
  await served(path, /^(text|application)\/javascript/, "JavaScript");
}

// The pinned page from three origins, on the real network: no interception. The file:// and
// local loads read the working tree's pinned page, which never changes once committed.
const page = `pinned/${tag}.html`;
const server = serve(root, { prefix: "/spike-html-design/" });
const origins = {
  "file://": fileUrl(join(root, page)),
  "a local server": `${server.url}${page}`,
  "GitHub Pages": `${PAGES}${page}`,
};
try {
  for (const scheme of ["light", "dark"]) {
    const prints = {};
    for (const [name, url] of Object.entries(origins)) {
      let opened;
      try {
        opened = await openPage(url, { scheme });
        // A load that lost the stylesheet or any of its layer files misses that layer's probe, so
        // two failed loads cannot pass for equal renders. The probes and their values are the
        // tag's own, from the per-tag table, so a later tag's token changes never fail this tag.
        const probes = await layersLoaded(opened, tag);
        const styled = JSON.stringify(probes) === JSON.stringify(loaded(tag));
        check(
          styled,
          `${page} from ${name} loads the baseline and its layers, in ${scheme}`,
          `probes ${JSON.stringify(probes)}`,
        );
        if (styled) prints[name] = JSON.stringify(await opened.fingerprint());
      } catch (error) {
        check(false, `${page} from ${name} loads, in ${scheme}`, error.message);
      } finally {
        opened?.close();
      }
    }
    const [first, ...rest] = Object.keys(origins);
    for (const name of rest) {
      const equal = prints[first] !== undefined && prints[first] === prints[name];
      check(equal, `${page} renders the same from ${first} and ${name}, in ${scheme}`);
    }
  }
  // The menu, from each origin, when the tag publishes modules: from file:// it runs only through
  // jsDelivr's CORS header, since the page's origin is opaque.
  if (MODULES.length) {
    for (const [name, url] of Object.entries(origins)) {
      let opened;
      try {
        opened = await openPage(url, { scheme: "light" });
        const result = await applyFromMenu(opened);
        check(
          result.applied === result.chosen && result.stored === result.chosen && result.repainted,
          `${page} from ${name}: its menu opens and applies ${result.chosen}`,
          JSON.stringify(result),
        );
      } catch (error) {
        check(false, `${page} from ${name}: its menu opens and applies a profile`, error.message);
      } finally {
        opened?.close();
      }
    }
  }
  // The keys, from each origin, when the tag publishes the specimen's own script: T opens the
  // menu, ? opens the help dialog listing the page's bindings, and j moves focus to the first
  // section. From file:// keys and specimen.js run only through jsDelivr's CORS header.
  if (PAGE_SCRIPTS.length) {
    for (const [name, url] of Object.entries(origins)) {
      let opened;
      try {
        opened = await openPage(url, { scheme: "light" });
        const result = await driveKeys(opened);
        const listed = result.help.map(([keys]) => keys).join(",");
        check(
          listed === "T,?,J,K,G,Esc" && result.focused === "tokens",
          `${page} from ${name}: T opens the menu, ? lists ${listed}, j focuses #${result.focused}`,
          JSON.stringify(result),
        );
      } catch (error) {
        check(false, `${page} from ${name}: its keys work`, error.message);
      } finally {
        opened?.close();
      }
    }
  }
} finally {
  server.stop();
}

// The extension fixture package, installed from GitHub at the tag as a consumer installs it: bun
// fetches github:JaimeStill/spike-html-design#<tag> from GitHub, unrewritten, into a temporary
// directory with a cache of its own, so no earlier install answers.
const published = [...FILES, ...MODULES, ...PAGE_SCRIPTS];
const absent = required().filter((path) => !published.includes(path));
if (absent.length) {
  console.log(
    `– the install from GitHub is skipped: ${tag} holds no ${absent.join(", ")}, which the extension fixture package's page loads`,
  );
} else {
  const scratch = mkdtempSync(join(tmpdir(), "spike-html-design-pin-"));
  const project = join(scratch, "extension-package");
  const installed = join(project, "node_modules", PACKAGE);
  let fixture;
  try {
    const result = install(scratch, project, { source: GITHUB, tag });
    check(
      result.exitCode === 0,
      `the extension fixture package installs ${GITHUB}#${tag} with bun`,
      result.stderr.trim(),
    );
    if (result.exitCode === 0) {
      // bun names what it resolved the tag to, abbreviated: GitHub's ref, which for an annotated
      // tag is the tag object, not its commit. Either is the tag's.
      const ref = git("rev-parse", tag).stdout.toString().trim();
      const commit = git("rev-parse", `${tag}^{commit}`).stdout.toString().trim();
      const named = result.stdout.match(new RegExp(`${PACKAGE}@${GITHUB}#([0-9a-f]+)`))?.[1];
      check(
        Boolean(named) && (ref.startsWith(named) || commit.startsWith(named)),
        `bun resolves ${tag} to ${named}, the tag's own`,
        `bun named ${named ?? "nothing"}; ${tag} is ${ref.slice(0, 7)}, commit ${commit.slice(0, 7)}`,
      );
      const pkg = JSON.parse(readFileSync(join(installed, "package.json"), "utf8"));
      check(
        pkg.name === PACKAGE && pkg.version === tag.slice(1),
        `it installs ${PACKAGE} ${tag.slice(1)}`,
        `got ${pkg.name} ${pkg.version}`,
      );
      const differ = published.filter((path) => {
        try {
          return !readFileSync(join(installed, path)).equals(show(tag, path));
        } catch {
          return true;
        }
      });
      check(
        differ.length === 0,
        `its ${published.length} published files are byte-equal to ${tag}'s`,
        `differ or missing: ${differ.join(", ")}`,
      );
      // The package's page, served, against the tag's pinned page from file:// through jsDelivr:
      // the header's elements and every token on the root compute alike.
      fixture = serve(project);
      for (const scheme of ["light", "dark"]) {
        let pinned;
        let opened;
        try {
          pinned = await openPage(origins["file://"], { scheme });
          opened = await openPage(fixture.url, { scheme });
          // Compared as values, not as JSON: the order chromium lists the root's custom properties
          // in differs between the two pages.
          check(
            Bun.deepEquals(await rendered(pinned), await rendered(opened)),
            `the installed package's page renders as ${page} renders, in ${scheme}`,
          );
        } catch (error) {
          check(false, `the installed package's page renders, in ${scheme}`, error.message);
        } finally {
          pinned?.close();
          opened?.close();
        }
      }
    }
  } finally {
    fixture?.stop();
    rmSync(scratch, { recursive: true, force: true });
  }
}

console.log(failures ? `${failures} failed` : `${tag} is published and pinned`);
process.exit(failures ? 1 : 0);
