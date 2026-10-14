# goal · experiment.html.spike-html-design

- **State:** building
- **Task:** profiles
- **Branch:** profiles

## Tasks

1. [x] layers
2. [x] themes
3. [x] facets
4. [ ] profiles
5. [ ] preferences
6. [ ] keys
7. [ ] validate

## Task brief · experiment.html.spike-html-design · profiles

Problem       v0.3.0 has one color profile, Flexoki, fixed at the root, and an interface
              built from Flexoki alone. Evidence 3 and 5 need four color profiles, each
              light and dark, applied to any subtree, with contrast recorded per profile.
              Measured against all four palettes, the interface lacked a pane surface and
              carried a border step nothing reads. Profiles also brings the full entry
              point, the enforced size budget, the workbench layout the architect called
              out, and the kbd styling formerly assigned to keys. preferences and validate
              build on it. (Evidence 3, 5; 11's budget.)

Behaviors
  Color interface
  1. The color facet is exactly 16 tokens, each a light and dark pair:
     --bg-0, the pane: darker than --bg in both schemes; --bg, the page; --bg-2, the
     element surface: one step from --bg toward the text in each scheme; --border, for
     dividers, containers, and hover fills; --border-2, for control boundaries; --fg,
     --fg-2, --fg-3, for text; the eight hues. --border-3 is gone, and no other v0.3.0
     color name changes. Flexoki's ladder shifts one step: light pane base-50, page
     paper, surface base-100, borders base-150 and base-200; dark pane black, page
     base-950, surface base-900, borders base-850 and base-800. Text and hues keep their
     v0.3.0 Flexoki steps.
  2. Five color profiles, each its own file: Flexoki (default), Tokyo Night (day /
     night), Catppuccin (latte / mocha), Everforest (hard light / hard dark), and Primer
     (GitHub Light Default / Dark Dimmed). Each maps upstream swatches onto the 16 tokens
     by role, as starting values the review stops confirm. Each is credited by a heading
     comment naming source, license, and upstream version: Flexoki MIT; Tokyo Night
     Apache-2.0 at v4.14.1; Catppuccin MIT at palette v1.8.0; Everforest
     (sainnhe/everforest) MIT and Primer (GitHub VS Code theme) MIT, each at a pinned
     upstream version. (Review redirect: Kanagawa dropped.)

  Selection
  3. data-palette="flexoki" | "tokyo-night" | "catppuccin" | "everforest" | "primer" on any element
     applies that profile to its subtree at zero specificity; the nearest scope wins.
     With no attribute anywhere Flexoki applies; data-palette on the root overrides it.
     A scope sets only color tokens and re-sets color and background on its own element,
     so a scoped container paints as the root does. A consumer's later layer still beats
     every profile.
  4. data-scheme="light" | "dark" on any element forces that scheme for its subtree. With
     no attribute the page follows the system scheme, live; data-theme does nothing.
  5. A preview container, an element with data-palette and data-scheme, renders its
     subtree as that profile and scheme render at the root: for every profile and scheme,
     every element of the preview card has the same computed colors in both cases.

  Interaction and elements
  6. Interaction reads one hook, --interaction-color, falling back to --blue: link color,
     the focus outline, the caret, accent-color, ::selection's 30% mix, and control hover
     borders. Neither the baseline nor any profile declares it; a consumer setting it on
     any element re-colors all interaction in that subtree.
  7. On hover, enabled text inputs, select, textarea, the native button, button inputs,
     the file button, and neutral .button take a border in the interaction color. Active
     and focus keep their treatment, .button-<hue> keeps its own hook color, and disabled
     controls don't change.
  8. Inline code outside pre has no chip: the code font, its text read as
     var(--code-color, var(--green)); inside a link it takes the link's color and
     underline. (Review redirect: replaces the --bg-2 chip.)
  9. kbd is an outlined key: a --border-2 border at --line-s with a --line-m bottom edge,
     no fill, --radius-sm. Its border and text read --kbd-color, falling back to
     --border-2 and --fg. All key-hint styling is kbd's.
  10. Table header cells sit on --bg-2. .table-striped's default stripe becomes a
      color-mix() distinct from the header surface, still replaced by --table-stripe.
  11. The elements behavior test still holds: under reset and elements, every element lays
      out as with no stylesheet, apart from the reset's allowances.
  11a. A blockquote's start edge is a neutral --border-2 rule, not the interaction color.
  11b. A dialog's padding is a step tighter, with more space before its actions.

  Contrast
  12. Each profile records its contrast in each scheme: every text token and hue over
      every surface (--bg-0, --bg, --bg-2, --border, --border-2), WCAG 2, short marks and
      a legend. Recorded, not corrected; the check recomputes every cell in chromium at 2
      decimals.

  Package
  13. The lean entry holds the foundation and Flexoki. The full entry is self-contained:
      everything the lean entry holds plus Tokyo Night, Catppuccin, Everforest, and
      Primer, each imported one hop deep into the color sub-layer.
  14. package.json names spike-html-design at 0.4.0 and exports the lean entry as ".",
      the full entry as "./full", and each profile as its own export; no dependencies;
      every export resolves to a published file.
  15. A consumer linking the lean entry and importing one profile's export into the color
      sub-layer can select that profile with data-palette.
  16. The check fails when an entry's per-file brotli-11 sum exceeds its budget: 14,000
      bytes lean, 16,000 full. (Review redirect: lean raised from 12,000.) Raw sizes stay reported, not enforced.

  Specimen
  17. The specimen is a workbench in reference variant A's console layout, with no
      workbench note. It loads every profile; forms are rearranged within the specimen's
      own composition; embedded cells are denser, with realistic data: URL content and a
      scheme-aware iframe; a comparison grid holds a compact preview card for every
      profile and scheme (ten); the contrast section gives each profile one row, light
      and dark records side by side. All arrangement stays in the specimen layer.
  17a. (Review redirect.) The specimen's copy reads as clear, grammatical technical
      documentation for a human reader. No paragraph carries its own measure: text spans
      its panel, and the page column caps at 80rem. The header has no rule or meta line
      and sits close to Tokens; section labels and layer names are larger; color panels
      drop their intros and top-align their tables, with room between text and table;
      --space-fluid and --space-base head the space scale and --type-fluid heads the type
      scale, shown as fluid expansion across the display range, with no separate
      progress panel (the progress tokens are documented as internal); the tables
      example is wider, with more columns and room for its caption; the embedded cells
      are evenly arranged.
  18. The preview card shows a heading; a paragraph with a link, inline code, and kbd; a
      neutral button and two hue buttons; a labeled text input; a three-row table with a
      header and a striped row; a strip of every color token; and a label naming the
      profile and scheme. A fixture page renders the same card per profile, for reuse by
      validate's extension fixture.
  19. The specimen renders the same from file:// and from a local server under the Pages
      subpath.
  20. A v0.4.0 pinned page is the specimen linking the @v0.4.0 jsDelivr full entry. Its
      hermetic test and the live pin check cover every stylesheet the tag publishes; the
      v0.1.0, v0.2.0, and v0.3.0 pinned pages still pass against their own tags.
  21. README, STANDARDS.md, and the goal record describe v0.4.0: the interface and its
      roles, profile selection and nesting, the three hooks in elements and their
      fallbacks, kbd's ownership, the entries and exports, and the enforced budgets.

Test seams    the harness page: a page in headless chromium, read for computed styles under
              emulated scheme and viewport; the check's size report over the exported entries.

Slices
  1. The interface: the 16-token color facet with Flexoki's shifted ladder, --border-3
     renamed, data-palette and data-scheme scopes on any element. Demo: the specimen in
     both schemes, a container forced dark inside a light page.
  2. Interaction and elements: --interaction-color and hover borders, the code chip and
     --code-color, the kbd keycap and --kbd-color, the header surface, the stripe mix,
     each with an extension test. Demo: the specimen's elements and tools sections.
  3. Three profiles: Kanagawa, Tokyo Night, Catppuccin, credited, with per-profile
     exports, the preview-container equivalence test, per-profile contrast records, and
     the preview-card fixture page. Demo: the fixture, one card per profile and scheme.
  4. The workbench: console layout, note removed, forms rearranged, embedded cells, the
     eight-card comparison grid, the contrast rows. Demo: the served workbench.
  ── REVIEW STOP 1 (held after slice 4): Flexoki's shifted ladder, the stripe, Tokyo
     Night and Catppuccin accepted; redirect recorded in Decisions ──
  4b. Review fixes: drop Kanagawa; add Everforest (hard) and Primer (Light Default /
     Dark Dimmed) with exports, contrast records, and cards; inline code as green text;
     the blockquote edge; the dialog spacing; the specimen copy and layout fixes. Demo:
     the served workbench.
  ── REVIEW STOP 2: the architect views the new profiles and the fixes in both schemes
     before the full entry and budget are built ──
  5. The full entry and package: self-contained full entry, package.json at 0.4.0 with
     ".", "./full", and per-profile exports, a lean-plus-one-profile consumer test, the
     specimen on the full entry. Demo: the check passes; the size report lists both.
  6. The budget: per-entry brotli budgets enforced by the check. Demo: the check passes;
     a fixture entry over its budget fails.
  7. Docs and pin: README, STANDARDS.md, the goal record, and the v0.4.0 pinned page
     synced with the final specimen. Demo: the check passes; serve shows the final
     workbench.

Out of scope  second space and type profiles and data-space/data-type (preferences); the
              registry, theming menu, persistence (preferences); the shortcuts API and ?
              dialog (keys); Kanagawa; dragon, storm, moon, frappe, macchiato; Everforest medium and soft; role tokens, a
              selection token, surface hooks for code or kbd; correcting any contrast; a
              shipped card or any component; layouts; bundling; the git-tag install and
              exported conformance test (validate); @function, @mixin, if().
Door          one-way for tag v0.4.0, which jsDelivr caches as immutable; two-way otherwise.
              v0.3.0 keeps --border-3 and its Flexoki values on its own pin.
Release       v0.4.0

## Progress

slices 4/8 + 4b committed (2b21e96, f1bd346, 2ac62e0, 0c7c043, 0cd4b9c, 26b085e) · review stop 1 done · review stop 2 pending · standards — · spec — · editor —

## Decisions

- setup: the evidence is the nine items in `context/README.md`, "The evidence". Superseded by
  plan (facets redirect): eleven items.
- setup: one dark and one light theme from Flexoki (MIT); rejected omarchy's 22 themes, which add
  a generator and vendored files and whose hue slots aren't semantic (hackerman's `red` is
  green; no theme has a bright orange), and rejected kanagawa wave and lotus, mapped by hand.
