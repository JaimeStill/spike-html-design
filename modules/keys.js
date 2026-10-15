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
//     wait: number,                            the sequence wait in ms, 1500; read at each press.
//     listening: boolean,                      whether a copy has installed the listener.
//   }
//
// A copy that finds a store already there uses it as it is.
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
import { matches, normalize, problem, stringify, wrap } from "./keys-grammar.js";

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

// mode is the mode bindings are pressed in. Raw until modes land; the one place that reads it.
function mode() {
  return "raw";
}

// effective returns binding as pressed now, parsed: the one place a binding's written form
// becomes the form keys matches, so modes and settings change it here alone.
function effective(binding) {
  return wrap(binding, mode(), {}, { mac });
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

// elementBinding reads el's data-keys as a binding, or warns once and returns null.
function elementBinding(el) {
  const keys = el.getAttribute("data-keys");
  const alternatives = effective(keys);
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
function active() {
  const modal = document.querySelector(":modal");
  const elements = [...document.querySelectorAll("[data-keys]")]
    .filter((el) => !modal || modal.contains(el))
    .filter((el) => !el.matches(":disabled") && !el.closest("[inert]") && el.checkVisibility())
    .map(elementBinding)
    .filter(Boolean);
  if (modal) return elements;
  const registered = store.registered.map((entry) => ({
    entry,
    keys: entry.keys,
    alternatives: effective(entry.keys),
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

// fire dispatches keys-fire for a binding's matched sequence and, unless it is cancelled, acts:
// it clicks or focuses the element, or calls register()'s handler.
function fire({ binding, sequence }) {
  const detail = {
    binding: normalize(binding.keys, { mac }),
    keys: sequence.map(stringify),
    mode: mode(),
  };
  if (binding.entry) detail.label = binding.entry.label;
  const target = binding.el ?? document;
  const event = new CustomEvent("keys-fire", { bubbles: true, cancelable: true, detail });
  if (!target.dispatchEvent(event)) return;
  if (binding.entry) binding.entry.handler(event);
  else if (isField(binding.el)) binding.el.focus();
  else binding.el.click();
}

// onkey reads the bindings in effect and matches the press against them, after the presses
// pending. A complete match with no longer one waiting fires at once; a longer one waiting
// starts or continues the sequence; nothing matching drops the sequence in progress.
function onkey(event) {
  if (silent(event)) return;
  const presses = [...(pending?.presses ?? []), snapshot(event)];
  const n = presses.length;
  let complete = null;
  let longer = null;
  for (const binding of active()) {
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
  }, store.wait);
  sequenceEvent(started ? "start" : "continue", strings);
}

if (!store.listening) {
  store.listening = true;
  document.addEventListener("keydown", onkey);
}
