# goal · experiment.html.spike-html-design

- **State:** idle
- **Task:** none
- **Branch:** none

## Tasks

1. [ ] layers
2. [ ] themes
3. [ ] toggle
4. [ ] keys
5. [ ] validate

## Decisions

- setup: the evidence is the nine items in `context/README.md`, "The evidence".
- setup: one dark and one light theme from Flexoki (MIT); rejected omarchy's 22 themes, which add
  a generator and vendored files and whose hue slots aren't semantic (hackerman's `red` is
  green; no theme has a bright orange), and rejected kanagawa wave and lotus, mapped by hand.
- setup: 18 hue tokens, the ANSI 16 plus orange and bright orange; brown dropped.
- setup: `<theme-toggle>` cycles system, light, dark on T, stored in localStorage; with nothing
  stored the theme follows the system setting, live.
- setup: kind code; `mise run check` = biome ci, shellcheck, actionlint over workflows, bun test;
  no package dependencies. Rejected Deno (no CSS lint, needs jsr:@std/toml) and Python (a second
  language).
- setup: browser behavior is tested inside the check through headless chromium, which fails when
  chromium is missing; rejected Playwright (an npm dependency and its own browser downloads) and
  happy-dom (no real focus or storage).
- setup: this spike deploys the first Pages workflow; the other two spikes copy it.
- setup: one minor tag per task, v0.1.0 to v0.4.0; each task brief carries a Release line and a
  one-way door, since jsDelivr caches a tag as immutable.
- setup: the section tree with reading progress is spike-html-artifacts'; this spike ships the
  key-hint styling.
- setup: no gate; merge is plain `gh pr merge --merge --delete-branch`; `[remote] ci` waits for
  the Pages deploy on the merge commit before a tag. The repository is public, which jsDelivr
  `/gh/` requires.
- setup: `mise run currency` covers the mise tools and the workflows' action pins.
- setup: references are keys in the coordinator's catalog: herald only. The spike keeps no
  references files.

## Pending edits

(none)
