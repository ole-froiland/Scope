/* ==========================================================================
   Kvittering — utskriftseffekt, telleverk og rådene som kan foldes ut.
   Alt er progressiv pynt: uten JS står hele kvitteringen ferdig utskrevet.
   ========================================================================== */

(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- Linjene «skrives ut» når de kommer i syne ------------------------- */

  const lines = Array.from(document.querySelectorAll(".print-line"));

  if (reduceMotion || !("IntersectionObserver" in window)) {
    lines.forEach((line) => line.classList.add("is-printed"));
  } else {
    const printer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-printed");
          printer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.15 },
    );
    lines.forEach((line) => printer.observe(line));
  }

  /* --- Beløpene teller opp én gang -------------------------------------- */

  const norwegian = new Intl.NumberFormat("nb-NO");
  const counters = Array.from(document.querySelectorAll("[data-count]"));

  function runCounter(element) {
    const target = Number(element.dataset.count);
    if (!Number.isFinite(target)) return;

    const duration = 900;
    const start = performance.now();

    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      // Mykt utløp, så tallet lander i stedet for å stoppe brått.
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = norwegian.format(Math.round(target * eased));
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  if (!reduceMotion && "IntersectionObserver" in window) {
    const counterWatcher = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          runCounter(entry.target);
          counterWatcher.unobserve(entry.target);
        });
      },
      { threshold: 0.6 },
    );
    counters.forEach((counter) => counterWatcher.observe(counter));
  }

  /* --- Rådene kan foldes ut --------------------------------------------- */

  document.querySelectorAll(".advice-toggle").forEach((toggle) => {
    const panel = document.getElementById(toggle.getAttribute("aria-controls"));
    if (!panel) return;

    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      panel.hidden = open;
    });
  });

  /* --- Topplinja får en kant når siden er rullet ------------------------- */

  const topbar = document.querySelector("[data-topbar]");
  if (topbar) {
    const sync = () => topbar.classList.toggle("is-stuck", window.scrollY > 8);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
  }
})();
