/* ==========================================================================
   Sesong — årshjulet.
   Månedene kan velges både i hjulet (peker) og på knappene under (tastatur
   og skjermleser). Innholdet i rådkortet er det samme uansett vei inn.
   ========================================================================== */

(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const months = {
    jan: {
      navn: "Januar", indeks: 62,
      rad: "Kutt én vakt på mandag og tirsdag ut måneden.",
      hvorfor: "Januar starter rolig etter jul: de to første ukedagene ligger 38 % under snittet ditt. Bemanninga har ikke fulgt etter.",
      effekt: "+6 400 kr i måneden",
    },
    feb: {
      navn: "Februar", indeks: 68,
      rad: "Legg vinterferieuka inn i vaktplanen nå.",
      hvorfor: "Trafikken flytter seg fra lunsj til ettermiddag i ferieuka. Samme antall timer, feil plassert, koster deg mest.",
      effekt: "+4 100 kr i uka",
    },
    mar: {
      navn: "Mars", indeks: 74,
      rad: "Sett ned bestillingen av ferskvare med 15 % fram til påske.",
      hvorfor: "Mars ligger jevnt, men svinnet ditt topper seg her. Lageret bygges for en helg som ikke kommer før i april.",
      effekt: "+3 300 kr i måneden",
    },
    apr: {
      navn: "April", indeks: 84,
      rad: "Åpne uteserveringen på den første dagen over 14 grader.",
      hvorfor: "Historisk hopper salget 31 % den første milde helgen. I fjor var dere klare fire dager for sent.",
      effekt: "+12 700 kr i påskeuka",
    },
    mai: {
      navn: "Mai", indeks: 97,
      rad: "Doble bemanninga rundt 17. mai, men bare mellom 11 og 15.",
      hvorfor: "Trykket er ekstremt, men kortvarig. Full bemanning hele dagen spiser opp hele gevinsten.",
      effekt: "+9 800 kr",
    },
    jun: {
      navn: "Juni", indeks: 104,
      rad: "Flytt to vakter fra tirsdag til søndag ettermiddag.",
      hvorfor: "Søndagene tar av så snart det er sol, mens tirsdagene ligger flatt. Timene finnes allerede i planen din.",
      effekt: "+5 600 kr i uka",
    },
    jul: {
      navn: "Juli", indeks: 112,
      rad: "Skjær menyen ned til 12 retter ut måneden.",
      hvorfor: "Fellesferien gir flere gjester og færre folk på kjøkkenet. Kortere meny gir raskere bord og mindre svinn.",
      effekt: "+14 200 kr i måneden",
    },
    aug: {
      navn: "August", indeks: 106,
      rad: "Behold sommerbemanninga to uker lenger enn i fjor.",
      hvorfor: "Salget faller først i uke 34, ikke uke 32. I fjor kuttet dere for tidlig og mistet to gode helger.",
      effekt: "+7 900 kr",
    },
    sep: {
      navn: "September", indeks: 94,
      rad: "Sett ny pris på de tre rettene med lavest dekningsgrad.",
      hvorfor: "Varekosten har steget 6 % siden mai uten at menyen har fulgt etter. Tre retter står for hele tapet.",
      effekt: "+8 400 kr i måneden",
    },
    okt: {
      navn: "Oktober", indeks: 88,
      rad: "Flytt lunsjåpningen én time senere på mandag og tirsdag.",
      hvorfor: "Første gjest kommer i snitt 12:40 når høstmørket setter inn. Timen før koster mer enn den henter inn.",
      effekt: "+2 100 kr i uka",
    },
    nov: {
      navn: "November", indeks: 96,
      rad: "Lås julebordmenyen til to alternativer nå.",
      hvorfor: "Bestillingene kommer inn i november, men innkjøpet skjer i desember. Færre valg gir mye lavere svinn.",
      effekt: "+11 500 kr i desember",
    },
    des: {
      navn: "Desember", indeks: 128,
      rad: "Legg inn en ekstra oppvask på de fire største kveldene.",
      hvorfor: "Servicen stopper i oppvasken, ikke på gulvet, når trykket er over 120 gjester. Det gir lengre ventetid og lavere snittbong.",
      effekt: "+16 300 kr",
    },
  };

  const order = Object.keys(months);
  const dial = document.querySelector("[data-dial]");
  if (!dial) return;

  const centerMonth = dial.querySelector("[data-dial-month]");
  const centerValue = dial.querySelector("[data-dial-value]");
  const insightMonth = document.querySelector("[data-insight-month]");
  const insightAdvice = document.querySelector("[data-insight-advice]");
  const insightWhy = document.querySelector("[data-insight-why]");
  const insightEffect = document.querySelector("[data-insight-effect]");
  const groups = Array.from(dial.querySelectorAll(".month"));
  const chips = Array.from(document.querySelectorAll("[data-month-button]"));

  let active = "jan";
  let autoplay = null;

  function select(key) {
    const month = months[key];
    if (!month) return;

    active = key;

    groups.forEach((group) => {
      group.classList.toggle("is-active", group.dataset.month === key);
    });
    chips.forEach((chip) => {
      const on = chip.dataset.monthButton === key;
      chip.classList.toggle("is-active", on);
      chip.setAttribute("aria-pressed", String(on));
    });

    centerMonth.textContent = month.navn;
    centerValue.textContent = `Indeks ${month.indeks}`;
    insightMonth.textContent = month.navn.toLowerCase();
    insightAdvice.textContent = month.rad;
    insightWhy.textContent = month.hvorfor;
    insightEffect.textContent = month.effekt;
  }

  function stopAutoplay() {
    if (autoplay === null) return;
    window.clearInterval(autoplay);
    autoplay = null;
  }

  groups.forEach((group) => {
    group.addEventListener("click", () => {
      stopAutoplay();
      select(group.dataset.month);
    });
  });

  chips.forEach((chip) => {
    chip.addEventListener("click", () => {
      stopAutoplay();
      select(chip.dataset.monthButton);
    });
  });

  // Hjulet går rundt av seg selv til noen tar over, slik at det er tydelig
  // at månedene kan velges. Stopper også når fanen ikke er synlig.
  if (!reduceMotion && "IntersectionObserver" in window) {
    const starter = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || autoplay !== null) return;
          starter.disconnect();
          autoplay = window.setInterval(() => {
            if (document.hidden) return;
            select(order[(order.indexOf(active) + 1) % order.length]);
          }, 2600);
        });
      },
      { threshold: 0.4 },
    );
    starter.observe(dial);

    ["pointerdown", "keydown", "wheel"].forEach((type) => {
      dial.addEventListener(type, stopAutoplay, { once: true });
    });
  }

  select("jan");

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

  /* --- Topplinja --------------------------------------------------------- */

  const nav = document.querySelector("[data-nav]");
  if (nav) {
    const sync = () => nav.classList.toggle("is-stuck", window.scrollY > 8);
    sync();
    window.addEventListener("scroll", sync, { passive: true });
  }
})();
