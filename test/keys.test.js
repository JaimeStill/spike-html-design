import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { dirname } from "node:path";
import { openPage, serve } from "./harness.js";

const root = dirname(import.meta.dir);
// The repository served at the root, so a fixture imports the modules by relative URL; chromium
// runs no relative module script from file://.
const server = serve(root);
const fixture = (name) => `${server.url}test/fixtures/${name}`;
const pages = [];

// Every fixture shares the server's origin, and so the reader's stored settings: each test
// clears them before its pages close.
afterEach(async () => {
  for (const page of pages.splice(0)) {
    await page.evaluate("localStorage.clear()");
    page.close();
  }
});
afterAll(() => server.stop());

const KEYS = "/modules/keys.js";
// WAIT is the sequence wait the tests set, short so a test waits it out quickly; the default,
// 1500 ms, is checked once.
const WAIT = 150;

// open opens a keys fixture with the wait set to WAIT and every keys-fire and keys-sequence
// detail recorded, in window.fired and window.sequences, and closes it after the test.
async function open(name = "keys.html") {
  const page = await openPage(fixture(name));
  pages.push(page);
  await page.evaluate(`(() => {
    window.defaultWait = globalThis[Symbol.for("spike-html-design.keys")].wait;
    globalThis[Symbol.for("spike-html-design.keys")].wait = ${WAIT};
    window.fired = [];
    window.sequences = [];
    document.addEventListener("keys-fire", (event) => window.fired.push(event.detail));
    document.addEventListener("keys-sequence", (event) => window.sequences.push(event.detail));
  })()`);
  return page;
}

// MODIFIERS are CDP's modifier bits.
const MODIFIERS = { alt: 1, ctrl: 2, meta: 4, shift: 8 };

// press sends a real key press through CDP: a keyDown of key, with code (a US layout's for an
// ASCII letter or digit unless given), the modifiers held, and repeat or keyCode when given,
// then its keyUp. A character typed with no Control or Meta carries its text, as typing would.
async function press(page, key, { code, repeat = false, keyCode, ...held } = {}) {
  const modifiers = Object.entries(held).reduce(
    (bits, [name, on]) => bits | (on ? MODIFIERS[name] : 0),
    0,
  );
  const letter = /^[a-z]$/i.test(key);
  const event = {
    key,
    code: code ?? (letter ? `Key${key.toUpperCase()}` : /^[0-9]$/.test(key) ? `Digit${key}` : ""),
    modifiers,
    autoRepeat: repeat,
    windowsVirtualKeyCode: keyCode ?? (letter ? key.toUpperCase().charCodeAt(0) : 0),
  };
  const text = [...key].length === 1 && !held.ctrl && !held.meta ? { text: key } : {};
  await page.view.cdp("Input.dispatchKeyEvent", { type: "keyDown", ...event, ...text });
  await page.view.cdp("Input.dispatchKeyEvent", { type: "keyUp", ...event });
}

// log resolves to the actions the fixture's bindings ran, in order.
const log = (page) => page.evaluate("window.log");

// wait resolves after ms, as measured in the page.
const sleep = (page, ms) => page.evaluate(`new Promise((resolve) => setTimeout(resolve, ${ms}))`);

// call runs body with the keys module the page loaded, as keys, and resolves to its result.
const call = (page, body) =>
  page.evaluate(`import(${JSON.stringify(KEYS)}).then((keys) => ${body})`);

