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

// stylesheets returns the stylesheet files tag publishes, as repository paths: its root,
// baseline.css, first, then every other .css file in the tag outside test/, listed recursively so
// a layer file nested in a subdirectory is never missed.
export function stylesheets(tag) {
  const listed = git("ls-tree", "-r", "--name-only", `${tag}`);
  if (!listed.ok) throw new Error(`tags: cannot list the files at ${tag}`);
  const others = listed.stdout
    .toString()
    .split("\n")
    .filter(
      (path) => path.endsWith(".css") && path !== "baseline.css" && !path.startsWith("test/"),
    );
  return ["baseline.css", ...others];
}

// modules returns the JavaScript modules tag publishes, as repository paths: every .js file
// directly in the tag's modules/ directory, sorted as git lists them. A tag cut before v0.5.0
// holds no modules/ and returns none.
export function modules(tag) {
  const listed = git("ls-tree", "-r", "--name-only", `${tag}`);
  if (!listed.ok) throw new Error(`tags: cannot list the files at ${tag}`);
  return listed.stdout
    .toString()
    .split("\n")
    .filter((path) => /^modules\/[^/]+\.js$/.test(path));
}

// pageScripts returns the specimen's own scripts tag publishes, as repository paths: every .js
// file at the tag's root, specimen.js from v0.6.0. They are no package export, but jsDelivr
// serves them from the tag like any other file, and the tag's pinned page loads them from there.
// A tag cut before v0.6.0 holds none and returns none.
export function pageScripts(tag) {
  const listed = git("ls-tree", "--name-only", `${tag}`);
  if (!listed.ok) throw new Error(`tags: cannot list the files at ${tag}`);
  return listed.stdout
    .toString()
    .split("\n")
    .filter((path) => path.endsWith(".js"));
}
