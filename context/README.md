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

Whether the baseline graduates, and where: the architecture layer, beside the diagram and voice
standards, or its own standards-lab repository. experiment.html's later spikes
(spike-html-components, spike-html-hosting, spike-html-go-wasm, spike-html-apps) link to it.
Its packaging, a git-tag package that other packages extend, is also an input to v1.client.

## The evidence

1. One package, with no build, whose layers nest under one top-level layer: tokens (with color,
   space, and type sub-layers), reset, elements, tools. A consumer's own later layers, and
   unlayered CSS, override it without specificity workarounds.
2. Color, space, and type are token interfaces with a new contract: fluid scales, radius from
   one base, and fonts keyed by role. Swapping one facet's profile changes only that facet's
   tokens.
3. Color profiles Flexoki, Tokyo Night, Catppuccin, Everforest, and Primer, each light and
   dark. With nothing stored, the scheme follows the system setting, live. Contrast is recorded
   per profile, not corrected.
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
  its CSS entry points, and from preferences on its JS modules, with no dependencies. A
  consumer installs it by git tag, `bun add github:JaimeStill/spike-html-design#vX.Y.Z`, which
  validate proves. The lean entry point holds the foundation and the default profiles, and the
  full one every profile; "Entries and exports", below, lists v0.4.0's exports. Each entry's
  size, raw and brotli, is reported from facets on, and its brotli size is held to a budget from
  profiles on.
- **Serving.** GitHub Pages through `actions/deploy-pages`, for the specimen page. jsDelivr is a
  tested secondary channel: `cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@vX.Y.Z/...`.
- **Releases.** One minor tag per task, v0.1.0 to v0.6.0. A tag is never changed or re-cut. The
  token names change at v0.3.0 with no aliases; earlier tags keep their names.
- **Not here.** Components such as a badge or a card belong to consumer packages, which declare
  their own later layers. Layouts and a layout engine are spike-html-components' and then
  v1.client's, and motion is a later facet. The section tree with reading progress belongs to
  spike-html-hosting, as does the screenshot review script.

## Capabilities

Each entry names the task that builds it. Each tag keeps its own names on its own pinned page:
v0.1.0 and v0.2.0 have flat layers, Primer-derived themes with the `data-theme` hook, role
tokens, and component classes, and v0.3.0 has `--border-3`. "Using v0.4.0", below, describes
the interface a page uses now.

- **Layers** (facets): one top-level layer named for the package holds tokens, with color,
  space, and type sub-layers, then reset, elements, and tools.
- **Facets** (facets): each facet is a token contract that one profile fills. Color holds
  surfaces, borders, text, and eight hues named for their color, with no role tokens: a hue
  carries no meaning, and semantic variants are the consumer's. The page follows the system
  scheme, live, unless `data-scheme` forces one. Space holds a nine-step fluid scale, two line
  widths, and radii from one base. Type holds an eight-step scale, fluid from `--text-l` up,
  with fonts and leadings keyed by role (body, heading, ui, code). The fluid tokens interpolate
  with `progress()` between rem bounds over the display's size. Browsers without `progress()`,
  older than Firefox 155 and Safari 26, lose fluid sizing: the space tokens and the fluid text
  steps fail to compute, so the margins, paddings, and heading sizes that read them fall back to
  their unset values.
- **Profiles** (profiles): the color interface is sixteen tokens, with a pane surface,
  `--bg-0`, and two border steps. Five profiles fill it, Flexoki, Tokyo Night, Catppuccin,
  Everforest, and Primer, each light and dark in its own file, with a contrast record per
  profile and scheme. `data-palette` and `data-scheme` apply a profile and a scheme to any
  element's subtree, so a preview container renders as its profile renders at the root. The
  elements layer reads three hooks, `--interaction-color`, `--code-color`, and `--kbd-color`,
  and styles `kbd` as an outlined key, the baseline's only key-hint styling.
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
- **JS modules** (preferences, keys): planned. The package and each extension package register
  profiles into one registry. In preferences, T opens a theming menu with a section per facet
  and the scheme, and a second space and a second type profile apply by `data-space` and
  `data-type`. `keys.js` binds keys and opens the ? help dialog.
