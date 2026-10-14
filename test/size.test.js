import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { audit, BUDGETS, brotli, entries, imports, measure, table } from "../scripts/size.js";
import { ENTRIES } from "./layers.js";

const root = dirname(import.meta.dir);

// FIXTURE is a one-entry package, entry.css importing part.css, that the budget tests audit
// against budgets of their own.
const FIXTURE = join(import.meta.dir, "fixtures", "size");

describe("size report", () => {
  test("measures every CSS entry the package exports, lean then full, and no profile", async () => {
    expect(await entries()).toEqual(Object.keys(ENTRIES));
  });

  for (const [entry, imported] of Object.entries(ENTRIES)) {
    test(`covers exactly ${entry} and the files it imports, in cascade order`, async () => {
      const report = await measure(entry);
      expect(report.files.map((file) => file.path)).toEqual([
        entry,
        ...imported.map(([, path]) => path),
      ]);
    });

    test(`gives each of ${entry}'s files its raw and brotli bytes, and their totals`, async () => {
      const report = await measure(entry);
      for (const { path, raw, brotli: compressed } of report.files) {
        const bytes = new Uint8Array(await Bun.file(join(root, path)).arrayBuffer());
        expect([path, raw, compressed]).toEqual([path, bytes.length, brotli(bytes)]);
        expect([path, compressed < raw]).toEqual([path, true]);
      }
      expect(report.raw).toBe(report.files.reduce((total, file) => total + file.raw, 0));
      expect(report.brotli).toBe(report.files.reduce((total, file) => total + file.brotli, 0));
    });
  }

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

  test("renders an audited report's budget and headroom under its total", async () => {
    const { reports } = await audit();
    const lines = table(reports[0]).split("\n");
    expect(lines.slice(-2).map((line) => line.trim().split(/\s+/))).toEqual([
      ["budget", `${reports[0].budget}`],
      ["headroom", `${reports[0].headroom}`],
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

describe("size budget", () => {
  test("budgets every CSS entry, 14,000 brotli bytes for the lean and 18,000 for the full", async () => {
    expect(BUDGETS).toEqual({ "baseline.css": 14_000, "full.css": 18_000 });
    expect(Object.keys(BUDGETS)).toEqual(await entries());
  });

  test("holds every entry within its budget, with its headroom the budget less its brotli total", async () => {
    const { reports, failures } = await audit();
    expect(failures).toEqual([]);
    expect(reports.map(({ entry, budget, headroom }) => [entry, budget, headroom])).toEqual(
      reports.map(({ entry, brotli: total }) => [entry, BUDGETS[entry], BUDGETS[entry] - total]),
    );
    for (const { entry, headroom } of reports) {
      expect([entry, headroom >= 0]).toEqual([entry, true]);
    }
  });

  test("fails an entry over its budget, by how much, and passes one exactly at it", async () => {
    const { brotli: total } = await measure("entry.css", FIXTURE);
    expect(total).toBeGreaterThan(100);
    const over = await audit({ "entry.css": 100 }, FIXTURE);
    expect(over.failures).toEqual([
      `entry.css is ${total - 100} bytes over its budget: ${total} > 100`,
    ]);
    expect(over.reports.map(({ headroom }) => headroom)).toEqual([100 - total]);
    expect((await audit({ "entry.css": total }, FIXTURE)).failures).toEqual([]);
  });

  test("fails an entry with no budget", async () => {
    expect((await audit({}, FIXTURE)).failures).toEqual(["entry.css has no budget"]);
  });

  test("the script exits 0 within budget and prints each entry's budget and headroom", async () => {
    // The script audits the repository against BUDGETS, as the check runs it; audit's failures
    // are held above, on the fixture.
    const run = Bun.spawnSync(["bun", join(root, "scripts", "size.js")]);
    expect(run.exitCode).toBe(0);
    const out = run.stdout.toString();
    for (const entry of Object.keys(BUDGETS)) {
      expect(out).toContain(`size: ${entry}`);
    }
    expect(out.match(/^\s+headroom\s+\d+$/gm)).toHaveLength(Object.keys(BUDGETS).length);
  });
});