- setup: 18 hue tokens, the ANSI 16 plus orange and bright orange; brown dropped.
- setup: `<theme-toggle>` cycles system, light, dark on T, stored in localStorage; with nothing
  stored the theme follows the system setting, live. Superseded by plan (facets redirect):
  preferences replaces toggle.
- setup: kind code; `mise run check` = biome ci, shellcheck, actionlint over workflows, bun test;
  no package dependencies. Rejected Deno (no CSS lint, needs jsr:@std/toml) and Python (a second
  language).
- setup: browser behavior is tested inside the check through headless chromium, which fails when
  chromium is missing; rejected Playwright (an npm dependency and its own browser downloads) and
  happy-dom (no real focus or storage).
- setup: this spike deploys the first Pages workflow; the other two spikes copy it.
- setup: one minor tag per task, v0.1.0 to v0.4.0; each task brief carries a Release line and a
  one-way door, since jsDelivr caches a tag as immutable. The range is now v0.1.0 to v0.6.0
  (plan, facets redirect).
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
  come from color-mix(), `.card` uses a border for elevation. Superseded by plan (facets
  redirect): components leave the foundation.
- layers: the theme layer styles prose elements (headings, links, lists, tables, blockquote, hr,
  code, pre). Superseded by facets: the elements layer styles every rendered element.
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
  and key-hint styling stays with keys. Superseded by facets (review stop): whitespace by
  proximity, under the space and type facets' names; `kbd` still has an outline, and key-hint
  styling still stays with keys.