describe("keys: element bindings", () => {
  test("T clicks its button, running the invoker command, and marks the press handled", async () => {
    const page = await open();
    await page.evaluate(`document.addEventListener("keydown", (event) => {
      window.handled = event.defaultPrevented;
    })`);
    await press(page, "t");
    expect(await log(page)).toEqual(["command --theme"]);
    expect(await page.evaluate("window.handled")).toBe(true);
    expect(await page.evaluate("window.fired")).toEqual([
      { binding: "t", keys: ["t"], mode: "raw" },
    ]);
    // A single press that fires at once is no sequence.
    expect(await page.evaluate("window.sequences")).toEqual([]);
  });

  test("a field's binding focuses it", async () => {
    const page = await open();
    await press(page, "/");
    expect(await page.evaluate("document.activeElement.id")).toBe("search");
  });

  test("keys reads the page at each press: an added element binds, a removed one unbinds", async () => {
    const page = await open();
    await page.evaluate(`(() => {
      const button = document.createElement("button");
      button.dataset.keys = "n";
      button.dataset.log = "n";
      document.body.append(button);
    })()`);
    await press(page, "n");
    await page.evaluate(`document.querySelector("[data-keys=t]").removeAttribute("data-keys")`);
    await press(page, "t");
    expect(await log(page)).toEqual(["n"]);
  });

  test("a malformed data-keys binds nothing and warns once", async () => {
    const page = await open();
    await page.evaluate(`(() => {
      window.warnings = [];
      console.warn = (message) => window.warnings.push(message);
    })()`);
    await press(page, "x");
    await press(page, "y");
    expect(await log(page)).toEqual([]);
    const warnings = await page.evaluate("window.warnings");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toStartWith("keys: data-keys binds nothing:");
  });

  test("the first of two elements sharing keys wins, ahead of a register() binding", async () => {
    const page = await open();
    await call(page, `keys.register("f", "registered f", () => window.log.push("f registered"))`);
    await press(page, "f");
    expect(await log(page)).toEqual(["f first"]);
    // With the elements gone, the register() binding is the first.
    await page.evaluate(`document.querySelectorAll("[data-keys=f]").forEach((el) => el.remove())`);
    await press(page, "f");
    expect(await log(page)).toEqual(["f first", "f registered"]);
  });
});

describe("keys: register()", () => {
  test("fires its handler with the keys-fire event; its remover removes only that binding", async () => {
    const page = await open();
    await call(
      page,
      `{
        window.removeOne = keys.register("q", "one", (event) => window.log.push("one " + event.type));
        keys.register("q", "two", () => window.log.push("two"));
      }`,
    );
    await press(page, "q");
    expect(await log(page)).toEqual(["one keys-fire"]);
    expect(await page.evaluate("window.fired")).toEqual([
      { binding: "q", keys: ["q"], mode: "raw", label: "one" },
    ]);
    await page.evaluate("(window.removeOne(), window.removeOne())");
    await press(page, "q");
    expect(await log(page)).toEqual(["one keys-fire", "two"]);
  });

  test("throws a TypeError on a malformed binding, label, or handler", async () => {
    const page = await open();
    const thrown = (args) =>
      call(
        page,
        `{ try { keys.register(${args}); return null; }
           catch (error) { return [error.constructor.name, error.message]; } }`,
      );
    const [name, message] = await thrown(`"Control+", "x", () => {}`);
    expect(name).toBe("TypeError");
    expect(message).toStartWith("keys: ");
    expect((await thrown(`"x", 1, () => {}`))[0]).toBe("TypeError");
    expect((await thrown(`"x", "x", null`))[0]).toBe("TypeError");
    expect(
      await page.evaluate(`globalThis[Symbol.for("spike-html-design.keys")].registered`),
    ).toEqual([]);
  });
});

