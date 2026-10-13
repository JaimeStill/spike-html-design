# spike-html-design

spike-html-design builds one native, tagged baseline of CSS and JS for the organization's
human-facing HTML artifacts: briefs, plan rounds, reports, explainers, and demos. The baseline
is a foundation of swappable design facets. Color, space, and type are each a family of tokens,
and each takes one of several profiles. Its cascade layers style native elements without
changing their behavior and add opt-in tool classes, and a small set of ES modules registers
profiles, keeps the reader's preferences, and binds keys. The spike tests whether other
repositories can consume the baseline by version, as a git-tag package and through jsDelivr,
and extend it with packages of their own. Its answer is evidence for standards-lab's
experiment.html intake; the spike decides nothing itself.

The spike is the sub-goal `experiment.html.spike-html-design` in the coordinator's roadmap,
`standards-lab/context/roadmap.toml`, where its tasks live. Its answer lands in
`standards-lab/context/html-artifacts.md`, "Answers · experiment.html"; its question is framed
there under "Experiment: spike-html-design", and the baseline's settled design under "Style
baseline".

## Terms

- **Layer:** a CSS cascade layer, which sets the order rules win in.
- **Facet:** one dimension of design as a family of tokens: color, space (lines, spacing, and
  radius), or type.
- **Profile:** one set of values for one facet.
- **Scheme:** light, dark, or system, a choice inside every color profile.
- **Tier:** a color token for a surface, a border, or text.
- **Hue:** one of eight color tokens, each named for the color it shows.
- **Theme:** a named selection of one profile per facet.

## The question

Can one tagged, native baseline of swappable design facets be consumed by version, as a git-tag
package and through a pinned CDN URL, and extended by other packages?

## The decision it changes

Whether the baseline graduates, and where: the architecture layer, beside docs-site's diagram
and voice standards, or its own standards-lab repository. spike-html-artifacts and
spike-html-go-wasm link to it. Its packaging, a git-tag package that other packages extend, is
also an input to v1.client.

## The evidence

1. One package, with no build, whose layers nest under one top-level layer: tokens (with color,
   space, and type sub-layers), reset, elements, tools. A consumer's own later layers, and
   unlayered CSS, override it without specificity workarounds.
2. Color, space, and type are token interfaces with a new contract: fluid scales, radius from
   one base, and fonts keyed by role. Swapping one facet's profile changes only that facet's
   tokens.
3. Color profiles Flexoki, Kanagawa, Tokyo Night, and Catppuccin, each light and dark. With
   nothing stored, the scheme follows the system setting, live. Contrast is recorded per
   profile, not corrected.
4. The elements layer changes no native element's behavior, which a test proves against
   chromium's defaults. The tools layer's classes are opt-in, and each states what it changes.
5. A preview container with profile attributes renders its subtree as that profile renders at
   the root.
6. Preferences: T opens a theming menu with each facet's profile and the scheme. Choices persist
   across reloads and pages, and the flash of the default profile before a stored one applies is
   measured. Profiles come from a JS registry that extension packages add to.
7. `keys.js`: one registry; T, ?, j, k, g; silent in fields and with modifiers;
   aria-keyshortcuts; the ? dialog lists the baseline's keys and an artifact's own.
8. Consumption by version, two ways:
   - an install by git tag with bun, with CSS imported from node_modules;
   - a pinned jsDelivr URL, rendering the same from `file://`, a local server, and Pages.
9. Extension: a package, a test fixture, adds a color profile into the foundation's color layer,
   registers it, and passes the conformance test the foundation exports.
10. A page pinned to an earlier tag stays unchanged after later tags ship.
11. Each entry point's size, raw and compressed: measured and reported in facets, enforced
    against a budget from profiles on; and the cost of the @import chain from the CDN.

## Scope

- **No build.** Hand-written CSS, HTML, and ES modules with custom elements and no framework.
  Tools are pinned in mise. Bundling at release waits until validate measures the cost of the
  @import chain from the CDN.
- **Packaging.** From facets on, a `package.json` names and versions the package and exports
  its CSS entry points, and from preferences on its JS modules, with no dependencies. At v0.3.0
  it exports one entry, the lean `baseline.css`, as the package root. A consumer installs it by
  git tag, `bun add github:JaimeStill/spike-html-design#vX.Y.Z`, which validate proves. The lean
  entry point holds the foundation and the default profiles, and the full one, from profiles
  on, every profile. Each entry's size, raw and brotli, is measured and reported in facets, and
  enforced against a budget from profiles on.
- **Serving.** GitHub Pages through `actions/deploy-pages`, for the specimen page. jsDelivr is a
  tested secondary channel: `cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@vX.Y.Z/...`.
- **Releases.** One minor tag per task, v0.1.0 to v0.6.0. A tag is never changed or re-cut. The
  token names change at v0.3.0 with no aliases; earlier tags keep their names.
- **Not here.** Components such as a badge or a card belong to consumer packages, which declare
  their own later layers. Layouts and a layout engine are the backlog goal `client-layouts`, and
  motion is a later facet. The section tree with reading progress belongs to
  spike-html-artifacts, as do the screenshot review script and the HTML briefs themselves.

## Capabilities

