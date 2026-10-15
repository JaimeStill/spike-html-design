// register: the Harbor extension's registration module. It lists harbor under color in the
// baseline's registry, so the theming menu offers it and the stored preferences apply it. The
// page loads it after the baseline's own registration module and before preferences, render-
// blocking, so a stored choice of harbor applies before first paint. It loads no CSS: the page
// links harbor.css itself. "spike-html-design/registry" is the package's ./registry export, which
// the page's import map resolves into node_modules.
import { register } from "spike-html-design/registry";

register("color", "harbor");
