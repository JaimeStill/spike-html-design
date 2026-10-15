import { describe, expect, test } from "bun:test";
import {
  ACTIVATORS,
  DEFAULTS,
  isBare,
  keyshortcuts,
  LEADERS,
  labels,
  MODES,
  matches,
  normalize,
  parse,
  problem,
  stringify,
  wrap,
} from "../modules/keys-grammar.js";

// press builds a parsed press: key, then the modifiers it holds.
const press = (key, held = {}) => ({
  key,
  control: false,
  alt: false,
  meta: false,
  shift: false,
  ...held,
});

// event builds a keydown-like object, a US layout's code for an ASCII letter or digit unless
// given, and no modifier unless given.
function event(key, held = {}) {
  const code = /^[a-z]$/i.test(key)
    ? `Key${key.toUpperCase()}`
    : /^[0-9]$/.test(key)
      ? `Digit${key}`
      : "";
  return { key, code, shiftKey: false, altKey: false, ctrlKey: false, metaKey: false, ...held };
}

// pressed reports whether the first press of binding's first alternative matches e.
const pressed = (binding, e, options) => matches(parse(binding, options)[0][0], e);

describe("keys grammar: parse", () => {
  test("a letter is one press, lowercase, Shift up", () => {
    expect(parse("t")).toEqual([[press("t")]]);
    expect(parse("T")).toEqual([[press("t")]]);
  });

  test("a space separates the presses of a sequence, and a comma the alternatives", () => {
    expect(parse("g t")).toEqual([[press("g"), press("t")]]);
    expect(parse("g  t")).toEqual([[press("g"), press("t")]]);
    expect(parse("j, ArrowDown")).toEqual([[press("j")], [press("ArrowDown")]]);
  });

  test("+ joins modifiers to one key, their names folding case into normal order", () => {
    const all = press("k", { control: true, alt: true, meta: true, shift: true });
    expect(parse("shift+meta+ALT+control+k")).toEqual([[all]]);
    expect(normalize("shift+meta+ALT+control+k")).toBe("Control+Alt+Meta+Shift+K");
  });

  test("Mod is Meta on macOS and Control elsewhere", () => {
    expect(parse("Mod+k", { mac: true })).toEqual([[press("k", { meta: true })]]);
    expect(parse("Mod+k")).toEqual([[press("k", { control: true })]]);
    expect(normalize("mod+k", { mac: false })).toBe("Control+k");
  });

  test("Shift+T and Shift+t both require Shift", () => {
    expect(parse("Shift+T")).toEqual([[press("t", { shift: true })]]);
    expect(parse("Shift+t")).toEqual([[press("t", { shift: true })]]);
    expect(normalize("Shift+t")).toBe("Shift+T");
  });

  test("a symbol is the character typed, and Shift is dropped from it", () => {
    expect(parse("?")).toEqual([[press("?")]]);
    expect(parse("Shift+?")).toEqual([[press("?")]]);
    expect(parse("Alt+Shift+?")).toEqual([[press("?", { alt: true })]]);
  });

  test("Plus and Space name those keys, and a named key is its event.key", () => {
    expect(parse("Control+Plus")).toEqual([[press("+", { control: true })]]);
    expect(parse("space")).toEqual([[press(" ")]]);
    expect(parse("Escape")).toEqual([[press("Escape")]]);
    expect(normalize("Control+plus, Shift+Space")).toBe("Control+Plus, Shift+Space");
  });

  const MALFORMED = {
    empty: "",
    blank: "  ",
    "an empty alternative": "a,,b",
    "a trailing comma": "a,",
    "a trailing +": "Control+",
    "a bare +": "+",
    "a + between nothing": "Shift++",
    "two keys in a combination": "a+b",
    "an unknown modifier": "Ctrl+k",
    "a repeated modifier": "Shift+shift+k",
    "Mod and the modifier it resolves to": "Mod+Control+k",
    "a modifier alone": "Shift",
    "Mod alone": "mod",
    "a misspelled named key": "escape",
    "a word that names no key": "Control+key",
  };
  for (const [name, binding] of Object.entries(MALFORMED)) {
    test(`a binding with ${name} is malformed: it parses to null and problem says why`, () => {
      expect(parse(binding)).toBeNull();
      expect(normalize(binding)).toBeNull();
      expect(typeof problem(binding)).toBe("string");
    });
  }

  test("a binding that isn't a string is malformed", () => {
    expect(parse(undefined)).toBeNull();
    expect(problem(42)).toBe("a binding must be a string");
  });

  test("problem is null for a binding that parses", () => {
    expect(problem("g t, Alt+T, ?")).toBeNull();
  });
});

