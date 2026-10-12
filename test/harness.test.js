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
    expect(await page.style(":root", "--accent")).toBe("rgb(32, 94, 166)");
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
