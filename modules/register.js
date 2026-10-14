// register: the lean registration module, the JS mirror of the lean entry, baseline.css. It
// registers the profiles that entry ships, each facet's default: flexoki for color, regular for
// space, mono for type. A page that links baseline.css imports this module; one that links
// full.css imports register-full.js instead. It loads no CSS.
import { register } from "./registry.js";

register("color", "flexoki");
register("space", "regular");
register("type", "mono");
