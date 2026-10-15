// extension installs the extension fixture package, test/fixtures/extension-package, with bun and
// reads how its page renders, for the hermetic extension-package test and the live pin check. The
// fixture depends on the baseline by git tag as a consumer writes it,
// github:JaimeStill/spike-html-design#<tag>; the test installs that dependency offline from the
// local repository, and the pin check installs it from GitHub.

import { cpSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FINGERPRINT_PROPERTIES } from "./harness.js";

export const FIXTURE = join(import.meta.dir, "fixtures", "extension-package");
export const MANIFEST = JSON.parse(readFileSync(join(FIXTURE, "package.json"), "utf8"));
export const PACKAGE = "spike-html-design";
// GITHUB is the dependency's source as the fixture declares it, without its tag.
export const GITHUB = "github:JaimeStill/spike-html-design";

// required returns the package files the fixture's page loads from node_modules, as repository
// paths, read from its page: the entry it links and every module its import map names. A tag
// that holds none of them, or not all, cannot serve the page.
export function required() {
  const page = readFileSync(join(FIXTURE, "index.html"), "utf8");
  const paths = page.matchAll(new RegExp(`\\./node_modules/${PACKAGE}/([^"]+)`, "g"));
  return [...new Set([...paths].map(([, path]) => path))];
}

// install copies the fixture into project, a new directory under scratch, points its one
// dependency at source#tag, and installs it with bun, its cache inside scratch so no earlier
// install answers. env adds to the install's environment, as the offline test's closed proxies
// do. It returns bun's exit code, stdout, and stderr.
export function install(scratch, project, { source, tag, env = {} }) {
  cpSync(FIXTURE, project, { recursive: true });
  const manifest = { ...MANIFEST, dependencies: { [PACKAGE]: `${source}#${tag}` } };
  writeFileSync(join(project, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  const result = Bun.spawnSync([process.execPath, "install", "--no-save"], {
    cwd: project,
    env: { ...process.env, BUN_INSTALL_CACHE_DIR: join(scratch, "cache"), ...env },
  });
  return {
    exitCode: result.exitCode,
    stdout: result.stdout.toString(),
    stderr: result.stderr.toString(),
  };
}

// RENDERED are the elements both the fixture's page and the pinned page hold, in the header the
// fixture copies from the specimen, and PROPERTIES what the comparison reads on each: the
// fingerprint's properties but the box's size and margins, which the specimen's own layout layer
// sets and the fixture's page leaves. The header's intro paragraph is left out for the same
// reason, since that layer colors it; its code and kbd, which the baseline colors, are kept.
const RENDERED = [
  "html",
  "body",
  "body > header > h1",
  "body > header > button",
  "body > header > button > kbd",
  "body > header > p > code",
  "body > header > p > kbd",
];
const PROPERTIES = FINGERPRINT_PROPERTIES.filter(
  (property) => !/^(width|height|margin-)/.test(property),
);

// rendered resolves to the root's custom properties and each of RENDERED's computed PROPERTIES.
export function rendered(page) {
  return page.evaluate(`(() => {
    const root = getComputedStyle(document.documentElement);
    const tokens = Object.fromEntries([...root].filter((name) => name.startsWith("--"))
      .map((name) => [name, root.getPropertyValue(name).trim()]));
    const elements = Object.fromEntries(${JSON.stringify(RENDERED)}.map((selector) => {
      const style = getComputedStyle(document.querySelector(selector));
      return [selector, Object.fromEntries(${JSON.stringify(PROPERTIES)}
        .map((name) => [name, style.getPropertyValue(name)]))];
    }));
    return { tokens, elements };
  })()`);
}
