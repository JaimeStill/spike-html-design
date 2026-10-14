// layers holds what the baseline and pinned tests, and the live pin check, share about the
// stylesheet's layer files: the layer names, and per tag a probe that tells a page whose layer
// files all loaded from one whose root loaded but an import did not.

import { ADDED, FACET_PROFILES, profilePath, SERIF } from "./profiles.js";

// PACKAGE is the working tree's one top-level layer, named for the package.
export const PACKAGE = "spike-html-design";

// LAYERS are the working tree's nested layers under PACKAGE, in cascade order, each a dotted
// name below it. A tag's own layer files are read from the tag, not from here.
export const LAYERS = ["tokens.color", "tokens.space", "tokens.type", "reset", "elements", "tools"];

// layerPath returns the file a nested layer is imported from: the path its name spells under
// layers/, as in layers/tokens/color.css for tokens.color.
export function layerPath(layer) {
  return `layers/${layer.replaceAll(".", "/")}.css`;
}

// FACETS are the nested layers that hold a facet's profiles, nested layer to facet.
const FACETS = { "tokens.color": "color", "tokens.space": "space", "tokens.type": "type" };

// DEFAULT_PROFILES are the profiles the lean entry imports into each facet's sub-layer after the
// facet's own file, nested layer to file: Flexoki, regular and mono, each in the directory the
// facet's file name spells.
export const DEFAULT_PROFILES = Object.fromEntries(
  Object.entries(FACETS).map(([layer, facet]) => [
    layer,
    profilePath(facet, FACET_PROFILES[facet].names[0]),
  ]),
);

// IMPORTS are the working tree's lean entry's imports, in order, each [nested layer, file]: every
// nested layer's own file, and a facet's default profile right after the facet's own file.
export const IMPORTS = LAYERS.flatMap((layer) => [
  [layer, layerPath(layer)],
  ...(layer in DEFAULT_PROFILES ? [[layer, DEFAULT_PROFILES[layer]]] : []),
]);

// FULL_IMPORTS are the working tree's full entry's imports, in order, each [nested layer, file]:
// the lean entry's, with each facet's profiles past its default right after the default's.
export const FULL_IMPORTS = IMPORTS.flatMap(([layer, path]) => [
  [layer, path],
  ...(path === DEFAULT_PROFILES[layer]
    ? ADDED[FACETS[layer]].map((name) => [layer, profilePath(FACETS[layer], name)])
    : []),
]);

// ENTRIES are the package's CSS entries, each repository path to its imports: the lean entry,
// which the package exports as its root, and the full entry, exported as ./full.
export const ENTRIES = { "baseline.css": IMPORTS, "full.css": FULL_IMPORTS };

// PROBES holds, per tag, one computed style per layer file, on that tag's specimen markup, that
// only that file sets and that no color scheme changes, as [selector, property, value when every
// layer file loaded]. A tag's entry never changes once the tag is cut: a page pinned to it
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
  // Primer's tiers replace herald's values, so the tokens probe reads the new --bg pair.
  "v0.2.0": [
    [":root", "--bg", "light-dark(#ffffff, #0d1117)"],
    ["body", "box-sizing", "border-box"],
    ["#prose h1", "font-size", "36px"],
    ["#components .card", "display", "flex"],
  ],
  // One probe per nested layer file. The components layer is gone, so its probe is too; the
  // color probe reads Flexoki's --bg pair, the space and type probes read tokens that no display
  // size changes, the elements probe reads the heading weight, since heading sizes are fluid, and
  // the tools probe reads a scroll helper. Unstyled, the six read "", "", "", "content-box",
  // "700", and "visible".
  "v0.3.0": [
    [":root", "--bg", "light-dark(#fffcf0, #100f0f)"],
    [":root", "--line-s", "1px"],
    [":root", "--text-m", "1rem"],
    ["body", "box-sizing", "border-box"],
    ["#prose h1", "font-weight", "600"],
    ["#tools .scroll-x", "overflow-x", "auto"],
  ],
  // Flexoki's ladder shifted one step, and its values moved to their own profile file, so the
  // color probe reads the new --bg pair from Flexoki's file and a new probe reads the facet's own
  // file's color-scheme; the other five probes are v0.3.0's.
  // The specimen and its pinned page link the full entry, so one probe per profile past the
  // default reads that profile's --bg pair on the first element naming it, its first preview
  // card. Unstyled, the color-scheme probe reads "normal" and the profile probes "".
  "v0.4.0": [
    [":root", "color-scheme", "light dark"],
    [":root", "--bg", "light-dark(#fffcf0, #1c1b1a)"],
    ['[data-palette="primer"]', "--bg", "light-dark(#ffffff, #22272e)"],
    ['[data-palette="catppuccin"]', "--bg", "light-dark(#eff1f5, #1e1e2e)"],
    ['[data-palette="everforest"]', "--bg", "light-dark(#fffbef, #272e33)"],
    [":root", "--line-s", "1px"],
    [":root", "--text-m", "1rem"],
    ["body", "box-sizing", "border-box"],
    ["#prose h1", "font-weight", "600"],
    ["#tools .scroll-x", "overflow-x", "auto"],
  ],
  // The working tree, to be cut as v0.5.0: space and type split as color did, each facet's file
  // now its contract and each profile its own file. The color probes are v0.4.0's. The space
  // facet's file keeps --radius-full and the type facet's the text scale, so --text-m still
  // probes it; --line-s moved to regular's file, and a leading probes mono's. One probe per
  // profile past a default reads a token it sets on the first element naming it, the specimen's
  // compact and serif samples. Unstyled, the new probes read "".
  "v0.5.0": [
    [":root", "color-scheme", "light dark"],
    [":root", "--bg", "light-dark(#fffcf0, #1c1b1a)"],
    ['[data-palette="primer"]', "--bg", "light-dark(#ffffff, #22272e)"],
    ['[data-palette="catppuccin"]', "--bg", "light-dark(#eff1f5, #1e1e2e)"],
    ['[data-palette="everforest"]', "--bg", "light-dark(#fffbef, #272e33)"],
    [":root", "--radius-full", "9999px"],
    [":root", "--line-s", "1px"],
    ['[data-space="compact"]', "--radius-base", "0.25rem"],
    [":root", "--text-m", "1rem"],
    [":root", "--leading-ui", "1.25"],
    ['[data-type="serif"]', "--font-heading", SERIF],
    ["body", "box-sizing", "border-box"],
    ["#prose h1", "font-weight", "600"],
    ["#tools .scroll-x", "overflow-x", "auto"],
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
