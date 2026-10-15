import { afterAll, afterEach, describe, expect, test } from "bun:test";
import { dirname, join } from "node:path";
import { fileUrl, openPage, serve } from "./harness.js";

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

// sleep resolves after ms, as measured in the page.
const sleep = (page, ms) => page.evaluate(`new Promise((resolve) => setTimeout(resolve, ${ms}))`);

// call runs body with the keys module the page loaded, as keys, and resolves to its result.
const call = (page, body) =>
  page.evaluate(`import(${JSON.stringify(KEYS)}).then((keys) => ${body})`);

// filled resolves once the help dialog is open and filled, or rejects after 2 s.
const filled = (page) =>
  page.evaluate(`new Promise((resolve, reject) => {
    const end = performance.now() + 2000;
    const poll = () => {
      const dialog = document.getElementById("help");
      if (dialog.open && dialog.querySelector("[data-keys-list] [data-keys-table]")) resolve(true);
      else if (performance.now() > end) reject(new Error("help: not filled"));
      else setTimeout(poll, 10);
    };
    poll();
  })`);

// rows resolves to the help table's rows: each [keys, action], keys drawn with each kbd as
// [name] and an off row ending " off", action the row button's text.
const rows = (page) =>
  page.evaluate(`[...document.querySelectorAll("#help [data-keys-table] tbody tr")].map((row) => {
    const [keys, action] = row.cells;
    const drawn = [...keys.childNodes].map((node) =>
      node.localName === "kbd" ? "[" + node.textContent + "]" : node.textContent).join("");
    return [drawn, action.querySelector("button").textContent];
  })`);

