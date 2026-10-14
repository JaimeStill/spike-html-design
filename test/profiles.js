// profiles holds what the tests share about the profiles of every facet: each color profile's
// upstream source, and the swatch it maps onto each of the sixteen color tokens, light and dark;
// and each space and type profile's declared values. It is the record the profile files, their
// comments, the preview cards and the contrast records are all checked against, so a value
// changed in one place and not the others fails.

// SCHEMES are the two color schemes, in the order a token's light-dark() pair holds them.
export const SCHEMES = ["light", "dark"];

// COLOR_PROFILES are the color profiles, data-palette name to { title, source, license, version,
// variants, tokens }: its display name; its upstream's URL, its license, and the version its
// values are read at (null for Flexoki, the default, whose file credits it without one); the
// upstream variants it takes for light and dark; and per token, in the facet's order, the
// [swatch name, hex] pair it takes in light, then in dark. They run in the order every list of
// them follows: Flexoki first, the default, then Primer, Catppuccin, and Everforest.
export const COLOR_PROFILES = {
  flexoki: {
    title: "Flexoki",
    source: "https://stephango.com/flexoki",
    license: "MIT",
    version: null,
    variants: ["light", "dark"],
    tokens: {
      "--bg-0": [
        ["base-50", "#f2f0e5"],
        ["black", "#100f0f"],
      ],
      "--bg": [
        ["paper", "#fffcf0"],
        ["base-950", "#1c1b1a"],
      ],
      "--bg-2": [
        ["base-100", "#e6e4d9"],
        ["base-900", "#282726"],
      ],
      "--border": [
        ["base-150", "#dad8ce"],
        ["base-850", "#343331"],
      ],
      "--border-2": [
        ["base-200", "#cecdc3"],
        ["base-800", "#403e3c"],
      ],
      "--fg": [
        ["black", "#100f0f"],
        ["base-100", "#e6e4d9"],
      ],
      "--fg-2": [
        ["base-700", "#575653"],
        ["base-300", "#b7b5ac"],
      ],
      "--fg-3": [
        ["base-500", "#878580"],
        ["base-600", "#6f6e69"],
      ],
      "--red": [
        ["red-600", "#af3029"],
        ["red-400", "#d14d41"],
      ],
      "--orange": [
        ["orange-600", "#bc5215"],
        ["orange-400", "#da702c"],
      ],
      "--yellow": [
        ["yellow-600", "#ad8301"],
        ["yellow-400", "#d0a215"],
      ],
      "--green": [
        // The one departure from Flexoki's scale: green-600 and green-400 (#66800b, #879a39)
        // rotated from OKLCH hues ~123° and ~119° to 142° at their own lightness and chroma.
        ["green-600 at hue 142°", "#408739"],
        ["green-400 at hue 142°", "#61a25a"],
      ],
      "--cyan": [
        ["cyan-600", "#24837b"],
        ["cyan-400", "#3aa99f"],
      ],
      "--blue": [
        ["blue-600", "#205ea6"],
        ["blue-400", "#4385be"],
      ],
      "--purple": [
        ["purple-600", "#5e409d"],
        ["purple-400", "#8b7ec8"],
      ],
      "--magenta": [
        ["magenta-600", "#a02f6f"],
        ["magenta-400", "#ce5d97"],
      ],
    },
  },
  primer: {
    title: "Primer",
    source: "https://github.com/primer/github-vscode-theme",
    license: "MIT",
    version: "v6.3.5",
    variants: ["GitHub Light Default", "GitHub Dark Dimmed"],
    tokens: {
      "--bg-0": [
        ["canvas.inset", "#f6f8fa"],
        ["canvas.inset", "#1c2128"],
      ],
      "--bg": [
        ["canvas.default", "#ffffff"],
        ["canvas.default", "#22272e"],
      ],
      "--bg-2": [
        ["scale.gray[1]", "#eaeef2"],
        ["canvas.subtle", "#2d333b"],
      ],
      "--border": [
        ["border.muted", "#d8dee4"],
        ["border.muted", "#373e47"],
      ],
      "--border-2": [
        ["border.default", "#d0d7de"],
        ["border.default", "#444c56"],
      ],
      "--fg": [
        ["fg.default", "#1f2328"],
        ["fg.default", "#adbac7"],
      ],
      "--fg-2": [
        ["fg.muted", "#656d76"],
        ["fg.muted", "#768390"],
      ],
      "--fg-3": [
        ["fg.subtle", "#6e7781"],
        ["fg.subtle", "#636e7b"],
      ],
      "--red": [
        ["danger.fg", "#cf222e"],
        ["danger.fg", "#e5534b"],
      ],
      "--orange": [
        ["severe.fg", "#bc4c00"],
        ["severe.fg", "#cc6b2c"],
      ],
      "--yellow": [
        ["attention.fg", "#9a6700"],
        ["attention.fg", "#c69026"],
      ],
      "--green": [
        ["success.fg", "#1a7f37"],
        ["success.fg", "#57ab5a"],
      ],
      "--cyan": [
        ["ansi.cyan", "#1b7c83"],
        ["ansi.cyan", "#39c5cf"],
      ],
      "--blue": [
        ["accent.fg", "#0969da"],
        ["accent.fg", "#539bf5"],
      ],
      "--purple": [
        ["done.fg", "#8250df"],
        ["done.fg", "#986ee2"],
      ],
      "--magenta": [
        ["sponsors.fg", "#bf3989"],
        ["sponsors.fg", "#c96198"],
      ],
    },
  },
  catppuccin: {
    title: "Catppuccin",
    source: "https://github.com/catppuccin/palette",
    license: "MIT",
    version: "v1.8.0",
    variants: ["latte", "mocha"],
    tokens: {
      "--bg-0": [
        ["mantle", "#e6e9ef"],
        ["mantle", "#181825"],
      ],
      "--bg": [
        ["base", "#eff1f5"],
        ["base", "#1e1e2e"],
      ],
      "--bg-2": [
        ["surface0", "#ccd0da"],
        ["surface0", "#313244"],
      ],
      "--border": [
        ["surface1", "#bcc0cc"],
        ["surface1", "#45475a"],
      ],
      "--border-2": [
        ["overlay0", "#9ca0b0"],
        ["overlay0", "#6c7086"],
      ],
      "--fg": [
        ["text", "#4c4f69"],
        ["text", "#cdd6f4"],
      ],
      "--fg-2": [
        ["subtext0", "#6c6f85"],
        ["subtext0", "#a6adc8"],
      ],
      "--fg-3": [
        ["overlay1", "#8c8fa1"],
        ["overlay1", "#7f849c"],
      ],
      "--red": [
        ["red", "#d20f39"],
        ["red", "#f38ba8"],
      ],
      "--orange": [
        ["peach", "#fe640b"],
        ["peach", "#fab387"],
      ],
      "--yellow": [
        ["yellow", "#df8e1d"],
        ["yellow", "#f9e2af"],
      ],
      "--green": [
        ["green", "#40a02b"],
        ["green", "#a6e3a1"],
      ],
      "--cyan": [
        ["teal", "#179299"],
        ["teal", "#94e2d5"],
      ],
      "--blue": [
        ["blue", "#1e66f5"],
        ["blue", "#89b4fa"],
      ],
      "--purple": [
        ["mauve", "#8839ef"],
        ["mauve", "#cba6f7"],
      ],
      "--magenta": [
        ["pink", "#ea76cb"],
        ["pink", "#f5c2e7"],
      ],
    },
  },
  everforest: {
    title: "Everforest",
    source: "https://github.com/sainnhe/everforest",
    license: "MIT",
    version: "v0.3.0",
    variants: ["hard", "hard"],
    tokens: {
      "--bg-0": [
        ["bg_dim", "#f2efdf"],
        ["bg_dim", "#1e2326"],
      ],
      "--bg": [
        ["bg0", "#fffbef"],
        ["bg0", "#272e33"],
      ],
      "--bg-2": [
        ["bg1", "#f8f5e4"],
        ["bg1", "#2e383c"],
      ],
      "--border": [
        ["bg3", "#edeada"],
        ["bg2", "#374145"],
      ],
      "--border-2": [
        ["bg5", "#bec5b2"],
        ["bg5", "#4f5b58"],
      ],
      "--fg": [
        ["fg", "#5c6a72"],
        ["fg", "#d3c6aa"],
      ],
      "--fg-2": [
        ["grey2", "#829181"],
        ["grey2", "#9da9a0"],
      ],
      "--fg-3": [
        ["grey1", "#939f91"],
        ["grey1", "#859289"],
      ],
      "--red": [
        ["red", "#f85552"],
        ["red", "#e67e80"],
      ],
      "--orange": [
        ["orange", "#f57d26"],
        ["orange", "#e69875"],
      ],
      "--yellow": [
        ["yellow", "#dfa000"],
        ["yellow", "#dbbc7f"],
      ],
      "--green": [
        ["green", "#8da101"],
        ["green", "#a7c080"],
      ],
      "--cyan": [
        ["aqua", "#35a77c"],
        ["aqua", "#83c092"],
      ],
      "--blue": [
        ["blue", "#3a94c5"],
        ["blue", "#7fbbb3"],
      ],
      "--purple": [
        ["purple", "#df69ba"],
        ["purple", "#d699b6"],
      ],
      "--magenta": [
        ["purple", "#df69ba"],
        ["purple", "#d699b6"],
      ],
    },
  },
};