- **Package** (facets, profiles, validate): `package.json` and the lean entry point, with each
  entry's size reported by `mise run size` and the check (facets); the full entry point and the
  enforced size budget (profiles); the git-tag install and an extension fixture that passes the
  exported conformance test (validate).
- **Publishing:** the specimen page, `index.html`, on Pages, with a section per layer and facet
  from facets on and a grid of preview containers for every profile and scheme from profiles on;
  `mise run serve` (facets), which serves a branch on localhost; a page per tag under `pinned/`
  that links the tag's jsDelivr URL; `mise run pin <tag>`, which checks a published tag live.

## Using v0.4.0

### The color interface

The color facet is sixteen tokens. Each holds a light and a dark value, and resolves to the
scheme of the element that reads it.

| Token | Role |
| --- | --- |
| `--bg-0` | The pane: a side or tool pane, darker than the page in both schemes. |
| `--bg` | The page. |
| `--bg-2` | The element surface, one step from the page toward the text: table headers. |
| `--border` | Dividers, containers, and hover fills. |
| `--border-2` | Control boundaries: text fields, selects, buttons, dialogs, and `kbd`. |
| `--fg` | Text, the strongest. |
| `--fg-2` | Secondary text. |
| `--fg-3` | Faint text. |
| `--red`, `--orange`, `--yellow`, `--green`, `--cyan`, `--blue`, `--purple`, `--magenta` | The eight hues. Each is named for the color it shows and carries no meaning. |

There are no role tokens. A page that wants a success or a danger color reads the hue it means,
or sets its own token in its own layer.

### Selecting a profile

`data-palette` on any element applies a profile to that element's subtree. The nearest
`data-palette` wins, so scopes nest. With no attribute anywhere, Flexoki applies, and
`data-palette` on the root replaces it for the whole page.

`data-scheme="light"` or `data-scheme="dark"` on any element forces that scheme on its subtree.
With no attribute, the page follows the system scheme and changes when it does.

An element with either attribute paints its own background and text from the tokens it
resolves, so a scoped container renders as its profile and scheme render at the root. Both
attributes have zero specificity: a consumer's later layer beats every profile.

```html
<html data-palette="catppuccin">
  ...
  <aside data-palette="primer" data-scheme="dark">...</aside>
</html>
```

### The profiles

Each profile is its own file under `layers/tokens/color/`, whose heading comment credits its
source. Its contrast in each scheme, every text token and hue over every surface, is recorded
in the specimen and not corrected.