describe("keys: sequences", () => {
  test("g c runs the longer and g, when the wait ends, the shorter", async () => {
    const page = await open();
    expect(await page.evaluate("window.defaultWait")).toBe(1500);
    await press(page, "g");
    await press(page, "c");
    expect(await log(page)).toEqual(["g c"]);
    await press(page, "g");
    // Pending until the wait ends.
    expect(await log(page)).toEqual(["g c"]);
    await sleep(page, WAIT + 100);
    expect(await log(page)).toEqual(["g c", "g"]);
    expect(await page.evaluate("window.sequences")).toEqual([
      { state: "start", presses: ["g"] },
      { state: "end", presses: ["g", "c"], reason: "fired" },
      { state: "start", presses: ["g"] },
      { state: "end", presses: ["g"], reason: "fired" },
    ]);
    expect((await page.evaluate("window.fired")).map(({ keys }) => keys)).toEqual([
      ["g", "c"],
      ["g"],
    ]);
  });

  test("a press that doesn't continue the sequence ends it and is dropped, not retried", async () => {
    const page = await open();
    await press(page, "g");
    // t is bound, but as a new start, not as g's next press.
    await press(page, "t");
    await sleep(page, WAIT + 100);
    expect(await log(page)).toEqual([]);
    expect(await page.evaluate("window.sequences")).toEqual([
      { state: "start", presses: ["g"] },
      { state: "end", presses: ["g"], reason: "dropped" },
    ]);
  });

  test("a press after the wait finds the sequence timed out", async () => {
    const page = await open();
    await call(page, `keys.register("w e r", "wer", () => window.log.push("w e r"))`);
    await press(page, "w");
    await press(page, "e");
    await sleep(page, WAIT + 100);
    await press(page, "r");
    expect(await log(page)).toEqual([]);
    expect(await page.evaluate("window.sequences")).toEqual([
      { state: "start", presses: ["w"] },
      { state: "continue", presses: ["w", "e"] },
      { state: "end", presses: ["w", "e"], reason: "timeout" },
    ]);
    // Within the wait it runs.
    for (const key of ["w", "e", "r"]) await press(page, key);
    expect(await log(page)).toEqual(["w e r"]);
  });

  test("the indicator, an outside module, shows the pending presses from keys-sequence alone", async () => {
    const page = await open();
    const shown = () => page.evaluate(`document.getElementById("indicator").textContent`);
    await call(page, `keys.register("w e r", "wer", () => {})`);
    await press(page, "w");
    expect(await shown()).toBe("w");
    await press(page, "e");
    expect(await shown()).toBe("w then e");
    await press(page, "r");
    expect(await shown()).toBe("");
  });
});

describe("keys: silence", () => {
  test("nothing fires in a field, even a combination", async () => {
    const page = await open();
    await call(page, `keys.register("Control+k", "k", () => window.log.push("Control+k"))`);
    for (const id of ["text", "notes", "pick", "editable", "search"]) {
      await page.evaluate(`document.getElementById(${JSON.stringify(id)}).focus()`);
      await press(page, "t");
      await press(page, "k", { ctrl: true });
    }
    expect(await log(page)).toEqual([]);
    // Out of the field, the combination fires.
    await page.evaluate("document.activeElement.blur()");
    await press(page, "k", { ctrl: true });
    expect(await log(page)).toEqual(["Control+k"]);
  });

  test("with Control or Meta held, a bare binding doesn't match", async () => {
    const page = await open();
    await press(page, "t", { ctrl: true });
    await press(page, "t", { meta: true });
    expect(await log(page)).toEqual([]);
  });

  test("nothing fires on a repeat, while composing, on Dead or Process, or with AltGraph", async () => {
    const page = await open();
    await press(page, "t", { repeat: true });
    await press(page, "t", { keyCode: 229 });
    await press(page, "Dead");
    await press(page, "Process");
    await page.evaluate(`(() => {
      const send = (init) => document.dispatchEvent(new KeyboardEvent("keydown",
        { key: "t", code: "KeyT", bubbles: true, cancelable: true, ...init }));
      send({ isComposing: true });
      send({ modifierAltGraph: true });
    })()`);
    expect(await log(page)).toEqual([]);
    expect(await page.evaluate("window.fired")).toEqual([]);
  });

  test("an event already handled is left alone", async () => {
    const page = await open();
    await page.evaluate(
      `document.body.addEventListener("keydown", (event) => event.preventDefault())`,
    );
    await press(page, "t");
    expect(await log(page)).toEqual([]);
  });

  test("a modifier pressed alone neither starts nor drops a sequence", async () => {
    const page = await open();
    await press(page, "g");
    await press(page, "Shift", { code: "ShiftLeft", shift: true });
    await press(page, "c");
    expect(await log(page)).toEqual(["g c"]);
  });
});

