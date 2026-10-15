// keys-help: the help dialog's contents, loaded by keys.js the first time a dialog holding an
// element marked data-keys-list opens, never before. The page places the dialog and opens it
// itself, with a visible button and the built-in show-modal command:
//
//   <button type="button" commandfor="help" command="show-modal" data-keys="?">Help <kbd>?</kbd></button>
//   <dialog id="help" aria-labelledby="help-title">
//     <h2 id="help-title">Keyboard shortcuts</h2>
//     <div data-keys-list></div>
//     <button type="button" commandfor="help" command="close" data-keys="?">Close <kbd>?</kbd></button>
//   </dialog>
//
//   fill(dialog)    fills each [data-keys-list] in dialog: keys.js calls it each time dialog opens.
//
// A marked element is filled, in order, with:
//
//   - a table of the bindings that would be active with the dialog closed, keys.js's bindings(),
//     one row per binding: its keys, each press's labels (keys-grammar's labels()) drawn as
//     sibling <kbd> elements with "+" between a combination's and "then" between presses, and "or"
//     between alternatives; then its action, a button that closes the dialog and runs the binding
//     as a press would. The button's text is the bound element's aria-label, else its text with
//     its <kbd> elements left out, and the joiners between two of them ("+", "then"), else, for a
//     field, its <label>'s text so read, else its keys as written; a register() binding's is
//     register()'s label. A row the off switch covers stays listed, marked data-keys-off with a
//     visible "off" after its keys; its button still runs the action, since a click is not a
//     character-key shortcut. Last comes a fixed row, marked data-keys-fixed: <kbd>Esc</kbd>,
//     "Leave a field", keys.js's Escape that releases a field. It is always listed and never
//     marked off, since it is no binding, and its action is plain text, not a button: it has
//     nothing to run from the dialog.
//   - the reader's settings, written through keys.js's changeSettings(): the off switch for
//     character-key shortcuts and the sequence wait, each a native control in one fieldset. A
//     change re-renders the table at once.
//   - a note for screen-reader users on passing a key through.
//
// It adds no CSS: the baseline's elements layer styles the table, the controls, and kbd.
// Every name it sets comes from the page or a script, so it is set as text, never parsed as
// markup.

import { bindings, changeSettings, settings } from "./keys.js";
import { labels } from "./keys-grammar.js";

// WAITS are the sequence waits the reader picks from, in ms.
const WAITS = [1000, 1500, 3000, 5000];

// NOTE is the screen-reader note, fixed English text.
const NOTE =
  "Screen readers: a screen reader may take a key before the page does. To pass the next key " +
  "through, press NVDA+F2 in NVDA, JAWS+3 in JAWS, Narrator+3 in Narrator, or VO+Tab in VoiceOver.";

// runs holds each row button's binding runner.
const runs = new WeakMap();

// wired holds each marked element whose listeners are installed, with the dialog it sits in.
const wired = new WeakMap();

// textOf returns el's text with its kbd elements left out, and with them the text between two
// sibling kbd, the joiner a key hint writes ("+", "then"), whitespace collapsed and trimmed.
function textOf(el) {
  const copy = el.cloneNode(true);
  for (const kbd of copy.querySelectorAll("kbd")) {
    const joiner = kbd.nextSibling;
    if (joiner?.nodeType === Node.TEXT_NODE && joiner.nextSibling?.localName === "kbd") {
      joiner.remove();
    }
    kbd.remove();
  }
  return copy.textContent.replace(/\s+/g, " ").trim();
}

// labelOf returns a binding's label: see the module comment.
function labelOf({ element, label, keys }) {
  if (!element) return label;
  const aria = element.getAttribute("aria-label")?.trim();
  if (aria) return aria;
  const text = textOf(element);
  if (text) return text;
  const field = element.labels?.[0];
  return (field && textOf(field)) || keys;
}

