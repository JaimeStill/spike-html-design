# Standards

The judgement calls the check can't enforce, one line each, for the standards-reviewer. What
`mise run check` enforces is never restated here.

The architecture pages that apply, in the architecture repository:

- `principles/minimal-footprint.md`
- `principles/rolling-currency.md`
- `principles/independent-releases.md`
- `principles/validation-first.md`

## The baseline

- Native CSS, HTML, and ES modules only: no build step, no framework, no package dependency.
- A page works the same from `file://`, a local server, and Pages; it links the baseline by a
  pinned jsDelivr tag URL, never a branch.
- A published tag is never changed or re-cut; jsDelivr caches it as immutable.
- Features: Baseline Newly available, plus non-Baseline features only as progressive
  enhancement, where a browser without them still renders a correct page.
- Fluid tokens need `progress()`. A browser without it computes them as invalid: fluid margins
  and padding fall to 0 and headings to body size.
- A variant is a suffix, never a prefix: `--red-bright`, `.button-red`.
- Each entry has a brotli size budget, in `BUDGETS` in `scripts/size.js`. Raising one is the
  architect's decision, recorded in the goal record with its reason; it is never the fix for a
  failing check.

## Tokens

- A hue is named for the color it shows and carries no meaning. There are no role tokens:
  semantic variants are the consumer's, through a tools family's hook or its own layers. The
  baseline is open for extension, closed for modification.
- Fluid bounds are rem, never px; aspect-ratio queries belong to layout, never to a token.
- `--space-fluid` and `--type-fluid` are internal to their facets; pages never read them.
  `--space-base` is public.
- A color profile maps its upstream's swatches onto the sixteen tokens by role. A hue takes the
  swatch whose color matches its name, with the ANSI slot as tie-breaker. The profile's file
  credits its source, license, and upstream version in a heading comment.
- A profile's contrast is recorded, never corrected: its values stay its upstream's.
- A profile sets its own facet's tokens only: a color profile color tokens, a space profile
  space tokens, a type profile type tokens.

## Hooks

A hook is a custom property a layer reads so that a consumer can extend a treatment without
restating it.

- The baseline reads a hook with a fallback and never declares it on an element the page didn't
  opt in to; no profile declares one. The tools layer's `.button-<hue>` variants set
  `--button-color` because a page opts in to each by its class.
- Hooks are public API, frozen per tag with the class names. Adding a hook later breaks nothing,
  so a hook is added only where a treatment exists to extend, never for one declaration.
- The interaction color marks only what a reader can act on: links, focus, the caret, form
  accents, selection, and control hover borders. A blockquote's edge and other decoration stay
  neutral.
- Code and kbd have no surface hooks: inline code is colored text, and kbd is an outlined key.

## Layers

- The elements layer is class-free with zero specificity, and sets only paint, type, border
  (including `border-collapse` and `border-spacing`), radius, margin, and padding.
- The tools layer is opt-in and unprefixed. A family has a hook where it has a treatment to
  extend: `--button-color` for buttons, `--table-stripe` for tables. Scroll and forms have none;
  a consumer extends them in its own later layer. A variant named `button-<name>` gets the
  button treatment.
- The reset changes only its listed allowances.
- The specimen's arrangement lives in its own layer: composition, not baseline.
- `kbd` styling, including every key hint, belongs to the elements layer. The keys module binds
  keys and styles nothing.

## Whitespace

Space follows proximity: what belongs together sits closer than what doesn't.

- Items in a list or group sit `--space-3xs` to `--space-2xs` apart.
- Blocks sit `--space-s` apart.
- A heading's space above grows with its level, and it sits closer to what follows it, which it
  names, than to what precedes it.
- Sections sit `--space-xl` to `--space-2xl` apart, set in the consumer's layout, never the
  baseline's.

## Reading measure

- A reading measure belongs on a prose-centric layout's reading column, never on single
  paragraphs. Interfaces such as the workbench let text span its panel.
- The baseline ships no measure token and no measure class: line length is layout.
