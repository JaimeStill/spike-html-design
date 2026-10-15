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
   itself. A page binds its own, in one store per page. Keys is silent in fields, on repeats,
   and while an input method composes; writes aria-keyshortcuts; has an off switch; and fills
   the page's ? help dialog with the page's bindings. The specimen binds T, ?, j, k, and g
   through it. One convention: every binding is pressed as written, with chords and
   combinations spelled out. It was chosen at the keys review stop, after leader and activator
   modes were built and tried on the specimen.
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
  full one every profile; "Entries and exports", below, lists v0.6.0's exports. Each entry's
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
tokens, and component classes; v0.3.0 has `--border-3`; and v0.4.0 has flat profile export
keys, `./profiles/<name>`; and v0.5.0's `<theme-menu>` binds its own T, Shift included. "Using
v0.6.0", below, describes the interface a page uses now.

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
- **Profiles** (profiles, preferences): the color interface is sixteen tokens, with a pane surface,
  `--bg-0`, and two border steps. Four profiles fill it, Flexoki, Primer, Catppuccin, and
  Everforest, each light and dark in its own file, with a contrast record per profile and
  scheme. `data-palette` and `data-scheme` apply a profile and a scheme to any element's
  subtree, so a preview container renders as its profile renders at the root. Space has two
  profiles, regular and compact, and type two, mono and sans, which `data-space` and `data-type`
  apply the same way (preferences). The elements layer reads three hooks, `--interaction-color`, `--code-color`, and `--kbd-color`, and styles `kbd`
  as an outlined key, the baseline's only key-hint styling.
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
  (preferences); the git-tag install and an extension fixture that passes the
  exported conformance test (validate).
- **Publishing:** the specimen page, `index.html`, on Pages, with a section per layer and facet
  from facets on, a grid of preview containers for every profile and scheme from profiles on, a
  Theme button that opens the menu from preferences on, and from keys on a Help button and
  dialog, with T, ?, j, k, and g bound; `mise run serve` (facets), which serves a branch on
  localhost; a page per tag under `pinned/` that links the tag's jsDelivr URLs, for its modules
  too from v0.5.0, and for the specimen's own `specimen.js` from v0.6.0; `mise run pin <tag>`,
  which checks a published tag's stylesheets, modules, and page scripts live.

## Using v0.6.0

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
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@v0.6.0/full.css" />
    <link rel="modulepreload" href="https://cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@v0.6.0/modules/registry.js" />
    <script type="module" blocking="render" src="https://cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@v0.6.0/modules/register-full.js"></script>
    <script type="module" blocking="render" src="https://cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@v0.6.0/modules/preferences.js"></script>
    <script type="module" src="https://cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@v0.6.0/modules/keys.js"></script>
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
source. Its contrast in each scheme, every text token and hue over every surface, is recorded
in the specimen and not corrected.

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
import { register } from "https://cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@v0.6.0/modules/registry.js";

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
caps lock doesn't block it, and Shift+T no longer does, as it did in v0.5.0, whose menu keeps its
own T. The element fetches `theme-menu.js` the first time it opens, never before first paint,
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
import { register } from "https://cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@v0.6.0/modules/keys.js";

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
with one of them held. Keys is silent while focus is in a field (input, textarea, select, or
contenteditable), even for a combination; while an input method composes (`isComposing`, or
`keyCode` 229); on "Dead" and "Process"; with AltGraph held; on a repeat; on an event already
handled; and on a modifier pressed alone. A press keys acts on, or that starts or continues a
sequence, is marked handled.

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
module the first time the dialog opens, however it opens, and at each open the module fills the
marked element, before the dialog shows, with:

- a table of the bindings active with the dialog closed, one row each: its keys drawn as sibling
  `kbd` elements, "+" within a combination and "then" between presses, and its action, a button
  that closes the dialog and runs the binding, so every binding has a visible control. The
  action's label is the bound element's `aria-label`, else its text without its `kbd`, else a
  field's `<label>`, else `register()`'s label.
- the reader's settings: an off switch, on by default, and the sequence wait, 1000, 1500, 3000, or
  5000 ms.
- a note on passing a key through a screen reader: NVDA+F2, JAWS+3, Narrator+3, or VO+Tab.

The off switch turns off character-key shortcuts, single characters and chords of them, as
WCAG 2.1.4 requires, while combinations with Control, Alt, or Meta stay on. Their rows stay
listed, marked off, and their buttons still work. Only changed settings are stored, as JSON
under the localStorage key `spike-html-design.keys`, per origin, shaped `{ enabled?, wait? }`.
Keys reads them at each press, so another tab's change applies at once. The help module adds no
CSS: the elements layer styles the table, the controls, and `kbd`.

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

A page links one entry, never both. A page that needs a profile beyond the lean entry's links
the lean entry, imports that profile into its facet's sub-layer after the entry, and registers
its name (see "The registry"):

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@v0.6.0/baseline.css" />
<style>
  @import url(https://cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@v0.6.0/layers/tokens/color/catppuccin.css)
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

The keys budgets are each entry's v0.6.0 total, 9,097, 3,066, and 11,668 bytes, plus about 13%,
rounded up to the hundred. `keys.js` is about three times @github/hotkey's 2,872 bytes, the
precedent's runtime; comments are 53–56% of the keys modules' brotli size, left as written for
validate's holistic size strategy.

The check fails when an entry exceeds its budget or has none. The budgets live in `BUDGETS` in
`scripts/size.js`, and raising one is the architect's decision. Raw sizes are reported, not
enforced. `mise run size` prints each entry's files with their raw and brotli sizes, the totals,
and the headroom.

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
7. `validate`: the git-tag install, the extension fixture, pin stability, sizes against the
   budget, the cost of the CDN's import chain, and the answer (evidence 8–11).

## References

The spike reads this repository and never writes to it. It is a key in the coordinator's
`references.toml`, with its local checkout in `references.local.toml`: `herald` (its client
design, `app/client/design`, and its presentation palette,
`_project/presentation/assets/design/README.md`).

## The answer

Planned: the `validate` task writes it.