Each entry names the task that builds it. v0.2.0 had four flat layers (tokens, reset, theme,
components) under `baseline.css`, Primer-derived dark and light themes with the `data-theme`
hook, role tokens, and component classes. v0.3.0, the facets tag, replaces them: the nested
layers, the facet tokens under new names with no aliases, the elements and tools layers, and
`package.json`; v0.1.0 and v0.2.0 keep their own names and pinned pages.

- **Layers** (facets): one top-level layer named for the package holds tokens, with color,
  space, and type sub-layers, then reset, elements, and tools.
- **Facets** (facets): the token contract, one profile per facet. Color is Flexoki: tiers for
  surfaces, borders, and text, and eight hues named for their color, with no role tokens; a hue
  carries no meaning, and semantic variants are the consumer's. With no `data-scheme` attribute
  the page follows the system scheme, live, and `data-scheme="light"` or `"dark"` forces it.
  Space is a nine-step fluid scale, two line widths, and radii from one base; type is an
  eight-step scale, fluid from `--text-l` up, with fonts and leadings keyed by role (body,
  heading, ui, code). The fluid tokens interpolate with `progress()` between rem bounds over the
  display's size. Browsers without `progress()`, older than Firefox 155 and Safari 26, lose
  fluid sizing: the space tokens and the fluid text steps fail to compute, so the margins,
  paddings, and heading sizes that read them fall back to their unset values.
- **Profiles** (profiles): Kanagawa (wave and lotus), Tokyo Night (night and day), and
  Catppuccin (mocha and latte), with a contrast table per profile. A zero-specificity attribute
  (`data-palette`, `data-space`, `data-type`) applies a profile to any element, and the default
  profile sits on `:root`. A scope re-declares its aliases and re-sets color and background, so
  a preview container renders as its profile renders at the root.
- **Elements** (facets): class-free, zero-specificity styling of every rendered native element,
  limited to paint, type, border (with a table's `border-collapse` and `border-spacing`), radius,
  margin, and padding, with `::file-selector-button`, `::marker`, `::placeholder`, and
  `::backdrop` included. A test checks each element's layout properties, under the reset and
  elements, against chromium's defaults; the reset changes only its listed allowances.
- **Tools** (facets): opt-in, unprefixed classes for native elements, which may change layout:
  buttons (`.button` and a `.button-<hue>` variant per hue), scroll, forms, and tables. A family
  has a hook where it has a treatment to extend: a consumer's variant sets `--button-color` or
  `--table-stripe` in its own layer. Scroll and forms have no hook; a consumer extends them in
  its own later layer.
- **JS modules** (preferences, keys): a profile registry that the package and each extension
  package register into; preferences, where T opens a theming menu with a section per facet and
  the scheme; `keys.js`, the ? help dialog, and key-hint styling.
- **Package** (facets, profiles, validate): `package.json` and the lean entry point, with each
  entry's size reported by `mise run size` and the check (facets); the full entry point and the
  enforced size budget (profiles); the git-tag install and an extension fixture that passes the
  exported conformance test (validate).
- **Publishing:** the specimen page, `index.html`, on Pages, with a section per layer and facet
  from facets on and a grid of preview containers for every profile and scheme from profiles on;
  `mise run serve` (facets), which serves a branch on localhost; a page per tag under `pinned/`
  that links the tag's jsDelivr URL; `mise run pin <tag>`, which checks a published tag live.

## Path

The tasks, in the order they run. Each open task cites the evidence it proves; layers and
themes proved the earlier evidence list, which v0.2.0's README holds.

1. `layers`: the layered stylesheet, a specimen page, the check's headless chromium harness, the
   Pages workflow, and tag v0.1.0 linked by its pinned URL from Pages.
2. `themes`: Primer-derived dark and light, the `data-theme` hook, the system default, the
   contrast table; v0.2.0.
3. `facets`: the nested layers, the facet token interfaces, the elements layer and its behavior
   test, the tools layer and its extension fixture, one profile per facet with Flexoki's
   contrast table, the components layer removed, `package.json`, the lean entry point with its
   size measured and reported, the specimen's section per layer and facet, `mise run serve`,
   and a visual review after the tokens and elements render; v0.3.0 (evidence 1, 2, 4).
4. `profiles`: Kanagawa, Tokyo Night, and Catppuccin, preview containers, the specimen's grid of
   every profile and scheme, the full entry point, the enforced size budget, contrast per
   profile, and a planned visual review after the grid renders; v0.4.0 (evidence 3, 5).
5. `preferences`: the profile registry, the T theming menu, persistence, and the flash
   measurement; v0.5.0 (evidence 6).
6. `keys`: `keys.js`, the ? dialog, key-hint styling; v0.6.0 (evidence 7).
7. `validate`: the git-tag install, the extension fixture, pin stability, sizes against the
   budget, the cost of the CDN's import chain, and the answer (evidence 8–11).

## References

The spike reads this repository and never writes to it. It is a key in the coordinator's
`references.toml`, with its local checkout in `references.local.toml`: `herald` (its client
design, `app/client/design`, and its presentation palette,
`_project/presentation/assets/design/README.md`).

## The answer

Pending: the `validate` task writes it.