- layers: components keep herald's `.btn-muted` (on `--color-2`, not the muted token themes
  adds), add no orange button (herald has none), write badge variants `.badge.badge-*`, and keep
  herald's 0.05em letter spacing, 0.4 disabled opacity, and 0.15s transitions. Superseded by
  plan (facets redirect): components leave the foundation.
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
  their paths freeze at v0.1.0 with baseline.css's. Superseded in part by facets: baseline.css
  keeps its path, and from v0.3.0 each nested layer's file sits at the path its name spells
  (`layers/tokens/color.css`).
- themes: two color layers: eight hue tokens, and role tokens that alias them; supersedes setup's
  "18 hue tokens". Rejected ANSI 16 as the token model: across nine palettes "bright" has no
  stable look, and black or white sits at 1.0–1.6:1 on one of the two backgrounds. The role
  tokens are superseded by facets: hues only.
- themes: colors derive from Primer's resolved values, @primer/primitives 11.10.0 (3f51f80),
  without adopting its layered system; supersedes setup's Flexoki. Rejected Flexoki (3 light hues
  and 1 dark under 4.5, faint text 2.0 / 2.6), Selenized (brights barely distinct), Modus
  (GPL-3.0, no orange), Gruvbox (its cyan is green), Solarized (brights are grays), Tokyo Night
  day (13 of 13 hues under 4.5), Catppuccin latte (8 hues under 3), Rosé Pine (brights equal
  normals; hues not semantic), Nord (dark only). Superseded from v0.3.0 by facets' Flexoki
  profile; v0.2.0 stays Primer.
- themes: the hues are red, orange, yellow, green, cyan, blue, purple, magenta, from Primer's
  display-*-fgColor (magenta is its "pink"), 5.9:1 or more in light and 7.0:1 in dark; no bright
  or tint tokens, tints stay color-mix() at use. Rejected Primer's ANSI normals (light yellow
  #4d2d00 is brown). Supersedes layers' "themes adds the other 13 hues, muted, and accent".
  From v0.3.0 the eight names hold and the values are Flexoki's (facets).
- themes: --accent, --success, --warning, --danger alias blue, green, yellow, red, so a hue
  override carries to its role; rejected Primer's own role values (4.87–5.24 in light).
  Superseded by facets: no role tokens.
