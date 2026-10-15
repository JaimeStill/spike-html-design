// shortcuts drives a page's keys as a reader would, for the pinned tests and the live pin check:
// from v0.6.0 a pinned page loads keys and the specimen's specimen.js from jsDelivr, and its keys
// must work from every origin it is opened from, file:// among them through jsDelivr's CORS
// header. The presses are real key presses, so they reach keys' document listener as a reader's
// would.

// STORE is the global key of keys' binding store, frozen with v0.6.0; it is written out, not
// imported, because keys installs its listener on import and runs only in a page.
const STORE = 'globalThis[Symbol.for("spike-html-design.keys")]';

// until resolves once expression is truthy in page, polling every 10 ms, and rejects naming label
// after timeout ms.
function until(page, label, expression, timeout) {
  return page.evaluate(`new Promise((resolve, reject) => {
    const end = performance.now() + ${timeout};
    const poll = () => {
      if (${expression}) resolve(true);
      else if (performance.now() > end) reject(new Error("shortcuts: timed out: " + ${JSON.stringify(label)}));
      else setTimeout(poll, 10);
    };
    poll();
  })`);
}

// driveKeys waits for specimen.js to register its three bindings, then presses T, which opens the
// theme menu, and Escape, which cancels it; ?, which opens the help dialog, and Escape, which
// closes it; and j, which moves focus to the first section. It resolves to what the reader would
// see: whether the menu opened and closed, the help table's rows as [keys, label], and the id of
// the element j focused. It rejects when a step does not happen within timeout ms.
export async function driveKeys(page, timeout = 5000) {
  await until(page, "bindings", `${STORE}?.registered.length === 3`, timeout);
  const menuOpen = `document.querySelector("theme-menu")?.hasAttribute("data-open")`;
  await page.view.press("t");
  await until(page, "menu open", menuOpen, timeout);
  await page.view.press("Escape");
  await until(page, "menu closed", `!${menuOpen}`, timeout);
  await page.view.press("?");
  await until(
    page,
    "help filled",
    `document.getElementById("help").open &&
      document.querySelector("#help [data-keys-list] [data-keys-table]")`,
    timeout,
  );
  const help = await page.evaluate(
    `[...document.querySelectorAll("#help [data-keys-table] tbody tr")].map((row) => [
      [...row.cells[0].querySelectorAll("kbd")].map((kbd) => kbd.textContent).join(" "),
      row.cells[1].querySelector("button").textContent,
    ])`,
  );
  await page.view.press("Escape");
  await until(page, "help closed", `!document.getElementById("help").open`, timeout);
  await page.view.press("j");
  const focused = await page.evaluate(
    "document.activeElement.id || document.activeElement.localName",
  );
  return { menu: true, help, focused };
}
