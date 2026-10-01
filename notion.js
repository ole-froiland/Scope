// Scope #19 — Notion: ordet i hero-pillen skrives på nytt, og Rådstavlen bytter visning med fanene Tabell og Tavle.
const pill = document.querySelector("[data-n-pill]");

// Samme skrivemaskin som /enkel: ordet skrives bokstav for bokstav og slettes med backspace eller markering.
if (pill && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const word = pill.querySelector("[data-n-word]");
  const words = [
    ["mat", "blue"], ["vin", "red"], ["kultur", "green"], ["kaffe", "blue"],
    ["indisk", "red"], ["stemning", "green"], ["tartar", "blue"],
  ];
  const removals = ["backspace", "select", "backspace", "select-italic", "backspace", "select-bold"];
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const remove = async (text, style) => {
    if (style === "backspace") {
      for (let i = text.length; i >= 0; i -= 1) { word.textContent = text.slice(0, i); await wait(150); }
      return;
    }
    word.classList.add("is-selecting");
    for (let i = 1; i <= text.length; i += 1) {
      const start = text.length - i;
      word.innerHTML = `${text.slice(0, start)}<span class="n-sel">${text.slice(start)}</span>`;
      await wait(90);
    }
    await wait(320);
    if (style === "select-italic") { word.classList.add("is-em"); await wait(700); }
    if (style === "select-bold") { word.classList.add("is-strong"); await wait(700); }
    word.classList.remove("is-selecting", "is-em", "is-strong");
    word.textContent = "";
  };

  (async () => {
    for (let n = 0; ; n += 1) {
      await wait(2200);
      const [text] = words[n % words.length];
      const [next, tone] = words[(n + 1) % words.length];
      await remove(text, removals[n % removals.length]);
      await wait(350);
      pill.dataset.tone = tone;
      for (let i = 1; i <= next.length; i += 1) { word.textContent = next.slice(0, i); await wait(210); }
    }
  })();
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
