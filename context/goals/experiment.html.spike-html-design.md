# goal · experiment.html.spike-html-design

- **State:** building
- **Task:** keys
- **Branch:** keys

## Tasks

1. [x] layers
2. [x] themes
3. [x] facets
4. [x] profiles
5. [x] preferences
6. [ ] keys
7. [ ] validate

## Task brief · experiment.html.spike-html-design · keys

Problem       v0.5.0 has one shortcut, T, which <theme-menu> binds itself. There is no
              shortcut API, no declaration, no help listing, no convention besides a bare key,
              and no way to turn shortcuts off, which WCAG SC 2.1.4 (Level A) requires of
              character-key shortcuts. Evidence 7 needs a shortcut library: one registry per
              page, silent in fields, declared to assistive technology, and listed in a ? help
              dialog with each page's own keys. The architect ruled that the library binds no
              shortcuts itself and supports raw keys, leader chords, and an activator
              combination, with @github/hotkey as the precedent. This task builds keys as a
              family of three modules, moves T off <theme-menu>, and gives the specimen a help
              dialog and bindings in every convention. (Evidence 7, restated; 8's pinned page;
              11's budgets.)

Behaviors
  Grammar
  1. A binding is a string in @github/hotkey's grammar: "," separates alternatives, a space
     separates the presses of a sequence, and "+" joins a combination of Control, Alt, Meta,
     Shift, or Mod (Meta on macOS, Control elsewhere) with one key; "Plus" and "Space" name
     those keys. A letter written without Shift matches either case while Shift is up (caps
     lock doesn't defeat it), and "Shift+T" requires Shift. A symbol is written as the
     character typed ("?"), Shift ignored. A malformed string binds nothing.
  2. The grammar module has no DOM: it parses and normalizes a binding, wraps a bare binding
     for a mode, and formats one for display and for aria-keyshortcuts. A symbol is declared
     by its US physical key ("?" as "Shift+/"); a sequence declares nothing.

  Runtime
  3. An element carrying data-keys is a binding: when its keys are pressed, keys clicks it (so
     its native action or invoker command runs) or focuses it if it is a field.
     register(keys, label, handler) binds keys with no element, returns a function that
     removes exactly that binding, and throws a TypeError on a malformed string.
  4. Matching uses event.key. With Alt held, letters and digits match by event.code (Option
     and AltGr change the character). A non-ASCII letter falls back to event.code (KeyJ is
     j). keys is silent in fields (input, textarea, select, contenteditable), while an input
     method composes (isComposing or keyCode 229), on "Dead" and "Process", with AltGraph, on
     repeats, and on events already handled. A press keys acts on, or that continues a
     sequence, is marked handled.
  5. Sequences: each press must follow the last within the sequence wait, 1500 ms by default.
     A press that doesn't continue the sequence ends it and is dropped. When one binding is a
     prefix of another ("g" and "g c"), keys waits for the next press and runs the shorter
     when the wait ends.
  6. Modes: a bare binding (one press with no modifier other than Shift) is pressed as written
     in raw mode, after the leader in leader mode, and with the activator held in activator
     mode. Bindings that spell out a sequence or combination are used as written in every
     mode. Defaults: raw mode, leader g, activator Alt (Option). A page sets its default mode
     with data-keys-mode on <html>; a mode the reader chose overrides it.
  7. Scope: while a modal dialog is open, only element bindings inside it are active and
     register() bindings pause; otherwise an element binding is active unless disabled,
     inside [inert], or not visible. keys reads the page at each press. When two active
     bindings share keys, the first wins: elements in document order, then register()
     bindings in registration order.
  8. keys writes aria-keyshortcuts on every element carrying data-keys from the binding in
     effect ("T", "Alt+T", "Shift+/"), rewrites it when the mode or settings change, and
     leaves it off for a sequence and while the off switch covers that binding.
  9. One store per page, at globalThis[Symbol.for("spike-html-design.keys")], shared by every
     copy of keys from any URL or tag, with one document listener, so a key never fires
     twice; its shape is public API frozen with v0.6.0. The runtime loads as a plain module
     script, not render-blocking.
  9a. Extension: keys is extensible by outside modules rather than growing features itself.
     The runtime dispatches two events, their names and detail shapes public API frozen with
     v0.6.0. keys-fire, cancelable, on the bound element (or document for a register()
     binding) before it acts, with the binding, the keys pressed, and the mode; cancelling it
     stops the action. keys-sequence on document as a sequence starts, continues, and ends
     (fired, timed out, or dropped), with the presses so far. The grammar module is exported
     for formatting. A test fixture builds a pending-sequence indicator as an outside module
     from these alone, proving the extension point; the indicator does not ship.

  Help dialog and the reader's settings
  10. The page places a native <dialog> holding an element marked data-keys-list and opens it
      with a visible button through show-modal. The help module loads on the dialog's first
      open. Each time it opens, the module fills the marked element with a table of the
      bindings active with the dialog closed, each row a button that closes the dialog and
      runs the binding; keys in the current mode as sibling kbd ("+" in a combination, "then"
      between presses); labels from aria-label, else text without kbd, else register()'s
      label; the reader's settings; and a screen-reader note. keys adds no CSS.
  11. Settings: an off switch, on by default, that turns off character-key shortcuts (raw and
      leader) while combinations stay on, its rows listed and marked inactive; the mode (raw,
      leader, activator); the leader (g, comma, backslash, Space); the activator (Alt,
      Control, Meta, Alt+Shift), noting Control+T, W, N never reach a page; the wait (1000,
      1500, 3000, 5000 ms). Only changed settings are stored, as JSON under localStorage key
      spike-html-design.keys, per origin; keys reads them at each press, so another tab's
      change applies at once.
  12. The note tells screen-reader users how to pass a key through (NVDA+F2, JAWS+3,
      Narrator+3, VO+Tab) and that activator mode reaches NVDA's browse mode.

  T
  13. <theme-menu> no longer listens for T. A page binds T with data-keys on its Theme button
      and loads keys. While the menu is open, T reaches the menu's Save, which carries T
      inside the modal. --open and the menu's own keys are unchanged; v0.5.0 keeps its T.

  Specimen and pins
  14. The specimen loads keys and states no mode. Its header holds the Theme button (T) and a
      Help button (?) opening a native help dialog; inside it a Close button carries ?, and
      Escape closes it natively. register() binds j and k, moving focus to the next or
      previous of the 31 sections with an id (tabindex="-1", a focus style in the specimen
      layer), and g to the top (g g in leader mode, Alt+g in activator mode). Served and on
      Pages all work in every mode and the dialog lists them. From file:// the working-tree
      specimen has no keys, as it has no menu (recorded).
  15. A v0.6.0 pinned page is the specimen linking the @v0.6.0 jsDelivr full entry and
      modules; from file:// its keys work through jsDelivr's CORS header. Its hermetic test
      and the live pin check cover every stylesheet and module the tag publishes; v0.1.0–
      v0.5.0 pinned pages still pass against their own tags.

  Package and docs
  16. package.json at 0.6.0 adds ./keys, ./keys/grammar, ./keys/help, each with a brotli
      budget in BUDGETS set from its built size and approved at the session brief
      (@github/hotkey's 2,872 B is the runtime's yardstick). Other budgets unchanged; lean
      within 14,000 B, full within 18,000 B.
  17. README, STANDARDS.md, and the goal record describe v0.6.0: the grammar and its
      differences from @github/hotkey; register(); matching and silence; sequences, wait,
      prefix rule; modes and defaults; scope and conflicts; derived aria-keyshortcuts; the
      store; the help dialog, settings, and storage; T's move; evidence 7 restated. The
      organization's convention stays an open question for v1.client.

Test seams    the harness page in headless chromium, read for focus, attributes, storage,
              dialog state, and scroll position after real presses (view.press) or CDP
              Input.dispatchKeyEvent with any key, code, and modifier, under intercepted
              requests; the grammar module as plain functions under bun; the size report.

Slices
  1. Grammar module under unit tests; v0.6.0's probes and package.json at 0.6.0. Demo: tests
     format "g t", "Alt+T", and "?" every way.
  2. Runtime in raw mode: store and listener, element bindings, register() and remover,
     matching and silence, sequences, prefix rule, scope, first-wins. Demo: a fixture where T
     clicks a button, "g c" and "g" coexist, and nothing fires in a field, on repeat, under a
     modal, or when disabled. Includes the keys-fire and keys-sequence events and the
     outside-module indicator fixture (behavior 9a).
  3. Modes and aria: leader and activator wrapping, data-keys-mode, stored settings read at
     each press, derived aria-keyshortcuts. Demo: one fixture pressed in all three modes.
  4. T moves to keys. Demo: the served specimen's T opens the menu and, while open, saves.
  5. Help dialog and settings. Demo: a fixture's dialog lists its bindings; switching modes or
     the off switch changes what fires, in this tab and another.
  6. Specimen bindings. Demo: the served workbench driven from the keyboard in each mode.
  ── REVIEW STOP (after slice 6): the architect compares raw keys, leader chords, and
     activator combinations on the served workbench (`mise run serve`), with the help dialog
     and its settings, before any tag; redirects go to Decisions ──
  7. Package and budgets: three exports, budgets, consumer test. Demo: size report lists them.
  8. Docs and pin: README, STANDARDS.md, goal record, v0.6.0 pinned page, pin check. Demo:
     the pinned page's keys and help dialog work from file:// under interception.

Out of scope  choosing the organization's convention (v1.client); per-binding remapping; a
              page setting leader, activator, or wait; a shipped sequence-pending indicator
              (an outside module builds it through 9a); bindings in shadow roots (spike-html-components); section
              tree and reading progress (spike-html-hosting); the Keyboard Map API; focusgroup
              for the menu; verifying JAWS, Narrator, VoiceOver; layouts beyond US and one
              non-Latin, tested; Firefox and Safari, tested; validate's items.
Door          one-way for tag v0.6.0: exports ./keys, ./keys/grammar, ./keys/help; the grammar
              and its @github/hotkey differences; register()'s signature and remover; the
              matching, sequence, prefix, dropped-press, and first-wins rules; the modes and
              defaults (raw, g, Alt, 1500 ms); data-keys, data-keys-list, data-keys-mode and
              its values; keys owning aria-keyshortcuts on bound elements; the keys-fire and
              keys-sequence events and their details; the store key and
              shape; storage key spike-html-design.keys and its JSON (renaming drops readers'
              settings); preferences.js without T. Two-way: specimen bindings, help wording.
Release       v0.6.0

## Progress

slices 6/8 committed (grammar ec54ae1, runtime c08b39c, modes b5033ef, T 986f0e1, help 31725aa, specimen 1fda454) · review stop pending · standards — · spec — · editor —

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
  recorded and not corrected. Superseded in part by profiles review stop 1: Kanagawa dropped,
  Everforest and Primer added.
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
  Amends behavior 15; rejected grading surfaces against --bg with text thresholds. From profiles
  the surfaces are --bg-0, --bg, --bg-2, --border, and --border-2.
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
  by the check; raw reported only. The review stops raised them to 14,000 / 18,000.
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
  --fg. Superseded by profiles review stop 1: green text, no chip.
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
- profiles review stop 2 (architect): accepted the new profiles (Everforest magenta = purple,
  as upstream; Primer light fg-2 ≈ fg-3, as upstream; Primer light bg-2 = scale.gray[1]) and the
  layout and copy fixes. Full budget raised to 18,000 B brotli (five profiles with swatch
  comments). .scroll-x drops scrollbar-gutter: stable, which left wrapped tables short of their
  container; .scroll-y keeps it.
- profiles (architect): Flexoki's --green is #408739 light / #61a25a dark, its own green
  (#66800b / #879a39, OKLCH hue ~123°) rotated to hue 142° at Flexoki's lightness and chroma
  (L 0.559 / C 0.134 light, L 0.651 / C 0.124 dark), away from yellow. A documented departure
  from upstream Flexoki.
- profiles BUILD: package.json moved to 0.4.0 in slice 1, not slice 5: the package test ties the
  version to the newest probes tag, and slice 1 added v0.4.0's probes.
- profiles BUILD: one rule, `:where([data-palette], [data-scheme])`, paints `--bg` and `--fg`, so
  a container that only forces a scheme repaints too; text color inherits as a resolved color.
- profiles BUILD: caret-color and accent-color moved from the body to `:where(*)`, so each element
  resolves `--interaction-color` in its own palette and scheme. Trade-off: a consumer's plain
  accent-color on an ancestor no longer inherits; the hook is the path.
- profiles BUILD: the default stripe is `color-mix(in srgb, var(--bg-2) 50%, var(--bg))`.
- profiles BUILD: the inline-code rule is `:where(code:not(pre code, a code))`, so code in a pre
  stays plain and code in a link takes the link's color and underline.
- profiles BUILD: a dialog's actions sit `--space-m` below its content, through
  `dialog > :is(form, menu, footer):last-child:not(:first-child)` in the elements layer, so
  every consumer's `method="dialog"` form gets the space.
- profiles BUILD: Everforest pinned at v0.3.0; its `--border` is bg3 light (bg2 light equals
  bg_dim, the pane) and bg2 dark. Its magenta is its purple, which fills the ANSI magenta slots.
- profiles BUILD: Primer pinned at github-vscode-theme v6.3.5, resolving @primer/primitives 7.10.0
  with the theme's src/colors.js overrides; every new hex was checked against upstream, 64 of 64.
- profiles BUILD: the specimen's banners are `--text-2xl`, `--text-xl`, and `--text-l`, since
  synthesized small caps render near 70% of the font size; the fluid readout is a CSS counter set
  by `round(var(--sample) * 100)`, with no script.
- profiles BUILD: the budgets live once, in `BUDGETS` in `scripts/size.js`. An entry with no
  budget fails the check, and one exactly at its budget passes. Raising a budget is the
  architect's decision, never a fix for a failing check (STANDARDS.md).
- profiles standards review: the color-facet test reads every token the color sub-layer declares,
  so an extra token fails; the budget tests hold BUDGETS' keys to the exported entries and the
  audit to no failures, replacing tests that restated BUDGETS and audit's arithmetic.
- profiles session brief redirect (architect): drop Tokyo Night; it is too close to Catppuccin
  and translates less well to a web UI. Profiles are ordered Flexoki, Primer, Catppuccin,
  Everforest everywhere. Upstream values stay as upstream ships them, contrast fails included;
  the Flexoki green rotation is the one exception. The fluid-expansion rows sit at the foot of
  their scales; section h2s take the standard h2 style with no banner block; the line samples
  must show --line-s and --line-m distinctly.
- profiles session brief redirect (architect): the line tokens stay 1px and 2px; the samples
  render correctly and now draw in --fg. Rejected 0.5px for --line-s: it renders as 1px on 1x
  displays and thins every control boundary to a hairline on HiDPI. The fluid rows sit a
  --space-m below their scales.
- profiles SHIP (architect): accepted the session brief; v0.4.0 releases four color profiles
  (Flexoki, Primer, Catppuccin, Everforest) over the 16-token interface.
- plan preferences: currency was current on main before round 1 (`mise run currency` reported
  nothing), so the brief has no upgrade slice.
- plan preferences: registering a profile lists its name only; the page's or extension's CSS
  ships the profile, and registering never loads CSS. Rejected loading CSS on register: it adds a
  fetch-time flash for stored profiles under the lean entry.
- plan preferences: one registry per page, a store at a well-known global key (Symbol.for), with
  the module's exports as the API over it; the store's shape is public API frozen per tag.
  Rejected import maps: an extension pinned to another tag would get a second registry, and every
  page would need an import map.
- plan preferences: the registry is its own module with no UI, separate from preferences.
  (Architect, for keys: keys.js is purely the shortcut API, not the shortcuts themselves; binding
  specific shortcuts is a higher-level concern.)
- plan preferences: stored preferences apply before first paint through a render-blocking module
  (`blocking="render"`), inside the preferences module, as progressive enhancement; chromium
  measured no flash, and Firefox's flash is recorded. Rejected a classic blocking script (departs
  from ES modules), an inline snippet per page (unversioned), and a third pre-paint module.
- plan preferences: one namespaced localStorage key per origin, shared by every page using the
  baseline (every file:// page in chromium and every jaimestill.github.io project site
  included). A stored name a page hasn't registered falls back to that facet's default and stays
  in storage.
- plan preferences: the menu is a custom element the page places once, in light DOM, so the
  elements layer styles it; a shadow root would shut the baseline out (verified). Promoting it to
  an official web component waits for spike-html-components (architect).
- plan preferences: the element binds T itself until keys.js takes the binding in v0.6.0.
- plan preferences: another tab's save applies live through the storage event, except while the
  menu is open: it is ignored then, Save overwrites it, and Cancel restores the stored value,
  the other tab's included.
- plan preferences: the second space profile is denser: compact, --space-base 0.75rem to
  0.875rem and --radius-base 0.25rem, lines unchanged. The default space profile is regular.
- plan preferences: the type profiles are mono (default) and serif, framed as interface versus
  editorial (engineer versus writer); "keep it simple for now" (architect).
- plan preferences: serif sets heading and ui to the transitional system stack ui-serif,
  Charter, "Bitstream Charter", "Sitka Text", Cambria, serif; body stays sans, code mono, and the
  scale and leadings stay the default's. The serif ui font is dialed in at the review stop and at
  validate (architect). Rejected the old-style stack (Iowan, Palatino). Superseded at the review
  stop: sans replaces serif.
- plan preferences: space and type profiles are files under their facet directories, as color's
  are (profiles BUILD).
- plan preferences: profile export keys nest by facet, ./profiles/<facet>/<name>, and color's
  keys move from flat; v0.4.0 keeps its keys, and no outside consumer links them.
- plan preferences: the working-tree specimen loads its modules by relative URL, and its missing
  menu from file:// is recorded. The review stop runs on `mise run serve`, where relative modules
  load. The v0.5.0 pinned page proves file:// through jsDelivr's CORS header, hermetically and
  with `mise run pin`. Rejected classic scripts with no import or export. Verified that an import
  map, fetch, and XHR can't load working-tree modules from file://.
- plan preferences: the harness adds Access-Control-Allow-Origin to intercepted answers.
- plan preferences: each JS export is held to a brotli budget in BUDGETS from v0.5.0, its figure
  set from the built size and approved at the session brief.
- plan preferences: a visual review stop on the served workbench follows the menu and the new
  profiles, before the package, budget, and pin slices.
- plan preferences: one registration module per CSS entry: ./register (flexoki, regular, mono)
  and ./register/full (every built-in profile); no module can detect the linked entry.
- plan preferences: the page's own button opens the menu with the invoker command
  commandfor="<id>" command="--open" (Baseline newly available, 2025-12-12). Rejected a trigger
  the element renders.
- plan preferences: the menu is a modal dialog holding a live preview, since the 80% backdrop
  veils the page. Rejected a non-modal popover with the page as the preview.
- plan preferences: each change applies at once to the preview and the page. T and Save accept
  and write storage once; Escape and Cancel restore the snapshot taken when the menu opened and
  write nothing (architect). A backdrop click does nothing.
- plan preferences: each section is a native radio group drawn as ◀ value ▶, the unchecked
  radios hidden visually but kept in the group. Up/Down and k/j move between sections;
  Left/Right and h/l cycle within one, a deliberate deviation from the APG radio pattern
  (architect's settings-menu model). The scheme row cycles system, light, dark. Rejected a
  role="slider" row.
- plan preferences: the preview holds the preview card's contents without its frame or token
  strip.
- plan preferences: the menu's CSS is never in the baseline's layers: one constructed sheet the
  element adopts onto the document, so it moves with the component when promoted (architect).
  Rejected the tools layer.
- plan preferences: the adopted sheet's layer is spike-html-design.theme-menu, after tools and
  under every consumer layer; "treat the spike namespace as the custom component layer for the
  spike" (architect). Rejected a top-level layer, which beats the page's app layer (verified).
- plan preferences: the menu's code is a separate module, loaded on first open and exported as
  ./theme-menu; the render-blocking preferences module holds only pre-paint apply, persistence,
  the T binding, and the thin element. This encapsulates the menu for promotion (architect).
- plan preferences: keys the open menu handles stop at the dialog; T closes the open menu.
- plan preferences: the menu carries Save (as T) and Cancel (as Escape), since closing has two
  actions (architect); Save shows <kbd>T</kbd> and Cancel <kbd>Esc</kbd>, each with
  aria-keyshortcuts.
- plan preferences: the element is <theme-menu>; the JS export keys are ./registry,
  ./preferences, ./theme-menu, ./register, and ./register/full.
- plan preferences: the specimen's trigger is a native "Theme" button with <kbd>T</kbd> and
  aria-keyshortcuts="T" at the end of the header's title row.
- plan preferences: chromium 152 blocks relative module scripts from file://, which confirms
  context/file-modules.md.
- preferences review stop (architect): the Theme button sits beneath the title and above the
  intro. Accepted: Up/Down stop at the first and last rows, h/l wrap; values show registry
  names; the preview is inert; the menu is rebuilt each open and any other close counts as
  Cancel; the registry is preloaded with modulepreload (first paint ~244 ms versus ~456 ms with
  fetches held 200 ms).
- preferences review stop (architect): the second type profile is sans, not serif: heading, ui,
  and body in the system sans stack, code mono, the default scale and leadings. The pair is mono
  (interface) and sans.
- preferences review stop (architect): the specimen's Color, Space, and Type sections follow the
  current selection, in this task (slice 4b): Light and Dark swatches as scheme-scoped cells,
  hex values filled by a specimen-only script, captions per profile.
- preferences review stop 2 (architect): accepted slice 4b, with the whole Light and Dark cell
  scoped to its scheme (the Dark column paints its own dark surface on a light page).
- preferences BUILD: the modules live in a top-level `modules/` directory, beside `layers/`.
- preferences BUILD: DEFAULTS are constants (flexoki, regular, mono), the profiles both CSS
  entries apply with no attribute, not whichever name registered first.
- preferences BUILD: register throws a TypeError on an unknown facet or an empty name.
- preferences BUILD: the preferences module exports the hooks the menu builds on: KEY,
  ATTRIBUTES, SCHEMES, read, apply, save, setOpen, isOpen.
- preferences BUILD: with nothing stored, the preferences module leaves the root untouched, so a
  page's own profile attributes stand.
- preferences BUILD: T counts with Shift (caps lock), and not with Ctrl, Alt, or Meta, or in a
  field (input, textarea, select, contenteditable).
- preferences BUILD: <theme-menu> loads theme-menu.js by `new URL("./theme-menu.js",
  import.meta.url)`, so the menu comes from the same URL and tag as the preferences module.
- preferences BUILD: a space profile sets only --space-base, the two lines, and --radius-base;
  space.css declares the steps and derived radii again on `:where(:root, [data-space])`, since a
  custom property inherits with its var() already substituted.
- preferences BUILD: a type profile sets the four role fonts and four leadings; `:where([data-type])`
  re-sets font-family and line-height on its scope, since both inherit as resolved values.
- preferences BUILD: data-space gets no paint rule: a space scope changes no paint and no text.
- preferences BUILD: a JS entry's size is the module plus every module its static imports reach,
  each counted once; a dynamic import() counts toward the module it loads, so theme-menu.js is
  its own entry.
- preferences BUILD: Cancel compares the stored string at open and at close, so another tab's
  save during the open menu is what Cancel restores.
- preferences BUILD: the menu is rebuilt on each open, so its rows list the registry as it is.
- preferences BUILD: the specimen's hex-value script is inline, so it runs from file://, where
  relative module scripts don't; the Space and Type captions follow the selection through
  inherited custom properties, with no script.
- preferences BUILD: `test/menu.js` drives a pinned page's menu as a reader would, shared by
  the pinned tests and the live pin check.
- preferences BUILD: the pin check accepts a module served as text/javascript or
  application/javascript.
- preferences standards review: two tests that passed without proving their behavior were fixed
  (03cda5e), and STANDARDS.md's "a profile sets color tokens only" became "a profile sets its own
  facet's tokens only" (d68c240).
- preferences editor: context/file-modules.md is integrated: README "Modules from `file://`"
  states the exception, and the coordinator edit to html-artifacts.md "Build" is in Pending
  edits.
- preferences SHIP (architect): accepted the session brief and the JS budgets (registry 1,200,
  preferences 3,800, theme-menu 8,500, register 1,450, register-full 1,550 B brotli), "fine for
  the spike"; size is to be revisited with the holistic client strategy. v0.5.0 releases.
- plan keys: currency was current on main before round 1 (`mise run currency` printed nothing).
- plan keys: the package binds no shortcuts; the specimen binds T, ?, j, k, and g through the API,
  and evidence 7 is restated so (architect: keys is purely the shortcut API).
- plan keys: the ? help dialog is a native <dialog> the page places, opened by the built-in
  show-modal command from a visible button; keys fills a marked list in it.
- plan keys: <theme-menu> drops its own T listener at v0.6.0; one owner per key. v0.5.0 keeps its T.
- plan keys: one binding store per page at globalThis[Symbol.for("spike-html-design.keys")], one
  document listener; its shape frozen per tag.
- plan keys: keys loads as a plain module script, not render-blocking.
- plan keys (research redirect, architect): before round 2, the session researched
  aria-keyshortcuts and current shortcut practice. aria-keyshortcuts only declares (UAs must not
  act on it), names physical keys, folds case, and has no sequences; NVDA and JAWS browse mode
  trap single characters (t, k, g, j). Supersedes round 1's "the element carrying
  aria-keyshortcuts is the binding": the binding is a behavior attribute in @github/hotkey's
  grammar (the precedent, architect), and keys writes aria-keyshortcuts from it.
- plan keys (architect): keys is a module family supporting raw keys, leader chords, and an
  activator combination; the architect hasn't chosen a convention, so the library supports all
  three. Supersedes round 1's "no leader key or sequences in v0.6.0".
- plan keys: both per-binding strings and one activation mode: bare bindings follow the mode;
  strings spelling out a sequence or combination are used as written. Answers the "global or
  encapsulated mode" pending question.
- plan keys: the attribute is data-keys, not data-hotkey: bare keys and caps lock differ from
  @github/hotkey, so a shared name would promise compatibility that isn't there.
- plan keys: a letter without Shift matches either case; "Shift+T" requires Shift. A symbol is
  written as the character ("?"), Shift ignored; rejected @github/hotkey's "Shift+?".
- plan keys: matching by event.key; with Alt held letters and digits match by event.code
  (Option and AltGr change the character); non-ASCII letters fall back to event.code. Rejected
  @github/hotkey's Option-symbol table.
- plan keys (architect): the default leader is g ("g for goto"; h, j, k, l stay free for
  navigation). Rejected comma, Space (takes scrolling), backslash (AltGr on German and French).
- plan keys: the default activator is Alt (Option): the one modifier whose browser shortcuts a
  page can cancel everywhere, and NVDA browse mode passes it. Rejected Meta (window manager,
  Omarchy), Control (Ctrl+T/W/N reserved), Alt+Shift (Firefox accesskey, layout switch).
- plan keys: sequence wait 1500 ms (@github/hotkey); the reader can choose 1000, 1500, 3000, or
  5000 ms (architect).
- plan keys: a prefix conflict ("g" and "g c") waits, then runs the shorter (vim); rejected
  mousetrap's longest-wins and @github/hotkey's replace.
- plan keys (architect): a press that doesn't continue a sequence is dropped, as @github/hotkey
  does; rejected retrying it as a fresh press.
- plan keys: every repeat is ignored; under an open modal only bindings inside it are active
  and register() bindings pause; disabled, [inert], and hidden elements are skipped; the first
  active binding wins (elements in document order, then register() order).
- plan keys: register(keys, label, handler) returns its remover; no unregister export.
- plan keys: the off switch (on by default) turns off character-key shortcuts only (raw and
  leader), as WCAG 2.1.4 covers; combinations stay on. Rows stay listed, marked inactive.
- plan keys: three modules: grammar (no DOM), runtime, and a help module loaded on the dialog's
  first open. Exports ./keys, ./keys/grammar, ./keys/help; each its own budget.
- plan keys: help rows are buttons that close the dialog and run the binding, so every binding
  has a visible control; a fixed screen-reader pass-through note ships in the help module; the
  reader's settings live in the help dialog, not the theme menu.
- plan keys: labels from aria-label, else text without kbd, else register()'s label.
- plan keys: the page sets its default mode with <html data-keys-mode>; default raw; the reader
  can override the mode, leader (g, comma, backslash, Space), activator (Alt, Control, Meta,
  Alt+Shift), and wait. A page sets only the mode (consistency across an origin, WCAG 3.2.3).
- plan keys: the help dialog shows the current mode's keys only, as sibling kbd with "+" and
  "then"; rejected nested kbd (a key drawn inside a key).
- plan keys: keys writes aria-keyshortcuts from the binding in effect, declares a symbol by its
  US physical key ("Shift+/"), declares nothing for a sequence, and removes it while the off
  switch covers the binding.
- plan keys (architect): no sequence-pending indicator ships; "the module should be extensible
  to external contributions that enable such features": the runtime dispatches keys-fire
  (cancelable) and keys-sequence events, and a fixture builds the indicator from outside.
- plan keys: names: Symbol.for("spike-html-design.keys"), localStorage spike-html-design.keys
  holding only changed settings as JSON; attributes data-keys, data-keys-list, data-keys-mode.
- plan keys: the specimen states no mode; j and k move focus through all 31 sections with an id
  (tabindex="-1"); g goes to the top (g g in leader mode). A review stop follows slice 6.
- plan keys: assumed: bare means one press with no modifier but Shift; register() throws a
  TypeError on a malformed string, and a malformed data-keys binds nothing and warns once; keys
  is silent in fields even for combinations; presses continuing a sequence are marked handled.
- keys BUILD: the ./keys and ./keys/grammar exports moved into slice 2 with provisional budgets
  (8,300 and 4,250 B brotli), since the pinned test requires every tracked module to be an
  export; slice 7 sets the final figures, approved at the session brief.
- keys BUILD: the store is { registered, wait, listening }; the first copy installs one
  bubble-phase document listener, so a page handler can prevent a key first.
- keys BUILD: a press that doesn't continue a pending sequence drops it, even when a shorter
  binding ("g" beside "g c") was waiting; lone modifier presses are ignored, so Shift on the way
  to a "g Shift+T" doesn't drop it.
- keys BUILD: a register() handler receives the keys-fire event; keys-sequence goes out only when
  a press leaves a longer binding pending.
- keys BUILD: settings() and changeSettings(change) are the runtime's exports for the help
  module; a written mode, raw included, stays stored until set to null, so a reader can choose
  raw on a page that defaults to leader. store.wait is the package default; the stored wait wins.
- keys BUILD: the off switch covers an alternative only when every press is a single character
  with no Control, Alt, or Meta (Space included, so Space-leader chords are covered); named keys
  like Escape stay on.
- keys BUILD: keys removes the aria-keyshortcuts it wrote when data-keys is removed, and never
  touches an element that never carried data-keys. The provisional keys.js budget rose to 10,550 B
  (entry 9,335 B brotli with the grammar).
- keys BUILD: inside the open theme menu, T stays the menu's own key (Save keeps its hand-written
  aria-keyshortcuts="T"); data-keys on Save can't fire, since focus sits on a radio (a field), and
  the menu stops T at the dialog, so one press acts once. Plain T saves in every mode, as a
  focused component's key outside the off switch. theme-menu.js's accept() export is removed.
- keys BUILD: Shift+T no longer opens the menu: "t" matches either case with Shift up (caps lock
  works); v0.5.0 allowed Shift.
- keys BUILD: keys.js exports bindings(dialog) for the help module; only the listening copy loads
  keys-help.js, on the first beforetoggle of a dialog holding [data-keys-list], and fills it
  synchronously on later opens. A row's run() dispatches no keys-fire (no key was pressed).
- keys BUILD: labels drop kbd and the text between sibling kbd ("then", "+"); a field with no text
  takes its <label>'s text; an unlabeled binding shows its keys. A row the off switch covers gets
  data-keys-off and a visible "off", not aria-disabled, since its button still works.
- keys BUILD: the theme menu ignores repeated T and Escape, so holding the T that opened it doesn't
  save it; held move keys still repeat. Provisional keys-help budget 15,100 B (entry 13,338 B).
- keys BUILD: j and k step the specimen's 19 sections with an id (31 <section>s, 12 cells without
  ids; corrects the plan's "31"), from the innermost section holding focus, else from the
  viewport's top edge; no wrap. The specimen's bindings live in specimen.js (external, so the
  pinned page's markup normalizes); slice 8 adds it to the pinned page's mocked files and the pin
  check. From file:// the native Help button still opens the dialog, with fallback text.

## Pending edits

- coordinator · html-artifacts.md, "Style baseline": rewritten at the answer to describe the
  faceted baseline: layers, facets, profiles, elements and tools, and packaging (facets onward;
  replaces the layers and themes edits to "Style baseline", "Palette", and "Themes"). From
  profiles it covers the sixteen-token color interface, `data-palette` and `data-scheme` scopes
  on any element, the five color profiles, the hooks (`--interaction-color`, `--code-color`,
  `--kbd-color`, `--button-color`, `--table-stripe`), and the lean and full entries with their
  enforced brotli budgets.
- coordinator · roadmap.toml, preferences summary: gains a second space and a second type
  profile, and the data-space and data-type scopes (plan profiles).
- coordinator · roadmap.toml, keys summary: drop "plus key-hint styling"; keys is the
  shortcuts API alone (plan profiles).
- coordinator · html-artifacts.md, "Keyboard": key-hint styling ships with the baseline's
  elements layer (profiles), not keys.js; joins the "Style baseline" rewrite (plan profiles).
- coordinator · roadmap.toml, preferences summary: drop "Replaces the theme toggle" (it was
  never built); add the second space and type profiles (compact, sans) and the data-space and
  data-type scopes (plan preferences; supersedes the plan profiles edit above).
- coordinator · roadmap.toml, keys summary: keys.js is purely the shortcut API, binding specific
  shortcuts a higher-level concern; capture the question of an optional leader key, with a
  global mode (no leader) and an encapsulated mode (leader chords) (plan preferences).
- coordinator · html-artifacts.md, "Build": a page's CSS works the same from file://, but
  chromium blocks relative ES module scripts there, so a file:// page loads the modules from
  jsDelivr (CORS); an untagged working-tree page has no modules from file:// (preferences).
- coordinator · html-artifacts.md, "Keyboard": rewrite: keys is a module family (grammar,
  runtime, help) supporting raw keys, leader chords, and activator combinations through a
  data-keys behavior attribute, writing aria-keyshortcuts from it; the package binds no
  shortcuts; the reader's off switch and settings; key-hint styling stays with elements (keys).
- coordinator · roadmap.toml, keys summary: names the module family, the three conventions,
  leader g and activator Alt; supersedes the plan preferences keys edit's leader question
  (keys).
- coordinator · v1.client: open question: which shortcut convention (raw, leader, activator)
  the organization adopts, informed by the keys review stop (keys).
