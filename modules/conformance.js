// conformance: checks that a profile an extension adds keeps the facet's contract, in a live page.
// It has no imports and loads no CSS, and it reads computed values only, never a stylesheet's
// rules: chromium hides the rules of a file:// page's sheets and of a cross-origin sheet, so a
// check that read them would fail from file:// and through jsDelivr. Read through computed
// values, the check runs alike from file://, through jsDelivr, from a local server, and from
// node_modules.
//
// The API:
//
//   check(facet, name)  resolves to the failures of the profile name, its data-palette value for
//                       the color facet, as a list of { rule, message }: rule is one of
//                       RULES[facet], message says what broke in words. An empty list means the
//                       profile conforms. Each rule fails at most once, in RULES's order. It waits
//                       for the page's load event, so every stylesheet has applied, then probes
//                       with elements and one stylesheet of its own, and removes them before it
//                       resolves. It rejects with a TypeError for a facet that is not one of
//                       the registry's, or one with no check at this version, and for an empty
//                       name. Only the color facet has a check.
//   RULES               each checked facet's rule names, in the order check() reports them.
//
// The color facet's rules, each the part of the contract in layers/tokens/color.css it holds:
//
//   tokens        the profile sets each of the sixteen color tokens under data-palette="<name>"
//                 to a color, in light and in dark.
//   color-only    it sets no space or type token there.
//   layer         its block is inside spike-html-design.tokens.color: a zero-specificity rule in
//                 the next layer, spike-html-design.tokens.space, beats it, as a consumer's later
//                 layer then does. Unchecked when tokens fails for every token.
//   specificity   its selector has zero specificity, :where([data-palette="<name>"]): a
//                 zero-specificity rule later in the color layer beats it. Unchecked when layer
//                 fails, since an unlayered block beats every layered rule whatever its
//                 selector.
//   paints        a scope with that name paints its background from its own --bg and its text
//                 from its own --fg, in each scheme.
//   surfaces      --bg, --bg-1 and --bg-2 step toward the text, --fg, in each scheme: each is
//                 strictly closer to --fg's relative luminance than the one before.
//   registered    the name is listed under color in the registry's store.
//
// A rule that reads a token which failed tokens skips it, so a missing token fails tokens alone.

// FACETS are the registry's facets, as its module names them; this module imports nothing, so it
// keeps its own copy.
const FACETS = ["color", "space", "type"];

export const RULES = Object.freeze({
  color: Object.freeze([
    "tokens",
    "color-only",
    "layer",
    "specificity",
    "paints",
    "surfaces",
    "registered",
  ]),
});

// COLOR are the sixteen color tokens, in the facet's order.
const COLOR = [
  "--bg",
  "--bg-1",
  "--bg-2",
  "--border",
  "--border-2",
  "--fg",
  "--fg-2",
  "--fg-3",
  "--red",
  "--orange",
  "--yellow",
  "--green",
  "--cyan",
  "--blue",
  "--purple",
  "--magenta",
];

// OTHERS are the space and type facets' tokens: the values their profiles set and every token
// derived from them.
const OTHERS = [
  "--space-fluid",
  "--space-base",
  "--space-3xs",
  "--space-2xs",
  "--space-xs",
  "--space-s",
  "--space-m",
  "--space-l",
  "--space-xl",
  "--space-2xl",
  "--space-3xl",
  "--line-s",
  "--line-m",
  "--radius-base",
  "--radius-sm",
  "--radius-md",
  "--radius-lg",
  "--radius-full",
  "--type-fluid",
  "--text-xs",
  "--text-s",
  "--text-m",
  "--text-l",
  "--text-xl",
  "--text-2xl",
  "--text-3xl",
  "--text-4xl",
  "--font-body",
  "--font-heading",
  "--font-ui",
  "--font-code",
  "--leading-body",
  "--leading-heading",
  "--leading-ui",
  "--leading-code",
];

const SCHEMES = ["light", "dark"];

// PROBE is the attribute that marks the check's own scopes, and SENTINEL the value its rules set
// every color token to on them.
const PROBE = "data-conformance-probe";
const SENTINEL = "conformance-probe";

// MISSING is the color a probe reads when a token is unset or no color: no profile's, as no
// palette holds a color 0.4% opaque.
const MISSING = "rgba(1, 2, 3, 0.004)";

// STYLE is the check's own stylesheet: every color token set to SENTINEL at zero specificity on
// a scope marked same, later in the color layer than any profile, and on one marked later, in
// the layer after it. The layer statement names both layers in the package's order and creates
// neither when the page's entry already has.
const sentinels = COLOR.map((token) => `${token}: ${SENTINEL};`).join(" ");
const STYLE = `@layer spike-html-design.tokens.color, spike-html-design.tokens.space;
@layer spike-html-design.tokens.color { :where([${PROBE}="same"]) { ${sentinels} } }
@layer spike-html-design.tokens.space { :where([${PROBE}="later"]) { ${sentinels} } }`;

// check resolves to the failures of facet's profile name; see the heading.
export async function check(facet, name) {
  if (!FACETS.includes(facet)) {
    throw new TypeError(
      `conformance: unknown facet ${facet}; expected one of ${FACETS.join(", ")}`,
    );
  }
  if (!RULES[facet]) throw new TypeError(`conformance: no check for the ${facet} facet`);
  if (typeof name !== "string" || name === "") {
    throw new TypeError(`conformance: a ${facet} profile's name must be a non-empty string`);
  }
  if (document.readyState !== "complete") {
    await new Promise((resolve) => addEventListener("load", resolve, { once: true }));
  }
  return checkColor(name);
}

