import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";

const root = dirname(import.meta.dir);
const pkg = await Bun.file(join(root, "package.json")).json();

// targets flattens an exports map, or a string export, into every file path it names, whatever
// its nesting of conditions.
function targets(exports) {
  if (typeof exports === "string") return [exports];
  return Object.values(exports).flatMap(targets);
}

describe("package", () => {
  test("names the package at its version, with no dependencies", () => {
    expect(pkg.name).toBe("spike-html-design");
    expect(pkg.version).toBe("0.3.0");
    for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
      expect([field, pkg[field]]).toEqual([field, undefined]);
    }
  });

  test("exports the lean entry as the package root, and names it its style", () => {
    expect(pkg.exports["."]).toBe("./baseline.css");
    expect(pkg.style).toBe("./baseline.css");
  });

  test("every export resolves to an existing file", async () => {
    const paths = [...targets(pkg.exports), pkg.style];
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect([path, await Bun.file(join(root, path)).exists()]).toEqual([path, true]);
    }
  });
});