- themes: the roles are accent, success, warning (not Primer's "attention"), and danger; no info,
  muted, link, focus, or syntax tokens. Links, focus outlines, and selection read --accent.
  Superseded by facets: no role tokens; links, focus outlines, and selection read --blue.
- themes: usage rule: a role marks state or interaction; a hue marks a category and never implies
  status; on a page that shows status, categories draw first from cyan, purple, magenta, orange.
  Stated in STANDARDS.md and in a specimen section. Superseded by facets: a hue carries no
  meaning, and semantic variants are the consumer's.
- themes: tiers take Primer's bgColor-default, bgColor-muted, control-bgColor-hover,
  borderColor-default (opaque), fgColor-default, fgColor-muted, fgColor-disabled; --fg-2 at
  3.45 / 3.57 and the divider are recorded, not corrected. Superseded from v0.3.0 by facets'
  Flexoki tiers.
- themes: --color, --color-1, --color-2 become --fg, --fg-1, --fg-2 at v0.2.0, no aliases; each
  tag freezes its own names, and v0.1.0 stays as tagged. No outside consumer linked the pin.
  facets renames the tokens again at v0.3.0, with no aliases (plan, facets redirect).
- themes: a variant is always a suffix, never a prefix (STANDARDS.md).
- themes: badges add cyan, purple, magenta, success, warning, danger, accent; buttons keep
  herald's set. Supersedes layers' "a badge says its color, not its meaning" for role variants.
  Superseded by plan (facets redirect): components leave the foundation.
- themes: Primer is credited by a comment heading the tokens layer, "Colors derived from
  @primer/primitives (MIT, GitHub Inc.), https://github.com/primer/primitives", with no version
  (11.10.0 recorded here); rejected the full MIT notice. From v0.3.0 the color facet credits
  Flexoki instead.
- themes: :root[data-theme="light"|"dark"] sets color-scheme in the tokens layer, and toggle
  writes it later; with no attribute the page follows the system, live. Superseded by facets:
  data-scheme replaces data-theme.
- themes: the contrast table is static in the specimen, and the check recomputes it in chromium
  under each emulated scheme, failing on a mismatch at 2 decimals; no script, no generated file.
- themes: the table measures every color token against --bg, WCAG 2, marked at 4.5 and 3;
  failures recorded, not corrected. Rejected APCA and --bg-1 rows. Superseded by facets (BUILD,
  architect): text and hues graded over every surface and border.
- themes: pinned pages are tested from one table, against `git show <tag>:` once the tag exists
  and the working tree before, with per-tag probes shared by the pin script and the layers
  helper. Resolves layers' "standards review deferred to themes".
- themes: BUILD: the probes are one per-tag table of (selector, property, value) in
  `test/layers.js`; its last key is the working tree's, and a tag not yet cut adds its entry
  last.
- themes: BUILD: a tag's stylesheet list is `git ls-tree <tag> layers/`, in the pinned test and
  `scripts/pin.js`; the read-only git helpers live in `test/tags.js`, and the pinned test writes
  a tag's files to a temp directory to answer intercepted requests. The list is superseded by
  facets (BUILD): every .css file in the tag.
- themes: BUILD: `::selection` is a 30% color-mix() of --accent; hover fills stay 15%. From
  facets, the mix is of --blue.
- themes: BUILD: a role badge reads its role token (`var(--success)`), not the hue. Superseded
  by facets: no role tokens and no badges.
- themes: BUILD: the contrast table marks "AA", "AA large", and "fail", judged on the unrounded
  ratio, and shows them on the success, warning, and danger badges; it is the specimen's last
  section. From facets the marks are plain text, since the badges are gone.
- themes: BUILD: the data-theme rules follow the `:root` token block. Superseded by facets: the
  data-scheme rules follow it.
- themes: standards review: forced-theme tests over every color token replace the light-dark()
  declaration test, which depended on the source's structure; the duplicate no-alias test is
  removed.
- themes: notes outside the task: Primer's high-contrast and colorblind themes as later themes;
  a LICENSE for this repository.
- plan (after v0.2.0): the architect reviewed v0.2.0 on Pages: Primer reads too cold, the
  specimen's layout is a mess, and mono isn't applied to headings and chrome. Kept: the hue and
  role model, and dropping ANSI 16 as the token model.
- plan: a new task, `aesthetic`, runs before toggle: a modern web and terminal look inspired by
  cassette futurism, Flexoki values in the hue and role model, a type system, and a designed
  specimen layout. Tags shift: aesthetic v0.3.0, toggle v0.4.0, keys v0.5.0. Superseded by plan
  (facets redirect): facets takes v0.3.0, and the path runs to validate.
- plan: looks are chosen from rendered options, not numbers: aesthetic's plan rounds show 2–3
  rendered specimen variants, and every later session brief that changes how pages look embeds
  screenshots of the specimen in both themes. themes' palette was accepted from contrast ratios
  alone, without a rendered page.
- aesthetic: hues take Flexoki's own steps, 600 light / 400 dark, uncorrected; Flexoki's palette
  establishes the contrast. Supersedes themes' Primer values from v0.3.0 on; v0.2.0 stays Primer.
  Superseded by plan (facets redirect): the color contract is open. Kept as reference for the
  Flexoki profile, light / dark: red #AF3029 / #D14D41, orange #BC5215 / #DA702C, yellow #AD8301
  / #D0A215, green #66800B / #879A39, cyan #24837B / #3AA99F, blue #205EA6 / #4385BE, purple
  #5E409D / #8B7EC8, magenta #A02F6F / #CE5D97.
- aesthetic: the specimen drops the contrast table at v0.3.0; the README's evidence 4 is
  restated, not dropped, so the numbering holds. Superseded by plan (facets redirect): contrast
  is recorded per profile.
- aesthetic: faint text takes no correction; --fg-2 is the step the chosen variant assigns.
  Superseded by plan (facets redirect): no variant was chosen, and the color contract is open.
- aesthetic: --accent stays on blue; cassette futurism is a rough inspiration, not copied.
  Superseded by plan (facets redirect): the color contract is open.
- aesthetic: font stacks stay system-only and unchanged; rejected a vendored webfont. Still holds
  for the stacks; the plan (facets redirect) keys them by role, and type profiles set them.
- aesthetic: mono for headings and chrome; sans for prose. Superseded by plan (facets redirect):
  type is a facet; variant C's treatment is reference only.
- aesthetic: no new component classes; chrome is theme-layer element styles plus the
  specimen's app layer. Superseded by plan (facets redirect): components leave the foundation,
  and elements and tools replace the theme layer.
- aesthetic: variants are rendered outside the repository in BUILD's slice 1, screenshotted in
  both themes, never committed; they differ in layout, type, and the Flexoki steps assigned to
  the tiers and roles. Superseded by plan (facets redirect): no session-generated screenshots.
- aesthetic: the specimen drops its contrast section and adds "In use". Superseded by plan
  (facets redirect): the specimen becomes the workbench.
- aesthetic: Flexoki is credited by one comment heading the tokens layer; rejected the full MIT
  notice.
- aesthetic: slice 1 ends at a planned stop where the architect picks a variant or blend.
  Superseded by plan (facets redirect): the architect redirected the spike at that stop, and the
  review stops move to facets and profiles.
- plan (facets redirect): at aesthetic's planned pick the architect redirected the spike: the
  baseline becomes a foundation of swappable design facets, consumed by version as a git-tag
  package and through jsDelivr, and extended by other packages. The question, the evidence
  (now 11 items), and the path are rewritten in `context/README.md`; the decision it changes
  also names v1.client.
- plan (facets redirect): terms: a layer is a CSS cascade layer, the order rules win in; a facet
  is one dimension of design as a token family (color; space, meaning lines, spacing, and
  radius; type); a profile is one set of values for one facet; a scheme is light, dark, or
  system, a choice inside every color profile; a theme is a named selection of one profile per
  facet.
- plan (facets redirect): every layer nests under one top-level layer named for the package:
  pkg.tokens with sub-layers pkg.tokens.color, pkg.tokens.space, and pkg.tokens.type, then
  pkg.reset, pkg.elements, pkg.tools. tools is the foundation's top layer.
- plan (facets redirect): consumers declare their own later layers (components, app), and
  unlayered consumer CSS beats the whole foundation. Component packages are the consumer's
  concern; shadow-DOM components read the tokens through inheritance.
- plan (facets redirect): the elements layer styles native elements without classes, limited to
  paint, type, border, radius, margin, and padding; a test checks each element's layout
  properties against chromium's defaults. The tools layer holds opt-in classes for native
  elements (button variants, scroll helpers, form and table helpers), free to change layout.
- plan (facets redirect): components leave the foundation: badge, card, and variant B's labeled
  panel are components. The components layer is removed in facets.
- plan (facets redirect): `::file-selector-button` is styled by elements; the hidden-input
  pattern is a component.
- plan (facets redirect): a profile applies through a zero-specificity attribute scope on any
  element (`:where([data-palette=…])`, data-space, data-type), with the default profile on
  :root. A scope re-declares its aliases and re-sets color and background on its root, so a
  preview container renders as that profile does at the root.
- plan (facets redirect): color profiles are Flexoki first, then Kanagawa (wave and lotus), Tokyo
  Night (night and day), and Catppuccin (mocha and latte). Contrast is a per-profile fact,
  recorded and not corrected.
- plan (facets redirect): the color token contract is open again; the hue and role model is not
  assumed. Resolved by facets: tiers and hues, no role tokens.
- plan (facets redirect): the token contract is new, with herald as inspiration only: fluid space
  and type scales in modern units, radius scaled from one base (variant C's 4/6/8px are reference
  only), and fonts keyed by role (body, heading, ui, code). Tokens are renamed at v0.3.0 with no
  aliases; earlier tags keep their names.
- plan (facets redirect): a small JS SDK covers what CSS can't: a profile registry that the
  package and each extension package register into, preferences, and keys. T opens a theming
  menu with a section per facet and the scheme. preferences replaces toggle.
- plan (facets redirect): packaging. From facets on, a package.json gives the name, the version,
  and exports for the CSS entries and JS modules, with no dependencies. Consumers install by git
  tag, `bun add github:JaimeStill/spike-html-design#vX.Y.Z`. jsDelivr stays a tested secondary
  channel, with pinned pages and `mise run pin` per tag. The lean entry holds the foundation and
  the default profiles, the full entry every profile, and the check enforces a compressed byte
  budget per entry from facets on. The budget is superseded by facets: enforced from profiles
  on.
- plan (facets redirect): no build in the foundation; bundling at release waits until validate
  measures the @import chain's cost from the CDN.
- plan (facets redirect): the specimen becomes a workbench: a section per layer and facet, and
  from profiles on a comparison grid of preview containers for every profile and scheme.
- plan (facets redirect): facets and profiles each have a planned visual review stop, facets
  after the tokens and elements render and profiles after the grid renders.
- plan (facets redirect): a `mise run serve` task serves a branch on localhost for viewing.
- plan (facets redirect): no pixel diffs and no session-generated screenshots; the architect
  views the served workbench and sends screenshots when calling something out. Supersedes the
  plan line "every later session brief that changes how pages look embeds screenshots".
- plan (facets redirect): the harness PNG capture, 0d50c76, is not carried; the local `aesthetic`
  branch is deleted unmerged once these edits merge.
- plan (facets redirect): layouts and a layout engine go to the coordinator's backlog as
  `client-layouts`; motion is a later facet.
- plan (facets redirect): notes outside the path: variants A, B, and C are reference only:
  C's sentence-case mono headings, 17px sans prose, and 4/6/8px radius; B's labeled panel with
  its h2 on the frame as a future component. Chromium blocks ES module scripts on file://, so
  preferences and validate settle how an artifact opened from disk runs the SDK.
- facets: the package and its top-level cascade layer are named spike-html-design; the lean entry
  stays baseline.css; the entry imports every file straight into its nested layer, one hop deep.
- facets: hues only; no role tokens. Elements and tools read hues explicitly, and semantic
  variants are the consumer's: rules are open for extension, closed for modification. Supersedes
  themes' roles and its hue-and-role usage rule. Rejected an --accent read at each use.
- facets: feature policy: Baseline Newly available, plus non-Baseline features only as
  progressive enhancement (a browser without them still renders a correct page). Rejected
  Widely-only (drops light-dark()) and chromium-only (@function, if() unstyle other engines).
- facets: fluid tokens interpolate with progress() between rem endpoints over 22.5rem to 80rem of
  min(100vi, 100svb * 16 / 9); no px in fluid bounds; aspect-ratio queries belong to layout. A
  starting point the architect profiles across emulated displays. Rejected cqi (needs
  containment), aspect-ratio breakpoints for sizing (a ratio can't tell a phone from a TV), and
  clamp() with precomputed slopes.
- facets: data-scheme replaces data-theme for forcing light or dark.
- facets: t-shirt step names for space and type; the space facet's lines are border and outline
  widths (--line-s, --line-m, px); line heights live in type, keyed by font role.
- facets: starting points for the review stop, not decisions: type 16px at ratio 1.2 to 18px at
  1.25 over eight steps; space from its own 16–18px base at 0.25–6 times; radius from a 0.375rem
  base (sm 2/3, lg 4/3, full); leading 1.5 / 1.2 / 1.25 / 1.5; measure 68ch; Flexoki tiers with
  variant A's surfaces and borders and variant B's text, hues 600 light / 400 dark. The review
  stop changed the type scale and dropped the measure (below).
- facets: mono heading and ui fonts, sans body, mono code; system stacks only.
- facets: the elements behavior test compares tokens and elements alone against no stylesheet.
- facets: elements covers every rendered element; tools ships buttons, scroll, forms, and
  tables, unprefixed, each family open for extension through one hook property; .button is a
  base class plus eight outline hue variants; the native button is neutral. Rejected filled
  variants (wait for a consumer) and dialog, details, and media tools (layout or motion). The
  hook rule is amended by facets (BUILD, escalation).
- facets: the measure is a token only; capping width is layout. Superseded by facets (review
  stop): --measure is dropped.
- facets: facets reports sizes and enforces none; the budget is enforced from profiles on.
  Supersedes the packaging line "the check enforces a compressed byte budget per entry from
  facets on".
- facets (BUILD, architect): contrast is graded only where legibility is the concern, text over a
  color: every text token (--fg, --fg-2, --fg-3) and every hue against every surface (--bg,
  --bg-2, --border, --border-2, --border-3), in each scheme. Surfaces get no ratio of their own.
  Amends behavior 15; rejected grading surfaces against --bg with text thresholds.
- facets (BUILD, architect): display tests are framed by aspect ratio, not by any one monitor:
  21:9, 16:9, 16:10, 4:3, 1:1, and their portrait mirrors down to 9:21, each at a small and a
  large size. Amends behavior 7's "including 3440×1440".
- facets (review stop): confirmed: Flexoki tiers and hues in both schemes, the space steps, the
  radii, and fluid scaling across orientations and display shapes.
- facets (review stop): --text-m is fixed at 1rem (the reader's default), as are xs and s; only
  l and above grow. Rejected a smaller fluid body (15→16px).
- facets (review stop): the type ratio runs 1.25 at the narrow end to 1.333 at the wide end, with
  the same heading-to-step mapping, to separate heading levels; checked again visually.
  Rejected skipping steps between headings.
- facets (review stop): whitespace by proximity in elements: heading top margin by level (h1/h2
  --space-xl, h3/h4 --space-l, h5/h6 --space-m), bottom --space-2xs; blocks --space-s apart;
  items in a list or group --space-3xs; a container's first child has no top margin. Written
  as a whitespace guideline in STANDARDS.md, with sections xl–2xl in the consumer's layout.
- facets (review stop): --measure is dropped; line length is layout. The specimen uses the full
  width. Supersedes "the measure is a token only".
- facets (review stop): two line widths, --line-s and --line-m; adding --line-l later breaks
  nothing.
- facets (review stop): border-collapse and border-spacing are border properties the elements
  layer may set; tables collapse by default. Amends behavior 10's property list.
- facets (review stop): the behavior test covers reset plus elements against no stylesheet; the
  reset may change only an explicit list, and leaves dialog and popover margins to chromium so
  modals center natively. The reset is evaluated against current resets for an optimal set.
- facets (review stop): the specimen arranges its sections with grids and structural elements in
  its own, clearly named layer, marked on the page as composition, not baseline: it shows how
  compositions arrange within the design system, and its rules are never part of the baseline.
  Each element sample carries its element name as a label.
- facets (review stop): layout sheets, reusable templates for page categories, sit in their own
  layer between the foundation and the application; they are the client-layouts goal's, not
  this task's.
- facets (review stop): the architect accepted the design layer after a second look as the
  starting point, adjusted as issues surface. Workbench layout feedback waits for profiles'
  comparison grid and its review stop; the specimen layer is composition, not baseline.
- facets (BUILD, accepted by the architect): the button variant treatment is keyed on the class
  prefix: a variant is named `button-<name>` and sets only --button-color; CSS can't test
  whether a custom property is set, so a hook set on any other class does nothing.
- facets (BUILD, escalation): a tools family has a hook where it has a treatment to extend:
  buttons (--button-color) and tables (--table-stripe); scroll and forms have none and extend
  through a consumer's later layer. Amends behavior 11's "one hook per family". Rejected
  --field-gap and --scroll-padding: a hook feeding one declaration is frozen API with no gain,
  and adding one later breaks nothing.
- facets (BUILD): a tag's stylesheet list is every .css file in `git ls-tree -r <tag>` outside
  `test/`, baseline.css first, in the pinned test and `scripts/pin.js`, so a layer file nested
  under `layers/tokens/` is covered. Supersedes themes' `git ls-tree <tag> layers/`.
- facets (final review, architect): the type ratio runs 1.125 at the narrow end to 1.2 at the
  wide end, bringing the scale back to Variant A's interface scale; supersedes the 1.25 → 1.333
  review-stop ratio. Headings map one step down (h1 3xl, h2 2xl, h3 xl, h4 l, h5 m, h6 s); 4xl
  stays for larger text. Heading levels are told apart by size alone: stylistic treatment
  (case, tracking, font changes per level) is a template, component, or application concern.
- facets (final review, architect): heading top margins move one step down: h1/h2 --space-l,
  h3/h4 --space-m, h5/h6 --space-s; bottom stays --space-2xs.
- plan web-client (2026-10-13, architect): experiment.html's spikes run one at a time, this spike
  first, then spike-html-components, spike-html-hosting (renamed from spike-html-artifacts),
  spike-html-go-wasm, and spike-html-apps; they run beside v1.messaging, and v1.client waits on
  both (`standards-lab/context/web-client.md`). The plan-web-client pull request applied the
  roadmap, v1.client, and strategy-note pending edits; client-layouts, docs-site, and
  external-client leave the backlog for v1.client and the spikes.
- plan web-client (architect): the workbench layout rework lands in profiles, judged at its
  comparison-grid review stop; the architect's screenshots of what fails are its plan round's
  input.
- plan web-client (architect): HTML is for persistent artifacts (reports, stats) hosted in the
  coordinator; task briefs, plan rounds, session briefs, and context notes stay Markdown. The
  section tree and review script move with spike-html-artifacts to spike-html-hosting.
- plan profiles: hues come from the upstream swatch whose color matches the hue's name, ANSI slot as
  tie-breaker (Tokyo Night magenta = magenta2; lotus yellow = lotusYellow3).
- plan profiles: per-profile tier and hue values are starting values from upstream UI roles,
  confirmed at the review stop.
- plan profiles: one light and one dark variant per profile (lotus/wave, day/night, latte/mocha);
  rejected dragon, storm, moon, frappe, macchiato.
- plan profiles: Tokyo Night from folke/tokyonight.nvim v4.14.1 (Apache-2.0), day from its generated
  extras; rejected enkia's MIT theme, whose light variant isn't day.
- plan profiles: data-scheme forces a scheme on any element at zero specificity.
- plan profiles: budget is the brotli-11 per-file sum per entry, 12,000 lean / 16,000 full, enforced
  by the check; raw reported only.
- plan profiles: the profiles review stop sits after profiles and grid render, before full entry
  and budget.
- plan profiles: workbench follows reference variant A (console); note deleted; forms rearranged in
  the specimen only; denser embedded cells with realistic data: content and a scheme-aware
  iframe.
- plan profiles: header cells get a --bg-2 surface in elements; .table-striped's default stripe
  becomes a mix.
- plan profiles: comparison grid is a compact preview card per profile and scheme; contrast gives one
  row per profile, light and dark side by side, short marks and a legend.
- plan profiles: the tier ladder is kept; rejected role names.
- plan profiles: full entry is self-contained, exported as ./full, each profile its own export;
  rejected a profiles-only add-on.
- plan profiles: profiles sit in tokens.color; rejected a nested sub-layer per profile.
- plan profiles: preview card is specimen composition plus a fixture page, not a shipped component,
  with the fuller contents.
- plan profiles: second space and type profiles, with data-space and data-type, move to preferences;
  profiles ships data-palette only.
- plan profiles: inline code is a --bg-2 chip in elements, text through --code-color with fallback
  --fg.
- plan profiles: --bg-2 steps toward the text in both schemes (lighter in dark).
- plan profiles: pane token --bg-0, darker than --bg in both schemes.
- plan profiles: Flexoki's ladder shifts one step so the pane is distinct; supersedes the Flexoki
  tiers confirmed at the facets review stop.
- plan profiles: two border steps: --border (dividers, containers, hover fills) and --border-2
  (control boundaries, replacing --border-3); rejected keeping an unread middle step.
- plan profiles: controls take a colored border on hover only; active and focus keep their
  treatment.
- plan profiles: interaction reads one hook, --interaction-color, fallback --blue, never declared by
  the baseline or a profile; supersedes facets' "Rejected an --accent read at each use".
- plan profiles: key-hint styling moves to profiles as kbd's element styling; keys is the shortcuts
  API alone; supersedes setup's and layers' "key-hint styling stays with keys".
- plan profiles: kbd is an outlined key with a --line-m bottom edge; --kbd-color colors border and
  text.
- plan profiles: no surface hooks for code or kbd.
- profiles BUILD (architect): every color profile, Flexoki included, is its own file and
  export; color.css keeps only the facet's contract (scheme rules, scope paint rule, the token
  roles). Space and type split the same way when preferences adds their second profiles.
- profiles review stop 1 (architect): drop Kanagawa (it doesn't translate to a UI); add
  Everforest at its hard light and dark variants and Primer from the GitHub VS Code theme,
  GitHub Light Default and Dark Dimmed. Primer was removed at v0.3.0 only because one scheme
  was planned then, a preference for Flexoki, not a dislike; supersedes "Primer reads too cold"
  as a reason to exclude it. data-palette values: everforest, primer.
- profiles review stop 1 (architect): inline code is the code font in --green through
  --code-color, with no chip; code in a link takes the link's color. Supersedes plan profiles'
  --bg-2 chip.
- profiles review stop 1 (architect): a blockquote's edge stays neutral (--border-2); the
  interaction color marks only what can be acted on.
- profiles review stop 1 (architect): a reading measure belongs to prose-centric layouts, on the
  reading column, never to single paragraphs; mechanical interfaces like the workbench let text
  span its panel. The baseline ships no measure class.
- profiles review stop 1 (architect): --space-fluid and --type-fluid are fluid expansion across
  the display range, internal to their facets; the specimen shows them with --space-base at the
  head of each scale, not as a "progress" panel.
- profiles review stop 1 (architect): lean budget raised to 14,000 B brotli; full stays 16,000.
- profiles review stop 1 (architect): a second review stop follows the fix slice.

## Pending edits

- coordinator · html-artifacts.md, "Style baseline": rewritten at the answer to describe the
  faceted baseline: layers, facets, profiles, elements and tools, and packaging (facets onward;
  replaces the layers and themes edits to "Style baseline", "Palette", and "Themes").
- coordinator · roadmap.toml, preferences summary: gains a second space and a second type
  profile, and the data-space and data-type scopes (plan profiles).
- coordinator · roadmap.toml, keys summary: drop "plus key-hint styling"; keys is the
  shortcuts API alone (plan profiles).
- coordinator · html-artifacts.md, "Keyboard": key-hint styling ships with the baseline's
  elements layer (profiles), not keys.js; joins the "Style baseline" rewrite (plan profiles).