describe("keys grammar: stringify", () => {
  test("writes a binding, a sequence, or a press in normal form", () => {
    const binding = parse("g T, ALT+t, shift+?");
    expect(stringify(binding)).toBe("g t, Alt+t, ?");
    expect(stringify(binding[0])).toBe("g t");
    expect(stringify(binding[1][0])).toBe("Alt+t");
  });
});

describe("keys grammar: bare and modes", () => {
  test("bare is one character press with no modifier but Shift", () => {
    for (const binding of ["t", "Shift+T", "?", "1", "Plus"]) {
      expect([binding, isBare(parse(binding)[0])]).toEqual([binding, true]);
    }
    for (const binding of [
      "g t",
      "Alt+t",
      "Control+k",
      "Meta+k",
      "Escape",
      "Space",
      "Shift+Enter",
    ]) {
      expect([binding, isBare(parse(binding)[0])]).toEqual([binding, false]);
    }
  });

  test("the modes, leaders, and activators, with raw, g, and Alt the defaults", () => {
    expect(MODES).toEqual(["raw", "leader", "activator"]);
    expect(LEADERS).toEqual(["g", ",", "\\", "Space"]);
    expect(ACTIVATORS).toEqual(["Alt", "Control", "Meta", "Alt+Shift"]);
    expect(DEFAULTS).toEqual({ mode: "raw", leader: "g", activator: "Alt" });
  });

  test("raw mode leaves a binding as written", () => {
    expect(stringify(wrap("t, Shift+T, ?", "raw"))).toBe("t, Shift+T, ?");
  });

  test("leader mode puts the leader before each bare press, so g becomes g g", () => {
    expect(stringify(wrap("t, Shift+T, ?", "leader"))).toBe("g t, g Shift+T, g ?");
    expect(stringify(wrap("g", "leader"))).toBe("g g");
    expect(stringify(wrap("t", "leader", { leader: "Space" }))).toBe("Space t");
    expect(stringify(wrap("t", "leader", { leader: "\\" }))).toBe("\\ t");
    // The comma key can't be written in a binding, since "," separates alternatives, so the
    // comma leader is checked parsed.
    expect(wrap("t", "leader", { leader: "," })).toEqual([[press(","), press("t")]]);
  });

  test("activator mode holds the activator's modifiers with each bare press", () => {
    expect(stringify(wrap("t, Shift+T, ?", "activator"))).toBe("Alt+t, Alt+Shift+T, Alt+?");
    expect(stringify(wrap("t", "activator", { activator: "Control" }))).toBe("Control+t");
    expect(stringify(wrap("t", "activator", { activator: "Meta" }))).toBe("Meta+t");
    expect(stringify(wrap("t, ?", "activator", { activator: "Alt+Shift" }))).toBe(
      "Alt+Shift+T, Alt+?",
    );
  });

  test("a sequence, a combination, or a named key is as written in every mode", () => {
    const written = "g c, Control+k, Alt+t, Meta+Shift+P, Escape, Space";
    for (const mode of MODES) {
      expect([mode, stringify(wrap(written, mode))]).toEqual([mode, written]);
    }
  });

  test("wrap takes a parsed binding, and returns null for a malformed one", () => {
    expect(stringify(wrap(parse("t"), "leader"))).toBe("g t");
    expect(wrap("a+b", "leader")).toBeNull();
  });

  test("an unknown mode reads as raw, and an unknown leader or activator as its default", () => {
    expect(stringify(wrap("t", "chord"))).toBe("t");
    expect(stringify(wrap("t", "leader", { leader: "x" }))).toBe("g t");
    expect(stringify(wrap("t", "activator", { activator: "Hyper" }))).toBe("Alt+t");
  });
});

