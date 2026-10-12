# goal · experiment.html.spike-html-design

- **State:** building
- **Task:** themes
- **Branch:** themes

## Tasks

1. [x] layers
2. [ ] themes
3. [ ] toggle
4. [ ] keys
5. [ ] validate

## Task brief · themes

```
Problem       v0.1.0 carries herald's grays and five hues: one look, no roles,
              no forced theme, no contrast evidence. Evidence 2, 3 and 4 need
              dark and light themes from one source, a system default that
              follows the OS live, and a contrast table.
Behaviors
  1. Tiers take Primer's resolved values through light-dark(), light /
     dark: --bg #ffffff / #0d1117, --bg-1 #f6f8fa / #151b23, --bg-2
     #eff2f5 / #262c36, --divider #d1d9e0 / #3d444d, --fg #1f2328 /
     #f0f6fc, --fg-1 #59636e / #9198a1, --fg-2 #818b98 / #656c76. The
     names --color, --color-1 and --color-2 no longer exist, and no alias
     keeps them.
  2. Eight hue tokens, each named for its color, light / dark: --red
     #c50d28 / #f27d83, --orange #a24610 / #ed8326, --yellow #805900 /
     #d3910d, --green #2b6e3f / #41b445, --cyan #006a80 / #07ace4, --blue
     #005fcc / #4da0ff, --purple #783ae4 / #b687f7, --magenta #b12f79 /
     #e57bb2. No bright, tint, black, white or ANSI tokens.
  3. Four role tokens alias hues: --accent blue, --success green,
     --warning yellow, --danger red. An app layer that overrides a hue
     changes its role with it.
  4. Links and focus outlines resolve to --accent; selected text sits on
     a translucent color-mix() of --accent.
  5. :root[data-theme="light"] and [data-theme="dark"] set color-scheme
     in the tokens layer. Each resolves its theme's colors whatever the
     emulated system scheme.
  6. With no data-theme, the page follows prefers-color-scheme. Changing
     the emulated scheme on an open page changes the resolved --bg and
     --fg with no reload.
  7. Badges add .badge-cyan, -purple, -magenta, -success, -warning,
     -danger and -accent. Each is its token on a translucent mix of
     that token. Buttons are unchanged.
  8. The tokens layer's source opens with "Colors derived from
     @primer/primitives (MIT, GitHub Inc.),
     https://github.com/primer/primitives". The root stylesheet's
     header says each tag freezes its token and class names.
  9. The specimen shows every token, the new badges, and a section that
     sets the four roles beside the eight hues under the usage rule.
  10. The specimen carries a static contrast table for both themes: every
      color token against --bg as a WCAG 2 ratio to 2 decimals, marked at
      4.5 and 3, with failures recorded, not corrected. The check
      recomputes each ratio in chromium under each emulated scheme and
      fails on any mismatch.
  11. Each pinned page is tested from one table. Once a page's tag exists,
      its markup and render are compared against that tag's specimen,
      root stylesheet and layer files, with that tag's probe values. Until
      then they are compared against the working tree. The v0.1.0 page
      still renders as the v0.1.0 specimen with v0.1.0's stylesheet.
  12. A pinned page links only cdn.jsdelivr.net/gh/JaimeStill/
      spike-html-design@v0.2.0/baseline.css. With that request answered
      hermetically, its computed styles match the specimen's for the same
      markup, from file:// and a local server.
  13. The live pin check reads each tag's probe values. After the tag,
      `mise run pin v0.2.0` passes, and `mise run pin v0.1.0` still passes
      against v0.1.0's values.
  "Resolves": the computed color of a sample that reads the token.
Test seams    A page loaded in headless chromium through the one harness
              helper, queried for computed styles under emulated schemes;
              pinned pages also read their tag's files through git show.
              13 uses it with the network on.
Slices
  1. pinned per tag: table-driven pinned test with per-tag probes in the
     shared helper and the pin script; v0.1.0 compared against its tag,
     shown green after a token edit (11, 13)
  2. tokens: renamed tiers, Primer values, eight hues, four roles, the
     credit and the root header; theme, components and specimen follow the
     rename; links, focus and selection on --accent (1–4, 8)
  3. data-theme hook and live system default (5, 6)
  4. badges, the roles-and-hues specimen section, and STANDARDS.md's
     usage rule and suffix rule (7, 9)
  5. contrast table in the specimen, recomputed by the check (10)
  6. pinned v0.2.0 page and its hermetic test; README and CLAUDE.md
     describe the Primer-derived themes (12)
  7. after SHIP's tag: mise run pin v0.2.0 and v0.1.0, results recorded
     (13)
Out of scope  <theme-toggle>, its storage, and the flash (toggle); keys.js,
              the ? dialog, key-hint styling (keys); sizes (validate);
              Primer's high-contrast and colorblind themes; ANSI tokens;
              correcting contrast failures; a LICENSE for the repository.
Door          One-way for v0.2.0 once pushed (jsDelivr caches the tag as
              immutable, freezing --fg, --fg-1, --fg-2, the eight hue
              and four role names, the seven badge classes, the
              data-theme hook and the tokens layer's bytes). v0.1.0 stays
              as tagged, and its consumers keep --color until they move to
              v0.2.0 and rename. Two-way before the push.
Release       v0.2.0 (spike-html-design root)
```

