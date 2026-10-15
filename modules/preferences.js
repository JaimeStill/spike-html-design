// preferences: the reader's stored theme choice, applied to the root before first paint, kept
// in storage, and followed across tabs; and <theme-menu>, the thin element that opens the menu.
//
// A page loads it render-blocking, after the registration module that matches its CSS entry:
//
//   <script type="module" blocking="render" src=".../register.js"></script>
//   <script type="module" blocking="render" src=".../preferences.js"></script>
//
// Module scripts run in document order, so the registry lists the page's profiles when this
// module runs, and blocking="render" holds first paint until it has applied the stored choice:
// no flash of the default profile. Its bytes delay first paint, so it holds only that: apply,
// persistence, the storage event, and the thin element. The menu itself is
// theme-menu.js, fetched the first time the menu opens. Without storage, or without this module,
// the page renders its defaults: preferences are progressive enhancement.
//
// A choice is { color, space, type, scheme }: a registered profile name per facet, as its
// data-palette, data-space, or data-type value, and a scheme of system, light, or dark, as
// data-scheme, where system means no data-scheme. Every page using the baseline on an origin
// shares one choice, as JSON under KEY in localStorage.
//
// The exports are the hooks the menu builds on:
//
//   KEY                  the localStorage key, one per origin.
//   ATTRIBUTES           each facet's attribute, and the scheme's.
//   SCHEMES              the scheme's values, system (the default) first.
//   read()               the stored choice, or null when nothing is stored or storage is blocked.
//   apply(choice, el)    applies choice to el, the root by default, without saving it.
//   save(choice)         stores choice and returns whether storage took it.
//   setOpen(open)        marks the menu open or closed; while open, another tab's save is
//                        ignored here, and the menu's Save or Cancel settles it.
//   isOpen()             whether the menu is open.
import { DEFAULTS, FACETS, profiles } from "./registry.js";

export const KEY = "spike-html-design.preferences";

export const ATTRIBUTES = Object.freeze({
  color: "data-palette",
  space: "data-space",
  type: "data-type",
  scheme: "data-scheme",
});

export const SCHEMES = Object.freeze(["system", "light", "dark"]);

let open = false;

// read parses the stored choice. Storage can throw (blocked, or a sandboxed page) and its value
// can be anything another page wrote, so either reads as nothing stored.
export function read() {
  try {
    const choice = JSON.parse(localStorage.getItem(KEY));
    return choice && typeof choice === "object" ? choice : null;
  } catch {
    return null;
  }
}

// apply sets each facet's attribute on el to choice's name when this page registered it, and
// removes it otherwise, so a name only another page registered falls back to this page's default
// (DEFAULTS, which the CSS applies with no attribute) and stays in storage. A scheme of light or
// dark sets data-scheme; system, or anything else, removes it.
export function apply(choice, el = document.documentElement) {
  for (const facet of FACETS) {
    const name = choice?.[facet];
    if (profiles(facet).includes(name)) el.setAttribute(ATTRIBUTES[facet], name);
    else el.removeAttribute(ATTRIBUTES[facet]);
  }
  if (SCHEMES.includes(choice?.scheme) && choice.scheme !== SCHEMES[0]) {
    el.setAttribute(ATTRIBUTES.scheme, choice.scheme);
  } else el.removeAttribute(ATTRIBUTES.scheme);
}

// save stores choice's four keys, each facet's default and the system scheme filling a gap.
export function save(choice) {
  const stored = { scheme: choice?.scheme ?? SCHEMES[0] };
  for (const facet of FACETS) stored[facet] = choice?.[facet] ?? DEFAULTS[facet];
  try {
    localStorage.setItem(KEY, JSON.stringify(stored));
    return true;
  } catch {
    return false;
  }
}

export function setOpen(value) {
  open = Boolean(value);
}

export function isOpen() {
  return open;
}

// Before first paint: the stored choice, if any. With nothing stored the root keeps whatever the
// page wrote on it.
const stored = read();
if (stored) apply(stored);

// Another tab's save fires storage here, never in the tab that saved. The open menu ignores it:
// its Save overwrites it, and its Cancel restores read(), the other tab's choice included. A
// cleared key (newValue null) restores the defaults.
addEventListener("storage", (event) => {
  if (open || (event.key !== KEY && event.key !== null)) return;
  apply(read() ?? {});
});

// ThemeMenu is the thin element the page places once, in light DOM, with an id its own button
// names: <button commandfor="theme" command="--open">. It opens on that invoker command, and only
// then fetches theme-menu.js, whose open(element) builds the menu inside it. It binds no key: a
// page binds T by giving that button data-keys="t" and loading keys.js, which clicks it. The menu
// module marks itself open and closed through setOpen.
class ThemeMenu extends HTMLElement {
  #menu = null;

  constructor() {
    super();
    this.addEventListener("command", (event) => {
      if (event.command === "--open") this.show();
    });
  }

  // show loads the menu module once, on first open, and opens the menu. It returns nothing: its
  // caller, the command, waits on nothing. A second call while the module loads opens the
  // menu once, since the menu's open ignores an element whose menu is already open.
  show() {
    if (open) return;
    this.#load().then((menu) => menu.open(this));
  }

  #load() {
    this.#menu ??= import(new URL("./theme-menu.js", import.meta.url).href);
    return this.#menu;
  }
}

if (!customElements.get("theme-menu")) customElements.define("theme-menu", ThemeMenu);
