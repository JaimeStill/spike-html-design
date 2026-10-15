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
// Every binding is pressed as written: a chord or a combination is spelled out in it ("g c",
// "Mod+k").
//
// The reader's settings are stored per origin as JSON under localStorage key
// "spike-html-design.keys", holding only the settings the reader changed:
//
//   {
//     enabled?: boolean,                   the off switch; true, the default, is on.
//     wait?: 1000 | 1500 | 3000 | 5000,    the sequence wait in ms, over the store's.
//   }
//
// An unknown name or invalid value reads as its default, and unparseable JSON, or storage that
// throws, as all defaults. keys reads them at each press, so another tab's change applies at
// once. With the off switch off (enabled false), a binding whose presses are all character keys
// with no Control, Alt, or Meta, a single key or a chord of them, doesn't fire, while a
// combination with Control, Alt, or Meta still does (WCAG 2.1.4).
//
// aria-keyshortcuts: keys owns the attribute on every element carrying data-keys and writes it
// from the binding, its single-press alternatives as keys-grammar's keyshortcuts() declares them
// ("T", "Alt+T", "Shift+/"). A sequence declares nothing, nor does an alternative the off switch
// covers, and the attribute is removed when nothing is left, or when an element's data-keys is
// removed. keys rewrites it on load, when another tab changes the settings (a storage event),
// when this page changes them through changeSettings(), and when an element's data-keys changes
// or an element is added. It touches no element that never carried data-keys.
//
// The extension events, their names and details public API frozen with v0.6.0:
//
//   keys-fire       cancelable and bubbling, on the bound element, or on document for a
//                   register() binding, before keys acts. Cancelling it stops the action.
//                   detail: { binding, keys, label? }: binding the binding's normal string (all
//                   its alternatives), keys the presses that fired it, each a normal string
//                   ("g", "c"), and label a register() binding's label.
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
//   settings()                      the settings in effect: { enabled, wait }, the reader's
//                                   where stored and valid, else the defaults, the wait the
//                                   store's.
//   changeSettings(change)          stores the reader's change, an object of some of
//                                   settings()'s names, and returns settings(). A value of null
//                                   removes that setting, and so does a default (enabled true,
//                                   wait the store's). Nothing left removes the storage key.
//                                   It throws a TypeError on an unknown name or invalid value.
//   bindings(dialog)                the bindings that would be active were dialog closed, for the
//                                   help module: the page outside dialog, under any other modal's
//                                   scope, with dialog's own elements left out. Each is listed
//                                   once per sequence, as the binding that fires it (first wins),
//                                   and a binding left with no sequence is not listed. Each is
//                                   { keys, label, element, sequences, off, run }: keys as
//                                   written, label register()'s or null, element the bound
//                                   element or null, sequences its parsed sequences, the off switch
//                                   aside; off whether the off switch covers every one of them;
//                                   run() acts as a press would, clicking or focusing the element
//                                   or calling the handler, with no keys-fire dispatched, since
//                                   nothing was pressed. A handler run this way receives an
//                                   undispatched keys-fire event whose detail's keys is [].
//
// The help dialog: a page places a native <dialog> holding an element marked data-keys-list.
// The copy that listens loads keys-help.js, beside itself, the first time such a dialog fires
// beforetoggle to open, however it opens (a show-modal invoker, showModal(), or show()), and
// from then on has it fill the dialog's marked elements at each open, before the dialog shows.
// A load that fails is warned of on the console and tried again at the next open; until one
// succeeds, the dialog opens as the page wrote it.
import { keyshortcuts, matches, normalize, parse, problem, stringify } from "./keys-grammar.js";

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
  wait: (value) => [1000, 1500, 3000, 5000].includes(value),
};

// defaults are the settings in effect with none stored.
const defaults = () => ({ enabled: true, wait: store.wait });

// stored returns the reader's valid stored settings, {} when storage is empty, unparseable, or
// throws, as it does with site data blocked. A name it doesn't know is left out, and so dropped
// on the next write.
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
    if (value === null || value === fallback[name]) delete next[name];
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
// presses the off switch covers.
const isCharacter = (press) =>
  !press.control && !press.alt && !press.meta && [...press.key].length === 1;