| `data-palette` | Light / dark | Source | License | Version |
| --- | --- | --- | --- | --- |
| `flexoki` (default) | light / dark | [Flexoki](https://stephango.com/flexoki), Steph Ango | MIT | unversioned |
| `tokyo-night` | day / night | [folke/tokyonight.nvim](https://github.com/folke/tokyonight.nvim) | Apache-2.0 | v4.14.1 |
| `catppuccin` | latte / mocha | [catppuccin/palette](https://github.com/catppuccin/palette) | MIT | v1.8.0 |
| `everforest` | hard light / hard dark | [sainnhe/everforest](https://github.com/sainnhe/everforest) | MIT | v0.3.0 |
| `primer` | GitHub Light Default / GitHub Dark Dimmed | [primer/github-vscode-theme](https://github.com/primer/github-vscode-theme) | MIT | v6.3.5 |

Flexoki's green is the one departure from an upstream: its green-600 and green-400 keep their
OKLCH lightness and chroma but rotate from a hue near yellow to 142°, sRGB green's, as
`#408739` light and `#61a25a` dark.

### Hooks

A hook is a custom property that a layer reads, so a consumer extends a treatment by setting
one property on any element. The baseline reads each hook with a fallback. Neither the
baseline nor any profile declares a hook, except the tools layer's `.button-<hue>` variants,
which a page opts in to by class and which set `--button-color`. Hooks are public API, frozen
with each tag.

| Hook | Layer | Colors | Fallback |
| --- | --- | --- | --- |
| `--interaction-color` | elements | Links, the focus outline, the caret, `accent-color`, the selection's 30% mix, and the hover border of controls. | `--blue` |
| `--code-color` | elements | Inline code's text. | `--green` |
| `--kbd-color` | elements | `kbd`'s border and text. | `--border-2` for the border, `--fg` for the text |
| `--button-color` | tools | A `.button-<name>` variant's border and text. | none: each variant sets it |
| `--table-stripe` | tools | The stripe of `.table-striped`. | a mix of `--bg-2` and `--bg` |

```css
@layer spike-html-design, app;
@layer app {
  .danger-zone { --interaction-color: var(--red); }
  .button-danger { --button-color: var(--red); }
}
```

The elements layer sets `caret-color` and `accent-color` on every element from
`--interaction-color`, so each resolves in its own element's palette and scheme. A plain
`accent-color` set on an ancestor therefore doesn't reach its descendants: set the hook instead.

The elements layer styles `kbd` as an outlined key with a heavier bottom edge, the baseline's
only key-hint styling. The planned keys module binds keys and styles nothing.

### Entries and exports

| Export | File | Holds |
| --- | --- | --- |
| `.` | `baseline.css` | The lean entry: the foundation and Flexoki. |
| `./full` | `full.css` | The full entry: everything the lean entry holds, plus every other profile. |
| `./profiles/<name>` | `layers/tokens/color/<name>.css` | One profile, for `flexoki`, `tokyo-night`, `catppuccin`, `everforest`, and `primer`. |

A page links one entry, never both. A page that needs one profile beyond Flexoki links the lean
entry and imports that profile into the color sub-layer, after the entry:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@v0.4.0/baseline.css" />
<style>
  @import url(https://cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@v0.4.0/layers/tokens/color/catppuccin.css)
    layer(spike-html-design.tokens.color);
</style>
```

A profile file linked on its own is unlayered, and beats the consumer's layers.

### Size budgets

Each entry's size is the sum of its files' brotli-11 sizes, the entry and every file it imports.
The check fails when an entry exceeds its budget, 14,000 bytes for the lean entry and 18,000
bytes for the full entry, or has none. The budgets live in `BUDGETS` in `scripts/size.js`, and
raising one is the architect's decision. Raw sizes are reported, not enforced. `mise run size`
prints each entry's files with their raw and brotli sizes, the totals, and the headroom.

### Reading measure

The baseline ships no measure token and no measure class. A reading measure belongs on a
prose layout's reading column, which the layout sets (STANDARDS.md, "Reading measure").

### Fluid tokens

`--space-fluid` and `--type-fluid` are internal: each is the display's fluid expansion, 0 to 1,
across the display range, and drives its facet's scale. Pages never read them. `--space-base`
is public: setting it rescales every space step.

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
4. `profiles`: the sixteen-token color interface, Tokyo Night, Catppuccin, Everforest, and
   Primer beside Flexoki, the interaction, code, and kbd hooks, preview containers, the
   specimen's grid of every profile and scheme with the workbench layout reworked, the full
   entry point, the enforced size budget, contrast per profile, and a visual review after the
   grid renders; v0.4.0 (evidence 3, 5).
5. `preferences`: the profile registry, the T theming menu, persistence, and the flash
   measurement; v0.5.0 (evidence 6).
6. `keys`: `keys.js` and the ? dialog; v0.6.0 (evidence 7).
7. `validate`: the git-tag install, the extension fixture, pin stability, sizes against the
   budget, the cost of the CDN's import chain, and the answer (evidence 8–11).

## References

The spike reads this repository and never writes to it. It is a key in the coordinator's
`references.toml`, with its local checkout in `references.local.toml`: `herald` (its client
design, `app/client/design`, and its presentation palette,
`_project/presentation/assets/design/README.md`).

## The answer

Planned: the `validate` task writes it.
