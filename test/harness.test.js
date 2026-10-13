import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileUrl, openPage, serve } from "./harness.js";

const fixtures = join(import.meta.dir, "fixtures");
const pages = [];
const server = serve(fixtures);

// open opens a page and closes it after the test, so bun test exits with no tab left open.
async function open(url, options) {
  const page = await openPage(url, options);
  pages.push(page);
  return page;
}

afterEach(() => {
  for (const page of pages.splice(0)) page.close();
});
afterAll(() => server.stop());

describe("harness", () => {
  test("reads a computed style and a custom property from file://", async () => {
    const page = await open(fileUrl(join(fixtures, "index.html")), { scheme: "light" });
    expect(await page.style("p", "color")).toBe("rgb(16, 15, 15)");
    expect(await page.style(":root", "--blue")).toBe("rgb(32, 94, 166)");
  });

  test("reads a computed style from the local server", async () => {
    const page = await open(server.url, { scheme: "light" });
    expect(page.view.url).toStartWith("http://127.0.0.1:");
    expect(await page.style("p", "color")).toBe("rgb(16, 15, 15)");
  });

  test("the local server answers 404 for a missing file", async () => {
    expect((await fetch(`${server.url}missing.html`)).status).toBe(404);
  });

  test("evaluates an expression in the page", async () => {
    const page = await open(fileUrl(join(fixtures, "index.html")));
    expect(await page.evaluate("document.querySelector('p').textContent")).toBe("fixture");
  });

  test("emulates prefers-color-scheme both ways", async () => {
    const page = await open(fileUrl(join(fixtures, "index.html")), { scheme: "dark" });
    expect(await page.style("p", "color")).toBe("rgb(206, 205, 195)");
    await page.setScheme("light");
    expect(await page.style("p", "color")).toBe("rgb(16, 15, 15)");
  });

  test("keeps the emulated scheme when another media feature is set", async () => {
    const page = await open(fileUrl(join(fixtures, "index.html")), { scheme: "dark" });
    await page.setMedia("prefers-reduced-motion", "reduce");
    expect(await page.evaluate("matchMedia('(prefers-reduced-motion: reduce)').matches")).toBe(
      true,
    );
    expect(await page.style("p", "color")).toBe("rgb(206, 205, 195)");
  });

  test("the local server serves under a prefix and answers 404 outside it", async () => {
    const prefixed = serve(fixtures, { prefix: "/project/" });
    try {
      expect(prefixed.url).toEndWith("/project/");
      expect((await fetch(prefixed.url)).status).toBe(200);
      expect((await fetch(`${prefixed.url}pinned.css`)).status).toBe(200);
      expect((await fetch(prefixed.url.replace("/project/", "/pinned.css"))).status).toBe(404);
    } finally {
      prefixed.stop();
    }
  });

  test("the local server takes a fixed port when given one", async () => {
    const probe = serve(fixtures);
    const port = Number(new URL(probe.url).port);
    probe.stop();
    const fixed = serve(fixtures, { port });
    try {
      expect(fixed.url).toBe(`http://127.0.0.1:${port}/`);
      expect((await fetch(fixed.url)).status).toBe(200);
    } finally {
      fixed.stop();
    }
  });

  test("fingerprints every element's resolved styles and the root's custom properties", async () => {
    const page = await open(fileUrl(join(fixtures, "index.html")), { scheme: "light" });
    const print = await page.fingerprint(["color"]);
    expect(print.map(([path]) => path)).toEqual([
      "html",
      "html > head:nth-child(1)",
      "html > head:nth-child(1) > meta:nth-child(1)",
      "html > head:nth-child(1) > title:nth-child(2)",
      "html > head:nth-child(1) > style:nth-child(3)",
      "html > body:nth-child(2)",
      "html > body:nth-child(2) > p:nth-child(1)",
    ]);
    expect(print[0][1]).toEqual({ color: "rgb(0, 0, 0)", "--blue": "rgb(32, 94, 166)" });
    expect(print.at(-1)[1]).toEqual({ color: "rgb(16, 15, 15)" });
    await page.setScheme("dark");
    expect(await page.fingerprint(["color"])).not.toEqual(print);
  });

  test("answers an intercepted URL prefix from a local file", async () => {
    const page = await open(fileUrl(join(fixtures, "pinned.html")), {
      intercept: {
        "https://cdn.jsdelivr.net/gh/example/fixture@v0.0.0/": join(fixtures, "pinned.css"),
      },
    });
    expect(await page.style("p", "color")).toBe("rgb(102, 128, 11)");
  });

  test("style throws when no element matches", async () => {
    const page = await open(fileUrl(join(fixtures, "index.html")));
    await expect(page.style("#absent", "color")).rejects.toThrow("no element matches #absent");
  });

  test("fails with a clear message when chromium is not on PATH", async () => {
    // A fresh bun process, since chromium is spawned once per process and this one has it.
    const script = `import { openPage } from ${JSON.stringify(join(import.meta.dir, "harness.js"))};
      await openPage("about:blank");`;
    const child = Bun.spawn([process.execPath, "-e", script], {
      env: { PATH: dirname(process.execPath) },
      stderr: "pipe",
    });
    expect(await child.exited).not.toBe(0);
    expect(await new Response(child.stderr).text()).toContain(
      "harness: chromium not found on PATH",
    );
  });
});
