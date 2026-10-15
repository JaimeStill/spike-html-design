// pin checks a published tag live: jsDelivr serves every stylesheet file the tag publishes (its
// entries, baseline.css and from v0.4.0 full.css, each layer file, and each profile file) as an
// immutable, byte-equal stylesheet, and from v0.5.0 every module in its modules/ as an
// immutable, byte-equal JavaScript file, and from v0.6.0 the specimen's own scripts at its root,
// specimen.js, too; and the tag's pinned page renders the same from file://, a local server, and
// GitHub Pages, in light and in dark, from v0.5.0 its menu opens and applies a profile from each
// of them, and from v0.6.0 its keys open the menu and the help dialog and move focus from each.
// It reads the network and writes nothing.
//
// Usage: bun scripts/pin.js <tag>   (mise run pin <tag>)
//
// It prints one line per assertion and exits non-zero on any failure, or at once with
// "<tag> not published" when the tag is missing locally or on origin. It is a plain script, not
// a *.test.js file, so the hermetic `bun test` in `mise run check` never collects it.

import { dirname, join } from "node:path";
import { fileUrl, openPage, serve } from "../test/harness.js";
import { layersLoaded, loaded } from "../test/layers.js";
import { applyFromMenu } from "../test/menu.js";
import { driveKeys } from "../test/shortcuts.js";
import { git, modules, pageScripts, stylesheets, tagExists } from "../test/tags.js";

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

console.log(failures ? `${failures} failed` : `${tag} is published and pinned`);
process.exit(failures ? 1 : 0);
