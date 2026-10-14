// menu drives a page's <theme-menu> as a reader would, for the pinned tests and the live pin
// check: from v0.5.0 a pinned page loads the preferences modules from jsDelivr, and its menu must
// work from every origin it is opened from, file:// among them through jsDelivr's CORS header.

// KEY is the storage key the preferences module saves the choice under, frozen with v0.5.0; it
// is written out, not imported, because the module defines an element and runs only in a page.
const KEY = "spike-html-design.preferences";

// applyFromMenu opens the page's menu from its header's Theme button, checks the first color
// profile not already selected, and saves. It resolves to what the reader would see: whether
// the menu opened, the profile chosen, the profile the root then carries and storage then holds,
// and whether the page's background repainted. It removes the stored choice before resolving, so
// a later load of a page on the same origin renders its defaults again. It rejects when the menu
// does not open or close within timeout ms.
export function applyFromMenu(page, timeout = 5000) {
  return page.evaluate(`(async () => {
    const until = (label, ready) => new Promise((resolve, reject) => {
      const end = performance.now() + ${timeout};
      const poll = () => {
        if (ready()) resolve();
        else if (performance.now() > end) reject(new Error("menu: timed out: " + label));
        else setTimeout(poll, 10);
      };
      poll();
    });
    // The background the root's --bg resolves to, read through a probe element, since a custom
    // property's computed value is its unresolved declaration.
    const background = () => {
      const probe = document.body.appendChild(document.createElement("div"));
      probe.style.background = "var(--bg)";
      const color = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return color;
    };
    const before = background();
    const menu = document.querySelector("theme-menu");
    document.querySelector('button[command="--open"][commandfor="' + menu.id + '"]').click();
    await until("open", () => menu.querySelector("dialog")?.open);
    const radio = menu.querySelector('dialog [data-section="color"] input:not(:checked)');
    radio.click();
    menu.querySelector('dialog [data-action="save"]').click();
    await until("close", () => !menu.hasAttribute("data-open"));
    const result = {
      opened: true,
      chosen: radio.value,
      applied: document.documentElement.getAttribute("data-palette"),
      stored: JSON.parse(localStorage.getItem(${JSON.stringify(KEY)}))?.color ?? null,
      repainted: background() !== before,
    };
    localStorage.removeItem(${JSON.stringify(KEY)});
    return result;
  })()`);
}