// SANS and MONO are the system font stacks the type profiles set, as declared.
export const SANS =
  'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif';
export const MONO =
  'ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace';

// LEADINGS are the role leadings, which every type profile declares at the same values.
const LEADINGS = {
  "--leading-body": "1.5",
  "--leading-heading": "1.2",
  "--leading-ui": "1.25",
  "--leading-code": "1.5",
};

// SPACE_PROFILES are the space profiles, data-space name to the values its one block declares,
// token name to its declared text, in the file's order: the default, regular, first, at v0.4.0's
// values, then compact.
export const SPACE_PROFILES = {
  regular: {
    "--space-base": "calc(1rem + (1.125rem - 1rem) * var(--space-fluid))",
    "--line-s": "1px",
    "--line-m": "2px",
    "--radius-base": "0.375rem",
  },
  compact: {
    "--space-base": "calc(0.75rem + (0.875rem - 0.75rem) * var(--space-fluid))",
    "--line-s": "1px",
    "--line-m": "2px",
    "--radius-base": "0.25rem",
  },
};

// TYPE_PROFILES are the type profiles, data-type name to the values its one block declares,
// token name to its declared text with whitespace squashed, in the file's order: the default,
// mono, the interface voice at v0.4.0's values, then sans, every role but code in the sans stack.
export const TYPE_PROFILES = {
  mono: {
    "--font-body": SANS,
    "--font-heading": MONO,
    "--font-ui": MONO,
    "--font-code": MONO,
    ...LEADINGS,
  },
  sans: {
    "--font-body": SANS,
    "--font-heading": SANS,
    "--font-ui": SANS,
    "--font-code": MONO,
    ...LEADINGS,
  },
};

