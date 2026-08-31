/* ==========================================================================
   Menykortet — innsig ved rulling og bla i dagens anbefalinger.
   Uten JS står alt synlig, og den første anbefalingen ligger i HTML-en.
   ========================================================================== */

(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  /* --- Dagens anbefaling ------------------------------------------------- */

  const recommendations = [
    {
      text: "Sett inn én ekstra på gulvet fra 18:30 på fredag.",
      why: "Fredagene fylles raskt etter klokken 18. Én ekstra person gir roligere service og høyere snittbong. Forventet effekt: 3 800 kr i uken.",
    },
    {
      text: "Flytt åpningsvakta én time senere på tirsdag.",
      why: "Salget starter først 12:40 i snitt, men vakta starter 11:00. Timen koster mer enn den henter inn. Forventet effekt: 2 100 kr i uken.",
    },
    {
      text: "Bestill 20 % mindre ferskvare før regnhelgen.",
      why: "Meldt regn på lørdag treffer uteserveringen hardt: historisk faller salget 24 % på slike dager. Forventet effekt: 1 900 kr.",
    },
  ];

  const shell = document.querySelector("[data-recommend]");
  if (!shell) return;

  const textNode = shell.querySelector("[data-recommend-text]");
  const whyNode = shell.querySelector("[data-recommend-why]");
  const indexNode = shell.querySelector("[data-recommend-index]");
  const previous = shell.querySelector("[data-recommend-prev]");
  const next = shell.querySelector("[data-recommend-next]");

  let current = 0;

  function show(step) {
    current = (step + recommendations.length) % recommendations.length;
    const item = recommendations[current];

    const paint = () => {
      textNode.textContent = item.text;
      whyNode.textContent = item.why;
      indexNode.textContent = String(current + 1);
      textNode.classList.remove("is-swapping");
      whyNode.classList.remove("is-swapping");
    };

    if (reduceMotion) {
      paint();
      return;
    }

    textNode.classList.add("is-swapping");
    whyNode.classList.add("is-swapping");
    window.setTimeout(paint, 200);
  }

  previous.addEventListener("click", () => show(current - 1));
  next.addEventListener("click", () => show(current + 1));

  // Piltastene blar når fokus står i kortet.
  shell.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      show(current - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      show(current + 1);
    }
  });
})();
