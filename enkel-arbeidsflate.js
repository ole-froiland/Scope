// Scope-arbeidsflaten på /enkel: fanevisninger, et råd som glir inn fra høyre,
// og kort som faktisk lar seg dra mellom kolonnene.

const arbWindow = document.querySelector("[data-arb-window]");

if (arbWindow) {
  const arbViews = Array.from(arbWindow.querySelectorAll("[data-arb-view]"));
  const arbPanels = Array.from(arbWindow.querySelectorAll("[data-arb-panel]"));
  const arbBoard = arbWindow.querySelector("[data-arb-board]");
  const arbPeek = arbWindow.querySelector("[data-arb-peek]");
  const arbToast = arbWindow.querySelector("[data-arb-toast]");
  const arbNewCount = arbWindow.querySelector("[data-arb-new-count]");
  const arbNewWord = arbWindow.querySelector("[data-arb-new-word]");
  const arbNewSum = arbWindow.querySelector("[data-arb-new-sum]");
  const arbFinePointer = window.matchMedia("(pointer: fine)");

  // Grunnlaget bak hvert råd. Tallene i «rader» er de samme som kortet viser,
  // og regnestykket i «note» skal alltid gå opp mot «effekt».
  const arbDetails = {
    1: {
      kategori: "Bemanning",
      status: "Nytt",
      kilde: "Planday + PC-Kasse",
      periode: "Siste åtte torsdager",
      effekt: "≈ 2 600 kr / måned",
      ingress: "Salget faller 61 % etter lunsj, men bemanningen står stille. Flytt én vakt til fredag kveld og ta ut den andre.",
      rader: [
        ["Salg kl. 14–16", "1 240 kr"],
        ["På vakt i samme timer", "4 personer"],
        ["Lønn i de to timene", "2 440 kr"],
      ],
      note: "Én vakt tas ut: 2 timer × 305 kr/t × 4,33 torsdager. Den andre vakten flyttes til fredag kveld og regnes ikke som besparelse.",
    },
    2: {
      kategori: "Meny",
      status: "Nytt",
      kilde: "Lightspeed + Tripletex",
      periode: "Siste 90 dager",
      effekt: "≈ 2 800 kr / måned",
      ingress: "Råvareprisen har steget 38 % siden mai uten at menyprisen har fulgt etter. 18 kroner opp gir margin på nivå med resten av menyen.",
      rader: [
        ["Solgte porsjoner", "182 / mnd"],
        ["Råvarekost pr. porsjon", "84 kr"],
        ["Dekningsgrad", "51 %"],
      ],
      note: "18 kr høyere menypris × 182 porsjoner, minus 15 % anslått fall i volum.",
    },
    3: {
      kategori: "Omtaler",
      status: "Nytt",
      kilde: "Google Reviews + Quinyx",
      periode: "Siste 30 dager",
      effekt: "Ikke tallfestet",
      ingress: "Alle fire spiste mellom 19:30 og 20:15, kvelden kjøkkenet gikk med én kokk mindre enn normalt. Dette er bemanning, ikke service.",
      rader: [
        ["Omtaler som nevner ventetid", "4"],
        ["Kokker på vakt den kvelden", "3"],
        ["Snitt siste 30 dager", "3,9 av 5"],
      ],
      note: "Omtaler slår inn på belegget over tid, men vi setter ikke et kronetall på det. Rådet teller derfor ikke i den anslåtte effekten.",
    },
    4: {
      kategori: "Innkjøp",
      status: "Nytt",
      kilde: "Tripletex + lager",
      periode: "Siste tolv måneder",
      effekt: "≈ 1 600 kr / måned",
      ingress: "Bestillingene følger fjorårets volum mens salget har falt 25 %. Reduser neste bestilling og behold en buffer til helgen.",
      rader: [
        ["Bestilt pr. måned", "48 kg"],
        ["Brukt pr. måned", "36 kg"],
        ["Kastet", "12 kg"],
      ],
      note: "9 kg mindre pr. måned × 182 kr/kg. Tre kilo beholdes som buffer til helgen.",
    },
    5: {
      kategori: "Bemanning",
      status: "I gang",
      kilde: "Planday",
      periode: "Fra 10. september",
      effekt: "Måles i fire uker",
      ingress: "Vaktplanen for søndager er lagt om. Scope måler effekten mot samme periode i fjor og sier fra når tallene er inne.",
      rader: [
        ["Vakter flyttet", "2"],
        ["Timer pr. søndag", "− 3"],
        ["Måleperiode", "4 uker"],
      ],
      note: "Effekten føres først opp når fire hele uker er målt mot fjoråret.",
    },
    6: {
      kategori: "Meny",
      status: "I gang",
      kilde: "Lightspeed",
      periode: "Fra 8. september",
      effekt: "Måles i fire uker",
      ingress: "Tre forretter fikk ny pris 8. september. Scope følger både margin og solgte porsjoner, slik at et volumfall fanges opp.",
      rader: [
        ["Retter justert", "3"],
        ["Snitt prisøkning", "14 kr"],
        ["Måleperiode", "4 uker"],
      ],
      note: "Hvis volumet faller mer enn 15 %, varsler Scope og foreslår å rulle tilbake.",
    },
    7: {
      kategori: "Innkjøp",
      status: "Målt",
      kilde: "Tripletex + lager",
      periode: "Målt i fire uker",
      effekt: "+ 1 600 kr / måned",
      ingress: "Den faste avokadobestillingen ble kuttet fra 48 til 39 kilo. Svinnet falt som anslått, uten at noen rett gikk tom.",
      rader: [
        ["Bestilt før", "48 kg"],
        ["Bestilt nå", "39 kg"],
        ["Svinn nå", "3 kg"],
      ],
      note: "Målt mot de fire ukene før tiltaket, samme antall gjester.",
    },
    8: {
      kategori: "Bemanning",
      status: "Målt",
      kilde: "Planday + PC-Kasse",
      periode: "Målt i fire uker",
      effekt: "+ 2 400 kr / måned",
      ingress: "Én vakt ble flyttet fra torsdag ettermiddag til fredag kveld. Fredagsomsetningen holdt seg, torsdagslønnen falt.",
      rader: [
        ["Timer flyttet", "8 / mnd"],
        ["Omsetning fredag", "uendret"],
        ["Lønn torsdag", "− 2 400 kr"],
      ],
      note: "Målt mot de fire ukene før tiltaket.",
    },
    9: {
      kategori: "Meny",
      status: "Målt",
      kilde: "Lightspeed + Tripletex",
      periode: "Målt i seks uker",
      effekt: "+ 3 100 kr / måned",
      ingress: "Husets burger gikk opp 15 kroner. Volumet falt 4 %, altså langt mindre enn marginen vant.",
      rader: [
        ["Prisøkning", "15 kr"],
        ["Solgte porsjoner", "− 4 %"],
        ["Margin pr. porsjon", "+ 13 kr"],
      ],
      note: "Målt over seks uker mot samme periode før prisendringen.",
    },
  };

  const peekTitle = arbPeek?.querySelector("[data-arb-peek-title]");
  const peekCrumb = arbPeek?.querySelector("[data-arb-peek-crumb]");
  const peekStatus = arbPeek?.querySelector("[data-arb-peek-status]");
  const peekSource = arbPeek?.querySelector("[data-arb-peek-source]");
  const peekPeriod = arbPeek?.querySelector("[data-arb-peek-period]");
  const peekEffect = arbPeek?.querySelector("[data-arb-peek-effect]");
  const peekLead = arbPeek?.querySelector("[data-arb-peek-lead]");
  const peekRows = arbPeek?.querySelector("[data-arb-peek-rows]");
  const peekNote = arbPeek?.querySelector("[data-arb-peek-note]");
  const peekStart = arbPeek?.querySelector("[data-arb-peek-start]");
  const peekSnooze = arbPeek?.querySelector("[data-arb-peek-snooze]");
  const peekClose = arbPeek?.querySelector("[data-arb-peek-close]");

  let openCardId = null;
  let toastTimer = null;

  /* ---------- Fanevisninger ---------- */

  function showView(name) {
    arbViews.forEach((view) => {
      const isActive = view.dataset.arbView === name;

      view.classList.toggle("is-active", isActive);
      view.setAttribute("aria-selected", String(isActive));
      view.tabIndex = isActive ? 0 : -1;
    });

    arbPanels.forEach((panel) => {
      panel.hidden = panel.dataset.arbPanel !== name;
    });

    if (name !== "tavle") closePeek();
  }

  arbViews.forEach((view, index) => {
    view.tabIndex = view.classList.contains("is-active") ? 0 : -1;
    view.addEventListener("click", () => showView(view.dataset.arbView));
    view.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;

      event.preventDefault();
      const step = event.key === "ArrowRight" ? 1 : -1;
      const next = arbViews[(index + step + arbViews.length) % arbViews.length];
      showView(next.dataset.arbView);
      next.focus();
    });
  });

  /* ---------- Tellere og anslått effekt ---------- */

  function kroner(text) {
    const match = /(\d[\d\s]*)\s*kr/.exec(text || "");

    return match ? Number(match[1].replace(/\s/g, "")) : 0;
  }

  function refreshCounts() {
    arbWindow.querySelectorAll("[data-arb-col]").forEach((col) => {
      const counter = col.querySelector("[data-arb-count]");
      const cards = col.querySelectorAll(".arb-card").length;

      if (counter) counter.textContent = String(cards);
    });

    const nyeCol = arbWindow.querySelector('[data-arb-col="nye"]');
    if (!nyeCol || !arbNewCount || !arbNewSum) return;

    const cards = Array.from(nyeCol.querySelectorAll(".arb-card"));
    const sum = cards.reduce((total, card) => {
      const amount = card.querySelector(".arb-card-amount");

      // Råd uten kronesum skal ikke telle med i anslaget.
      return total + (amount && !amount.classList.contains("is-quiet") ? kroner(amount.textContent) : 0);
    }, 0);

    arbNewCount.textContent = String(cards.length);
    if (arbNewWord) arbNewWord.textContent = cards.length === 1 ? "nytt råd" : "nye råd";
    arbNewSum.textContent = sum > 0 ? `≈ ${sum.toLocaleString("nb-NO")} kr / måned` : "ingen tallfestede råd";
  }

  function showToast(message) {
    if (!arbToast) return;

    window.clearTimeout(toastTimer);
    arbToast.textContent = message;
    arbToast.hidden = false;
    toastTimer = window.setTimeout(() => {
      arbToast.hidden = true;
    }, 3200);
  }

  /* ---------- Rådet som glir inn ---------- */

  function openPeek(card) {
    const id = card.dataset.arbCard;
    const data = arbDetails[id];

    if (!data || !arbPeek) return;

    openCardId = id;
    peekTitle.textContent = card.querySelector(".arb-card-title").textContent.trim();
    peekCrumb.textContent = `Rådstavlen / ${data.kategori}`;
    peekStatus.textContent = data.status;
    peekStatus.className = `arb-pill ${
      data.status === "Målt" ? "arb-pill-done" : data.status === "I gang" ? "arb-pill-doing" : "arb-pill-new"
    }`;
    peekSource.textContent = data.kilde;
    peekPeriod.textContent = data.periode;
    peekEffect.textContent = data.effekt;
    peekLead.textContent = data.ingress;
    peekNote.textContent = data.note;

    peekRows.textContent = "";
    data.rader.forEach(([label, value]) => {
      const row = document.createElement("tr");
      const head = document.createElement("th");
      const cell = document.createElement("td");

      head.scope = "row";
      head.textContent = label;
      cell.textContent = value;
      row.append(head, cell);
      peekRows.append(row);
    });

    const isNew = card.closest('[data-arb-col="nye"]');
    peekStart.hidden = !isNew;
    peekSnooze.hidden = !isNew;

    arbPeek.hidden = false;
    peekClose?.focus();
  }

  function closePeek() {
    if (!arbPeek || arbPeek.hidden) return;

    const card = arbWindow.querySelector(`[data-arb-card="${openCardId}"]`);

    arbPeek.hidden = true;
    openCardId = null;
    card?.focus();
  }

  peekClose?.addEventListener("click", closePeek);

  arbWindow.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closePeek();
  });

  peekSnooze?.addEventListener("click", () => {
    showToast("Rådet er utsatt til neste uke.");
    closePeek();
  });

  peekStart?.addEventListener("click", () => {
    const card = arbWindow.querySelector(`[data-arb-card="${openCardId}"]`);
    const target = arbWindow.querySelector('[data-arb-col="igang"] [data-arb-dropzone]');

    if (!card || !target) return;

    const klokke = new Date().toLocaleTimeString("nb-NO", { hour: "2-digit", minute: "2-digit" });
    const foot = card.querySelector(".arb-card-foot");

    if (foot) {
      foot.textContent = "";
      const who = document.createElement("span");
      who.className = "arb-card-who";
      const avatar = document.createElement("i");
      avatar.className = "arb-avatar arb-avatar-1";
      avatar.textContent = "IH";
      who.append(avatar, document.createTextNode(`Satt i gang ${klokke}`));
      foot.append(who);
    }

    if (arbDetails[openCardId]) {
      arbDetails[openCardId].status = "I gang";
      arbDetails[openCardId].periode = `Satt i gang i dag ${klokke}`;
    }

    target.prepend(card);
    refreshCounts();
    showToast(`Satt i gang. Scope måler effekten i fire uker.`);
    closePeek();
  });

  /* ---------- Kort: klikk for å åpne, dra for å flytte ---------- */

  let drag = null;
  let arbSuppressClickUntil = 0;

  function dropzoneAt(x, y) {
    const element = document.elementFromPoint(x, y);

    return element ? element.closest("[data-arb-dropzone]") : null;
  }

  function clearDropzones() {
    arbWindow.querySelectorAll("[data-arb-dropzone]").forEach((zone) => zone.classList.remove("is-dropzone"));
  }

  function endDrag(event) {
    if (!drag) return;

    const moved = drag.started;

    if (drag.ghost) drag.ghost.remove();
    drag.card.classList.remove("is-dragging");
    clearDropzones();

    if (moved) {
      const zone = dropzoneAt(event.clientX, event.clientY);

      if (zone && zone !== drag.card.parentElement) {
        zone.append(drag.card);
        refreshCounts();
      } else if (zone) {
        // Slipp innenfor samme kolonne: sorter etter hvor pekeren står.
        const siblings = Array.from(zone.querySelectorAll(".arb-card")).filter((item) => item !== drag.card);
        const after = siblings.find((item) => {
          const rect = item.getBoundingClientRect();

          return event.clientY < rect.top + rect.height / 2;
        });

        if (after) zone.insertBefore(drag.card, after);
        else zone.append(drag.card);
      }
    }

    drag = null;

    // Hindrer at slippet også teller som et klikk og åpner rådet.
    if (moved) arbSuppressClickUntil = performance.now() + 400;
  }

  arbBoard?.addEventListener("pointerdown", (event) => {
    if (!arbFinePointer.matches || event.button !== 0) return;

    const card = event.target.closest(".arb-card");
    if (!card) return;

    drag = { card, startX: event.clientX, startY: event.clientY, started: false, ghost: null };

    try {
      card.setPointerCapture(event.pointerId);
    } catch {
      // Pekeren er allerede borte; draget faller tilbake på vanlige hendelser.
    }
  });

  arbBoard?.addEventListener("pointermove", (event) => {
    if (!drag) return;

    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;

    if (!drag.started) {
      if (Math.hypot(dx, dy) < 6) return;

      const rect = drag.card.getBoundingClientRect();

      drag.started = true;
      drag.offsetX = drag.startX - rect.left;
      drag.offsetY = drag.startY - rect.top;
      drag.ghost = drag.card.cloneNode(true);
      drag.ghost.classList.add("arb-card-ghost");
      drag.ghost.style.setProperty("--ghost-w", `${rect.width}px`);
      document.body.append(drag.ghost);
      drag.card.classList.add("is-dragging");
    }

    drag.ghost.style.left = `${event.clientX - drag.offsetX}px`;
    drag.ghost.style.top = `${event.clientY - drag.offsetY}px`;

    clearDropzones();
    dropzoneAt(event.clientX, event.clientY)?.classList.add("is-dropzone");
  });

  arbBoard?.addEventListener("pointerup", endDrag);
  arbBoard?.addEventListener("pointercancel", endDrag);

  arbBoard?.addEventListener("click", (event) => {
    if (performance.now() < arbSuppressClickUntil) {
      event.preventDefault();
      return;
    }

    const card = event.target.closest(".arb-card");
    if (card) openPeek(card);
  });

  refreshCounts();
}
