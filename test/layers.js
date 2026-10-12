// layers holds what the baseline and pinned tests, and the live pin check, share about the
// stylesheet's layer files: the layer names, and per tag a probe that tells a page whose layer
// files all loaded from one whose root loaded but an import did not.

// LAYERS are the working tree's cascade layers, in cascade order, each imported from
// layers/<name>.css. A tag's own layer files are read from the tag, not from here.
export const LAYERS = ["tokens", "reset", "theme", "components"];

// PROBES holds, per tag, one computed style per layer, on that tag's specimen markup, that only
// that layer's file sets and that no color scheme changes, as [selector, property, value when
// every layer file loaded]. A tag's entry never changes once the tag is cut: a page pinned to it
// keeps rendering its values whatever the working tree later renames or retunes. The last entry
// is the working tree's, the tag it will be cut as; add the next tag's entry when a change to
// the working tree would change a probe.
export const PROBES = {
  // Unstyled, the four read "", "content-box", "32px", and "block".
  "v0.1.0": [
    [":root", "--bg", "light-dark(hsl(0, 0%, 100%), hsl(0, 0%, 7%))"],
    ["body", "box-sizing", "border-box"],
    ["#prose h1", "font-size", "36px"],
    ["#components .card", "display", "flex"],
  ],
};

// CURRENT is the tag whose probes the working tree answers.
export const CURRENT = Object.keys(PROBES).at(-1);

// probesFor returns tag's probes, and throws for a tag the table does not hold, so a new pinned
// page cannot pass without its tag's entry.
export function probesFor(tag) {
  const probes = PROBES[tag];
  if (!probes) throw new Error(`layers: no PROBES entry for ${tag}`);
  return probes;
}

// layersLoaded resolves to the computed value of each of tag's probes on page.
export async function layersLoaded(page, tag = CURRENT) {
  const values = [];
  for (const [selector, property] of probesFor(tag))
    values.push(await page.style(selector, property));
  return values;
}

// loaded returns layersLoaded's result for tag when every layer file loaded.
export function loaded(tag = CURRENT) {
  return probesFor(tag).map(([, , value]) => value);
}

// LOADED is layersLoaded's result on the working tree when every layer file loaded.
export const LOADED = loaded(CURRENT);
