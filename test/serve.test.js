import { expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { serve } from "./harness.js";

const root = dirname(import.meta.dir);

// freePort returns a localhost port that was free a moment ago, from a server that takes one and
// stops at once.
function freePort() {
  const probe = serve(root);
  probe.stop();
  return Number(new URL(probe.url).port);
}

test("the serve script serves the working tree under the Pages subpath and prints its URL", async () => {
  const port = freePort();
  const child = Bun.spawn([process.execPath, join(root, "scripts", "serve.js"), `${port}`], {
    stdout: "pipe",
  });
  try {
    // The first line printed is the URL; the script keeps serving after it.
    const reader = child.stdout.pipeThrough(new TextDecoderStream()).getReader();
    let printed = "";
    while (!printed.includes("\n")) {
      const { value, done } = await reader.read();
      if (done) break;
      printed += value;
    }
    const url = printed.trim();
    expect(url).toBe(`http://127.0.0.1:${port}/spike-html-design/`);
    const specimen = await fetch(url);
    expect(specimen.status).toBe(200);
    expect(await specimen.text()).toContain("<title>spike-html-design specimen</title>");
    expect((await fetch(`${url}baseline.css`)).status).toBe(200);
    expect((await fetch(`${url}full.css`)).status).toBe(200);
    expect((await fetch(`${url}pinned/v0.3.0.html`)).status).toBe(200);
  } finally {
    child.kill();
    await child.exited;
  }
});

test("the serve script rejects a port that is not one", async () => {
  const child = Bun.spawn([process.execPath, join(root, "scripts", "serve.js"), "eighty"], {
    stderr: "pipe",
  });
  expect(await child.exited).toBe(2);
  expect(await new Response(child.stderr).text()).toContain("usage: mise run serve");
});
