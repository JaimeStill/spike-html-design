import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { audit, BUDGETS, brotli, entries, imports, measure, table } from "../scripts/size.js";
import { ENTRIES } from "./layers.js";

const root = dirname(import.meta.dir);

// MODULES are the package's JS entries, each to the modules it statically imports, depth first,
// each once. theme-menu.js is absent from preferences.js's: preferences.js loads it with a
// dynamic import() when the menu first opens, so it is fetched on demand, not with preferences.js;
// keys-help.js is absent from keys.js's the same way.
const MODULES = {
  "modules/registry.js": [],
  "modules/preferences.js": ["modules/registry.js"],
  "modules/theme-menu.js": ["modules/preferences.js", "modules/registry.js"],
  "modules/register.js": ["modules/registry.js"],
  "modules/register-full.js": ["modules/registry.js"],
  "modules/keys.js": ["modules/keys-grammar.js"],
  "modules/keys-grammar.js": [],
  "modules/keys-help.js": ["modules/keys.js", "modules/keys-grammar.js"],
};

// FIXTURE is a one-entry package, entry.css importing part.css, that the budget tests audit
// against budgets of their own.
const FIXTURE = join(import.meta.dir, "fixtures", "size");

describe("size report", () => {
  test("measures every CSS entry the package exports, lean then full, then every module, and no profile", async () => {
    expect(await entries()).toEqual([...Object.keys(ENTRIES), ...Object.keys(MODULES)]);
  });

  for (const [entry, imported] of Object.entries(MODULES)) {
    test(`covers exactly ${entry} and the modules it statically imports`, async () => {
      const report = await measure(entry);
      expect(report.files.map((file) => file.path)).toEqual([entry, ...imported]);
    });
  }

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

  test("reads every static import form of a module, and skips comments, import(), and bare names", () => {
    const js = `/* import "./skipped.js"; */
      // import { x } from "./skipped.js";
      import { a, b as c } from "./a.js";
      import * as d from '../d.js';
      import e, {
        f,
      } from "./e/f.js";
      import "./side.js";
      export { g } from "./g.js";
      export * from "./h.js";
      import { bare } from "bare";
      const later = import("./lazy.js");
      const url = new URL("./menu.js", import.meta.url);`;
    expect(imports("sub/entry.js", js)).toEqual([
      "sub/a.js",
      "d.js",
      "sub/e/f.js",
      "sub/side.js",
      "sub/g.js",
      "sub/h.js",
    ]);
  });
});

describe("size budget", () => {
  test("budgets every CSS and JS entry the package exports, and nothing else", async () => {
    expect(Object.keys(BUDGETS)).toEqual(await entries());
  });

  test("holds every entry within its budget", async () => {
    expect((await audit()).failures).toEqual([]);
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