describe("keys: scope", () => {
  test("a disabled, inert, or hidden element binds nothing", async () => {
    const page = await open();
    for (const key of ["d", "i", "h"]) await press(page, key);
    expect(await log(page)).toEqual([]);
    await page.evaluate(`document.querySelector("[data-keys=d]").disabled = false`);
    await press(page, "d");
    expect(await log(page)).toEqual(["d"]);
  });

  test("under a modal only its own bindings are active and register() bindings pause", async () => {
    const page = await open();
    await call(page, `keys.register("r", "r", () => window.log.push("r"))`);
    await press(page, "o");
    expect(await page.evaluate(`document.getElementById("modal").matches(":modal")`)).toBe(true);
    for (const key of ["t", "r", "g"]) await press(page, key);
    await sleep(page, WAIT + 100);
    await press(page, "m");
    expect(await log(page)).toEqual(["m"]);
    await press(page, "Escape");
    expect(await page.evaluate(`document.getElementById("modal").open`)).toBe(false);
    await press(page, "r");
    expect(await log(page)).toEqual(["m", "r"]);
  });
});

describe("keys: extension and the store", () => {
  test("cancelling keys-fire stops the action", async () => {
    const page = await open();
    await call(page, `keys.register("q", "q", () => window.log.push("q"))`);
    await page.evaluate(
      `document.addEventListener("keys-fire", (event) => event.preventDefault())`,
    );
    await press(page, "t");
    await press(page, "q");
    expect(await log(page)).toEqual([]);
    expect((await page.evaluate("window.fired")).map(({ binding }) => binding)).toEqual(["t", "q"]);
  });

  test("keys-fire bubbles from the bound element", async () => {
    const page = await open();
    await page.evaluate(`document.querySelector("[data-keys=t]").addEventListener("keys-fire",
      (event) => { window.from = [event.target.dataset.keys, event.bubbles, event.cancelable]; })`);
    await press(page, "t");
    expect(await page.evaluate("window.from")).toEqual(["t", true, true]);
  });

  test("two copies from two URLs share one store and one listener, so a key fires once", async () => {
    const page = await open("keys-copies.html");
    expect(await page.evaluate("window.copies")).toBe(true);
    for (const key of ["t", "a", "b"]) await press(page, key);
    expect(await log(page)).toEqual(["t", "a", "b"]);
    const store = await page.evaluate(`(() => {
      const store = globalThis[Symbol.for("spike-html-design.keys")];
      return { keys: Object.keys(store), registered: store.registered.map(({ keys, label }) => [keys, label]) };
    })()`);
    expect(store).toEqual({
      keys: ["registered", "wait", "listening"],
      registered: [
        ["a", "from a"],
        ["b", "from b"],
      ],
    });
  });
});

// MODES_FIXTURE is the modes fixture, one set of bindings pressed in every mode.
const MODES_FIXTURE = "keys-modes.html";

// declared resolves to each bound button's aria-keyshortcuts, by its data-log, null when absent.
const declared = (page) =>
  page.evaluate(`Object.fromEntries([...document.querySelectorAll("[data-log]")]
    .map((el) => [el.dataset.log, el.getAttribute("aria-keyshortcuts")]))`);

// store writes the reader's settings to storage as another tab would, value a string or an object
// written as JSON, and dispatches the storage event that tab's write sends here.
const store = (page, value) => {
  const json = typeof value === "string" ? value : JSON.stringify(value);
  return page.evaluate(`(() => {
    const oldValue = localStorage.getItem("spike-html-design.keys");
    localStorage.setItem("spike-html-design.keys", ${JSON.stringify(json)});
    dispatchEvent(new StorageEvent("storage", { key: "spike-html-design.keys", oldValue,
      newValue: ${JSON.stringify(json)}, storageArea: localStorage, url: location.href }));
  })()`);
};

// saved resolves to the reader's stored settings, parsed, or null when none are stored.
const saved = (page) => page.evaluate(`JSON.parse(localStorage.getItem("spike-html-design.keys"))`);

// pressAll presses T and ? as mode would have them pressed, then g c, Control+K, and Escape,
// which are as written in every mode.
async function pressAll(page, mode) {
  if (mode === "raw") {
    await press(page, "t");
    await press(page, "?", { code: "Slash", shift: true });
  } else if (mode === "leader") {
    await press(page, "g");
    await press(page, "t");
    await press(page, "g");
    await press(page, "?", { code: "Slash", shift: true });
  } else {
    // Option changes the character on macOS, so Alt matches a letter by event.code.
    await press(page, "†", { code: "KeyT", alt: true });
    await press(page, "?", { code: "Slash", alt: true, shift: true });
  }
  await press(page, "g");
  await press(page, "c");
  await press(page, "k", { ctrl: true });
  await press(page, "Escape", { code: "Escape" });
}

