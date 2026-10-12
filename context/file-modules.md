# ES modules from file://

Chromium won't run a relative `<script type="module">` from a `file://` page: the page's origin
is opaque, so the module fetch fails the CORS check. A `file://` page can load the baseline's
modules from jsDelivr, which answers with `Access-Control-Allow-Origin: *`. Evidence 7 asks for
the same render from `file://`, so the specimen and pinned pages for `toggle` and `keys` have to
load their modules that way, or the specimen records the gap.

- Assumes the planner's finding holds in the pinned chromium; the `toggle` task confirms it
  before it loads the first module.
- When confirmed, `standards-lab/context/html-artifacts.md` ("Build": "A page works the same
  from `file://`...") owes a coordinator edit naming this exception.
