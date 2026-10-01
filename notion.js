// Scope #19 — Notion: bytter visning i Rådstavlen med fanene Tabell og Tavle.
const database = document.querySelector("[data-n-database]");

if (database) {
  const tabs = [...database.querySelectorAll("[data-n-view]")];

  const show = (selected, moveFocus) => {
    tabs.forEach((tab) => {
      const active = tab === selected;
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute("aria-controls")).hidden = !active;
    });
    if (moveFocus) selected.focus();
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => show(tab, false));
    tab.addEventListener("keydown", (event) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (step) {
        event.preventDefault();
        show(tabs[(index + step + tabs.length) % tabs.length], true);
      }
    });
  });
}