const ALL = ["t", "?", "g c", "Control+k", "Escape"];

// DECLARED is each mode's aria-keyshortcuts for the fixture's buttons.
const DECLARED = {
  raw: { t: "T", "?": "Shift+/", "g c": null, "Control+k": "Control+K", Escape: "Escape" },
  leader: { t: null, "?": null, "g c": null, "Control+k": "Control+K", Escape: "Escape" },
  activator: {
    t: "Alt+T",
    "?": "Alt+Shift+/",
    "g c": null,
    "Control+k": "Control+K",
    Escape: "Escape",
  },
};

describe("keys: modes", () => {
  for (const mode of ["raw", "leader", "activator"]) {
    test(`the page's ${mode} mode: the fixture's bindings fire as ${mode} presses them, and aria-keyshortcuts follows`, async () => {
      const page = await open(`${MODES_FIXTURE}?mode=${mode}`);
      expect(await declared(page)).toEqual(DECLARED[mode]);
      await pressAll(page, mode);
      expect(await log(page)).toEqual(ALL);
      const fired = await page.evaluate("window.fired");
      expect(fired.map((detail) => detail.mode)).toEqual(ALL.map(() => mode));
      if (mode !== "raw") {
        // The raw presses of the bare bindings do nothing in this mode.
        await press(page, "t");
        await sleep(page, WAIT + 100);
        expect(await log(page)).toEqual(ALL);
      }
    });
  }

  test("the reader's mode overrides the page's, in all three, and raw is a choice too", async () => {
    const page = await open(`${MODES_FIXTURE}?mode=leader`);
    for (const mode of ["activator", "raw", "leader"]) {
      await call(page, `keys.changeSettings({ mode: ${JSON.stringify(mode)} })`);
      expect(await declared(page)).toEqual(DECLARED[mode]);
      await page.evaluate("window.log = []");
      await pressAll(page, mode);
      expect(await log(page)).toEqual(ALL);
    }
    expect(await saved(page)).toEqual({ mode: "leader" });
    // Removing the reader's mode returns to the page's.
    await call(page, `keys.changeSettings({ mode: null })`);
    expect(await saved(page)).toBeNull();
    expect(await call(page, "keys.settings().mode")).toBe("leader");
  });

  test("an invalid data-keys-mode means raw; changing it on <html> rewrites aria-keyshortcuts", async () => {
    const page = await open(`${MODES_FIXTURE}?mode=chords`);
    expect(await call(page, "keys.settings().mode")).toBe("raw");
    expect(await declared(page)).toEqual(DECLARED.raw);
    await page.evaluate(`document.documentElement.dataset.keysMode = "activator"`);
    expect(await declared(page)).toEqual(DECLARED.activator);
    await page.evaluate(`document.documentElement.removeAttribute("data-keys-mode")`);
    expect(await declared(page)).toEqual(DECLARED.raw);
  });

  test("the leader can be g, comma, backslash, or Space", async () => {
    const page = await open(`${MODES_FIXTURE}?mode=leader`);
    const leaders = [
      ["g", "g", "KeyG"],
      [",", ",", "Comma"],
      ["\\", "\\", "Backslash"],
      ["Space", " ", "Space"],
    ];
    for (const [leader, key, code] of leaders) {
      await call(page, `keys.changeSettings({ leader: ${JSON.stringify(leader)} })`);
      await press(page, key, { code });
      await press(page, "t");
    }
    expect(await log(page)).toEqual(["t", "t", "t", "t"]);
    // With the comma leader, g alone no longer leads.
    await call(page, `keys.changeSettings({ leader: "," })`);
    await press(page, "g");
    await press(page, "t");
    await sleep(page, WAIT + 100);
    expect(await log(page)).toEqual(["t", "t", "t", "t"]);
  });

  test("the activator can be Alt, Control, Meta, or Alt+Shift; Alt matches a letter by code", async () => {
    const page = await open(`${MODES_FIXTURE}?mode=activator`);
    const activators = [
      ["Alt", "†", { alt: true }, "Alt+T"],
      ["Control", "t", { ctrl: true }, "Control+T"],
      ["Meta", "t", { meta: true }, "Meta+T"],
      ["Alt+Shift", "ˇ", { alt: true, shift: true }, "Alt+Shift+T"],
    ];
    for (const [activator, key, held, shortcut] of activators) {
      await call(page, `keys.changeSettings({ activator: ${JSON.stringify(activator)} })`);
      expect((await declared(page)).t).toBe(shortcut);
      await press(page, key, { code: "KeyT", ...held });
      // The other activators don't fire it.
      if (activator !== "Alt") await press(page, "†", { code: "KeyT", alt: true });
      if (activator !== "Control") await press(page, "t", { ctrl: true });
    }
    expect(await log(page)).toEqual(["t", "t", "t", "t"]);
    expect((await page.evaluate("window.fired")).map((detail) => detail.keys)).toEqual([
      ["Alt+t"],
      ["Control+t"],
      ["Meta+t"],
      ["Alt+Shift+T"],
    ]);
  });
});