// FACET_PROFILES are the tokens layer's facets, each to its profiles' names and the attribute that
// selects them, the default first.
export const FACET_PROFILES = {
  color: { attribute: "data-palette", names: Object.keys(COLOR_PROFILES) },
  space: { attribute: "data-space", names: Object.keys(SPACE_PROFILES) },
  type: { attribute: "data-type", names: Object.keys(TYPE_PROFILES) },
};

// ADDED are each facet's profiles past its default, facet to names: the profiles a page that links
// the lean entry imports itself, and the full entry imports after the default.
export const ADDED = Object.fromEntries(
  Object.entries(FACET_PROFILES).map(([facet, { names }]) => [facet, names.slice(1)]),
);

// profilePath returns the file a facet's profile sits in, the default's included: under the
// facet's directory, as layers/tokens/color/, since the facet's own file, layers/tokens/color.css,
// sits at the path its layer's name spells and the profiles are imported into that layer.
export function profilePath(facet, name) {
  return `layers/tokens/${facet}/${name}.css`;
}

// profileColors returns a profile's hex values in the scheme at index, 0 for light and 1 for dark,
// token name to hex.
export function profileColors(name, index) {
  return Object.fromEntries(
    Object.entries(COLOR_PROFILES[name].tokens).map(([token, pair]) => [token, pair[index][1]]),
  );
}
