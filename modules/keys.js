// keys: the page's keyboard shortcuts. It binds none itself: a page binds an element by giving it
// data-keys, and a script binds a handler with register(). The grammar is keys-grammar.js's.
//
// A page loads it as a plain module script, not render-blocking, since no shortcut is pressed
// before first paint:
//
//   <script type="module" src=".../keys.js"></script>
//
// An element carrying data-keys is a binding: when its keys are pressed, keys clicks it, so its
// native action or invoker command runs, or focuses it when it is a field (input, textarea,
// select, or contenteditable). keys reads the page at each press, so adding or removing an
// element or its attribute adds or removes its binding. A malformed data-keys binds nothing and
// logs one console warning per element and value.
//
// A press matches by keys-grammar's matches(). keys is silent while the press's target is a field,
// even for a combination; while an input method composes (isComposing, or keyCode 229); on the
// keys "Dead" and "Process"; with AltGraph held; on a repeat; on an event already handled
// (defaultPrevented); and on a modifier pressed alone, so holding Shift neither starts nor ends
// a sequence. A press keys acts on, or that starts or continues a sequence, is marked handled.
//
// Sequences: each press must follow the last within the wait, 1500 ms by default. A press that
// doesn't continue the sequence in progress ends it and is dropped, not tried as a new start.
// When one binding is a prefix of another ("g" and "g c"), keys waits for the next press: one
// that continues runs the longer, and when the wait ends the shorter runs. A press that drops
// the sequence runs neither.
//
// Scope: while a modal dialog is open, only element bindings inside it are active and register()
// bindings pause. Otherwise an element binding is active unless it is disabled, inside [inert],
// or not visible. When two active bindings share keys, the first wins: elements in document
// order, then register() bindings in registration order.
//
// The store is one per page, a plain object at a well-known global key,
// globalThis[Symbol.for("spike-html-design.keys")]. Every copy of this module shares it,
// whatever URL or tag it was loaded from, and the copy that loads first installs the one
// document keydown listener, so a key never fires twice. The store's shape is public API, frozen
// with v0.6.0:
//
//   {
//     registered: { keys, label, handler }[],  register()'s bindings, in registration order:
//                                              keys as written, label a string, and handler.
//     wait: number,                            the package's sequence wait in ms, 1500, read at
//                                              each press; the reader's stored wait wins over it.
//     listening: boolean,                      whether a copy has installed the listener.
//   }
//
// A copy that finds a store already there uses it as it is.
//
// Modes: a bare binding (keys-grammar's isBare, one character press with no modifier but Shift)
// is pressed as written in raw mode, after the leader in leader mode ("t" as "g t"), and with
// the activator held in activator mode ("t" as "Alt+t"). A binding that spells out a sequence or
// a combination is used as written in every mode. A page sets its default mode with
// data-keys-mode="raw|leader|activator" on <html>, any other value meaning raw; a mode the reader
// chose overrides it.
//
// The reader's settings are stored per origin as JSON under localStorage key
// "spike-html-design.keys", holding only the settings the reader changed:
//
//   {
//     enabled?: boolean,                       the off switch; true, the default, is on.
//     mode?: "raw" | "leader" | "activator",   the reader's mode, over the page's.
//     leader?: "g" | "," | "\\" | "Space",      the leader, "g" by default.
//     activator?: "Alt" | "Control" | "Meta" | "Alt+Shift",
//                                              the activator, "Alt" (Option) by default.
//     wait?: 1000 | 1500 | 3000 | 5000,        the sequence wait in ms, over the store's.
//   }
//
// An unknown or invalid value reads as its default, and unparseable JSON, or storage that
// throws, as all defaults. keys reads them at each press, so another tab's change applies at
// once. With the off switch off (enabled false), a binding whose presses are all character keys
// with no Control, Alt, or Meta, as raw bare keys and leader chords are, doesn't fire, while a
// combination with Control, Alt, or Meta still does (WCAG 2.1.4).
//
// aria-keyshortcuts: keys owns the attribute on every element carrying data-keys and writes it
// from the binding in effect, its single-press alternatives as keys-grammar's keyshortcuts()
// declares them ("T", "Alt+T", "Shift+/"). A sequence, as a bare key is in leader mode, declares
// nothing, nor does an alternative the off switch covers, and the attribute is removed when
// nothing is left, or when an element's data-keys is removed. keys rewrites it on load, when
// another tab changes the settings (a storage event), when this page changes them through
// changeSettings(), and when an element's data-keys or <html>'s data-keys-mode changes or an
// element is added. It touches no element that never carried data-keys.
//
// The extension events, their names and details public API frozen with v0.6.0:
//
//   keys-fire       cancelable and bubbling, on the bound element, or on document for a
//                   register() binding, before keys acts. Cancelling it stops the action.
//                   detail: { binding, keys, mode, label? }: binding the binding's normal string
//                   (all its alternatives), keys the presses that fired it, each a normal string
//                   ("g", "c"), mode the mode it fired in, and label a register() binding's label.
//   keys-sequence   on document, as a sequence starts (its first press leaves a longer binding
//                   pending), continues (a press keeps it pending), and ends.
//                   detail: { state, presses, reason? }: state "start", "continue", or "end";
//                   presses the presses so far, each a normal string; reason, on end, "fired"
//                   (a binding ran, or its keys-fire was cancelled), "timeout" (the wait ended
//                   with nothing complete), or "dropped" (a press didn't continue it; presses
//                   leaves that press out). A press that fires a binding at once is no sequence
//                   and dispatches none.
//
// The exports:
//
//   register(keys, label, handler)  binds keys to handler, with no element, and returns a
//                                   function that removes exactly that binding, even when
//                                   another shares its keys. handler is called with the
//                                   keys-fire event. It throws a TypeError on a malformed keys,
//                                   a label that isn't a string, or a handler that isn't a
//                                   function.
//   settings()                      the settings in effect: { enabled, mode, leader, activator,
//                                   wait }, the reader's where stored and valid, else the
//                                   page's mode and the defaults, the wait the store's.
//   changeSettings(change)          stores the reader's change, an object of some of
//                                   settings()'s names, and returns settings(). A value of null
//                                   removes that setting, and so does a default (enabled true,
//                                   leader "g", activator "Alt", wait the store's); a mode is
//                                   kept as chosen, raw included, since it overrides the page's,
//                                   until null removes it. Nothing left removes the storage key.
//                                   It throws a TypeError on an unknown name or invalid value.
import {
  ACTIVATORS,
  DEFAULTS,
  keyshortcuts,
  LEADERS,
  MODES,
  matches,
  normalize,
  problem,
  stringify,
  wrap,
} from "./keys-grammar.js";

