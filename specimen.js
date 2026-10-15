// The specimen's own shortcuts, specimen code rather than the package's: keys binds none itself,
// so this page registers its own with keys' register(). j and k move focus to the next and the
// previous section with an id, in document order, nested sections included, and g goes to the
// top. The specimen loads this file as a module script by relative URL, beside keys.js, so it
// runs served and on Pages; from file://, chromium blocks it, and the page has no shortcuts, as
// it has no menu.
import { register } from "./modules/keys.js";

// sections lists the sections a j or k press moves through: every section with an id, each
// focusable from script through its tabindex="-1", in document order.
const sections = () => [...document.querySelectorAll("section[id]")];

// show focuses target and scrolls it to the viewport's top edge, less its scroll margin, so the
// section a press reached opens the view rather than sitting wherever focus() would leave it.
function show(target) {
  target.focus({ preventScroll: true });
  target.scrollIntoView({ block: "start" });
}

// below reports whether section starts below the viewport's top edge, less its scroll margin,
// where show() leaves a section: past it, the reader has not reached the section yet.
function below(section) {
  const margin = parseFloat(getComputedStyle(section).scrollMarginBlockStart) || 0;
  return section.getBoundingClientRect().top > margin + 1;
}

// step moves focus one section forward (1) or back (-1). With focus inside a section, the step
// is from the innermost section with an id holding it. With focus anywhere else, the header or
// the page itself, the step is from the scroll position: forward to the first section starting
// below the top edge, back to the last one starting above it. At either end nothing moves.
function step(direction) {
  const all = sections();
  const current = document.activeElement?.closest?.("section[id]");
  let target;
  if (current) target = all[all.indexOf(current) + direction];
  else if (direction > 0) target = all.find(below);
  else target = all.findLast((section) => section.getBoundingClientRect().top < 0);
  if (target) show(target);
}

register("j", "Next section", () => step(1));
register("k", "Previous section", () => step(-1));
register("g", "Top", () => {
  document.querySelector("body > header > h1").focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
});
