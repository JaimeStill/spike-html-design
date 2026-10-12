// tags reads a tag's files from the local repository with git, read-only, so the pinned tests and
// the live pin check compare a pinned page against the tag it pins rather than the working tree.

import { dirname } from "node:path";

const root = dirname(import.meta.dir);

// git runs a read-only git command in the repository and returns whether it exited 0, and its
// stdout.
export function git(...args) {
  const result = Bun.spawnSync(["git", ...args], { cwd: root });
  return { ok: result.exitCode === 0, stdout: result.stdout };
}

// tagExists reports whether tag exists in the local repository.
export function tagExists(tag) {
  return git("rev-parse", "-q", "--verify", `refs/tags/${tag}`).ok;
}

// show returns path's bytes at tag, and throws when the tag has no such file.
export function show(tag, path) {
  const result = git("show", `${tag}:${path}`);
  if (!result.ok) throw new Error(`tags: no ${path} at ${tag}`);
  return result.stdout;
}

// stylesheets returns the stylesheet files tag publishes: its root, baseline.css, and the layer
// files under layers/ it imports, as repository paths.
export function stylesheets(tag) {
  const listed = git("ls-tree", "--name-only", `${tag}`, "layers/");
  if (!listed.ok) throw new Error(`tags: cannot list layers/ at ${tag}`);
  const layers = listed.stdout
    .toString()
    .split("\n")
    .filter((path) => path.endsWith(".css"));
  return ["baseline.css", ...layers];
}