const KEY = Symbol.for("spike-html-design.keys");

globalThis[KEY] ??= { registered: [], wait: 1500, listening: false };
const store = globalThis[KEY];

// mac resolves Mod: Meta on macOS, Control elsewhere.
const mac = /mac|iphone|ipad/i.test(navigator.userAgentData?.platform ?? navigator.platform);

// MODIFIER_KEYS are the event.key values of a modifier pressed alone.
const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta", "AltGraph", "CapsLock", "OS"]);

export function register(keys, label, handler) {
  const reason = problem(keys);
  if (reason) throw new TypeError(`keys: ${reason}`);
  if (typeof label !== "string") throw new TypeError("keys: a binding's label must be a string");
  if (typeof handler !== "function")
    throw new TypeError("keys: a binding's handler must be a function");
  const entry = { keys, label, handler };
  store.registered.push(entry);
  return () => {
    const index = store.registered.indexOf(entry);
    if (index !== -1) store.registered.splice(index, 1);
  };
}

// STORAGE is the localStorage key the reader's settings are stored under, per origin.
const STORAGE = "spike-html-design.keys";

// VALID holds, for each setting, whether a value is one the reader can choose.
const VALID = {
  enabled: (value) => typeof value === "boolean",
  mode: (value) => MODES.includes(value),
  leader: (value) => LEADERS.includes(value),
  activator: (value) => ACTIVATORS.includes(value),
  wait: (value) => [1000, 1500, 3000, 5000].includes(value),
};

// defaults are the settings in effect with none stored; the mode is the page's.
function defaults() {
  const page = document.documentElement.getAttribute("data-keys-mode");
  return {
    enabled: true,
    mode: MODES.includes(page) ? page : DEFAULTS.mode,
    leader: DEFAULTS.leader,
    activator: DEFAULTS.activator,
    wait: store.wait,
  };
}