describe("keys: element bindings", () => {
  test("T clicks its button, running the invoker command, and marks the press handled", async () => {
    const page = await open();
    await page.evaluate(`document.addEventListener("keydown", (event) => {
      window.handled = event.defaultPrevented;
    })`);
    await press(page, "t");
    expect(await log(page)).toEqual(["command --theme"]);
    expect(await page.evaluate("window.handled")).toBe(true);
    expect(await page.evaluate("window.fired")).toEqual([{ binding: "t", keys: ["t"] }]);
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
      { binding: "q", keys: ["q"], label: "one" },
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

// SETTINGS_FIXTURE is the settings fixture: a key, a symbol, a chord, two combinations, and a
// named key, each pressed as written.
const SETTINGS_FIXTURE = "keys-settings.html";

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

// pressAll presses each of the fixture's bindings as written: T, ?, g c, Alt+T (Option changes
// the character on macOS, so Alt matches a letter by event.code), Control+K, and Escape.
async function pressAll(page) {
  await press(page, "t");
  await press(page, "?", { code: "Slash", shift: true });
  await press(page, "g");
  await press(page, "c");
  await press(page, "†", { code: "KeyT", alt: true });
  await press(page, "k", { ctrl: true });
  await press(page, "Escape", { code: "Escape" });
}

const ALL = ["t", "?", "g c", "Alt+t", "Control+k", "Escape"];

// DECLARED is the fixture's aria-keyshortcuts with the off switch on.
const DECLARED = {
  t: "T",
  "?": "Shift+/",
  "g c": null,
  "Alt+t": "Alt+T",
  "Control+k": "Control+K",
  Escape: "Escape",
};

// OFF is the fixture's aria-keyshortcuts with the off switch off: character keys declare nothing.
const OFF = { ...DECLARED, t: null, "?": null };

describe("keys: bindings as written", () => {
  test("a key, a symbol, a written chord, written combinations, and a named key all fire", async () => {
    const page = await open(SETTINGS_FIXTURE);
    expect(await declared(page)).toEqual(DECLARED);
    await pressAll(page);
    expect(await log(page)).toEqual(ALL);
    expect((await page.evaluate("window.fired")).map(({ keys }) => keys)).toEqual([
      ["t"],
      ["?"],
      ["g", "c"],
      ["Alt+t"],
      ["Control+k"],
      ["Escape"],
    ]);
    // Modifiers are exact: k without Control, and Alt+Shift+T, fire nothing.
    await page.evaluate("window.log = []");
    await press(page, "k");
    await press(page, "†", { code: "KeyT", alt: true, shift: true });
    expect(await log(page)).toEqual([]);
  });
});

describe("keys: the reader's settings", () => {
  test("settings() is { enabled, wait }, the wait the store's by default", async () => {
    const page = await open(SETTINGS_FIXTURE);
    expect(await call(page, "keys.settings()")).toEqual({ enabled: true, wait: WAIT });
  });

  test("the stored wait wins over the store's", async () => {
    const page = await open(SETTINGS_FIXTURE);
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

  test("invalid or unknown stored values read as defaults, and unparseable JSON as all defaults", async () => {
    const page = await open(SETTINGS_FIXTURE);
    const defaults = { enabled: true, wait: WAIT };
    // An earlier build's mode, leader, and activator are ignored.
    await store(page, { enabled: "no", mode: "leader", leader: ",", activator: "Meta", wait: 20 });
    expect(await call(page, "keys.settings()")).toEqual(defaults);
    await store(page, { mode: "activator", wait: 3000 });
    expect(await call(page, "keys.settings()")).toEqual({ ...defaults, wait: 3000 });
    for (const value of ["{", "[]", "null", '"leader"']) {
      await store(page, value);
      expect(await call(page, "keys.settings()")).toEqual(defaults);
    }
    // keys still fires as written.
    await press(page, "t");
    expect(await log(page)).toEqual(["t"]);
  });

  test("changeSettings() stores only changed settings; a default or null removes one", async () => {
    const page = await open(SETTINGS_FIXTURE);
    await call(page, `keys.changeSettings({ wait: 3000 })`);
    expect(await saved(page)).toEqual({ wait: 3000 });
    await call(page, `keys.changeSettings({ enabled: false })`);
    expect(await saved(page)).toEqual({ wait: 3000, enabled: false });
    await call(page, `keys.changeSettings({ wait: null, enabled: true })`);
    expect(await saved(page)).toBeNull();
    // Invalid values and stale mode keys already stored are dropped on the next change.
    await store(page, { enabled: 1, mode: "activator", leader: "g", activator: "Alt" });
    await call(page, `keys.changeSettings({ wait: 5000 })`);
    expect(await saved(page)).toEqual({ wait: 5000 });
    const thrown = (change) =>
      call(
        page,
        `{ try { keys.changeSettings(${change}); return null; }
           catch (error) { return error.constructor.name; } }`,
      );
    for (const change of [
      `{ mode: "leader" }`,
      `{ leader: "g" }`,
      `{ activator: "Alt" }`,
      `{ wait: 20 }`,
      `{ colour: "red" }`,
    ]) {
      expect([change, await thrown(change)]).toEqual([change, "TypeError"]);
    }
    expect(await saved(page)).toEqual({ wait: 5000 });
  });

  test("the off switch turns off keys and chords of characters and leaves combinations on", async () => {
    const page = await open(SETTINGS_FIXTURE);
    await call(page, `keys.register("j", "j", () => window.log.push("j"))`);
    await call(page, `keys.register("Alt+j", "Alt+j", () => window.log.push("Alt+j"))`);
    await call(page, "keys.changeSettings({ enabled: false })");
    expect(await declared(page)).toEqual(OFF);
    await pressAll(page);
    await press(page, "j");
    await press(page, "∆", { code: "KeyJ", alt: true });
    expect(await log(page)).toEqual(["Alt+t", "Control+k", "Escape", "Alt+j"]);
    // Turned back on, they all fire.
    await page.evaluate("window.log = []");
    await call(page, "keys.changeSettings({ enabled: true })");
    expect(await declared(page)).toEqual(DECLARED);
    await pressAll(page);
    expect(await log(page)).toEqual(ALL);
  });
});

describe("keys: aria-keyshortcuts", () => {
  test("another tab's change to the settings applies at once, to presses and the attribute", async () => {
    const page = await open(SETTINGS_FIXTURE);
    await store(page, { enabled: false });
    expect(await declared(page)).toEqual(OFF);
    await pressAll(page);
    expect(await log(page)).toEqual(["Alt+t", "Control+k", "Escape"]);
    // Storage cleared in another tab: key null.
    await page.evaluate(`(localStorage.clear(),
      dispatchEvent(new StorageEvent("storage", { key: null, storageArea: localStorage })))`);
    expect(await declared(page)).toEqual(DECLARED);
  });

  test("two tabs on one origin: a change in one rewrites the other's attribute", async () => {
    const one = await open(SETTINGS_FIXTURE);
    const two = await open(SETTINGS_FIXTURE);
    await call(one, `keys.changeSettings({ enabled: false })`);
    // The other tab's storage event arrives as a task; wait for it.
    await sleep(two, 50);
    expect(await declared(two)).toEqual(OFF);
    await press(two, "t");
    await press(two, "k", { ctrl: true });
    expect(await log(two)).toEqual(["Control+k"]);
  });

  test("stored settings apply on load", async () => {
    const page = await open(SETTINGS_FIXTURE);
    await page.evaluate(
      `localStorage.setItem("spike-html-design.keys", JSON.stringify({ enabled: false }))`,
    );
    await page.goto(fixture(SETTINGS_FIXTURE));
    expect(await declared(page)).toEqual(OFF);
  });

  test("follows added elements and data-keys changes, and leaves unbound elements alone", async () => {
    const page = await open(SETTINGS_FIXTURE);
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
    await call(page, `keys.changeSettings({ enabled: false })`);
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
      expect(await page.evaluate("window.fired")).toEqual([{ binding: "t", keys: ["t"] }]);
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

  test("holding T opens the menu and its repeats save nothing; a repeated Escape cancels nothing", async () => {
    const page = await openMenuPage();
    await press(page, "t");
    expect(await menuOpen(page, true)).toBe(true);
    for (const key of ["t", "T", "Escape"]) await press(page, key, { code: key, repeat: true });
    await sleep(page, 100);
    expect(await menuOpen(page, false)).toBe(true);
    expect(await page.evaluate("window.writes")).toBe(0);
    // A held move key still repeats, as a native arrow does.
    const section = () =>
      page.evaluate(`document.activeElement.closest("fieldset").dataset.section`);
    expect(await section()).toBe("color");
    await press(page, "j", { repeat: true });
    expect(await section()).toBe("scheme");
    // Released and pressed again, T saves.
    await press(page, "t");
    expect(await menuOpen(page, false)).toBe(false);
    expect(await page.evaluate("window.writes")).toBe(1);
  });
});

// The help dialog: keys-help.js, which keys loads the first time a dialog holding
// [data-keys-list] opens, fills it with the page's bindings, the reader's settings, and the
// screen-reader note.
describe("keys: the help dialog", () => {
  const HELP = "keys-help.html";

  // fetchedHelp resolves to whether the page has fetched keys-help.js.
  const fetchedHelp = (page) =>
    page.evaluate(`performance.getEntriesByType("resource")
      .some(({ name }) => name.endsWith("/modules/keys-help.js"))`);

  // openHelp opens the dialog from its Help button, a show-modal invoker, and waits for it.
  async function openHelp(page) {
    await page.evaluate(`document.querySelector("button[command=show-modal]").click()`);
    await filled(page);
  }

  // closeHelp closes the dialog from script.
  const closeHelp = (page) => page.evaluate(`document.getElementById("help").close()`);

  // choose sets one of the dialog's settings controls, as the reader would, and fires change.
  const choose = (page, name, value) =>
    page.evaluate(`(() => {
      const control = document.querySelector("#help [data-keys-settings] [name=${name}]");
      if (control.type === "checkbox") control.checked = ${JSON.stringify(value)};
      else control.value = ${JSON.stringify(String(value))};
      control.dispatchEvent(new Event("change", { bubbles: true }));
    })()`);

  // ROWS is the fixture's rows, with j registered after the elements.
  const ROWS = [
    ["[?]", "Help"],
    ["[T]", "Theme"],
    ["[A]", "Archive the thread"],
    ["[F]", "First"],
    ["[G] then [C]", "Contents"],
    ["[Control]+[K]", "Command"],
    ["[/]", "Search"],
    ["[J]", "Next section"],
  ];

  // registerJ registers j, and a second f the first element's f shadows.
  const registerJ = (page) =>
    call(
      page,
      `(keys.register("j", "Next section", (event) => window.log.push("j " + JSON.stringify(event.detail))),
        keys.register("f", "Shadowed f", () => window.log.push("f registered")))`,
    );

  test("keys-help.js loads on the first open by the show-modal button, not before", async () => {
    const page = await open(HELP);
    await sleep(page, 100);
    expect(await fetchedHelp(page)).toBe(false);
    expect(
      await page.evaluate(`document.querySelector("[data-keys-list]").childElementCount`),
    ).toBe(0);
    await openHelp(page);
    expect(await fetchedHelp(page)).toBe(true);
    expect(await page.evaluate(`document.getElementById("help").matches(":modal")`)).toBe(true);
    expect(await rows(page)).toEqual(ROWS.slice(0, -1));
  });

  test("showModal() from script, or the ? key, opens and fills it too", async () => {
    const page = await open(HELP);
    await page.evaluate(`document.getElementById("help").showModal()`);
    await filled(page);
    expect(await fetchedHelp(page)).toBe(true);
    // Its own Close carries ? inside the modal.
    await press(page, "?", { code: "Slash", shift: true });
    expect(await page.evaluate(`document.getElementById("help").open`)).toBe(false);
    await page.evaluate(`document.querySelector("[data-keys-list]").replaceChildren()`);
    await press(page, "?", { code: "Slash", shift: true });
    await filled(page);
    expect(await rows(page)).toEqual(ROWS.slice(0, -1));
  });

  test("lists each active binding once, as the one that fires, with its label by the rule", async () => {
    const page = await open(HELP);
    await registerJ(page);
    await openHelp(page);
    // Second F and the registered f lose to First; Disabled, Inert, Hidden, and the dialog's own
    // Close are left out; A's label is its aria-label, Search's its <label>'s text.
    expect(await rows(page)).toEqual(ROWS);
    // Each open lists the page as it is then.
    await closeHelp(page);
    await page.evaluate(`(document.querySelector("[data-keys=d]").disabled = false,
      document.querySelector("[data-log='f first']").remove())`);
    await openHelp(page);
    const listed = await rows(page);
    expect(listed).toContainEqual(["[D]", "Disabled"]);
    expect(listed).toContainEqual(["[F]", "Second"]);
  });

  test("a row button closes the dialog and runs its binding: click, focus, or the handler", async () => {
    const page = await open(HELP);
    await registerJ(page);
    const runRow = async (action) => {
      await openHelp(page);
      await page.evaluate(`[...document.querySelectorAll("#help [data-keys-table] button")]
        .find((button) => button.textContent === ${JSON.stringify(action)}).click()`);
      expect(await page.evaluate(`document.getElementById("help").open`)).toBe(false);
    };
    await runRow("Theme");
    await runRow("Next section");
    expect(await log(page)).toEqual([
      "t",
      `j ${JSON.stringify({ binding: "j", keys: [], label: "Next section" })}`,
    ]);
    // Running a row is no key press: keys-fire is not dispatched.
    expect(await page.evaluate("window.fired")).toEqual([]);
    await runRow("Search");
    expect(await page.evaluate("document.activeElement.id")).toBe("search");
  });

  test("the settings are stored through changeSettings and change what fires", async () => {
    const page = await open(HELP);
    await openHelp(page);
    const shown = await page.evaluate(`(() => {
      const fieldset = document.querySelector("#help [data-keys-settings]");
      return {
        legend: fieldset.querySelector("legend").textContent,
        controls: [...fieldset.querySelectorAll("input, select")].map((el) =>
          [el.name, el.type === "checkbox" ? el.checked : el.value,
           el.type === "checkbox" ? null : [...el.options].map((o) => o.value)]),
      };
    })()`);
    expect(shown).toEqual({
      legend: "Settings",
      controls: [
        ["enabled", true, null],
        // The tests' store wait, WAIT, is listed first, as the page's own.
        ["wait", "", ["", "1000", "1500", "3000", "5000"]],
      ],
    });
    await choose(page, "wait", 3000);
    expect(await saved(page)).toEqual({ wait: 3000 });
    expect(await call(page, "keys.settings()")).toEqual({ enabled: true, wait: 3000 });
    // The page's own wait, the empty first option, removes the reader's from storage.
    await choose(page, "wait", "");
    expect(await saved(page)).toBeNull();
    await choose(page, "enabled", false);
    expect(await saved(page)).toEqual({ enabled: false });
    await closeHelp(page);
    await press(page, "t");
    await press(page, "k", { ctrl: true });
    expect(await log(page)).toEqual(["Control+k"]);
  });

  test("the off switch marks character-key rows off while combinations still fire", async () => {
    const page = await open(HELP);
    await openHelp(page);
    await choose(page, "enabled", false);
    expect(await saved(page)).toEqual({ enabled: false });
    const offs =
      await page.evaluate(`[...document.querySelectorAll("#help [data-keys-table] tbody tr")]
      .map((row) => [row.cells[1].textContent, row.hasAttribute("data-keys-off")])`);
    expect(offs).toEqual([
      ["Help", true],
      ["Theme", true],
      ["Archive the thread", true],
      ["First", true],
      ["Contents", true],
      ["Command", false],
      ["Search", true],
    ]);
    expect((await rows(page))[1]).toEqual(["[T] off", "Theme"]);
    // An off row's button still runs its action: a click is no character-key shortcut.
    await page.evaluate(`[...document.querySelectorAll("#help [data-keys-table] button")]
      .find((button) => button.textContent === "Theme").click()`);
    expect(await log(page)).toEqual(["t"]);
    await press(page, "t");
    await press(page, "g");
    await press(page, "c");
    await press(page, "k", { ctrl: true });
    expect(await log(page)).toEqual(["t", "Control+k"]);
  });

  test("carries the screen-reader note", async () => {
    const page = await open(HELP);
    await openHelp(page);
    const note = await page.evaluate(
      `document.querySelector("#help [data-keys-note]").textContent`,
    );
    for (const text of ["NVDA+F2", "JAWS+3", "Narrator+3", "VO+Tab"]) expect(note).toContain(text);
    expect(note).not.toContain("activator");
  });

  test("another tab's change shows in the dialog on the next open, and changes what fires", async () => {
    const one = await open(HELP);
    const two = await open(HELP);
    await openHelp(two);
    await closeHelp(two);
    await openHelp(one);
    await choose(one, "wait", 5000);
    await choose(one, "enabled", false);
    await sleep(two, 50);
    await openHelp(two);
    expect((await rows(two))[1]).toEqual(["[T] off", "Theme"]);
    expect(
      await two.evaluate(`[...document.querySelectorAll("#help [data-keys-settings] :is(input, select)")]
        .map((el) => el.type === "checkbox" ? el.checked : el.value)`),
    ).toEqual([false, "5000"]);
    await closeHelp(two);
    await press(two, "t");
    await press(two, "k", { ctrl: true });
    expect(await log(two)).toEqual(["Control+k"]);
  });
});

// Behavior 14, the specimen: served, it loads keys, its header's Help button and ? open the help
// dialog, and specimen.js registers j and k, which move focus through the sections with an id,
// and g, which goes to the top.
describe("keys: the specimen", () => {
  // DESKTOP is a viewport tall enough to show several sections, short enough that the page
  // scrolls through every one the tests reach.
  const DESKTOP = { width: 1280, height: 900 };

  // openSpecimen opens the served specimen with the wait set to WAIT, and resolves once
  // specimen.js has registered its three bindings.
  async function openSpecimen() {
    const page = await openPage(`${server.url}index.html`, { viewport: DESKTOP });
    pages.push(page);
    await page.evaluate(`new Promise((resolve, reject) => {
      const end = performance.now() + 2000;
      const poll = () => {
        const store = globalThis[Symbol.for("spike-html-design.keys")];
        if (store?.registered.length === 3) {
          store.wait = ${WAIT};
          resolve(true);
        } else if (performance.now() > end) reject(new Error("specimen: no bindings"));
        else setTimeout(poll, 10);
      };
      poll();
    })`);
    return page;
  }

  // focused resolves to where focus is: the focused element's id, else its tag name, whether
  // it shows the elements layer's focus outline, and whether it opens the view, its top a scroll
  // margin below the viewport's top edge.
  const focused = (page) =>
    page.evaluate(`(() => {
      const el = document.activeElement;
      const style = getComputedStyle(el);
      const margin = parseFloat(style.scrollMarginBlockStart) || 0;
      return {
        at: el.id || el.localName,
        outlined: el.matches(":focus-visible") && style.outlineStyle === "solid",
        top: Math.abs(el.getBoundingClientRect().top - margin) < 2,
      };
    })()`);

  // at resolves to the focused element's id, else its tag name.
  const at = (page) => focused(page).then(({ at }) => at);

  const helpOpen = (page) => page.evaluate(`document.getElementById("help").open`);
  const question = (page) => press(page, "?", { code: "Slash", shift: true });

  test("its Help button carries ? and opens the help dialog by show-modal", async () => {
    const page = await openSpecimen();
    expect(
      await page.evaluate(`(() => {
        const help = document.querySelector("body > header > button + button");
        const close = document.querySelector("#help button[command=close]");
        return {
          help: [help.textContent.replace(/\\s+/g, " ").trim(), help.getAttribute("data-keys"),
            help.getAttribute("aria-keyshortcuts"), help.getAttribute("command"),
            help.getAttribute("commandfor")],
          close: [close.getAttribute("data-keys"), close.getAttribute("commandfor")],
          sections: document.querySelectorAll("section[id]").length,
          focusable: [...document.querySelectorAll("section[id]")].every((s) => s.tabIndex === -1),
        };
      })()`),
    ).toEqual({
      help: ["Help ?", "?", "Shift+/", "show-modal", "help"],
      close: ["?", "help"],
      sections: 19,
      focusable: true,
    });
    await page.evaluate(`document.querySelector("body > header > button + button").click()`);
    await filled(page);
    expect(await page.evaluate(`document.getElementById("help").matches(":modal")`)).toBe(true);
  });

  test("? opens the help dialog listing T, ?, j, k, and g; ? on Close closes it, and so does Escape", async () => {
    const page = await openSpecimen();
    await question(page);
    await filled(page);
    expect(await rows(page)).toEqual([
      ["[T]", "Theme"],
      ["[?]", "Help"],
      ["[J]", "Next section"],
      ["[K]", "Previous section"],
      ["[G]", "Top"],
    ]);
    await question(page);
    expect(await helpOpen(page)).toBe(false);
    await question(page);
    await filled(page);
    await press(page, "Escape", { code: "Escape", keyCode: 27 });
    expect(await helpOpen(page)).toBe(false);
  });

  test("j and k move focus through the sections in document order, each shown with its outline", async () => {
    const page = await openSpecimen();
    // From the top, with focus on the page, j reaches the first section.
    await press(page, "j");
    expect(await focused(page)).toEqual({ at: "tokens", outlined: true, top: true });
    // Nested sections count in document order.
    const order = ["color", "space", "type", "elements", "prose"];
    for (const id of order) {
      await press(page, "j");
      expect(await focused(page)).toEqual({ at: id, outlined: true, top: true });
    }
    await press(page, "k");
    expect(await focused(page)).toEqual({ at: "elements", outlined: true, top: true });
    await press(page, "k");
    expect(await at(page)).toBe("type");
  });

  test("with focus outside every section, j and k step from the scroll position", async () => {
    const page = await openSpecimen();
    // #prose opens the view, the page focused: j goes past it to #text, k back to #elements,
    // the last section starting above the view.
    await page.evaluate(`document.getElementById("prose").scrollIntoView({ block: "start" })`);
    await press(page, "j");
    expect(await at(page)).toBe("text");
    await page.evaluate(`document.activeElement.blur()`);
    await page.evaluate(`document.getElementById("prose").scrollIntoView({ block: "start" })`);
    await press(page, "k");
    expect(await at(page)).toBe("elements");
    // At the first section, k goes nowhere further back.
    await page.evaluate(`document.getElementById("tokens").focus()`);
    await press(page, "k");
    expect(await at(page)).toBe("tokens");
  });

  test("g goes to the top: the title takes focus and the page scrolls to its start", async () => {
    const page = await openSpecimen();
    for (const _ of [1, 2, 3, 4, 5]) await press(page, "j");
    expect(await page.evaluate("scrollY")).toBeGreaterThan(0);
    await press(page, "g");
    expect(await at(page)).toBe("h1");
    expect(await page.evaluate("scrollY")).toBe(0);
  });

  test("from file://, it has no keys, and its help dialog says why it lists nothing", async () => {
    // Chromium runs no relative module script from file://, so neither keys nor specimen.js
    // runs: j moves nothing and ? opens nothing. The Help button's show-modal is native, so it
    // still opens the dialog, which keeps its markup's explanation.
    const page = await openPage(fileUrl(join(root, "index.html")), { viewport: DESKTOP });
    pages.push(page);
    await press(page, "j");
    await question(page);
    expect({ at: await at(page), open: await helpOpen(page) }).toEqual({ at: "body", open: false });
    await page.evaluate(`document.querySelector("body > header > button + button").click()`);
    expect(await helpOpen(page)).toBe(true);
    expect(
      await page.evaluate(`document.querySelector("#help [data-keys-list]").textContent.trim()`),
    ).toContain("opened as a file");
  });
});

// A package consumer: keys-consumer.html imports the runtime and the grammar by the package's
// name and their export keys, through an import map naming each key's file, as a consumer
// resolving the exports map would, and its help dialog loads the module ./keys/help names.
describe("keys: a package consumer", () => {
  const CONSUMER = "keys-consumer.html";
  const EXPORTS = ["./keys", "./keys/grammar", "./keys/help"];

  test("its import map names each keys export's file, as package.json maps it", async () => {
    const pkg = await Bun.file(join(root, "package.json")).json();
    const page = await open(CONSUMER);
    const map = await page.evaluate(
      `JSON.parse(document.querySelector("script[type=importmap]").textContent).imports`,
    );
    expect(map).toEqual(
      Object.fromEntries(
        EXPORTS.map((key) => [`${pkg.name}/${key.slice(2)}`, `../../${pkg.exports[key].slice(2)}`]),
      ),
    );
  });

  test("its bindings fire, by element and by register(), and the grammar formats", async () => {
    const page = await open(CONSUMER);
    await press(page, "t");
    await press(page, "j");
    expect(await log(page)).toEqual(["t", "j"]);
    expect(await page.evaluate("window.formatted")).toBe("Alt+T");
    expect(
      await page.evaluate(
        `document.querySelector("[data-log=t]").getAttribute("aria-keyshortcuts")`,
      ),
    ).toBe("T");
  });

  test("? opens the help dialog, filled by the module ./keys/help names", async () => {
    const page = await open(CONSUMER);
    await press(page, "?", { code: "Slash", shift: true });
    const rows = await page.evaluate(`new Promise((resolve, reject) => {
      const end = performance.now() + 2000;
      const poll = () => {
        const rows = document.querySelectorAll("#help [data-keys-table] tbody tr");
        if (document.getElementById("help").open && rows.length > 0) {
          resolve([...rows].map((row) => row.cells[1].querySelector("button").textContent));
        } else if (performance.now() > end) reject(new Error("help: not filled"));
        else setTimeout(poll, 10);
      };
      poll();
    })`);
    expect(rows).toEqual(["Help", "Theme", "Next section"]);
    // The help module keys loaded is the file the import map resolves ./keys/help to, one
    // module, so a consumer importing ./keys/help shares it.
    const help = await page.evaluate(`(async () => {
      const url = new URL("../../modules/keys-help.js", location).href;
      const fetched = performance.getEntriesByType("resource").map(({ name }) => name);
      const module = await import("spike-html-design/keys/help");
      return { fetched: fetched.filter((name) => name === url).length, fill: typeof module.fill };
    })()`);
    expect(help).toEqual({ fetched: 1, fill: "function" });
  });
});