describe("keys grammar: matches", () => {
  test("a letter matches either case while Shift is up, so caps lock doesn't defeat it", () => {
    expect(pressed("t", event("t"))).toBe(true);
    expect(pressed("t", event("T"))).toBe(true);
    expect(pressed("t", event("T", { shiftKey: true }))).toBe(false);
    expect(pressed("t", event("y"))).toBe(false);
  });

  test("Shift+T requires Shift, in either case", () => {
    expect(pressed("Shift+T", event("T", { shiftKey: true }))).toBe(true);
    expect(pressed("Shift+T", event("t", { shiftKey: true }))).toBe(true);
    expect(pressed("Shift+T", event("t"))).toBe(false);
    expect(pressed("Shift+T", event("T"))).toBe(false);
  });

  test("a symbol matches its character with Shift held or not", () => {
    expect(pressed("?", event("?", { code: "Slash", shiftKey: true }))).toBe(true);
    expect(pressed("?", event("?", { code: "Minus" }))).toBe(true);
    expect(pressed("?", event("/", { code: "Slash" }))).toBe(false);
  });

  test("Control, Alt, and Meta must be held exactly as written", () => {
    expect(pressed("t", event("t", { ctrlKey: true }))).toBe(false);
    expect(pressed("t", event("t", { metaKey: true }))).toBe(false);
    expect(pressed("t", event("t", { altKey: true }))).toBe(false);
    expect(pressed("?", event("?", { ctrlKey: true }))).toBe(false);
    expect(pressed("Control+k", event("k", { ctrlKey: true }))).toBe(true);
    expect(pressed("Control+k", event("k", { ctrlKey: true, altKey: true }))).toBe(false);
    expect(pressed("Control+k", event("k"))).toBe(false);
  });

  test("Mod matches Meta on macOS and Control elsewhere", () => {
    expect(pressed("Mod+k", event("k", { metaKey: true }), { mac: true })).toBe(true);
    expect(pressed("Mod+k", event("k", { ctrlKey: true }), { mac: true })).toBe(false);
    expect(pressed("Mod+k", event("k", { ctrlKey: true }))).toBe(true);
    expect(pressed("Mod+k", event("k", { metaKey: true }))).toBe(false);
  });

  test("with Alt held, letters and digits match by event.code", () => {
    // macOS Option+t types †, and Option+1 types ¡.
    expect(pressed("Alt+t", event("†", { code: "KeyT", altKey: true }))).toBe(true);
    expect(pressed("Alt+t", event("t", { code: "KeyY", altKey: true }))).toBe(false);
    expect(pressed("Alt+1", event("¡", { code: "Digit1", altKey: true }))).toBe(true);
    expect(pressed("Alt+Shift+T", event("ˇ", { code: "KeyT", altKey: true, shiftKey: true }))).toBe(
      true,
    );
    expect(pressed("Alt+Shift+T", event("†", { code: "KeyT", altKey: true }))).toBe(false);
  });

  test("a letter outside ASCII falls back to event.code, so the Russian layout's о is j", () => {
    expect(pressed("j", event("о", { code: "KeyJ" }))).toBe(true);
    expect(pressed("j", event("О", { code: "KeyJ" }))).toBe(true);
    expect(pressed("k", event("о", { code: "KeyJ" }))).toBe(false);
  });

  test("a digit and a named key match their event.key", () => {
    expect(pressed("1", event("1"))).toBe(true);
    expect(pressed("1", event("!", { code: "Digit1", shiftKey: true }))).toBe(false);
    expect(pressed("Escape", event("Escape", { code: "Escape" }))).toBe(true);
    expect(pressed("Space", event(" ", { code: "Space" }))).toBe(true);
    expect(pressed("Shift+Enter", event("Enter", { code: "Enter" }))).toBe(false);
  });
});

