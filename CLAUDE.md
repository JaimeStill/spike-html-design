# spike-html-design

A spike for the Standards Lab reference architecture. It builds one native, tagged CSS and JS
baseline for human-facing HTML artifacts (herald's layer structure, a Flexoki dark and light
theme, a theme toggle, a keyboard layer) and tests whether other repositories can consume it by
version through jsDelivr. The repository is managed with the marathon workflow; start from
`context/README.md`.

- **Standards:** `STANDARDS.md`, with pointers into the architecture repository.
- **Check:** `mise run check`. It runs browser tests in headless chromium and fails when
  chromium is missing.
- **Goals:** this spike's tasks live in the coordinator's roadmap,
  `standards-lab/context/roadmap.toml`, under `experiment.html.spike-html-design`. Its goal
  record is `context/goals/experiment.html.spike-html-design.md`.
- **Dependencies:** none. No build step, no package dependencies; tools are pinned in mise.
- **References:** the repositories this spike reads are keys in the coordinator's
  `references.toml` and `references.local.toml`. The spike reads them and never writes to them.