## Progress

slices 6/6 committed (b2200ad, 8c225c4, e5e1bb6, 2ffb27d, 100fa68, 508a28b) · standards 3d7506b · spec no gaps · editor done

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
- layers: the harness finds chromium with `Bun.which("chromium")`, serializes CDP calls per page
  (a view allows one in flight), and shares one chromium per bun process.
- layers: `color-scheme: light dark`; herald writes `dark light`, which differs only when the
  system states no preference.
- layers: the theme layer gives adjacent prose blocks a `--space-4` top margin through one
  `:where()` rule; h1–h6 take text 4xl down to base at weight 600; `kbd` is outlined as prose,
  and key-hint styling stays with keys.
- layers: components keep herald's `.btn-muted` (on `--color-2`, not the muted token themes
  adds), add no orange button (herald has none), write badge variants `.badge.badge-*`, and keep
  herald's 0.05em letter spacing, 0.4 disabled opacity, and 0.15s transitions.
- layers: a pinned page is flat `pinned/vX.Y.Z.html`, a copy of the specimen that a test holds
  identical; its hermetic test answers the pin from the working tree and answers every other
  https request 404.
- layers: `mise run pin <tag>` runs `scripts/pin.js`, a plain bun script that `bun test` doesn't
  collect; a tag counts as published when it exists locally and on origin.
- layers: the Pages workflow adds `workflow_dispatch` and a `pages` concurrency group.
- layers: standards review deferred to themes (resolved by themes): the pinned page's hermetic
  test compares against the working-tree `index.html` and `baseline.css`. Once either changes
  after v0.1.0, the test must compare against `git show v0.1.0:index.html` and `git show
  v0.1.0:baseline.css`; otherwise it fails, or renders the v0.1.0 page with newer CSS and
  misstates evidence 8.
- layers: round 3 (after the first session brief): the source is one file per layer, with
  baseline.css as the root that declares the order and imports each into its layer; rejected one
  file, which herald avoids and gets away with only because its bundler inlines the imports. The
  pinned URL is unchanged; the extra round trip is measured under evidence 9.
- layers: the layer files live in `layers/` (tokens.css, reset.css, theme.css, components.css);
  their paths freeze at v0.1.0 with baseline.css's.
- themes: two color layers: eight hue tokens, and role tokens that alias them; supersedes setup's
  "18 hue tokens". Rejected ANSI 16 as the token model: across nine palettes "bright" has no
  stable look, and black or white sits at 1.0–1.6:1 on one of the two backgrounds.
- themes: colors derive from Primer's resolved values, @primer/primitives 11.10.0 (3f51f80),
  without adopting its layered system; supersedes setup's Flexoki. Rejected Flexoki (3 light hues
  and 1 dark under 4.5, faint text 2.0 / 2.6), Selenized (brights barely distinct), Modus
  (GPL-3.0, no orange), Gruvbox (its cyan is green), Solarized (brights are grays), Tokyo Night
  day (13 of 13 hues under 4.5), Catppuccin latte (8 hues under 3), Rosé Pine (brights equal
  normals; hues not semantic), Nord (dark only).
- themes: the hues are red, orange, yellow, green, cyan, blue, purple, magenta, from Primer's
  display-*-fgColor (magenta is its "pink"), 5.9:1 or more in light and 7.0:1 in dark; no bright
  or tint tokens, tints stay color-mix() at use. Rejected Primer's ANSI normals (light yellow
  #4d2d00 is brown). Supersedes layers' "themes adds the other 13 hues, muted, and accent".