describe("keys grammar: formatting", () => {
  // The demo: "g t", "Alt+T", and "?" in every form, in every mode.
  const FORMATS = {
    "g t": {
      normal: "g t",
      labels: [[["G"], ["T"]]],
      keyshortcuts: null,
      leader: "g t",
      activator: "g t",
    },
    "Alt+T": {
      normal: "Alt+t",
      labels: [[["Alt", "T"]]],
      keyshortcuts: "Alt+T",
      leader: "Alt+t",
      activator: "Alt+t",
    },
    "?": {
      normal: "?",
      labels: [[["?"]]],
      keyshortcuts: "Shift+/",
      leader: "g ?",
      activator: "Alt+?",
    },
  };
  for (const [binding, expected] of Object.entries(FORMATS)) {
    test(`formats ${binding} every way`, () => {
      const parsed = parse(binding);
      expect(stringify(parsed)).toBe(expected.normal);
      expect(parsed.map(labels)).toEqual(expected.labels);
      expect(keyshortcuts(parsed)).toBe(expected.keyshortcuts);
      expect(stringify(wrap(parsed, "leader"))).toBe(expected.leader);
      expect(stringify(wrap(parsed, "activator"))).toBe(expected.activator);
    });
  }

  test("labels show letters as uppercase keycaps, modifiers in normal order, and Space by name", () => {
    expect(labels(parse("t")[0])).toEqual([["T"]]);
    expect(labels(parse("shift+control+k")[0])).toEqual([["Control", "Shift", "K"]]);
    expect(labels(parse("Space")[0])).toEqual([["Space"]]);
    expect(labels(parse("Control+Plus")[0])).toEqual([["Control", "+"]]);
    expect(labels(wrap("t", "leader", { leader: "," })[0])).toEqual([[","], ["T"]]);
  });

  test("aria-keyshortcuts names physical keys, modifiers first", () => {
    expect(keyshortcuts(parse("t"))).toBe("T");
    expect(keyshortcuts(parse("Shift+t"))).toBe("Shift+T");
    expect(keyshortcuts(parse("Shift+Control+k"))).toBe("Control+Shift+K");
    expect(keyshortcuts(parse("Space"))).toBe("Space");
    expect(keyshortcuts(parse("Escape"))).toBe("Escape");
    expect(keyshortcuts(parse("/"))).toBe("/");
  });

  test("a symbol is declared by its US physical key with Shift", () => {
    const SHIFTED = {
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
      Plus: "=",
      "{": "[",
      "}": "]",
      "|": "\\",
      ":": ";",
      '"': "'",
      "<": ",",
      ">": ".",
      "?": "/",
    };
    for (const [symbol, key] of Object.entries(SHIFTED)) {
      expect([symbol, keyshortcuts(parse(symbol))]).toEqual([symbol, `Shift+${key}`]);
    }
    expect(keyshortcuts(parse("Alt+?"))).toBe("Alt+Shift+/");
  });

  test("alternatives join with a space, and a sequence among them declares nothing", () => {
    expect(keyshortcuts(parse("t, g t, Alt+T, ?"))).toBe("T Alt+T Shift+/");
    expect(keyshortcuts(parse("g t, g c"))).toBeNull();
    expect(keyshortcuts(wrap("t", "leader"))).toBeNull();
    expect(keyshortcuts(wrap("t", "activator"))).toBe("Alt+T");
  });
});
