// pin checks a published tag live: jsDelivr serves the tag's baseline.css as an immutable,
// byte-equal stylesheet, and the tag's pinned page renders the same from file://, a local
// server, and GitHub Pages, in light and in dark. It reads the network and writes nothing.
//
// Usage: bun scripts/pin.js <tag>   (mise run pin <tag>)
//
// It prints one line per assertion and exits non-zero on any failure, or at once with
// "<tag> not published" when the tag is missing locally or on origin. It is a plain script, not
// a *.test.js file, so the hermetic `bun test` in `mise run check` never collects it.

import { dirname, join } from "node:path";
import { fileUrl, openPage, serve } from "../test/harness.js";

const REPO = "JaimeStill/spike-html-design";
const PAGES = "https://jaimestill.github.io/spike-html-design/";
const root = dirname(import.meta.dir);

const tag = process.argv[2];
if (!tag) {
  console.error("usage: mise run pin <tag>   (e.g. mise run pin v0.1.0)");
  process.exit(2);
}

// git runs a read-only git command in the repository and returns its exit code and stdout.
function git(...args) {
  const result = Bun.spawnSync(["git", ...args], { cwd: root });
  return { ok: result.exitCode === 0, stdout: result.stdout };
}

// The tag must exist locally (its baseline.css is the reference bytes) and on origin (jsDelivr
// and Pages read GitHub, not this checkout).
const local = git("rev-parse", "-q", "--verify", `refs/tags/${tag}`).ok;
const remote = git("ls-remote", "--exit-code", "--tags", "origin", `refs/tags/${tag}`).ok;
if (!local || !remote) {
  const where = [!local && "locally", !remote && "on origin"].filter(Boolean).join(" or ");
  console.error(`✗ ${tag} not published: no tag ${where}`);
  process.exit(1);
}

let failures = 0;

// check prints one assertion's result and counts its failure.
function check(ok, label, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${!ok && detail ? ` (${detail})` : ""}`);
}

// The stylesheet at its pinned jsDelivr URL.
const cdn = `https://cdn.jsdelivr.net/gh/${REPO}@${tag}/baseline.css`;
try {
  const response = await fetch(cdn);
  const type = response.headers.get("content-type") ?? "";
  const cache = response.headers.get("cache-control") ?? "";
  const body = new Uint8Array(await response.arrayBuffer());
  const tagged = git("show", `${tag}:baseline.css`).stdout;
  check(response.status === 200, `jsDelivr serves ${cdn} with 200`, `got ${response.status}`);
  check(type.startsWith("text/css"), "its content-type is text/css", `got "${type}"`);
  check(cache.includes("immutable"), "its cache-control is immutable", `got "${cache}"`);
  check(Buffer.from(body).equals(tagged), `its body is byte-equal to ${tag}:baseline.css`);
} catch (error) {
  check(false, `jsDelivr serves ${cdn}`, error.message);
}

// The pinned page from three origins, on the real network: no interception. The file:// and
// local loads read the working tree's pinned page, which never changes once committed.
const page = `pinned/${tag}.html`;
const server = serve(root, { prefix: "/spike-html-design/" });
const origins = {
  "file://": fileUrl(join(root, page)),
  "a local server": `${server.url}${page}`,
  "GitHub Pages": `${PAGES}${page}`,
};
try {
  for (const scheme of ["light", "dark"]) {
    const prints = {};
    for (const [name, url] of Object.entries(origins)) {
      let opened;
      try {
        opened = await openPage(url, { scheme });
        // An unstyled load declares no --bg, so two failed loads cannot pass for equal renders.
        const bg = await opened.style(":root", "--bg");
        const styled = bg.startsWith("light-dark(");
        check(styled, `${page} from ${name} loads the baseline, in ${scheme}`, `--bg "${bg}"`);
        if (styled) prints[name] = JSON.stringify(await opened.fingerprint());
      } catch (error) {
        check(false, `${page} from ${name} loads, in ${scheme}`, error.message);
      } finally {
        opened?.close();
      }
    }
    const [first, ...rest] = Object.keys(origins);
    for (const name of rest) {
      const equal = prints[first] !== undefined && prints[first] === prints[name];
      check(equal, `${page} renders the same from ${first} and ${name}, in ${scheme}`);
    }
  }
} finally {
  server.stop();
}

console.log(failures ? `${failures} failed` : `${tag} is published and pinned`);
process.exit(failures ? 1 : 0);
