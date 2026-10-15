// keys-grammar: the binding grammar keys reads, with no DOM: it parses and normalizes a binding,
// matches a press against a keydown, and formats a binding for display and for
// aria-keyshortcuts. It touches no global and loads nothing, so the
// runtime, the help module, and an outside module share it.
//
// A binding is a string in @github/hotkey's grammar:
//
//   "," separates alternatives, each a binding of its own: "?, Shift+/".
//   " " separates the presses of a sequence: "g c". Runs of whitespace are one separator.
//   "+" joins a combination of modifiers with exactly one key: "Control+Shift+K". The modifiers
//       are Control, Alt, Meta, Shift, and Mod, which is Meta on macOS and Control elsewhere;
//       their names fold case and normalize to that order. "Plus" and "Space" name those keys.
//
// It differs from @github/hotkey in three ways. A letter written without Shift matches either
// case while Shift is up, so caps lock doesn't defeat it, and "Shift+T" (or "Shift+t") requires
// Shift. A symbol is written as the character typed, "?", and Shift is ignored for it, where
// @github/hotkey writes "Shift+?". A named key is a UI Events key value, "Escape" or "ArrowUp",
// written as it is spelled there.
//
// A malformed string parses to null and binds nothing: an empty string or alternative, an empty
// press around a "+", an unknown or repeated modifier, a modifier alone, two keys in one
// combination, or a multi-letter key that isn't Plus, Space, or a named key. problem() says
// which, for the runtime's TypeError and warning. A "," always separates, so the comma key can't
// be bound.
//
// A parsed binding is an array of alternatives, each a sequence: an array of presses, each
//
//   { key, control, alt, meta, shift }
//
// key the event.key value it matches ("t" lowercase for a letter, "?", "+", " ", "Escape"), and
// each modifier whether it is held. For a symbol shift is always false, since it is ignored.
//
// The exports:
//
//   parse(binding, { mac })   the parsed binding, or null when it is malformed. mac resolves Mod.
//   problem(binding)          why binding is malformed, or null when it parses.
//   stringify(parsed)         a parsed binding, sequence, or press as its normal string.
//   normalize(binding, opts)  stringify(parse(binding, opts)), or null when it is malformed.
//   matches(press, event)     whether a keydown-like { key, code, shiftKey, altKey, ctrlKey,
//                             metaKey } is press.
//   labels(sequence)          a sequence for display, as presses of key labels.
//   keyshortcuts(binding)     a parsed binding's aria-keyshortcuts value, or null for none.

// MODIFIERS are the modifier names in their normal order, each to its press field.
const MODIFIERS = { Control: "control", Alt: "alt", Meta: "meta", Shift: "shift" };

// NAMED are the keys the grammar names, name to event.key.
const NAMED = { plus: "+", space: " " };

// US_SHIFTED is the US layout's Shift row, each symbol to the physical key it is typed on with
// Shift, so aria-keyshortcuts, which names physical keys, declares "?" as "Shift+/".
const US_SHIFTED = {
  "~": "`",
  "!": "1",
  "@": "2",
  "#": "3",
  $: "4",
  "%": "5",
  "^": "6",
  "&": "7",
  "*": "8",
  "(": "9",
  ")": "0",
  _: "-",
  "+": "=",
  "{": "[",
  "}": "]",
  "|": "\\",
  ":": ";",
  '"': "'",
  "<": ",",
  ">": ".",
  "?": "/",
};

// isLetter reports whether key is one cased character, a letter of any script.
const isLetter = (key) => [...key].length === 1 && key.toLowerCase() !== key.toUpperCase();
const isAsciiLetter = (key) => /^[a-z]$/i.test(key);
const isDigit = (key) => /^[0-9]$/.test(key);

// isSymbol reports whether key is one character that is neither a letter, a digit, nor
// whitespace: a key whose character Shift makes, so Shift is ignored for it.
const isSymbol = (key) => [...key].length === 1 && !isLetter(key) && !isDigit(key) && key !== " ";

// pressOf parses one press, a combination such as "Alt+Shift+T", into a press, or returns the
// reason it is malformed as a string.
function pressOf(token, mac) {
  const parts = token.split("+");
  const name = parts.pop();
  const press = { key: "", control: false, alt: false, meta: false, shift: false };
  for (const part of parts) {
    const lower = part.toLowerCase();
    const modifier =
      lower === "mod"
        ? mac
          ? "Meta"
          : "Control"
        : Object.keys(MODIFIERS).find((m) => m.toLowerCase() === lower);
    if (part === "") return `"${token}" has an empty key around a "+"; write the + key as Plus`;
    if (!modifier) return `"${token}" joins "${part}", which is not a modifier, to another key`;
    if (press[MODIFIERS[modifier]]) return `"${token}" repeats ${modifier}`;
    press[MODIFIERS[modifier]] = true;
  }
  if (name === "") return `"${token}" ends in "+" with no key; write the + key as Plus`;
  if ([...name].length === 1) press.key = isLetter(name) ? name.toLowerCase() : name;
  else if (name.toLowerCase() in NAMED) press.key = NAMED[name.toLowerCase()];
  else if (["mod", ...Object.values(MODIFIERS)].includes(name.toLowerCase())) {
    return `"${token}" is a modifier with no key`;
  } else if (/^[A-Z][A-Za-z0-9]*$/.test(name)) press.key = name;
  else return `"${token}" names no key; a named key is spelled as its event.key, as Escape`;
  if (isSymbol(press.key)) press.shift = false;
  return press;
}

