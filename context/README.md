# spike-html-design

spike-html-design builds one native, tagged CSS and JS baseline for the organization's
human-facing HTML artifacts: briefs, plan rounds, reports, explainers, and demos. It follows
herald's client design for structure, ships dark and light themes whose colors derive from
Primer's resolved values, with eight hue tokens and four role tokens over them, a system-first
theme toggle, and a keyboard layer, and tests whether other repositories can consume it by
version through jsDelivr. Its answer is evidence for standards-lab's
experiment.html intake; the spike decides nothing itself.

The spike is the sub-goal `experiment.html.spike-html-design` in the coordinator's roadmap,
`standards-lab/context/roadmap.toml`, where its tasks live. Its answer lands in
`standards-lab/context/html-artifacts.md`, "Answers · experiment.html"; its question is framed
there under "Experiment: spike-html-design", and the baseline's settled design under "Style
baseline".

## The question

Can one tagged, native CSS and JS baseline be consumed by version from other repositories
through a pinned jsDelivr URL?

## The decision it changes

Whether the baseline graduates, and where: the architecture layer, beside docs-site's diagram
and voice standards, or its own standards-lab repository. spike-html-artifacts and
spike-html-go-wasm link to it.

## The evidence

1. One root stylesheet that declares the layers tokens, reset, theme, components in that order
   and imports one file per layer, with no build; herald's scales and token names, system font
   stacks, plain-class components, outline elevation, no shadows or tint tokens; an artifact's
   own app layer, added last, overrides it without specificity workarounds.
2. A dark and a light theme whose colors derive from Primer's resolved values: eight hue tokens,
   each named for its color; role tokens (accent, success, warning, danger) over them;
   color-scheme set per theme; the source cited.
3. With nothing stored, the theme falls back to the system setting: prefers-color-scheme selects
   dark or light, and follows the OS setting when it changes while the page is open.
4. A contrast table for both themes: each text tier and hue against its background; failures
   recorded, not corrected.
5. `<theme-toggle>` cycles system, light, dark on T, and keeps the choice across reloads and
   pages; whether a stored choice flashes the other theme first, and what avoiding that costs a
   page.
6. `keys.js`: one registry; T, ?, j, k, g; silent in fields and with modifiers;
   aria-keyshortcuts; the ? dialog lists the baseline's keys and an artifact's own.
7. A page on another origin links a tag by its pinned jsDelivr URL, and renders the same from
   `file://`, a local server, and Pages.
8. A page pinned to an earlier tag stays unchanged after later tags ship.
9. The stylesheet's and modules' sizes, raw and as jsDelivr compresses them.

## Scope

- **No build.** Hand-written CSS, HTML, and ES modules with custom elements and no framework.
  Tools are pinned in mise; there are no package dependencies.
- **Serving.** GitHub Pages through `actions/deploy-pages`, for the specimen page. The baseline
  itself is consumed from `cdn.jsdelivr.net/gh/JaimeStill/spike-html-design@vX.Y.Z/...`.
- **Releases.** One minor tag per task, v0.1.0 to v0.4.0. A tag is never changed or re-cut.
- **Not here.** The section tree with reading progress belongs to spike-html-artifacts, as do the
  screenshot review script and the HTML briefs themselves.

## Capabilities

- **Stylesheet:** `baseline.css`, the root, imports `layers/tokens.css`, `reset.css`,
  `theme.css`, and `components.css` into their cascade layers; herald's scales and semantic
  token names, prose styling, and herald's six component classes.
- **Themes:** Primer-derived dark and light, the `data-theme` hook, the system default, the
  contrast table.
- **Theme toggle:** `<theme-toggle>`, its storage, and the flash measurement.
- **Keyboard:** `keys.js`, the ? help dialog, key-hint styling.
- **Publishing:** the specimen page, `index.html`, on Pages; a page per tag under `pinned/` that
  links the tag's jsDelivr URL; `mise run pin <tag>`, which checks a published tag live.

## Path

The tasks, in the order they run; each cites the evidence it proves.

1. `layers`: the layered stylesheet, a specimen page, the check's headless chromium harness, the
   Pages workflow, and tag v0.1.0 linked by its pinned URL from Pages (evidence 1, 7).
2. `themes`: Primer-derived dark and light, the `data-theme` hook, the system default, the
   contrast table; v0.2.0 (evidence 2, 3, 4).
3. `toggle`: `<theme-toggle>` and the flash measurement; v0.3.0 (evidence 5).
4. `keys`: `keys.js`, the ? dialog, key-hint styling; v0.4.0 (evidence 6).
5. `validate`: evidence 1–9 end to end, pin stability and sizes, and the answer (evidence 8, 9).

## References

The spike reads this repository and never writes to it. It is a key in the coordinator's
`references.toml`, with its local checkout in `references.local.toml`: `herald` (its client
design, `app/client/design`, and its presentation palette,
`_project/presentation/assets/design/README.md`).

## The answer

Pending: the `validate` task writes it.
