import { describe, expect, test } from "bun:test";
import { dirname, join, normalize } from "node:path";
import { imports } from "../scripts/size.js";
import { CURRENT, ENTRIES } from "./layers.js";
import { FACET_PROFILES, profilePath } from "./profiles.js";
import { git } from "./tags.js";

const root = dirname(import.meta.dir);
const pkg = await Bun.file(join(root, "package.json")).json();

// targets flattens an exports map, or a string export, into every file path it names, whatever
// its nesting of conditions.
function targets(exports) {
  if (typeof exports === "string") return [exports];
  return Object.values(exports).flatMap(targets);
}

// PROFILE_EXPORTS are the export keys of every profile, facet by facet, each to the file it
// names: ./profiles/<facet>/<name>, nested by facet, the default first.
const PROFILE_EXPORTS = Object.fromEntries(
  Object.entries(FACET_PROFILES).flatMap(([facet, { names }]) =>
    names.map((name) => [`./profiles/${facet}/${name}`, profilePath(facet, name)]),
  ),
);

// MODULES are the package's JS exports, each key to the module it names.
const MODULES = {
  "./registry": "./modules/registry.js",
  "./preferences": "./modules/preferences.js",
  "./theme-menu": "./modules/theme-menu.js",
  "./register": "./modules/register.js",
  "./register/full": "./modules/register-full.js",
  "./keys": "./modules/keys.js",
  "./keys/grammar": "./modules/keys-grammar.js",
};

describe("package", () => {
  test("names the package at the tag the working tree answers, with no dependencies", () => {
    expect(pkg.name).toBe("spike-html-design");
    // The version is the tag whose probes and pinned page the working tree carries, so a release
    // that bumps one and not the other fails.
    expect(`v${pkg.version}`).toBe(CURRENT);
    for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
      expect([field, pkg[field]]).toEqual([field, undefined]);
    }
  });

  test("exports the lean entry as the package root, and names it its style", () => {
    expect(pkg.exports["."]).toBe("./baseline.css");
    expect(pkg.style).toBe("./baseline.css");
  });

  test("exports the full entry as ./full", () => {
    expect(pkg.exports["./full"]).toBe("./full.css");
  });

  test("exports every profile of every facet as ./profiles/<facet>/<name>, then the modules, and nothing else", () => {
    expect(Object.keys(pkg.exports)).toEqual([
      ".",
      "./full",
      ...Object.keys(PROFILE_EXPORTS),
      ...Object.keys(MODULES),
    ]);
    for (const [key, path] of Object.entries(PROFILE_EXPORTS)) {
      expect([key, pkg.exports[key]]).toEqual([key, `./${path}`]);
    }
  });

  test("exports each module under its own key", () => {
    for (const [key, path] of Object.entries(MODULES)) {
      expect([key, pkg.exports[key]]).toEqual([key, path]);
    }
  });

  test("the lean entry imports each facet's default profile export, and the full entry every one", async () => {
    // A page that links an entry has the profiles it imports, so a profile export a page adds
    // beside the lean entry is one the lean entry leaves out, and the full entry leaves none out.
    const imported = async (entry) => imports(entry, await Bun.file(join(root, entry)).text());
    const defaults = Object.entries(FACET_PROFILES).map(([facet, { names }]) =>
      profilePath(facet, names[0]),
    );
    expect(Object.keys(ENTRIES)).toEqual(["baseline.css", "full.css"]);
    const lean = await imported("baseline.css");
    const full = await imported("full.css");
    const exported = Object.values(PROFILE_EXPORTS);
    expect(exported.filter((path) => lean.includes(path))).toEqual(defaults);
    expect(exported.filter((path) => full.includes(path))).toEqual(exported);
  });

  test("every export resolves to an existing file, one the package publishes", async () => {
    const paths = [...targets(pkg.exports), pkg.style];
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect([path, await Bun.file(join(root, path)).exists()]).toEqual([path, true]);
      // A tag publishes the repository's files, as jsDelivr serves them, but what git ignores and
      // the test fixtures, which no consumer resolves.
      const published = !git("check-ignore", "-q", path).ok && !normalize(path).startsWith("test/");
      expect([path, published]).toEqual([path, true]);
    }
  });
});
