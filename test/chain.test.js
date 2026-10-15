import { describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { cdn, count, edge, median, record } from "./chain.js";

// The import chain's shape, counted as the networked measurement task, mise run chain, counts it:
// from chromium's Network events for a page that loads one entry from jsDelivr. Here jsDelivr's
// URLs, at the working tree's version, are answered from the working tree's files, and every other
// https:// request 404s, so the counts are the working tree's and the check never reads the
// network. The task's timings are not asserted; the counts are.

const root = dirname(import.meta.dir);
const { version } = await Bun.file(join(root, "package.json")).json();
const CDN = cdn(`v${version}`);

// Every stylesheet outside test/ and every module, each answering its own jsDelivr URL.
const files = [
  ...new Bun.Glob("**/*.css").scanSync(root).filter((path) => !path.startsWith("test/")),
  ...new Bun.Glob("modules/*.js").scanSync(root),
];
const intercept = {
  ...Object.fromEntries(files.map((path) => [`${CDN}${path}`, join(root, path)])),
  "https://": join(import.meta.dir, "fixtures", "absent"),
};

describe("import chain", () => {
  for (const [entry, shape] of [
    ["baseline.css", { files: 10, hops: 1 }],
    ["full.css", { files: 15, hops: 1 }],
    ["modules/keys.js", { files: 2, hops: 1 }],
  ]) {
    test(`${entry} is ${shape.files} files, ${shape.hops} hop below the entry, all served`, async () => {
      const url = `${CDN}${entry}`;
      const { requests, paint } = await record(url, { intercept });
      const chain = count(requests, url);
      expect({ files: chain.files, hops: chain.hops, failed: chain.failed }).toEqual({
        ...shape,
        failed: [],
      });
      expect(chain.span).toBeGreaterThanOrEqual(0);
      expect(paint).toBeGreaterThan(0);
    });
  }

  test("keys.js's second request in sequence is keys-grammar.js", async () => {
    const url = `${CDN}modules/keys.js`;
    const { requests } = await record(url, { intercept });
    expect(count(requests, url).urls).toEqual([url, `${CDN}modules/keys-grammar.js`]);
  });

  test("counts a chain's depth through an import that imports", () => {
    // A synthetic record: a imports b, and b imports c, so the chain is three files, two hops.
    const at = (url, initiator, responded) => ({ url, initiator, status: 200, responded });
    const requests = [
      at("page", null, 0),
      at("a", "page", 10),
      at("b", "a", 20),
      at("c", "b", 35),
      at("other", "page", 50),
    ];
    expect(count(requests, "a")).toMatchObject({ files: 3, hops: 2, span: 25 });
  });

  test("names the edge from Fastly's or Cloudflare's headers", () => {
    expect(edge({ "x-served-by": "cache-fra-etou8220188-FRA, cache-pdk-kfty8610047-PDK" })).toBe(
      "Fastly PDK via FRA",
    );
    expect(edge({ "cf-ray": "8f1e2d3c4b5a6978-IAD" })).toBe("Cloudflare IAD");
    expect(edge({})).toBeNull();
  });

  test("takes the median of the finite runs", () => {
    expect(median([5, 1, 3])).toBe(3);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([null, Number.NaN])).toBeNull();
  });
});