// keysOf returns a binding's sequences drawn as nodes: sibling kbd elements, "+" within a
// press, "then" between presses, "or" between alternatives.
function keysOf(sequences) {
  const nodes = [];
  sequences.forEach((sequence, a) => {
    if (a > 0) nodes.push(" or ");
    labels(sequence).forEach((press, p) => {
      if (p > 0) nodes.push(" then ");
      press.forEach((name, k) => {
        if (k > 0) nodes.push("+");
        const kbd = document.createElement("kbd");
        kbd.textContent = name;
        nodes.push(kbd);
      });
    });
  });
  return nodes;
}

// escapeRow returns the fixed row for Escape releasing a field.
function escapeRow() {
  const row = document.createElement("tr");
  row.dataset.keysFixed = "";
  const keys = document.createElement("td");
  const kbd = document.createElement("kbd");
  kbd.textContent = "Esc";
  keys.append(kbd);
  const action = document.createElement("td");
  action.textContent = "Leave a field";
  row.append(keys, action);
  return row;
}

// table returns the bindings table for dialog, the fixed Escape row last.
function table(dialog) {
  const listed = bindings(dialog);
  const el = document.createElement("table");
  el.dataset.keysTable = "";
  el.innerHTML = `<thead><tr><th scope="col">Keys</th><th scope="col">Action</th></tr></thead><tbody></tbody>`;
  for (const binding of listed) {
    const row = document.createElement("tr");
    const keys = document.createElement("td");
    keys.append(...keysOf(binding.sequences));
    if (binding.off) {
      row.dataset.keysOff = "";
      const off = document.createElement("small");
      off.textContent = " off";
      keys.append(off);
    }
    const action = document.createElement("td");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = labelOf(binding);
    runs.set(button, binding.run);
    action.append(button);
    row.append(keys, action);
    el.tBodies[0].append(row);
  }
  el.tBodies[0].append(escapeRow());
  return el;
}

// waitControl returns a label holding the wait's select, at wait. A wait it doesn't list, as a
// page's store.wait can be, shows as a first option whose empty value removes the reader's.
function waitControl(wait) {
  const label = document.createElement("label");
  const select = document.createElement("select");
  select.name = "wait";
  const shown = (ms) => `${ms / 1000} s`;
  if (!WAITS.includes(wait)) select.append(new Option(shown(wait), "", false, true));
  for (const ms of WAITS) select.append(new Option(shown(ms), String(ms), false, ms === wait));
  label.append("Wait between presses ", select);
  return label;
}

// form returns the settings fieldset, at the settings in effect.
function form() {
  const current = settings();
  const fieldset = document.createElement("fieldset");
  fieldset.dataset.keysSettings = "";
  const legend = document.createElement("legend");
  legend.textContent = "Settings";
  const on = document.createElement("label");
  const enabled = document.createElement("input");
  Object.assign(enabled, { type: "checkbox", name: "enabled", checked: current.enabled });
  on.append(enabled, " Character-key shortcuts (combinations with Control, Alt, or Meta stay on)");
  const p = document.createElement("p");
  p.append(waitControl(current.wait));
  fieldset.append(legend, on, p);
  return fieldset;
}

// render replaces list's table with one drawn now.
function render(list, dialog) {
  list.querySelector(":scope > [data-keys-table]")?.remove();
  list.prepend(table(dialog));
}

// wire installs list's listeners once: a row button closes dialog and runs its binding, and a
// settings change is stored and re-renders the table.
function wire(list, dialog) {
  if (wired.get(list) === dialog) return;
  wired.set(list, dialog);
  list.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest("button") : null;
    const run = button && runs.get(button);
    if (!run) return;
    dialog.close();
    run();
  });
  list.addEventListener("change", (event) => {
    const { name, type, checked, value } = event.target;
    if (!name) return;
    let setting = checked;
    if (type !== "checkbox") setting = value === "" ? null : Number(value);
    changeSettings({ [name]: setting });
    render(list, dialog);
  });
}

export function fill(dialog) {
  for (const list of dialog.querySelectorAll("[data-keys-list]")) {
    wire(list, dialog);
    const note = document.createElement("p");
    note.dataset.keysNote = "";
    note.textContent = NOTE;
    list.replaceChildren(form(), note);
    render(list, dialog);
  }
}