// checkColor builds the probes for the color profile name, reads them, and removes them.
function checkColor(name) {
  const style = document.createElement("style");
  style.textContent = STYLE;
  // The host resets every color, space and type token, so a scope inside it holds only what the
  // profile, or the check's own rules, set there. It renders nothing: getComputedStyle still
  // computes a subtree that is not displayed.
  const host = document.createElement("div");
  host.style.display = "none";
  for (const token of [...COLOR, ...OTHERS]) host.style.setProperty(token, "initial");
  const scope = (scheme, probe) => {
    const el = document.createElement("div");
    el.setAttribute("data-palette", name);
    if (scheme) el.style.colorScheme = scheme;
    if (probe) el.setAttribute(PROBE, probe);
    return host.appendChild(el);
  };
  const schemes = SCHEMES.map((scheme) => {
    const el = scope(scheme);
    // A token that is unset falls back to MISSING, and one that is set but no color is invalid
    // at computed-value time, so the probe inherits MISSING from its parent.
    const parent = el.appendChild(document.createElement("div"));
    parent.style.color = MISSING;
    return { scheme, scope: el, probe: parent.appendChild(document.createElement("div")) };
  });
  const same = scope(null, "same");
  const later = scope(null, "later");
  document.head.append(style);
  document.documentElement.append(host);
  try {
    return failures(name, { schemes, same, later });
  } finally {
    host.remove();
    style.remove();
  }
}

// failures reads the probes and returns the color rules name breaks, in RULES's order.
function failures(name, { schemes, same, later }) {
  const failed = [];
  const fail = (rule, message) => failed.push({ rule, message: `${name}: ${message}` });

  // Each scheme's computed color per token, or null when the token is unset or no color there.
  const colors = schemes.map(({ scheme, probe }) => {
    const resolved = {};
    for (const token of COLOR) {
      probe.style.color = `var(${token}, ${MISSING})`;
      const value = getComputedStyle(probe).color;
      resolved[token] = value === getComputedStyle(probe.parentElement).color ? null : value;
    }
    return { scheme, resolved };
  });
  const broken = COLOR.filter((token) => colors.some(({ resolved }) => resolved[token] === null));
  if (broken.length) {
    const where = broken.map((token) => {
      const off = colors.filter(({ resolved }) => resolved[token] === null);
      return `${token} (${off.map(({ scheme }) => scheme).join(", ")})`;
    });
    fail("tokens", `sets no color in a scheme for ${where.join(", ")}`);
  }

  const own = getComputedStyle(schemes[0].scope);
  const others = OTHERS.filter((token) => own.getPropertyValue(token).trim() !== "");
  if (others.length) fail("color-only", `sets space or type tokens: ${others.join(", ")}`);

  // The tokens the profile sets on its scope, as the layer and specificity rules read them.
  const set = COLOR.filter((token) => own.getPropertyValue(token).trim() !== "");
  const beaten = (el) => {
    const computed = getComputedStyle(el);
    return set.filter((token) => computed.getPropertyValue(token).trim() !== SENTINEL);
  };
  const outLayered = set.length ? beaten(later) : [];
  if (outLayered.length) {
    fail(
      "layer",
      `beats a zero-specificity rule in the layer after spike-html-design.tokens.color for ${outLayered.join(", ")}, so it is not in that layer`,
    );
  }
  const outSpecific = set.length && !outLayered.length ? beaten(same) : [];
  if (outSpecific.length) {
    fail(
      "specificity",
      `beats a later zero-specificity rule in spike-html-design.tokens.color for ${outSpecific.join(", ")}, so its selector is more specific than :where([data-palette="${name}"])`,
    );
  }

  const unpainted = [];
  for (const [i, { scheme, scope }] of schemes.entries()) {
    const { resolved } = colors[i];
    const painted = getComputedStyle(scope);
    if (resolved["--bg"] && painted.backgroundColor !== resolved["--bg"]) {
      unpainted.push(
        `background ${painted.backgroundColor} is not --bg ${resolved["--bg"]} in ${scheme}`,
      );
    }
    if (resolved["--fg"] && painted.color !== resolved["--fg"]) {
      unpainted.push(`text ${painted.color} is not --fg ${resolved["--fg"]} in ${scheme}`);
    }
  }
  if (unpainted.length) fail("paints", `a scope's ${unpainted.join("; ")}`);

  const unordered = [];
  for (const { scheme, resolved } of colors) {
    const surfaces = ["--bg", "--bg-1", "--bg-2"];
    if (![...surfaces, "--fg"].every((token) => resolved[token])) continue;
    const text = luminance(resolved["--fg"]);
    const distance = surfaces.map((token) => Math.abs(luminance(resolved[token]) - text));
    if (!(distance[0] > distance[1] && distance[1] > distance[2])) unordered.push(scheme);
  }
  if (unordered.length) {
    fail("surfaces", `--bg, --bg-1 and --bg-2 do not step toward --fg in ${unordered.join(", ")}`);
  }

  const store = globalThis[Symbol.for("spike-html-design.registry")];
  if (!store?.color?.includes(name)) {
    fail("registered", `is not registered under color in the registry`);
  }
  return failed;
}

// luminance returns a computed color's WCAG relative luminance, 0 to 1. The color is drawn into
// a one-pixel canvas and read back as sRGB, so any notation a computed value takes reads alike.
let context;
function luminance(color) {
  context ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  context.clearRect(0, 0, 1, 1);
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [r, g, b] = [...context.getImageData(0, 0, 1, 1).data.slice(0, 3)].map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
