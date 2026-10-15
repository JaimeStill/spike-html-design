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
3. Color profiles Flexoki, Primer, Catppuccin, and Everforest, each light and dark. With nothing
   stored, the scheme follows the system setting, live. Contrast is recorded per profile, not
   corrected.
4. The elements layer changes no native element's behavior, which a test proves against
   chromium's defaults. The tools layer's classes are opt-in, and each states what it changes.
5. A preview container with profile attributes renders its subtree as that profile renders at
   the root.
6. Preferences: a theming menu with each facet's profile and the scheme, which the page's T
   opens. Choices persist across reloads and pages, and the flash of the default profile before
   a stored one applies is measured. Profiles come from a JS registry that extension packages
   add to.
7. Keys: a shortcut library of three modules (grammar, runtime, help) that binds no shortcut
   itself. A page binds its own, in one store per page. Keys runs no binding in fields, on
   repeats, or while an input method composes, and Escape releases a field. It writes
   aria-keyshortcuts, has an off switch, and fills the page's ? help dialog with the page's
   bindings. The specimen binds T, ?, j, k, and g through it. One convention holds: every
   binding is pressed as written, with chords and combinations spelled out. The keys review
   stop tried leader and activator modes on the specimen and found this convention enough.
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
  Tools are pinned in mise. "The answer" gives the measured cost of the @import chain from the
  CDN and of the comments, and leaves a release build to the experiment.html intake.
- **Packaging.** From facets on, a `package.json` names and versions the package and exports
  its CSS entry points, and from preferences on its JS modules, with no dependencies. A
  consumer installs it by git tag, `bun add github:JaimeStill/spike-html-design#vX.Y.Z`, as
  "Extending with a package" shows. The lean entry point holds the foundation and the default
  profiles, and the full one every profile; "Entries and exports", below, lists v0.7.0's
  exports. Each entry's size, raw and brotli, is reported from facets on, and its brotli size is
  held to a budget from profiles on.
- **Serving.** GitHub Pages through `actions/deploy-pages`, for the specimen page. jsDelivr is a
  tested secondary channel: `cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@vX.Y.Z/...`.
- **Releases.** One minor tag per task, v0.1.0 to v0.7.0. A tag is never changed or re-cut. The
  token names change at v0.3.0 with no aliases; earlier tags keep their names.
- **Not here.** Components such as a badge or a card belong to consumer packages, which declare
  their own later layers. Layouts and a layout engine are spike-html-components' and then
  v1.client's, and motion is a later facet. The section tree with reading progress belongs to
  spike-html-hosting, as does the screenshot review script.

## Capabilities

Each entry names the task that builds it. Each tag keeps its own names on its own pinned page:
v0.1.0 and v0.2.0 have flat layers, Primer-derived themes with the `data-theme` hook, role
tokens, and component classes; v0.3.0 has `--border-3`; v0.4.0 has flat profile export keys,
`./profiles/<name>`; v0.4.0 and v0.5.0 have a pane surface, `--bg-0`, darker than the page in
both schemes; and v0.5.0's `<theme-menu>` binds its own T, Shift included. "Using v0.7.0",
below, describes the interface a page uses now.

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
- **Profiles** (profiles, preferences, keys): the color interface is sixteen tokens, with three
  surfaces and two border steps (profiles); the surfaces step from `--bg` toward the text, as
  "The color interface" describes (keys). Four profiles fill it, Flexoki, Primer, Catppuccin,
  and Everforest, each light and dark in its own file, with a contrast record per profile and
  scheme. `data-palette` and `data-scheme` apply a profile and a scheme to any element's
  subtree, so a preview container renders as its profile renders at the root. Space has two
  profiles, regular and compact, and type two, mono and sans, which `data-space` and `data-type`
  apply the same way (preferences). The elements layer reads three hooks,
  `--interaction-color`, `--code-color`, and `--kbd-color`, and styles `kbd` as an outlined key,
  the baseline's only key-hint styling.
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
- **JS modules** (preferences, keys): one registry per page lists each facet's profiles, and the
  package and each extension package register into it. The preferences module applies the
  reader's stored choice before first paint, and T or the page's own button opens a theming menu
  with a row per facet and the scheme (preferences). Keys is three modules, a grammar, a runtime,
  and a help module: the page binds its own shortcuts with `data-keys` or `register()`, and keys
  fills the page's ? help dialog with them and the reader's settings (keys).
- **Package** (facets, profiles, preferences, validate): `package.json` and the lean entry point,
  with each entry's size reported by `mise run size` and the check (facets); the full entry point
  and the enforced size budget (profiles); the JS exports, each with its own budget
  (preferences); `./conformance`, which checks a color profile against the facet's contract in a
  live page, and the Harbor extension fixture, a package that installs the baseline by git tag,
  adds a color profile, and passes that check (validate).
- **Publishing:** the specimen page, `index.html`, on Pages, with a section per layer and facet
  from facets on, a grid of preview containers for every profile and scheme from profiles on, a
  Theme button that opens the menu from preferences on, and from keys on a Help button and
  dialog, with T, ?, j, k, and g bound; `mise run serve` (facets), which serves a branch on
  localhost; a page per tag under `pinned/` that links the tag's jsDelivr URLs, for its modules
  too from v0.5.0, and for the specimen's own `specimen.js` from v0.6.0; `mise run pin <tag>`,
  which checks a published tag's stylesheets, modules, and page scripts live, and from v0.6.0
  installs the Harbor fixture from GitHub by the tag (validate); and `mise run chain <tag>`
  (validate), which measures the CSS entries' and keys.js's import chains live from jsDelivr.

