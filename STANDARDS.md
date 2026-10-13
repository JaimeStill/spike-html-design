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
- Every hue token is named for the color it shows.
- A role token marks state or interaction; a hue token marks a category, never status. On a
  page that shows status, categories take cyan, purple, magenta and orange first.
- A variant is a suffix, never a prefix: `--red-bright`, `.badge-red-bright`.

## Whitespace

Space follows proximity: what belongs together sits closer than what doesn't.

- Items in a list or group sit `--space-3xs` to `--space-2xs` apart.
- Blocks sit `--space-s` apart.
- A heading's space above grows with its level, and it sits closer to what follows it, which it
  names, than to what precedes it.
- Sections sit `--space-xl` to `--space-2xl` apart, set in the consumer's layout, never the
  baseline's.
