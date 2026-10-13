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
- The check reports each entry's size and enforces no budget; profiles adds the budget.

## Tokens

- A hue is named for the color it shows and carries no meaning. There are no role tokens:
  semantic variants are the consumer's, through a tools family's hook or its own layers. The
  baseline is open for extension, closed for modification.
- Fluid bounds are rem, never px; aspect-ratio queries belong to layout, never to a token.

## Layers

- The elements layer is class-free with zero specificity, and sets only paint, type, border
  (including `border-collapse` and `border-spacing`), radius, margin, and padding.
- The tools layer is opt-in and unprefixed. A family has a hook where it has a treatment to
  extend: `--button-color` for buttons, `--table-stripe` for tables. Scroll and forms have none;
  a consumer extends them in its own later layer. A variant named `button-<name>` gets the
  button treatment.
- The reset changes only its listed allowances.
- The specimen's arrangement lives in its own layer: composition, not baseline.

## Whitespace

Space follows proximity: what belongs together sits closer than what doesn't.

- Items in a list or group sit `--space-3xs` to `--space-2xs` apart.
- Blocks sit `--space-s` apart.
- A heading's space above grows with its level, and it sits closer to what follows it, which it
  names, than to what precedes it.
- Sections sit `--space-xl` to `--space-2xl` apart, set in the consumer's layout, never the
  baseline's.