## Using v0.7.0

### Wiring a page

A page links one CSS entry and loads two modules from the same tag, both render-blocking: the
registration module that matches the entry, then the preferences module. It preloads the
registry, which both import, and places one `<theme-menu>`, here opened by its own button. To
bind shortcuts it loads keys as a plain module script and marks each bound control with
`data-keys`; here the Theme button carries T and the Help button ?, which opens the page's help
dialog:

```html
<html lang="en">
  <head>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@v0.7.0/full.css" />
    <link rel="modulepreload" href="https://cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@v0.7.0/modules/registry.js" />
    <script type="module" blocking="render" src="https://cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@v0.7.0/modules/register-full.js"></script>
    <script type="module" blocking="render" src="https://cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@v0.7.0/modules/preferences.js"></script>
    <script type="module" src="https://cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@v0.7.0/modules/keys.js"></script>
  </head>
  <body>
    <button type="button" commandfor="theme" command="--open" data-keys="t">
      Theme <kbd>T</kbd>
    </button>
    <button type="button" commandfor="help" command="show-modal" data-keys="?">
      Help <kbd>?</kbd>
    </button>
    ...
    <theme-menu id="theme"></theme-menu>
    <dialog id="help" aria-labelledby="help-title">
      <h2 id="help-title">Keyboard shortcuts</h2>
      <div data-keys-list></div>
      <button type="button" commandfor="help" command="close" data-keys="?">
        Close <kbd>?</kbd>
      </button>
    </dialog>
  </body>
</html>
```

A page without the modules renders the default profiles, or the profiles its own attributes
select. A page without keys has no shortcuts, and its buttons still work.

### The color interface

The color facet is sixteen tokens. Each holds a light and a dark value, and resolves to the
scheme of the element that reads it. The three surfaces step from `--bg` toward the text, each
raised over the one before: lightest to darkest in light schemes, darkest to lightest in dark,
in every profile. `--bg-0` is gone since v0.6.0, with no alias.

| Token | Role |
| --- | --- |
| `--bg` | The base background: the page, and the fill of fields. |
| `--bg-1` | The first elevated surface, one step toward the text: dialogs and panels. |
| `--bg-2` | The element surface, one more step toward the text: table headers. |
| `--border` | Dividers, containers, and hover fills. |
| `--border-2` | Control boundaries: text fields, selects, buttons, dialogs, and `kbd`. |
| `--fg` | Text, the strongest. |
| `--fg-2` | Secondary text. |
| `--fg-3` | Faint text. |
| `--red`, `--orange`, `--yellow`, `--green`, `--cyan`, `--blue`, `--purple`, `--magenta` | The eight hues. Each is named for the color it shows and carries no meaning. |

There are no role tokens. A page that wants a success or a danger color reads the hue it means,
or sets its own token in its own layer.

### Selecting a profile

Each facet has its own attribute: `data-palette` selects a color profile, `data-space` a space
profile, and `data-type` a type profile. Each applies its profile to the element's subtree. The
nearest attribute of each kind wins, so scopes nest. With no attribute anywhere, the defaults
apply, Flexoki, regular, and mono, and an attribute on the root replaces its facet's default for
the whole page.

`data-scheme="light"` or `data-scheme="dark"` on any element forces that scheme on its subtree.
With no attribute, the page follows the system scheme and changes when it does.

An element with `data-palette` or `data-scheme` paints its own background and text from the
tokens it resolves, and an element with `data-type` sets its own font and leading, so a scoped
container renders as its profiles and scheme render at the root. Every attribute has zero
specificity: a consumer's later layer beats every profile.

```html
<html data-palette="catppuccin" data-type="sans">
  ...
  <aside data-palette="primer" data-scheme="dark" data-space="compact">...</aside>
</html>
```

### The color profiles

Each color profile is its own file under `layers/tokens/color/`, whose heading comment credits its
source. Its contrast in each scheme, every text token and hue over `--bg`, `--bg-1`, `--bg-2`,
`--border`, and `--border-2`, is recorded in the specimen and not corrected. A profile whose
upstream swatches don't fall in the surfaces' order takes them in lightness order: Everforest
light's `--bg`, `--bg-1`, and `--bg-2` are bg0, bg1, and bg_dim.

