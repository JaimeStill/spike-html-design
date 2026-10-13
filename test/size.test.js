import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { brotli, entries, imports, measure, table } from "../scripts/size.js";
import { LAYERS, layerPath } from "./layers.js";

const root = dirname(import.meta.dir);

describe("size report", () => {
  test("measures every CSS entry the package exports, today the lean entry alone", async () => {
    expect(await entries()).toEqual(["baseline.css"]);
  });

  test("covers exactly the lean entry and the layer files it imports, in cascade order", async () => {
    const report = await measure("baseline.css");
    expect(report.files.map((file) => file.path)).toEqual([
      "baseline.css",
      ...LAYERS.map(layerPath),
    ]);
  });

  test("gives each file's raw and brotli bytes, and their totals", async () => {
    const report = await measure("baseline.css");
    for (const { path, raw, brotli: compressed } of report.files) {
      const bytes = new Uint8Array(await Bun.file(join(root, path)).arrayBuffer());
      expect([path, raw, compressed]).toEqual([path, bytes.length, brotli(bytes)]);
      expect([path, compressed < raw]).toEqual([path, true]);
    }
    expect(report.raw).toBe(report.files.reduce((total, file) => total + file.raw, 0));
    expect(report.brotli).toBe(report.files.reduce((total, file) => total + file.brotli, 0));
  });

  test("renders a row per file and a total row", async () => {
    const report = await measure("baseline.css");
    const lines = table(report).split("\n");
    expect(lines).toHaveLength(report.files.length + 3);
    expect(lines.at(-1).trim().split(/\s+/)).toEqual([
      "total",
      `${report.raw}`,
      `${report.brotli}`,
    ]);
  });

  test("reads every @import form and ignores one inside a comment", () => {
    const css = `/* @import url(./skipped.css); */
      @import url(./a.css) layer(x);
      @import url("b/c.css");
      @import "../d.css" layer(y);`;
    expect(imports("sub/entry.css", css)).toEqual(["sub/a.css", "sub/b/c.css", "d.css"]);
  });
});