// effective returns binding parsed under current, settings(). With the off switch off it leaves
// out the alternatives it covers, so a binding may have none; null when the binding is malformed.
function effective(binding, current) {
  const alternatives = parse(binding, { mac });
  if (!alternatives || current.enabled) return alternatives;
  return alternatives.filter((sequence) => !sequence.every(isCharacter));
}

// declare writes aria-keyshortcuts on every element carrying data-keys from its binding under
// the off switch, and removes it where that declares nothing.
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
// With closed given, a dialog, they are those in effect were it closed: its elements are left
// out, and it narrows nothing.
function active(current, closed = null) {
  const modal = [...document.querySelectorAll(":modal")].find((el) => el !== closed);
  const elements = [...document.querySelectorAll("[data-keys]")]
    .filter((el) => !modal || modal.contains(el))
    .filter((el) => !closed?.contains(el))
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

// fireEvent returns the keys-fire event for binding, its keys sequence, the presses that fired
// it.
function fireEvent(binding, sequence) {
  const detail = { binding: normalize(binding.keys, { mac }), keys: sequence.map(stringify) };
  if (binding.entry) detail.label = binding.entry.label;
  return new CustomEvent("keys-fire", { bubbles: true, cancelable: true, detail });
}

// act runs binding: it clicks or focuses the element, or calls register()'s handler with event.
function act(binding, event) {
  if (binding.entry) binding.entry.handler(event);
  else if (isField(binding.el)) binding.el.focus();
  else binding.el.click();
}

// fire dispatches keys-fire for a binding's matched sequence and, unless it is cancelled, acts.
function fire({ binding, sequence }) {
  const event = fireEvent(binding, sequence);
  if ((binding.el ?? document).dispatchEvent(event)) act(binding, event);
}

export function bindings(dialog) {
  const current = settings();
  const seen = new Set();
  const listed = [];
  for (const binding of active({ ...current, enabled: true }, dialog)) {
    const sequences = binding.alternatives.filter((sequence) => {
      const key = stringify(sequence);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (sequences.length === 0) continue;
    listed.push({
      keys: binding.keys,
      label: binding.entry?.label ?? null,
      element: binding.el ?? null,
      sequences,
      off: !current.enabled && sequences.every((sequence) => sequence.every(isCharacter)),
      run: () => act(binding, fireEvent(binding, [])),
    });
  }
  return listed;
}

// help is keys-help.js once loaded, and loading the promise of it, or of null when the load
// fails; see "The help dialog".
let help = null;
let loading = null;

// onbeforetoggle has the help module fill a dialog holding [data-keys-list] as it opens: at
// once, before it shows, once the module is loaded, and on the first open when it loads.
function onbeforetoggle(event) {
  const dialog = event.target;
  if (event.newState !== "open" || !(dialog instanceof HTMLDialogElement)) return;
  if (!dialog.querySelector("[data-keys-list]")) return;
  if (help) {
    help.fill(dialog);
    return;
  }
  loading ??= import(new URL("./keys-help.js", import.meta.url).href).then(
    (module) => {
      help = module;
      return module;
    },
    (error) => {
      // A failed load is forgotten, so the next open tries again; this open shows the dialog as
      // the page wrote it, its own Close still working.
      loading = null;
      console.warn("keys: the help module failed to load", error);
      return null;
    },
  );
  loading.then((module) => module?.fill(dialog));
}

// onkey reads the settings and the bindings in effect and matches the press against them, after
// the presses pending. A complete match with no longer one waiting fires at once; a longer one
// waiting starts or continues the sequence; nothing matching drops the sequence in progress.
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
      if (sequence.length === n) complete ??= { binding, sequence };
      else longer ??= { binding, sequence };
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
// element's data-keys or an element added. An element whose data-keys
// is removed loses the aria-keyshortcuts keys wrote on it.
if (!store.listening) {
  store.listening = true;
  document.addEventListener("keydown", onkey);
  // beforetoggle doesn't bubble, so it is heard in the capture phase.
  document.addEventListener("beforetoggle", onbeforetoggle, true);
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
    attributeFilter: ["data-keys"],
  });
}
