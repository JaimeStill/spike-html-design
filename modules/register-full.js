// register-full: the full registration module, the JS mirror of the full entry, full.css. It
// registers every built-in profile of every facet, each facet's default first, in the order the
// entry imports them. Like full.css, it is self-contained, one hop to the registry, not an
// add-on to the lean module: a page that links full.css imports this module alone. It loads no
// CSS.
import { register } from "./registry.js";

for (const name of ["flexoki", "primer", "catppuccin", "everforest"]) register("color", name);
for (const name of ["regular", "compact"]) register("space", name);
for (const name of ["mono", "serif"]) register("type", name);