// stored returns the reader's valid stored settings, {} when storage is empty, unparseable, or
// throws, as it does with site data blocked.
function stored() {
  let saved;
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE));
  } catch {
    return {};
  }
  if (!saved || typeof saved !== "object") return {};
  return Object.fromEntries(
    Object.keys(VALID)
      .filter((name) => VALID[name](saved[name]))
      .map((name) => [name, saved[name]]),
  );
}

export function settings() {
  return { ...defaults(), ...stored() };
}

export function changeSettings(change) {
  const next = stored();
  const fallback = defaults();
  for (const [name, value] of Object.entries(change)) {
    if (!(name in VALID)) throw new TypeError(`keys: "${name}" is not a setting`);
    if (value !== null && !VALID[name](value)) {
      throw new TypeError(`keys: ${JSON.stringify(value)} is not a ${name} the reader can choose`);
    }
    if (value === null || (name !== "mode" && value === fallback[name])) delete next[name];
    else next[name] = value;
  }
  try {
    if (Object.keys(next).length === 0) localStorage.removeItem(STORAGE);
    else localStorage.setItem(STORAGE, JSON.stringify(next));
  } catch {
    // Storage blocked: the change is lost, and the settings stay as they were.
  }
  declare();
  return settings();
}

// isCharacter reports whether press is a character key with no Control, Alt, or Meta: the
// presses the off switch covers. Space counts, so a Space leader's chords are covered.
const isCharacter = (press) =>
  !press.control && !press.alt && !press.meta && [...press.key].length === 1;

// effective returns binding as pressed now under current, settings(), parsed: the one place a
// binding's written form becomes the form keys matches. With the off switch off it leaves out
// the alternatives it covers, so a binding may have none; null when the binding is malformed.
function effective(binding, current) {
  const alternatives = wrap(binding, current.mode, current, { mac });
  if (!alternatives || current.enabled) return alternatives;
  return alternatives.filter((sequence) => !sequence.every(isCharacter));
}

// declare writes aria-keyshortcuts on every element carrying data-keys from the binding in
// effect, and removes it where that declares nothing.
function declare() {
  const current = settings();
  for (const el of document.querySelectorAll("[data-keys]")) {
    const alternatives = effective(el.getAttribute("data-keys"), current);
    const value = alternatives && keyshortcuts(alternatives);
    if (value) {
      if (el.getAttribute("aria-keyshortcuts") !== value) {
        el.setAttribute("aria-keyshortcuts", value);
      }
    } else el.removeAttribute("aria-keyshortcuts");
  }
}

// isField reports whether el types text, so a key pressed in it is text, not a shortcut.
function isField(el) {
  return (
    el instanceof Element &&
    (el.isContentEditable || el.closest("input, textarea, select") !== null)
  );
}

// warned holds each element's malformed data-keys values already warned about.
const warned = new WeakMap();

// elementBinding reads el's data-keys as a binding under current, or warns once and returns null.
function elementBinding(el, current) {
  const keys = el.getAttribute("data-keys");
  const alternatives = effective(keys, current);
  if (alternatives) return { el, keys, alternatives };
  const seen = warned.get(el) ?? new Set();
  if (!seen.has(keys)) {
    console.warn(`keys: data-keys binds nothing: ${problem(keys)}`, el);
    warned.set(el, seen.add(keys));
  }
  return null;
}

// active returns the bindings in effect, in the order the first wins: elements in document
// order, then register()'s in registration order. A modal dialog narrows them to its elements.
function active(current) {
  const modal = document.querySelector(":modal");
  const elements = [...document.querySelectorAll("[data-keys]")]
    .filter((el) => !modal || modal.contains(el))
    .filter((el) => !el.matches(":disabled") && !el.closest("[inert]") && el.checkVisibility())
    .map((el) => elementBinding(el, current))
    .filter(Boolean);
  if (modal) return elements;
  const registered = store.registered.map((entry) => ({
    entry,
    keys: entry.keys,
    alternatives: effective(entry.keys, current),
  }));
  return [...elements, ...registered];
}

// pending is the sequence in progress, null between sequences: its presses, as keydown snapshots
// and as normal strings, the first binding they complete while a longer waits, and the wait's
// timer. It is this copy's, since only the copy that listens reads it.
let pending = null;

