# spike-html-design

A spike for the Standards Lab reference architecture. It builds one native, tagged CSS and JS
baseline for human-facing HTML artifacts: color, space, and type facets whose profiles swap,
elements and tools layers over native elements, and modules for preferences and keys. It tests
whether other repositories can consume the baseline by version, as a git-tag package and through
jsDelivr, and extend it. The repository is managed with the marathon workflow; start from
`context/README.md`.

- **Standards:** `STANDARDS.md`, with pointers into the architecture repository.
- **Check:** `mise run check`. It runs browser tests in headless chromium and fails when
  chromium is missing. The tests open pages through `test/harness.js`.
- **Size budgets:** `BUDGETS` in `scripts/size.js`; `mise run size` reports each entry against
  its budget, and the check fails when one is over.
- **Live checks:** `mise run pin <tag>` checks a published tag against jsDelivr and Pages and,
  from v0.6.0, installs the extension fixture, `test/fixtures/extension-package/`, from GitHub by
  the tag. `mise run chain <tag>` measures the entries' import chains from jsDelivr. Both read
  the network, so the check never runs them.
- **Goals:** this spike's tasks live in the coordinator's roadmap,
  `standards-lab/context/roadmap.toml`, under `experiment.html.spike-html-design`. Its goal
  record is `context/goals/experiment.html.spike-html-design.md`.
- **Dependencies:** none. No build step, no package dependencies; tools are pinned in mise.
- **References:** the repositories this spike reads are keys in the coordinator's
  `references.toml` and `references.local.toml`. The spike reads them and never writes to them.
