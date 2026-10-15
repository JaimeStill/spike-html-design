// keys-indicator: a pending-sequence indicator built outside keys, from its keys-sequence events
// alone, to prove the extension point. It writes the presses so far into #indicator, "then"
// between them, and clears it when the sequence ends. It does not ship.
document.addEventListener("keys-sequence", ({ detail }) => {
  const indicator = document.getElementById("indicator");
  if (!indicator) return;
  indicator.textContent = detail.state === "end" ? "" : detail.presses.join(" then ");
});