- themes: --accent, --success, --warning, --danger alias blue, green, yellow, red, so a hue
  override carries to its role; rejected Primer's own role values (4.87–5.24 in light).
- themes: the roles are accent, success, warning (not Primer's "attention"), and danger; no info,
  muted, link, focus, or syntax tokens. Links, focus outlines, and selection read --accent.
- themes: usage rule: a role marks state or interaction; a hue marks a category and never implies
  status; on a page that shows status, categories draw first from cyan, purple, magenta, orange.
  Stated in STANDARDS.md and in a specimen section.
- themes: tiers take Primer's bgColor-default, bgColor-muted, control-bgColor-hover,
  borderColor-default (opaque), fgColor-default, fgColor-muted, fgColor-disabled; --fg-2 at
  3.45 / 3.57 and the divider are recorded, not corrected.
- themes: --color, --color-1, --color-2 become --fg, --fg-1, --fg-2 at v0.2.0, no aliases; each
  tag freezes its own names, and v0.1.0 stays as tagged. No outside consumer linked the pin.
- themes: a variant is always a suffix, never a prefix (STANDARDS.md).
- themes: badges add cyan, purple, magenta, success, warning, danger, accent; buttons keep
  herald's set. Supersedes layers' "a badge says its color, not its meaning" for role variants.
- themes: Primer is credited by a comment heading the tokens layer, "Colors derived from
  @primer/primitives (MIT, GitHub Inc.), https://github.com/primer/primitives", with no version
  (11.10.0 recorded here); rejected the full MIT notice.
- themes: :root[data-theme="light"|"dark"] sets color-scheme in the tokens layer, and toggle
  writes it later; with no attribute the page follows the system, live.
- themes: the contrast table is static in the specimen, and the check recomputes it in chromium
  under each emulated scheme, failing on a mismatch at 2 decimals; no script, no generated file.
- themes: the table measures every color token against --bg, WCAG 2, marked at 4.5 and 3;
  failures recorded, not corrected. Rejected APCA and --bg-1 rows.
- themes: pinned pages are tested from one table, against `git show <tag>:` once the tag exists
  and the working tree before, with per-tag probes shared by the pin script and the layers
  helper. Resolves layers' "standards review deferred to themes".
- themes: BUILD: the probes are one per-tag table of (selector, property, value) in
  `test/layers.js`; its last key is the working tree's, and a tag not yet cut adds its entry
  last.
- themes: BUILD: a tag's stylesheet list is `git ls-tree <tag> layers/`, in the pinned test and
  `scripts/pin.js`; the read-only git helpers live in `test/tags.js`, and the pinned test writes
  a tag's files to a temp directory to answer intercepted requests.
- themes: BUILD: `::selection` is a 30% color-mix() of --accent; hover fills stay 15%.
- themes: BUILD: a role badge reads its role token (`var(--success)`), not the hue.
- themes: BUILD: the contrast table marks "AA", "AA large", and "fail", judged on the unrounded
  ratio, and shows them on the success, warning, and danger badges; it is the specimen's last
  section.
- themes: BUILD: the data-theme rules follow the `:root` token block.
- themes: standards review: forced-theme tests over every color token replace the light-dark()
  declaration test, which depended on the source's structure; the duplicate no-alias test is
  removed.
- themes: notes outside the task: Primer's high-contrast and colorblind themes as later themes;
  a LICENSE for this repository.

## Pending edits

- coordinator · html-artifacts.md, "Style baseline": "One native stylesheet" becomes a root
  stylesheet that imports one file per layer (layers.round 3).
- coordinator · html-artifacts.md, "Style baseline", "Palette": the 18 ANSI hue tokens, muted, and
  accent become the tiers (bg, bg-1, bg-2, fg, fg-1, fg-2, divider), eight hue tokens each named
  for its color, four role tokens aliasing them, the usage rule, and the suffix rule (themes).
- coordinator · html-artifacts.md, "Palette": "Primer is not used, since its layered palette
  pays off only inside github.com" becomes "colors derive from a flat subset of Primer's
  resolved values; its layered system isn't adopted" (themes).
- coordinator · html-artifacts.md, "Themes": Flexoki and its notice become "derived from
  @primer/primitives (MIT), credited by a source comment"; the omarchy and kanagawa rejections
  stay (themes).
- coordinator · roadmap.toml, `tasks.themes` summary: Flexoki with 18 ANSI hue tokens becomes
  dark and light themes derived from Primer's resolved values, with eight hue tokens and four
  role tokens over them (themes).
