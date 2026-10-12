// layers holds what the baseline and pinned tests share about the stylesheet's layer files: the
// layer names, and a probe that tells a page whose layer files all loaded from one whose root
// loaded but an import did not.

// LAYERS are the baseline's cascade layers, in cascade order, each imported from layers/<name>.css.
export const LAYERS = ["tokens", "reset", "theme", "components"];

// layersLoaded resolves to one computed style per layer, on the specimen's markup, that only
// that layer's file sets and that no color scheme changes.
export async function layersLoaded(page) {
  return [
    await page.style(":root", "--bg"),
    await page.style("body", "box-sizing"),
    await page.style("#prose h1", "font-size"),
    await page.style("#components .card", "display"),
  ];
}

// LOADED is layersLoaded's result when all four layer files loaded. Unstyled, the four read "",
// "content-box", "32px", and "block".
export const LOADED = [
  "light-dark(hsl(0, 0%, 100%), hsl(0, 0%, 7%))",
  "border-box",
  "36px",
  "flex",
];
