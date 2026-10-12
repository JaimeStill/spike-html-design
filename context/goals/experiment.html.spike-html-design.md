# goal · experiment.html.spike-html-design

- **State:** building
- **Task:** layers
- **Branch:** layers

## Tasks

1. [ ] layers
2. [ ] themes
3. [ ] toggle
4. [ ] keys
5. [ ] validate

## Task brief · layers

```
Problem       No baseline exists to consume; the other two spikes link to it.
              Evidence 1 and 7 need one layered stylesheet, a published
              specimen, and a pinned tag.
Behaviors
  1. The stylesheet declares its layers tokens, reset, theme, components
     before any rule.
  2. A rule in an app layer declared after the stylesheet overrides a
     components rule of equal or higher specificity, with no !important
     and no added selectors.
  3. Tokens follow herald's names and values: system sans and mono stacks;
     space 1–6, 8, 10, 12, 16; text xs–4xl; radius sm–lg; colors --bg,
     --bg-1, --bg-2, --color, --color-1, --color-2, --divider, --blue,
     --green, --red, --yellow, --orange through light-dark(); no shadow or
     tint tokens.
  4. With no app styles the page follows the system scheme: emulating dark
     or light changes the resolved --bg and --color.
  5. The reset matches herald's: border-box sizing, zero margins, body
     line-height 1.5, block media, herald's form-control fonts, smooth
     anchor scrolling only without reduced motion.
  6. The theme layer sets body font, background and color, mono for pre,
     code and kbd, and styles headings on the text scale, links, lists,
     tables, blockquote and hr.
  7. Each component renders from tokens only: .btn and color variants,
     .card, .input, .label, .badge and color variants, .scroll-y/.scroll-x.
     Tints come from color-mix(); no element has a box-shadow; focus-visible
     shows a 2px outline.
  8. The specimen shows every token, component, variant and prose element,
     and renders the same from file:// and a local server.
  9. A pinned page links only cdn.jsdelivr.net/gh/JaimeStill/
     spike-html-design@v0.1.0/baseline.css; with that request answered from
     the working tree, its computed styles match the specimen's for the
     same markup, from file:// and a local server.
  10. mise run check runs the browser tests in headless chromium and fails
      when chromium is missing.
  11. Every push to main deploys the repository root to Pages through
      actions/checkout, upload-pages-artifact and deploy-pages, with no
      path filters; action pins are exact release tags and mise run
      currency reports them current.
  12. After the tag, a read-only networked command confirms jsDelivr serves
      the tagged stylesheet (200, text/css, immutable, byte-equal to the
      tag) and the pinned page's computed styles match across file://, a
      local server and its Pages URL.
  "Renders the same": identical computed-style fingerprint across modes.
Test seams    A page loaded in headless chromium through one harness helper
              and queried for computed styles; 12 uses it with network on.
Slices
  1. harness: bun test opens a page in headless chromium and asserts a
     computed style; check fails without chromium (10)
  2. tokens, reset, theme + specimen token and prose sections; app-layer
     override test (1–6, 8)
  3. components + specimen section; no-shadow and focus tests (7)
  4. Pages workflow; actionlint and currency clean (11)
  5. pinned page with intercepted file:// and local-server test (9)
  6. live pin check mise task (12); fails "v0.1.0 not published" until the
     tag exists; run after SHIP's tag, result recorded
Out of scope  The other 13 hue names, muted, accent, Flexoki values
              (themes); <theme-toggle>; keys.js, ? dialog, key-hint
              styling; sizes and pin stability (validate); SRI; a CI check.
Door          One-way for v0.1.0 once pushed (jsDelivr caches the tag as
              immutable, freezing baseline.css's path and its token and
              class names); two-way before the push.
Release       v0.1.0 (spike-html-design root)
```

## Progress

slices 4/6 committed · standards — · spec — · editor —

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
- layers: the check drives headless chromium through bun's built-in Bun.WebView, spawned with
  `url: false`; rejected hand-written CDP (rebuilds Bun.WebView) and `--dump-dom` (no keys,
  reload, emulation, or interception).
- layers: the stylesheet is `baseline.css` at the repository root; a codename waits for the
  graduation repository, whose URL changes anyway.
- layers: v0.1.0 freezes herald's color tiers and five hues (blue, green, red, yellow, orange),
  all settled names; themes adds the other 13 hues, muted, and accent. Rejected freezing all 18
  now (bright values before themes picks them) and the full Flexoki scale as tokens (~120
  step-named tokens the settled 18 replace).
- layers: components are herald's six plain classes; `.badge` takes color-named variants, tints
  come from color-mix(), `.card` uses a border for elevation.
- layers: the theme layer styles prose elements (headings, links, lists, tables, blockquote, hr,
  code, pre).
- layers: the check proves the @v0.1.0 page by intercepting cdn.jsdelivr.net and answering with
  the working-tree stylesheet; rejected a live skip-until-tagged fetch and a post-tag commit to
  main outside the pull request.
- layers: a read-only networked mise task proves the live pin right after the tag; validate
  reruns it per tag.
- layers: the Pages workflow deploys only (no check, no mise-action); pull requests run none.
- layers: no actions/configure-pages; Pages is already enabled and nothing reads base_url.

## Pending edits

(none)