describe("keys: the reader's settings", () => {
  test("the stored wait wins over the store's", async () => {
    const page = await open(MODES_FIXTURE);
    await call(page, `keys.register("w e", "we", () => window.log.push("w e"))`);
    // The store's wait, WAIT, has passed.
    await press(page, "w");
    await sleep(page, WAIT + 250);
    await press(page, "e");
    expect(await log(page)).toEqual([]);
    await call(page, "keys.changeSettings({ wait: 1000 })");
    expect(await call(page, "keys.settings().wait")).toBe(1000);
    await press(page, "w");
    await sleep(page, WAIT + 250);
    await press(page, "e");
    expect(await log(page)).toEqual(["w e"]);
  });

  test("invalid stored values read as defaults, and unparseable JSON as all defaults", async () => {
    const page = await open(`${MODES_FIXTURE}?mode=activator`);
    const defaults = {
      enabled: true,
      mode: "activator",
      leader: "g",
      activator: "Alt",
      wait: WAIT,
    };
    await store(page, {
      enabled: "no",
      mode: "chords",
      leader: "x",
      activator: "Shift",
      wait: 20,
      extra: 1,
    });
    expect(await call(page, "keys.settings()")).toEqual(defaults);
    await store(page, { mode: "leader", wait: 7 });
    expect(await call(page, "keys.settings()")).toEqual({ ...defaults, mode: "leader" });
    for (const value of ["{", "[]", "null", '"leader"']) {
      await store(page, value);
      expect(await call(page, "keys.settings()")).toEqual(defaults);
    }
    // keys still fires as the defaults have it.
    await press(page, "†", { code: "KeyT", alt: true });
    expect(await log(page)).toEqual(["t"]);
  });

  test("changeSettings() stores only changed settings; a default or null removes one", async () => {
    const page = await open(MODES_FIXTURE);
    await call(page, `keys.changeSettings({ leader: ",", wait: 3000 })`);
    expect(await saved(page)).toEqual({ leader: ",", wait: 3000 });
    await call(page, `keys.changeSettings({ leader: "g", enabled: false })`);
    expect(await saved(page)).toEqual({ wait: 3000, enabled: false });
    await call(page, `keys.changeSettings({ wait: null, enabled: true })`);
    expect(await saved(page)).toBeNull();
    // Invalid values already stored are dropped when the reader next changes something.
    await store(page, { leader: "x", mode: "activator" });
    await call(page, `keys.changeSettings({ wait: 5000 })`);
    expect(await saved(page)).toEqual({ mode: "activator", wait: 5000 });
    const thrown = (change) =>
      call(
        page,
        `{ try { keys.changeSettings(${change}); return null; }
           catch (error) { return error.constructor.name; } }`,
      );
    expect(await thrown(`{ leader: "x" }`)).toBe("TypeError");
    expect(await thrown(`{ colour: "red" }`)).toBe("TypeError");
    expect(await saved(page)).toEqual({ mode: "activator", wait: 5000 });
  });

  test("the off switch turns character-key shortcuts off and leaves combinations on", async () => {
    const page = await open(MODES_FIXTURE);
    await call(page, `keys.register("j", "j", () => window.log.push("j"))`);
    await call(page, `keys.register("Alt+j", "Alt+j", () => window.log.push("Alt+j"))`);
    await call(page, "keys.changeSettings({ enabled: false })");
    expect(await declared(page)).toEqual({
      t: null,
      "?": null,
      "g c": null,
      "Control+k": "Control+K",
      Escape: "Escape",
    });
    await pressAll(page, "raw");
    await press(page, "j");
    await press(page, "∆", { code: "KeyJ", alt: true });
    expect(await log(page)).toEqual(["Control+k", "Escape", "Alt+j"]);
    // Leader chords are character keys too; activator combinations stay on.
    await page.evaluate("window.log = []");
    await call(page, `keys.changeSettings({ mode: "leader" })`);
    await pressAll(page, "leader");
    expect(await log(page)).toEqual(["Control+k", "Escape"]);
    await page.evaluate("window.log = []");
    await call(page, `keys.changeSettings({ mode: "activator" })`);
    expect(await declared(page)).toEqual(DECLARED.activator);
    await pressAll(page, "activator");
    expect(await log(page)).toEqual(["t", "?", "Control+k", "Escape"]);
    // Turned back on, they all fire.
    await page.evaluate("window.log = []");
    await call(page, `keys.changeSettings({ enabled: true, mode: null })`);
    await pressAll(page, "raw");
    expect(await log(page)).toEqual(ALL);
  });
});