// parsed parses binding into its alternatives, or returns the reason it is malformed.
function parsed(binding, mac) {
  if (typeof binding !== "string") return "a binding must be a string";
  const alternatives = [];
  for (const alternative of binding.split(",")) {
    const tokens = alternative.trim().split(/\s+/);
    if (tokens[0] === "") return `"${binding}" has an empty alternative`;
    const sequence = [];
    for (const token of tokens) {
      const press = pressOf(token, mac);
      if (typeof press === "string") return press;
      sequence.push(press);
    }
    alternatives.push(sequence);
  }
  return alternatives;
}

export function parse(binding, { mac = false } = {}) {
  const result = parsed(binding, mac);
  return typeof result === "string" ? null : result;
}

export function problem(binding) {
  const result = parsed(binding, false);
  return typeof result === "string" ? result : null;
}

// keyName writes a press's key as the grammar spells it: Plus and Space by name, a letter
// uppercase when Shift is written and lowercase otherwise.
function keyName(press) {
  if (press.key === "+") return "Plus";
  if (press.key === " ") return "Space";
  if (isLetter(press.key)) return press.shift ? press.key.toUpperCase() : press.key;
  return press.key;
}

// modifiersOf returns the modifier names a press holds, in normal order.
const modifiersOf = (press) => Object.keys(MODIFIERS).filter((m) => press[MODIFIERS[m]]);

export function stringify(value) {
  if (!Array.isArray(value)) return [...modifiersOf(value), keyName(value)].join("+");
  if (value.length > 0 && !Array.isArray(value[0])) return value.map(stringify).join(" ");
  return value.map(stringify).join(", ");
}

export function normalize(binding, options) {
  const result = parse(binding, options);
  return result && stringify(result);
}

// matches compares by event.key, with the modifiers exact: Control, Alt, and Meta are held iff
// press holds them. A letter compares case-folded and needs Shift as written, so caps lock and
// "t" match while Shift+T doesn't. With Alt held, an ASCII letter or digit compares by
// event.code, since Option and AltGr change the character; so does an ASCII letter whose
// event.key is a letter outside ASCII, a layout such as Russian, where KeyJ is j. A symbol
// ignores Shift. Composition, repeats, fields, and AltGraph are the runtime's to filter.
export function matches(press, event) {
  if (Boolean(event.ctrlKey) !== press.control) return false;
  if (Boolean(event.altKey) !== press.alt) return false;
  if (Boolean(event.metaKey) !== press.meta) return false;
  if (isSymbol(press.key)) return event.key === press.key;
  if (Boolean(event.shiftKey) !== press.shift) return false;
  if (isAsciiLetter(press.key)) {
    if (event.altKey || (isLetter(event.key) && !isAsciiLetter(event.key))) {
      return event.code === `Key${press.key.toUpperCase()}`;
    }
    return event.key.toLowerCase() === press.key;
  }
  if (isDigit(press.key) && event.altKey) return event.code === `Digit${press.key}`;
  if (isLetter(press.key)) return event.key.toLowerCase() === press.key;
  return event.key === press.key;
}

// label writes a key for display: a letter as its keycap, uppercase whatever case was written,
// Space by name, anything else as its event.key.
function label(key) {
  if (key === " ") return "Space";
  return isLetter(key) ? key.toUpperCase() : key;
}

// labels returns a sequence as its presses, each its modifiers' names in normal order then its
// key's label: "g t" is [["G"], ["T"]] and "Alt+T" [["Alt", "T"]]. The help module draws each
// label a kbd, "+" between a press's and "then" between presses.
export function labels(sequence) {
  return sequence.map((press) => [...modifiersOf(press), label(press.key)]);
}

// keyshortcuts returns binding's aria-keyshortcuts: each alternative that is one press, its
// modifiers then its key, as WAI-ARIA names physical keys ("T", "Alt+T", "Control+Shift+K"), a
// symbol declared by its US physical key with Shift ("?" as "Shift+/"), joined by spaces. A
// sequence declares nothing, so a binding of sequences alone returns null.
export function keyshortcuts(binding) {
  const declared = binding
    .filter((sequence) => sequence.length === 1)
    .map(([press]) => {
      const physical = US_SHIFTED[press.key];
      const shown = {
        ...press,
        key: physical ?? press.key,
        shift: press.shift || Boolean(physical),
      };
      return [...modifiersOf(shown), label(shown.key)].join("+");
    });
  return declared.length > 0 ? [...new Set(declared)].join(" ") : null;
}
