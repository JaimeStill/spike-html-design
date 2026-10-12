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