describe("keys: aria-keyshortcuts", () => {
  test("another tab's change to the settings applies at once, to presses and the attribute", async () => {
    const page = await open(MODES_FIXTURE);
    await store(page, { mode: "activator" });
    expect(await declared(page)).toEqual(DECLARED.activator);
    await pressAll(page, "activator");
    expect(await log(page)).toEqual(ALL);
    await store(page, { enabled: false });
    expect((await declared(page)).t).toBeNull();
    // Storage cleared in another tab: key null.
    await page.evaluate(`(localStorage.clear(),
      dispatchEvent(new StorageEvent("storage", { key: null, storageArea: localStorage })))`);
    expect(await declared(page)).toEqual(DECLARED.raw);
  });

  test("two tabs on one origin: a change in one rewrites the other's attribute", async () => {
    const one = await open(MODES_FIXTURE);
    const two = await open(MODES_FIXTURE);
    await call(one, `keys.changeSettings({ mode: "activator" })`);
    // The other tab's storage event arrives as a task; wait for it.
    await sleep(two, 50);
    expect(await declared(two)).toEqual(DECLARED.activator);
    await press(two, "†", { code: "KeyT", alt: true });
    expect(await log(two)).toEqual(["t"]);
  });

  test("stored settings apply on load", async () => {
    const page = await open(MODES_FIXTURE);
    await page.evaluate(
      `localStorage.setItem("spike-html-design.keys", JSON.stringify({ mode: "activator", activator: "Meta" }))`,
    );
    await page.goto(fixture(MODES_FIXTURE));
    expect((await declared(page)).t).toBe("Meta+T");
  });

  test("follows added elements and data-keys changes, and leaves unbound elements alone", async () => {
    const page = await open(MODES_FIXTURE);
    const shortcut = (id) =>
      page.evaluate(
        `document.getElementById(${JSON.stringify(id)}).getAttribute("aria-keyshortcuts")`,
      );
    await page.evaluate(`(() => {
      const button = document.createElement("button");
      button.id = "added";
      button.dataset.keys = "n";
      document.body.append(button);
    })()`);
    expect(await shortcut("added")).toBe("N");
    await page.evaluate(`document.getElementById("added").dataset.keys = "Alt+n, ?"`);
    expect(await shortcut("added")).toBe("Alt+N Shift+/");
    // A sequence declares nothing; nor does a malformed binding.
    await page.evaluate(`document.getElementById("added").dataset.keys = "n m"`);
    expect(await shortcut("added")).toBeNull();
    await page.evaluate(`document.getElementById("added").dataset.keys = "Control+"`);
    expect(await shortcut("added")).toBeNull();
    // data-keys removed: the attribute keys wrote goes with it.
    await page.evaluate(`document.getElementById("added").dataset.keys = "n"`);
    expect(await shortcut("added")).toBe("N");
    await page.evaluate(`document.getElementById("added").removeAttribute("data-keys")`);
    expect(await shortcut("added")).toBeNull();
    // An element that never carried data-keys keeps its own.
    await call(page, `keys.changeSettings({ mode: "activator" })`);
    expect(await shortcut("unbound")).toBe("Alt+U");
  });
});

