// serve serves the working tree on localhost under the Pages subpath, /spike-html-design/, so a
// branch's specimen and pinned pages load as GitHub Pages would serve them, and prints the URL.
// It runs until interrupted and writes nothing.
//
// Usage: bun scripts/serve.js [port]   (mise run serve [--port <port>])
//
// The port defaults to 8000. It is a plain script, not a *.test.js file, so `bun test` never
// collects it.

import { dirname } from "node:path";
import { serve } from "../test/harness.js";

const PORT = 8000;
const root = dirname(import.meta.dir);

const arg = process.argv[2] ?? `${PORT}`;
const port = Number(arg);
if (!/^\d+$/.test(arg) || port < 1 || port > 65535) {
  console.error(`usage: mise run serve [--port <port>]   (got port "${arg}")`);
  process.exit(2);
}

const { url } = serve(root, { prefix: "/spike-html-design/", port });
console.log(url);
