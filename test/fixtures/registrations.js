// registrations: the registry fixtures' shared listing. list() renders each facet's registered
// names, as the registry module it is given reads them, into the page's <ul id="<facet>">, one
// <li> per name in registration order, so the page shows its registrations and the tests read
// them back.
export function list({ FACETS, profiles }) {
  for (const facet of FACETS) {
    const items = profiles(facet).map((name) =>
      Object.assign(document.createElement("li"), { textContent: name }),
    );
    document.getElementById(facet).replaceChildren(...items);
  }
}
