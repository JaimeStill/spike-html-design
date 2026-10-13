# goal · experiment.html.spike-html-design

- **State:** idle
- **Task:** none
- **Branch:** none

## Tasks

1. [x] layers
2. [x] themes
3. [x] facets
4. [ ] profiles
5. [ ] preferences
6. [ ] keys
7. [ ] validate

## Task brief · experiment.html.spike-html-design · facets

Problem       v0.2.0 is four flat layers: Primer colors, herald's fixed scales, role tokens,
              and components inside the foundation. The spike's question now needs a
              foundation of swappable facets consumed as a package: one nested package layer;
              color, space, and type token interfaces; an elements layer that changes no
              native element's behavior; opt-in tools; and a package.json. profiles,
              preferences, and validate all build on it. (Evidence 1, 2, 4.)

Behaviors
  1. The lean entry, at the same URL as v0.2.0's stylesheet, declares one top-level layer,
     spike-html-design, with nested layers in order: tokens (color, space, type), reset,
     elements, tools. It imports every file directly into its nested layer (one hop).
  2. A consumer's own later layer, and its unlayered CSS, beat any foundation rule of any
     specificity with no !important; a fixture shows it against an elements rule and a
     tools variant.
  3. Color: tiers --bg, --bg-2, --border, --border-2, --border-3, --fg, --fg-2, --fg-3 and
     hues --red, --orange, --yellow, --green, --cyan, --blue, --purple, --magenta, each
     resolving to a Flexoki value under each scheme. Starting values: surfaces and borders
     from the reviewed variant A, text from variant B, hues 600 light / 400 dark; tuned at
     the review stop. No role tokens (no --accent, --success, --warning, --danger), and no
     v0.2.0 token name remains.
  4. Scheme: with no data-scheme attribute the page follows the system scheme, live;
     data-scheme="light" or "dark" forces it; data-theme has no effect.
  5. Space: --space-3xs to --space-3xl (nine steps); --line-s and --line-m (px); and
     --radius-sm, --radius-md, --radius-lg, --radius-full derived from one radius base, so
     changing the base rescales every radius but full.
  6. Type: --text-xs to --text-4xl (eight steps); --font-body (sans), --font-heading,
     --font-ui, --font-code (mono; system stacks); --leading-body, --leading-heading,
     --leading-ui, --leading-code; and --measure.
  7. Every fluid space and type token interpolates with progress() between rem endpoints
     over 22.5rem to 80rem of min(100vi, 100svb * 16 / 9): it holds its smallest value
     below the range and its largest above it, follows browser zoom, and a short, wide
     window reads smaller than its width alone gives. Viewport emulation in the check
     proves each case, including 3440×1440.
  8. A test profile applied to one facet's sub-layer changes only that facet's tokens.
  9. The elements layer styles every rendered HTML element, plus ::file-selector-button,
     ::marker, ::placeholder, and ::backdrop, with zero-specificity selectors and no
     classes. It reads hues and tiers directly: links, focus outlines, selection, caret,
     and accent-color use blue; the native button is neutral.
 10. For every element of a fixture covering every rendered element, a page with only the
     tokens and elements layers has the same computed layout properties as the same page
     with no stylesheet: display, position, float, overflow, visibility, inline and block
     sizes with min and max, flex and grid properties, white-space, list-style-position,
     appearance, pointer-events, user-select.
 11. Tools ships four opt-in families, open for extension through one hook per family:
     - buttons: .button, a base class that gives any element (such as a link) the native
       button's look, and .button-<hue> for all eight hues, outline style, read through
       --button-color, on .button or a native button;
     - scroll: .scroll-x, .scroll-y;
     - forms: .field, .field-grow;
     - tables: .table-full, .table-striped.
     A consumer adds a variant in its own layer by setting a family's hook, and it renders
     with that family's treatment.
 12. The components layer and its classes (badge, card, input, label, btn) are gone.
 13. A package.json names spike-html-design at 0.3.0, exports the lean entry, has no
     dependencies, and every export resolves to a published file.
 14. The check reports each entry's raw size and per-file brotli sum, and enforces no number.
 15. The specimen is a workbench with a section per layer and facet showing every token
     with a resolving sample, every element, and every tools class; Flexoki's contrast
     table (every tier and hue against --bg, each scheme) is recomputed by the check.
 16. The specimen renders the same from file:// and from a local server under the Pages
     subpath.
 17. A v0.3.0 pinned page is the specimen linking the @v0.3.0 jsDelivr lean entry; its
     hermetic test and the live pin check cover every stylesheet file the tag publishes,
     wherever it sits; v0.1.0 and v0.2.0 pinned pages still pass against their own tags.
 18. mise run serve serves the working tree on localhost under the Pages subpath.
 19. README, STANDARDS.md, and the goal record describe v0.3.0: hues are named for color
     and carry no meaning; semantic variants are the consumer's, through hooks or its own
     layers; the feature policy is Baseline Newly available plus non-Baseline as
     progressive enhancement; no px in fluid bounds, and aspect-ratio queries are
     layout's; fluid tokens need progress(); sizes are reported, enforced from profiles on.

Test seams    the harness page: a page in headless chromium, read for computed styles under
              emulated media and viewport size; the check's size report over the published
              files.

Slices
  1. Skeleton: nested layers with one-hop imports, components removed, data-scheme,
     package.json, mise run serve, pin tooling listing every published file, the v0.3.0
     probe entry and pinned page. Demo: check passes; serve shows the specimen.
  2. Color facet: Flexoki tiers and hues, the scheme hook, the contrast table. Demo: the
     specimen in both schemes.
  3. Space and type facets: progress() scales with the two-axis bound, lines, radius, font
     and leading roles, measure; viewport emulation in the harness; facet-independence
     test. Demo: the specimen at emulated displays.
  4. Elements layer over every element, with the behavior test and the specimen's element
     sections. Demo: the workbench.
  ── REVIEW STOP: the architect views the served workbench and profiles it across
     emulated displays and the 3440×1440 ultrawide; starting values for type, space,
     radius, leading, measure, and Flexoki's tier and hue steps are confirmed or changed
     before tools is built ──
  5. Tools layer: four families with hooks, the .button base, the extension fixture, the
     specimen's tools section.
  6. Size report, docs (README, STANDARDS.md, goal record), pinned page re-synced with the
     final specimen.

Out of scope  Kanagawa, Tokyo Night, Catppuccin, profile attribute scopes and preview
              containers (profiles); the full entry and an enforced budget (profiles); JS
              modules, registry, preferences, keys; components; layouts and aspect-ratio
              media queries (client-layouts); motion; bundling; the git-tag install proof
              (validate); @function, @mixin, if().
Door          one-way for tag v0.3.0, which jsDelivr caches as immutable; two-way otherwise.
Release       v0.3.0

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

## Pending edits

- coordinator · html-artifacts.md, "Style baseline": rewritten at the answer to describe the
  faceted baseline: layers, facets, profiles, elements and tools, and packaging (facets onward;
  replaces the layers and themes edits to "Style baseline", "Palette", and "Themes").
