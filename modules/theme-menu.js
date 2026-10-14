// theme-menu: the theming menu, loaded by <theme-menu> the first time it opens, never before
// first paint. This is the stub the thin element calls; the menu itself (a modal dialog with a
// row per facet and the scheme, Save and Cancel, and a live preview) fills it in.
//
//   open(element)    opens the menu inside element and marks it open, so the storage event
//                    waits on the menu's Save or Cancel.
//   accept(element)  T while open: saves and closes the menu.
import { setOpen } from "./preferences.js";

export function open(element) {
  setOpen(true);
  element.toggleAttribute("data-open", true);
}

export function accept(element) {
  element.toggleAttribute("data-open", false);
  setOpen(false);
}
