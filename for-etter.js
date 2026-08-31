/* ==========================================================================
   Før / Etter — skyveren, innsig ved rulling og telleverk.
   Selve sammenligningen styres av en range-kontroll, så drag, touch og
   piltaster kommer gratis fra nettleseren. JS-en flytter bare klippet.
   ========================================================================== */

(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* --- Skyveren ---------------------------------------------------------- */

  const compare = document.querySelector("[data-compare]");
  const range = document.querySelector("[data-compare-range]");

  if (compare && range) {
    const applySplit = () => {
      compare.style.setProperty("--split", range.value);
    };

    applySplit();
    range.addEventListener("input", applySplit);

    // Ett mykt sveip første gang flaten kommer i syne, slik at det er
    // tydelig at skillet kan flyttes. Avbrytes så snart noen tar i den.
    if (!reduceMotion && "IntersectionObserver" in window) {
      let teased = false;
      let cancelled = false;

      const cancel = () => {
        cancelled = true;
      };
      ["pointerdown", "keydown", "input"].forEach((type) => {
        range.addEventListener(type, cancel, { once: true });
      });

      const teaser = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting || teased) return;
            teased = true;
            teaser.disconnect();

            const from = Number(range.value);
            // Nudget går mot «uten Scope», så rotet vises tydelig først –
            // da er det den rolige siden man selv drar fram.
            const to = 64;
            const duration = 900;
            const start = performance.now();

            function step(now) {
              if (cancelled) return;
              const progress = Math.min((now - start) / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              range.value = String(Math.round(from + (to - from) * eased));
              applySplit();
              if (progress < 1) requestAnimationFrame(step);
            }

            window.setTimeout(() => {
              if (!cancelled) requestAnimationFrame(step);
            }, 500);
          });
        },
        { threshold: 0.4 },
      );

      teaser.observe(compare);
    }
  }

  /* --- Innsig ------------------------------------------------------------ */

  const reveals = Array.from(document.querySelectorAll(".reveal"));

  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach((element) => element.classList.add("is-visible"));
  } else {
    const watcher = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          watcher.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    reveals.forEach((element) => watcher.observe(element));
  }

  /* --- Tallene teller opp ------------------------------------------------ */

  if (!reduceMotion && "IntersectionObserver" in window) {
    const counterWatcher = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const element = entry.target;
          counterWatcher.unobserve(element);

          const target = Number(element.dataset.count);
          if (!Number.isFinite(target) || target === 0) return;

          const duration = 700;
          const start = performance.now();

          function step(now) {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            element.textContent = String(Math.round(target * eased));
            if (progress < 1) requestAnimationFrame(step);
          }

          requestAnimationFrame(step);
        });
      },
      { threshold: 0.6 },
    );

    document.querySelectorAll("[data-count]").forEach((node) => counterWatcher.observe(node));
  }

  /* --- Topplinja --------------------------------------------------------- */

  const bar = document.querySelector("[data-bar]");
  if (bar) {
    const sync = () => bar.classList.toggle("is-stuck", window.scrollY > 8);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
  }
})();
