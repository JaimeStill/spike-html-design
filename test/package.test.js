import { describe, expect, test } from "bun:test";
import { dirname, join, normalize } from "node:path";
import { CURRENT } from "./layers.js";
import { COLOR_PROFILES, profilePath } from "./profiles.js";
import { git } from "./tags.js";

const root = dirname(import.meta.dir);
const pkg = await Bun.file(join(root, "package.json")).json();

// targets flattens an exports map, or a string export, into every file path it names, whatever
// its nesting of conditions.
function targets(exports) {
  if (typeof exports === "string") return [exports];
  return Object.values(exports).flatMap(targets);
}

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

  test("exports each color profile's file as ./profiles/<name>, and nothing else beside the entries", () => {
    const profiles = Object.keys(COLOR_PROFILES);
    expect(Object.keys(pkg.exports)).toEqual([
      ".",
      "./full",
      ...profiles.map((name) => `./profiles/${name}`),
    ]);
    for (const name of profiles) {
      expect([name, pkg.exports[`./profiles/${name}`]]).toEqual([
        name,
        `./${profilePath("color", name)}`,
      ]);
    }
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