// snapshot keeps the fields matches() reads, since an event's are live only while it dispatches.
const snapshot = ({ key, code, shiftKey, altKey, ctrlKey, metaKey }) => ({
  key,
  code,
  shiftKey,
  altKey,
  ctrlKey,
  metaKey,
});

// silent reports whether keys leaves event alone.
function silent(event) {
  return (
    event.defaultPrevented ||
    event.repeat ||
    event.isComposing ||
    event.keyCode === 229 ||
    event.key === "Dead" ||
    event.key === "Process" ||
    MODIFIER_KEYS.has(event.key) ||
    event.getModifierState?.("AltGraph") ||
    isField(event.target)
  );
}

// sequenceEvent dispatches keys-sequence on document.
function sequenceEvent(state, presses, reason) {
  const detail = reason
    ? { state, presses: [...presses], reason }
    : { state, presses: [...presses] };
  document.dispatchEvent(new CustomEvent("keys-sequence", { detail }));
}

// end ends the sequence in progress for reason. A fired sequence ends before its binding acts, so
// an indicator clears before the action, and a handler that throws leaves no sequence behind.
function end(reason) {
  clearTimeout(pending.timer);
  const { strings } = pending;
  pending = null;
  sequenceEvent("end", strings, reason);
}

// fire dispatches keys-fire for a binding's matched sequence, in the mode it matched in, and,
// unless it is cancelled, acts: it clicks or focuses the element, or calls register()'s handler.
function fire({ binding, sequence, mode }) {
  const detail = {
    binding: normalize(binding.keys, { mac }),
    keys: sequence.map(stringify),
    mode,
  };
  if (binding.entry) detail.label = binding.entry.label;
  const target = binding.el ?? document;
  const event = new CustomEvent("keys-fire", { bubbles: true, cancelable: true, detail });
  if (!target.dispatchEvent(event)) return;
  if (binding.entry) binding.entry.handler(event);
  else if (isField(binding.el)) binding.el.focus();
  else binding.el.click();
}

// onkey reads the settings and the bindings in effect and matches the press against them, after
// the presses pending. A complete match with no longer one waiting fires at once; a longer one waiting
// starts or continues the sequence; nothing matching drops the sequence in progress.
function onkey(event) {
  if (silent(event)) return;
  const presses = [...(pending?.presses ?? []), snapshot(event)];
  const n = presses.length;
  const current = settings();
  let complete = null;
  let longer = null;
  for (const binding of active(current)) {
    for (const sequence of binding.alternatives) {
      if (sequence.length < n || !presses.every((press, i) => matches(sequence[i], press))) {
        continue;
      }
      if (sequence.length === n) complete ??= { binding, sequence, mode: current.mode };
      else longer ??= { binding, sequence, mode: current.mode };
    }
  }
  if (!complete && !longer) {
    if (pending) end("dropped");
    return;
  }
  event.preventDefault();
  const strings = (complete ?? longer).sequence.slice(0, n).map(stringify);
  if (!longer) {
    if (pending) {
      pending.strings = strings;
      end("fired");
    }
    fire(complete);
    return;
  }
  const started = !pending;
  if (pending) clearTimeout(pending.timer);
  pending = { presses, strings, complete, timer: 0 };
  pending.timer = setTimeout(() => {
    const held = pending.complete;
    end(held ? "fired" : "timeout");
    if (held) fire(held);
  }, current.wait);
  sequenceEvent(started ? "start" : "continue", strings);
}

// The copy that listens also keeps aria-keyshortcuts current: now, on another tab's change to
// the settings (a storage event, key null when storage is cleared), and on a change to an
// element's data-keys, an element added, or <html>'s data-keys-mode. An element whose data-keys
// is removed loses the aria-keyshortcuts keys wrote on it.
if (!store.listening) {
  store.listening = true;
  document.addEventListener("keydown", onkey);
  declare();
  addEventListener("storage", (event) => {
    if (event.key === STORAGE || event.key === null) declare();
  });
  new MutationObserver((records) => {
    for (const { target, attributeName, oldValue } of records) {
      if (attributeName === "data-keys" && oldValue !== null && !target.hasAttribute("data-keys")) {
        target.removeAttribute("aria-keyshortcuts");
      }
    }
    declare();
  }).observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeOldValue: true,
    attributeFilter: ["data-keys", "data-keys-mode"],
  });
}