// T moved from <theme-menu> to keys in v0.6.0: the preferences fixture binds it with data-keys
// on its Theme button, and the menu keeps T as its own key while open.
describe("keys: T and the theme menu", () => {
  const PREFERENCES = "spike-html-design.preferences";

  // openMenuPage opens the preferences fixture with every keys-fire recorded in window.fired and
  // every storage write counted in window.writes.
  async function openMenuPage() {
    const page = await openPage(fixture("preferences.html"));
    pages.push(page);
    await page.evaluate(`(() => {
      window.fired = [];
      document.addEventListener("keys-fire", (event) => window.fired.push(event.detail));
      window.writes = 0;
      const setItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (...args) { window.writes++; return setItem.apply(this, args); };
    })()`);
    return page;
  }

  // menuOpen resolves to whether the menu is open once open settles at it, or after 2 s.
  const menuOpen = (page, open) =>
    page.evaluate(`new Promise((resolve) => {
      const end = performance.now() + 2000;
      const poll = () => {
        const now = document.querySelector("theme-menu").hasAttribute("data-open");
        if (now === ${open} || performance.now() > end) resolve(now);
        else setTimeout(poll, 10);
      };
      poll();
    })`);

  test("T, or t with caps lock, opens the menu through keys, which declares it", async () => {
    for (const key of ["t", "T"]) {
      const page = await openMenuPage();
      expect(
        await page.evaluate(
          `document.querySelector("button[commandfor=theme]").getAttribute("aria-keyshortcuts")`,
        ),
      ).toBe("T");
      await press(page, key);
      expect(await menuOpen(page, true)).toBe(true);
      expect(await page.evaluate("window.fired")).toEqual([
        { binding: "t", keys: ["t"], mode: "raw" },
      ]);
    }
  });

  test("T with a modifier, or in a field, opens nothing", async () => {
    const page = await openMenuPage();
    for (const held of ["ctrl", "alt", "meta", "shift"]) await press(page, "t", { [held]: true });
    for (const selector of ["input", "textarea", "select", "[contenteditable]"]) {
      await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
      await press(page, "t");
    }
    await sleep(page, 100);
    expect(await menuOpen(page, true)).toBe(false);
    expect(await page.evaluate("window.fired")).toEqual([]);
  });

  test("T while the menu is open saves once and closes it, and keys never sees it", async () => {
    const page = await openMenuPage();
    await press(page, "t");
    expect(await menuOpen(page, true)).toBe(true);
    await press(page, "l");
    await press(page, "t");
    expect(await menuOpen(page, false)).toBe(false);
    await sleep(page, 100);
    expect(await page.evaluate("window.writes")).toBe(1);
    expect(await page.evaluate(`JSON.parse(localStorage.getItem("${PREFERENCES}")).color`)).toBe(
      "primer",
    );
    // The one keys-fire is the press that opened the menu: the menu stops its T at the dialog.
    expect(await page.evaluate("window.fired.length")).toBe(1);
    expect(await page.evaluate(`document.querySelector("theme-menu dialog")`)).toBeNull();
  });

  test("in leader mode g t opens the menu, and the menu's own T saves it", async () => {
    const page = await openMenuPage();
    await call(page, `keys.changeSettings({ mode: "leader" })`);
    await page.evaluate("window.writes = 0");
    await press(page, "t");
    await sleep(page, 100);
    expect(await menuOpen(page, true)).toBe(false);
    await press(page, "g");
    await press(page, "t");
    expect(await menuOpen(page, true)).toBe(true);
    await press(page, "t");
    expect(await menuOpen(page, false)).toBe(false);
    expect(await page.evaluate("window.writes")).toBe(1);
  });
});
