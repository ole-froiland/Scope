// Scope #19 — Notion: ordet i hero-pillen bytter seg, og Rådstavlen bytter visning med fanene Tabell og Tavle.
const pill = document.querySelector("[data-n-pill]");

if (pill && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const word = pill.querySelector("[data-n-word]");
  const items = [
    ["mat", "blue"], ["vin", "red"], ["service", "green"],
    ["kaffe", "blue"], ["drinker", "red"], ["gjester", "green"],
  ];
  let index = 0;

  const fit = () => { pill.style.width = ""; pill.style.width = `${pill.getBoundingClientRect().width}px`; };
  fit();
  window.addEventListener("resize", fit);

  setInterval(() => {
    index = (index + 1) % items.length;
    const [text, tone] = items[index];
    word.classList.add("is-out");
    setTimeout(() => {
      pill.style.width = `${pill.getBoundingClientRect().width}px`;
      word.textContent = text;
      word.classList.remove("is-out");
      word.classList.add("is-in");
      pill.dataset.tone = tone;
      const from = pill.style.width;
      pill.style.width = "";
      const to = `${pill.getBoundingClientRect().width}px`;
      pill.style.width = from;
      void pill.offsetWidth;
      pill.style.width = to;
      void word.offsetWidth;
      word.classList.remove("is-in");
    }, 300);
  }, 2400);
}

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