| `data-palette` | Light / dark | Source | License | Version |
| --- | --- | --- | --- | --- |
| `flexoki` (default) | light / dark | [Flexoki](https://stephango.com/flexoki), Steph Ango | MIT | unversioned |
| `primer` | GitHub Light Default / GitHub Dark Dimmed | [primer/github-vscode-theme](https://github.com/primer/github-vscode-theme) | MIT | v6.3.5 |
| `catppuccin` | latte / mocha | [catppuccin/palette](https://github.com/catppuccin/palette) | MIT | v1.8.0 |
| `everforest` | hard light / hard dark | [sainnhe/everforest](https://github.com/sainnhe/everforest) | MIT | v0.3.0 |

Flexoki's green is the one departure from an upstream: its green-600 and green-400 keep their
OKLCH lightness and chroma but rotate from a hue near yellow to 142°, sRGB green's, as
`#408739` light and `#61a25a` dark.

### The space and type profiles

Each space profile is its own file under `layers/tokens/space/`, and each type profile under
`layers/tokens/type/`.

| Attribute | Profile | Values |
| --- | --- | --- |
| `data-space` | `regular` (default) | `--space-base` from 1rem on a 22.5rem display to 1.125rem on an 80rem one; `--radius-base` 0.375rem. |
| `data-space` | `compact` | `--space-base` from 0.75rem to 0.875rem over the same range; `--radius-base` 0.25rem. |
| `data-type` | `mono` (default) | Headings and interface controls in the system monospace stack, body text in the system sans stack, code in monospace. |
| `data-type` | `sans` | Headings, interface controls, and body text in the system sans stack, code in monospace. |

A space profile sets only `--space-base`, the two line widths, 1px and 2px in both, and
`--radius-base`. `space.css` declares every step and radius again on each `data-space` scope, so
they read that scope's base. A type profile sets the four role fonts and leadings; both type
profiles share the leadings and the text scale.

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
only key-hint styling. Keys binds keys and styles nothing.

### The registry

The registry module, `registry.js`, lists the profiles a page can apply, per facet, for the menu
and the stored preferences to read. One store serves the whole page: a plain object at
`globalThis[Symbol.for("spike-html-design.registry")]`, shaped
`{ color: string[], space: string[], type: string[] }`. Every copy of the module uses that store,
whatever URL or tag it loads from, so an extension pinned to another tag registers into the same
lists. The store's shape is public API, frozen with each tag.

| Export | What it is |
| --- | --- |
| `register(facet, name)` | Lists `name` under `facet`; registering a name twice is harmless. Throws a `TypeError` on an unknown facet or an empty name. |
| `profiles(facet)` | Returns a copy of the facet's names, in registration order. |
| `FACETS` | `color`, `space`, and `type`. The scheme is not a facet. |
| `DEFAULTS` | Each facet's default: `flexoki`, `regular`, and `mono`, the profiles both CSS entries apply with no attribute. |

Registering lists a name and loads no CSS: the page's CSS ships the profile. Two registration
modules mirror the CSS entries. `./register` registers the lean entry's defaults, and
`./register/full` every built-in profile; a page imports the one that matches the entry it
links. A page or extension that imports a profile beyond its entry registers that name itself,
in a module loaded before the preferences module:

```js
import { register } from "https://cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@v0.7.0/modules/registry.js";

register("color", "catppuccin");
```

### Preferences

The preferences module, `preferences.js`, applies the reader's stored choice to the root before
first paint, saves it, and follows other tabs. A choice is a profile name per facet and a scheme,
stored as JSON under the localStorage key `spike-html-design.preferences`. The key is one per
origin, so every page using the baseline on an origin shares the choice, in any directory. In
chromium every `file://` page shares one such origin, as does every project site under
`jaimestill.github.io`.

The module sets `data-palette`, `data-space`, `data-type`, and `data-scheme` on the root; the
system scheme sets no `data-scheme`. A stored name the page hasn't registered falls back to its
facet's default and stays in storage for the pages that register it. With nothing stored, the
module leaves the root as the page wrote it. Another tab's save applies at once through the
`storage` event, except while the menu is open. The module's exports, `KEY`, `ATTRIBUTES`,
`SCHEMES`, `read`, `apply`, `save`, `setOpen`, and `isOpen`, are the hooks the menu builds on;
its heading comment documents each.

The flash is the time from first paint to the stored choice applying. The check measures it in
headless chromium with each module fetch held 200 ms, as a CDN's round trip would hold it:

- Loaded with `blocking="render"`, the module applies the choice before first paint: a 0 ms
  flash, paid for by first paint waiting on the module fetches.
- Preloading `registry.js` with `modulepreload` fetches it beside the modules instead of after
  them, which moves that first paint from about 452 ms to about 228 ms.
- Loaded without `blocking="render"`, the default profiles show for about 366 ms before the
  stored choice applies.
- A module that fails to load doesn't stall first paint; the page renders its defaults.

Firefox doesn't support `blocking="render"`, so it paints the defaults first and then flashes.
That is recorded from its feature support, not measured.

### The theming menu

`<theme-menu>`, which the preferences module defines, holds the menu. A page places it once,
with an id, and opens it with its own button, `commandfor="<id>" command="--open"`. From v0.6.0
`<theme-menu>` listens for no key to open: a page that wants T gives that button
`data-keys="t"` and loads keys, as the specimen does. T then opens the menu with Shift up, so
caps lock doesn't block it; Shift+T doesn't open it. v0.5.0's menu keeps its own T, which Shift+T
also opened. The element fetches `theme-menu.js` the first time it opens, never before first paint,
from the URL and tag its own module came from.

The menu is a modal native `<dialog>` in light DOM, so the elements layer styles it, and it is
built again on each open. It has one row per section, in order: color profile, scheme, space,
and type. Each row is a native radio group drawn as ◀ value ▶, over the names the registry lists
for that facet; the scheme row cycles system, light, and dark. Beside the rows, a preview carries
the selection's attributes and holds a heading, a paragraph with a link, inline code, and `kbd`,
a neutral and a hue button, a text field, and a striped table.

| Key | What it does |
| --- | --- |
| ↑ ↓, k j | Moves between rows, stopping at the first and last. |
| ← →, h l | Cycles the row's values, wrapping. |
| Tab | Moves one stop per row. |
| T, Save | Stores the selection once and closes the menu. T here is the open menu's own key, not keys'. |
| Esc, Cancel | Restores what applied when the menu opened, stores nothing, and closes the menu. |

Every change applies at once to the preview and the page. Each key the menu handles stops at the
dialog, so no page-wide listener sees it. A backdrop click does nothing, and any other close
counts as Cancel. While the menu is open it ignores another tab's save: Save overwrites that
choice, and Cancel restores it.

The menu styles itself with one constructed stylesheet that the element adopts onto the
document, in the layer `spike-html-design.theme-menu`. The layer falls after the baseline's tools
and under every consumer layer and unlayered CSS, and its rules read only the baseline's tokens.

### Keys

Keys is the page's shortcut library, three modules from v0.6.0: the grammar, `keys-grammar.js`,
which parses and formats a binding and touches no DOM; the runtime, `keys.js`, which listens and
binds; and the help module, `keys-help.js`, which fills the help dialog. Keys binds no shortcut
itself. A page binds its own, and the specimen's T, ?, j, k, and g are the specimen's: T and ?
on its Theme and Help buttons, and j, k, and g through `register()` in its own `specimen.js`.
A page loads the runtime as a plain module script, not render-blocking, since no shortcut is
pressed before first paint; the runtime imports the grammar and loads the help module itself.

An element carrying `data-keys` is a binding. When its keys are pressed, keys clicks it, so its
native action or invoker command runs, or focuses it when it is a field. A script binds a
handler with no element:

```js
import { register } from "https://cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@v0.7.0/modules/keys.js";

const remove = register("g c", "Go to the contents", () =>
  document.getElementById("contents").focus(),
);
```

`register(keys, label, handler)` returns a function that removes exactly that binding, even when
another shares its keys. The handler receives the `keys-fire` event. It throws a `TypeError` on
a malformed binding, a label that isn't a string, or a handler that isn't a function; a
malformed `data-keys` binds nothing and logs one console warning.

One store serves the page, a plain object at
`globalThis[Symbol.for("spike-html-design.keys")]`, shaped
`{ registered: { keys, label, handler }[], wait: 1500, listening: boolean }`. Every copy of the
runtime shares it, whatever URL or tag it loads from, and the first installs the one document
listener, so a key never fires twice. Its shape is public API, frozen with v0.6.0.

### The binding grammar

A binding is a string in [@github/hotkey](https://github.com/github/hotkey)'s grammar, the
precedent. A "," separates alternatives, a space separates the presses of a sequence, and "+"
joins a combination of Control, Alt, Meta, Shift, or Mod with one key. Mod is Meta on macOS and
Control elsewhere, and "Plus" and "Space" name those keys. A named key is a UI Events key value,
as in "Escape" or "ArrowUp". A malformed string binds nothing, and since "," always separates,
the comma key can't be bound.

| Binding | Pressed as |
| --- | --- |
| `t` | T with Shift up, either case, so caps lock doesn't defeat it. |
| `Shift+T` | T with Shift held. |
| `?` | The key that types ?, Shift ignored. |
| `g c` | G, then C within the wait. |
| `Mod+k` | Meta+K on macOS, Control+K elsewhere. |
| `?, Shift+/` | Either alternative. |

Keys differs from @github/hotkey in these ways:

- The attribute is `data-keys`, not `data-hotkey`, since the matching below differs, and a
  shared name would promise compatibility that isn't there.
- A letter written without Shift matches either case while Shift is up; `Shift+T` requires
  Shift.
- A symbol is written as the character typed, `?`, never `Shift+?`, and Shift is ignored for it.
- With Alt held, a letter or digit matches by `event.code`, since Option and AltGr change the
  character; @github/hotkey's table of Option symbols isn't used.
- A letter outside ASCII falls back to `event.code`, so on a Russian layout KeyJ is j.
- When a shorter binding prefixes a longer one, the shorter still runs once the wait ends, where
  in @github/hotkey the longer replaces it (see below).

The grammar module's exports are `parse`, `problem`, `stringify`, `normalize`, `matches`,
`labels`, and `keyshortcuts`; its heading comment documents each. An outside module imports it
to format a binding as keys does.

### Matching, sequences, and scope

A press matches by `event.key`, with Control, Alt, and Meta exact: a bare binding doesn't match
with one of them held. Keys runs no binding while focus is in a field (input, textarea, select,
or contenteditable), even a combination; while an input method composes (`isComposing`, or
`keyCode` 229); on "Dead" and "Process"; with AltGraph held; on a repeat; on an event already
handled; and on a modifier pressed alone. A press keys acts on, or that starts or continues a
sequence, is marked handled.

Escape releases a field. Outside an open modal, an Escape pressed in a field blurs the field, so
the page's shortcuts work again, unless another listener handled it, an input method is
composing, or it is a repeat. Keys doesn't mark it handled, so the field's own Escape still
runs: a search field clears. Inside an open modal the dialog keeps Escape. The release is no
binding: the off switch doesn't cover it, it fires no `keys-fire`, and it ends no sequence.

In a sequence, each press must follow the last within the wait, 1500 ms by default. A press that
doesn't continue the sequence ends it and is dropped, not tried as a new start. When one binding
is a prefix of another, as `g` of `g c`, keys waits for the next press: one that continues runs
the longer, and when the wait ends the shorter runs.

While a modal dialog is open, only element bindings inside it are active, and `register()`
bindings pause. Otherwise an element binding is active unless it is disabled, inside `[inert]`,
or not visible. Keys reads the page at each press, so adding or removing an element or its
`data-keys` adds or removes its binding. When two active bindings share keys, the first wins:
elements in document order, then `register()` bindings in registration order.

Keys owns `aria-keyshortcuts` on every element carrying `data-keys` and writes it from the
binding, each single-press alternative as WAI-ARIA names physical keys: `T`, `Alt+T`, and `?` as
its US key, `Shift+/`. A sequence declares nothing, nor does a binding while the off switch
covers it. Keys rewrites the attribute when `data-keys` or the settings change, removes it when
`data-keys` is removed, and touches no element that never carried `data-keys`.

### Extending keys

Keys grows by outside modules rather than by features of its own. The runtime dispatches two
events, their names and details public API frozen with v0.6.0:

| Event | Dispatched | `detail` |
| --- | --- | --- |
| `keys-fire` | Cancelable and bubbling, on the bound element, or on `document` for a `register()` binding, before keys acts. Cancelling it stops the action. | `{ binding, keys, label? }`: the binding's normal string, the presses that fired it, and a `register()` binding's label. |
| `keys-sequence` | On `document`, as a sequence starts, continues, and ends. | `{ state, presses, reason? }`: `start`, `continue`, or `end`; the presses so far; and on end `fired`, `timeout`, or `dropped`. |

A test fixture builds a pending-sequence indicator from these and the grammar alone; the
indicator doesn't ship.

### The help dialog and the reader's settings

The page places a native `<dialog>` holding an element marked `data-keys-list`, and opens it with
a visible button through `command="show-modal"`, as "Wiring a page" shows. Keys loads the help
module the first time the dialog opens, however it opens. On that first open the dialog shows
with the page's own text in the marked element, and the module replaces it once it loads; on
every later open the module fills the element before the dialog shows. It fills it with:

- a table of the bindings active with the dialog closed, one row each: its keys drawn as sibling
  `kbd` elements, "+" within a combination and "then" between presses, and its action, a button
  that closes the dialog and runs the binding, so every binding has a visible control. The
  action's label is the bound element's `aria-label`, else its text without its `kbd`, else a
  field's `<label>`, else `register()`'s label. The last row is fixed: `Esc`, "Leave a field",
  for the Escape that releases a field. Its action is plain text, not a button, since it has
  nothing to run from the dialog, and it is never marked off. The table always has this row, so
  it is never empty.
- the reader's settings: an off switch, on by default, and the sequence wait, 1000, 1500, 3000, or
  5000 ms.
- a note on passing a key through a screen reader: NVDA+F2, JAWS+3, Narrator+3, or VO+Tab.

The off switch turns off character-key shortcuts, single characters and chords of them, as
WCAG 2.1.4 requires, while combinations with Control, Alt, or Meta stay on. Their rows stay
listed, marked off, and their buttons still work. Only changed settings are stored, as JSON
under the localStorage key `spike-html-design.keys`, per origin, shaped `{ enabled?, wait? }`.
Keys reads them at each press, so another tab's change applies at once. The help module adds no
CSS: the elements layer styles the table, the controls, and `kbd`.

When the help module fails to load, keys logs a console warning at each open, and the dialog
keeps the page's own text, its Close button still working. Keys imports the module again at the
next open, but chromium keeps the failed module for the life of the document, so only a reload
loads it.

### Conformance

The conformance module, `conformance.js`, from v0.7.0, checks one color profile in a live page
against the color facet's contract, so a package that ships a profile can test it by version. It
imports nothing and loads no CSS:

```js
import { check } from "https://cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@v0.7.0/modules/conformance.js";

const failures = await check("color", "harbor");
```

`check(facet, name)` waits for the page's load event, probes with elements and a stylesheet of its
own, removes them, and resolves to a list of `{ rule, message }`; an empty list means the profile
conforms. Each rule fails at most once, in `RULES`'s order. It rejects with a `TypeError` for an
unknown facet, a facet with no check (only color has one), or an empty name. It reads computed
values, never a stylesheet's rules, which chromium hides from `file://` and cross-origin pages, so
it runs alike from `file://` through jsDelivr, from a local server, and from node_modules.

| Rule | The profile named `name` |
| --- | --- |
| `tokens` | Sets each of the sixteen color tokens under `data-palette="<name>"` to a color, in light and in dark. |
| `color-only` | Sets no space or type token there. |
| `layer` | Sits inside `spike-html-design.tokens.color`, so a consumer's later layer beats it. |
| `specificity` | Applies at zero specificity, `:where([data-palette="<name>"])`. |
| `paints` | A scope with the name paints its background from its own `--bg` and its text from its own `--fg`, in each scheme. |
| `surfaces` | `--bg`, `--bg-1`, and `--bg-2` step toward `--fg` in each scheme. |
| `registered` | The name is listed under color in the registry. |

The rules, the function's name and arguments, and its failure list are public API, frozen with
v0.7.0. A source credit and upstream swatches are this repository's standard for its own
profiles, not the contract's.

### Extending with a package

The Harbor fixture, `test/fixtures/extension-package/`, is an extension package as a consumer
writes one. Its `package.json` depends on the baseline by tag,
`"spike-html-design": "github:JaimeStill/spike-html-design#v0.6.0"`, and `bun install` fetches it.
Its page links `full.css` from node_modules and then its own profile, `harbor.css`, which places
itself in the color layer since it is linked rather than imported with `layer()`:

```css
@layer spike-html-design.tokens.color {
  :where([data-palette="harbor"]) { --bg: light-dark(#f7f9fb, #0d1620); /* … */ }
}
```

Its `register.js` registers `harbor` after the baseline's registration module and before the
preferences module, so the menu lists it and a stored choice applies it before first paint.
Browsers don't read a package's exports: a page with no build reaches node_modules by path, and
its modules by bare names through an import map, which the page writes. Module scripts from
node_modules need a server; chromium runs none from `file://`.

### Entries and exports

| Export | File | Holds |
| --- | --- | --- |
| `.` | `baseline.css` | The lean entry: the foundation and each facet's default profile, Flexoki, regular, and mono. |
| `./full` | `full.css` | The full entry: everything the lean entry holds, plus every other profile of every facet. |
| `./profiles/<facet>/<name>` | `layers/tokens/<facet>/<name>.css` | One profile: color `flexoki`, `primer`, `catppuccin`, and `everforest`; space `regular` and `compact`; type `mono` and `sans`. |
| `./registry` | `modules/registry.js` | The registry. |
| `./register` | `modules/register.js` | The lean registration: each facet's default. |
| `./register/full` | `modules/register-full.js` | The full registration: every built-in profile. |
| `./preferences` | `modules/preferences.js` | The stored preferences and `<theme-menu>`. |
| `./theme-menu` | `modules/theme-menu.js` | The menu, which `<theme-menu>` loads on first open. |
| `./keys` | `modules/keys.js` | The keys runtime: `register`, `settings`, `changeSettings`, and `bindings`. |
| `./keys/grammar` | `modules/keys-grammar.js` | The binding grammar, with no DOM: `parse`, `problem`, `stringify`, `normalize`, `matches`, `labels`, and `keyshortcuts`. |
| `./keys/help` | `modules/keys-help.js` | The help dialog's contents, `fill`, which keys loads on the dialog's first open. |
| `./conformance` | `modules/conformance.js` | The conformance check, `check` and `RULES`, from v0.7.0. |

A page links one entry, never both. A page that needs a profile beyond the lean entry's links
the lean entry, imports that profile into its facet's sub-layer after the entry, and registers
its name (see "The registry"):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@v0.7.0/baseline.css" />
<style>
  @import url(https://cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@v0.7.0/layers/tokens/color/catppuccin.css)
    layer(spike-html-design.tokens.color);
</style>
```

A profile file linked on its own is unlayered, and beats the consumer's layers.

### Size budgets

Each entry's size is the sum of its files' brotli-11 sizes: the entry and every file it
statically imports, each counted once. A stylesheet's files are its `@import` chain; a module's
are its `import` and `export … from` statements, followed through every module they reach. A
dynamic `import()` counts toward the module it loads, so `theme-menu.js`, which the preferences
module loads on first open, is its own entry and not part of `preferences.js`'s size, as
`keys-help.js` is not part of `keys.js`'s. `keys.js`'s size includes the grammar, which it
imports, and `keys-help.js`'s both the runtime and the grammar. A profile
export is not an entry; its size counts in the entry that imports it.

| Entry | Budget (brotli bytes) |
| --- | --- |
| `baseline.css` | 14,000 |
| `full.css` | 18,000 |
| `modules/registry.js` | 1,200 |
| `modules/preferences.js` | 3,800 |
| `modules/theme-menu.js` | 8,500 |
| `modules/register.js` | 1,450 |
| `modules/register-full.js` | 1,550 |
| `modules/keys.js` | 10,300 |
| `modules/keys-grammar.js` | 3,500 |
| `modules/keys-help.js` | 13,200 |
| `modules/conformance.js` | 4,000 |

v0.7.0's keys entries, unchanged from v0.6.0, total 9,661, 3,066, and 12,351 bytes, leaving 639,
434, and 849 bytes of headroom, and `conformance.js` 3,542, leaving 458. `keys.js` is about three
times @github/hotkey's 2,872 bytes, the precedent's runtime. Comments are left as written; "The
answer" gives their cost and the size strategy.

The check fails when an entry exceeds its budget or has none. The budgets live in `BUDGETS` in
`scripts/size.js`, and raising one is the architect's decision. Raw sizes are reported, not
enforced. `mise run size` prints each entry's files with their raw and brotli sizes, the totals,
and the headroom, and beside them what the entry would weigh as one file, its imports inlined,
and as that file without comments: an estimate of a release build's saving, never budgeted.

### Modules from `file://`

A page's CSS renders the same from `file://`, but chromium won't run a relative module script
there: a `file://` page's origin is opaque, so the module fetch fails the CORS check. The
working-tree specimen therefore has no menu and no keys from `file://`, and renders its
defaults; its Help button, a native show-modal command, still opens the help dialog, which then
says why it lists nothing. A pinned page loads its modules, and from v0.6.0 the specimen's own
`specimen.js`, from jsDelivr, which answers with `Access-Control-Allow-Origin: *`, so its menu,
keys, and help dialog work from `file://` as they do served.

### Reading measure

The baseline ships no measure token and no measure class. A reading measure belongs on a
prose layout's reading column, which the layout sets (STANDARDS.md, "Reading measure").

### Fluid tokens

`--space-fluid` and `--type-fluid` are internal: each is the display's fluid expansion, 0 to 1,
across the display range, and drives its facet's scale. Pages never read them. `--space-base`
is public: setting it rescales every space step.

## Path

The tasks, in the order they run. From facets on, each task cites the evidence it proves; layers
and themes proved the earlier evidence list, which v0.2.0's README holds.

1. `layers`: the layered stylesheet, a specimen page, the check's headless chromium harness, the
   Pages workflow, and tag v0.1.0 linked by its pinned URL from Pages.
2. `themes`: Primer-derived dark and light, the `data-theme` hook, the system default, the
   contrast table; v0.2.0.
3. `facets`: the nested layers, the facet token interfaces, the elements layer and its behavior
   test, the tools layer and its extension fixture, one profile per facet with Flexoki's
   contrast table, the components layer removed, `package.json`, the lean entry point with its
   size measured and reported, the specimen's section per layer and facet, `mise run serve`,
   and a visual review after the tokens and elements render; v0.3.0 (evidence 1, 2, 4).
4. `profiles`: the sixteen-token color interface, Primer, Catppuccin, and Everforest beside
   Flexoki, the interaction, code, and kbd hooks, preview containers, the specimen's grid of
   every profile and scheme with the workbench layout reworked, the full entry point, the
   enforced size budget, contrast per profile, and a visual review after the grid renders;
   v0.4.0 (evidence 3, 5).
5. `preferences`: the compact space and sans type profiles with their scopes, the profile
   registry, persistence, the T theming menu, the flash measurement, and the JS exports with their
   budgets; v0.5.0 (evidence 2, 6).
6. `keys`: the keys grammar, runtime, and help modules, T moved off `<theme-menu>`, the
   specimen's help dialog and bindings, and a review stop that kept one convention, keys as
   written; v0.6.0 (evidence 7).
7. `validate`: the git-tag install, the conformance export and the extension fixture, pin
   stability, sizes against the budget, the cost of the CDN's import chain, and the answer;
   v0.7.0 (evidence 8–11).

## References

The spike reads this repository and never writes to it. It is a key in the coordinator's
`references.toml`, with its local checkout in `references.local.toml`: `herald` (its client
design, `app/client/design`, and its presentation palette,
`_project/presentation/assets/design/README.md`).

## The answer

**The question:** Can one tagged, native baseline of design facets (color, space, and type, each
with swappable profiles, over elements and tools layers) be consumed by version, as a git-tag
package and through a pinned CDN URL, and extended by other packages?

**The answer:** Yes: each tag, v0.1.0 to v0.6.0, is consumed unchanged by pinned jsDelivr URL,
v0.6.0 also by bun's git-tag install, and v0.7.0 releases under the same checks; an extension
package adds a color profile that passes the exported conformance check; the open cost is size,
most of it comments, left to the intake.

### The evidence, and where it is proven

1. **Layers, no build.** The package has no dependency and no build step, and its layers nest
   under `spike-html-design` in order; each entry imports its files one hop deep; a page's later
   layer beats the elements and tools layers at any specificity. Proven by tests alone:
   `test/baseline.test.js` ("layers") and `test/package.test.js`.
2. **Facet contracts.** Each facet declares only its own tokens, swapping one facet's profile
   changes only that facet's tokens, and the fluid scales stay within their rem bounds at every
   display shape. Proven by `test/baseline.test.js` ("tokens", "facet independence", "fluid space
   and type", "radius", "space and type profiles"); the scales and ratios were set at the facets
   review stop.
3. **Color profiles.** Flexoki, Primer, Catppuccin, and Everforest, each light and dark; the page
   follows a live change of the system scheme; each profile's contrast is recorded and recomputed
   in chromium, not corrected. Proven by `test/baseline.test.js` ("color interface", "color
   profiles", the contrast records); the set was settled at profiles review stop 1, which dropped
   Kanagawa.
4. **Native behavior.** Under the reset and elements layers, every element's layout properties
   match chromium's defaults, and only the tools layer styles a class. Proven by
   `test/baseline.test.js` ("elements behavior", "tools"); the facets review stop accepted the
   layers.
5. **Preview containers.** A `data-palette` and `data-scheme` scope renders its subtree as its
   profile renders at the root. Proven by `test/baseline.test.js` ("color interface", the preview
   cards); the profiles review stop accepted the grid.
6. **Preferences.** The menu lists the registry's profiles per facet and the scheme; a choice
   persists across reloads and pages; render-blocking, the choice applies before first paint
   (0 ms flash), and without `blocking="render"` the defaults show for about 366 ms; extension
   packages register into the same registry. Proven by `test/preferences.test.js` and
   `test/registry.test.js`, and for an extension by `test/extension-package.test.js`.
7. **Keys.** The grammar, runtime, and help modules bind nothing themselves; the page binds its
   own, silent in fields, on repeats, and while composing; Escape releases a field; keys writes
   `aria-keyshortcuts` and has an off switch, and the help dialog lists every binding. Proven by
   `test/keys.test.js` and `test/keys-grammar.test.js`; one convention, keys as written, was kept at
   the keys review stops, and the third accepted the Escape release and the surfaces.
8. **Consumption by version.** By pinned jsDelivr URL: each tag's pinned page renders as its
   specimen from `file://` and a local server, hermetically in `test/pinned.test.js`, and live from
   jsDelivr and Pages in `mise run pin`, which passed for v0.1.0 to v0.6.0 on 2026-10-15
   (19:05:49Z) with 30, 30, 38, 58, 97, and 122 checks and none failed. By git tag:
   `test/extension-package.test.js` installs the fixture offline from this repository at the tag,
   and `mise run pin v0.6.0` installed it from GitHub, where bun resolved the annotated tag
   (object 7d71d5f), its 25 published files byte-equal to the tag's, and the page rendered as the
   pinned page in light and dark. Only v0.6.0 installs it: earlier tags lack modules the fixture
   loads, as v0.5.0 lacks keys.js. v0.7.0's pin runs at its release.
9. **Extension.** The Harbor fixture adds a color profile into the color layer, registers it after
   the built-in profiles, appears in the theme menu, applies by `data-palette` and by the stored
   choice, and passes `./conformance`. The four built-in profiles conform, served and from
   `file://` through a CDN, and a fixture profile breaking each rule fails by that rule's name.
   Proven by tests alone: `test/extension-package.test.js` and `test/conformance.test.js`.
10. **Stability.** A pinned page's test reads its tag's files with `git show`, so no later change
    to the working tree reaches it, and the live `mise run pin` of 2026-10-15 passed every
    published tag, v0.1.0's page included, after five later tags. Proven by `test/pinned.test.js`
    and `mise run pin`.
11. **Size and the chain's cost.** Every entry stays within its brotli budget, enforced by the
    check (`test/size.test.js`, `mise run size`); `mise run chain v0.6.0` measured the CDN's import
    chain (below), and `test/chain.test.js` holds its file and hop counts.

### Size and the import chain

`mise run size` reports each entry in brotli bytes per file as served, as one file, and as one
file without comments. The last two are estimates of a release build ("Size budgets"):

| Entry | Per file (budget) | One file | One file, no comments |
| --- | --- | --- | --- |
| `baseline.css` | 13,657 (14,000) | 10,958 | 2,697 |
| `full.css` | 17,533 (18,000) | 12,504 | 3,134 |
| `modules/keys.js` | 9,661 (10,300) | 9,306 | 3,975 |
| `modules/keys-help.js` | 12,351 (13,200) | 11,610 | 5,268 |
| `modules/conformance.js` | 3,542 (4,000) | 3,542 | 2,115 |

Comments are about 80% of the CSS's brotli size as served (the per-file total; 75% as one file),
and 40–70% of each module's as served (40–67% as one file), from `conformance.js` at 40% to
`register.js` at 70%.

`mise run chain v0.6.0`, on 2026-10-15 (19:06:32Z), from jsDelivr's Cloudflare edge in Atlanta,
the median of five runs with the cache disabled over a warm connection. v0.7.0's CSS is unchanged
from v0.6.0's, so the figures stand for it.

| Entry | Files | Hops | Span | First paint |
| --- | --- | --- | --- | --- |
| `baseline.css` | 10 | 1 | 64.1 ms | 140.0 ms (60.2–174.6, the cold first run highest) |
| `full.css` | 15 | 1 | 65.9 ms | 144.0 ms (64.2–69.0) |
| `modules/keys.js` | 2 | 1 below the entry | 53.5 ms (52.1–57.1) | none: a module never blocks paint |

The span is the time from the entry's response to its last import's. A separate probe saw
jsDelivr's Fastly edges (cache-fra, cache-pdk), so the edge, and the figures, vary by place and
time.

The chain costs one hop, about 65 ms, on top of the entry; the comments cost about four times
the code. The options for a release build, none taken here:

- **One file per entry**, its imports inlined: removes the hop and saves about 20–30% of the CSS.
- **Comments stripped**: cuts the CSS's one file to about a quarter, and the keys modules' to
  under half.
- **jsDelivr's `.min`**: free, but its on-the-fly minifier (clean-css 5.3.3) fails on
  `baseline.css`; it works on the layer files.
- **A build in a later spike**, which would also own minification and a published `dist/`.

Which to take, and where, is the experiment.html intake's decision.

### Facts for later spikes

- **WCAG 2.1.4.** v0.5.0's `<theme-menu>` binds T with no way to turn it off, which fails WCAG
  2.1.4, Character Key Shortcuts (Level A). The tag is immutable. v0.6.0 moves T to keys, whose
  off switch covers it.
- **bun build** (for spike-html-apps). `bun build` resolves the package's exports and rewrites
  `light-dark()` into `--buncss-light` and `--buncss-dark` variables; whether a nested
  `data-scheme` still works under that rewrite is untested.
- **A git install's size.** bun ignores `package.json` `"files"` for a git dependency, so an
  install carries the whole tree, about 1.6 MB with `test/`, `pinned/`, and `context/`.
- **Registering the color tokens.** `@property` with syntax `"<color>"` was rejected: it resolves
  `light-dark()` where the token is declared, which breaks a nested `data-scheme`.
