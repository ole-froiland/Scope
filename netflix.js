const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// Samme ord og fargekoder som Enkel-siden bruker.
const heroWords = [
  { text: "mat", colorClass: "is-red" },
  { text: "vin", colorClass: "is-blue" },
  { text: "kultur", colorClass: "is-green" },
  { text: "kaffe", colorClass: "is-brown" },
  { text: "indisk", colorClass: "is-orange" },
  { text: "stemning", colorClass: "is-gold" },
  { text: "tartar", colorClass: "is-green" },
];

const colorClasses = ["is-red", "is-blue", "is-green", "is-brown", "is-orange", "is-gold"];

function initHeroWord() {
  const word = document.querySelector("[data-hero-word]");
  if (!word || reducedMotion.matches) return;

  const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));

  const setColor = (colorClass) => {
    word.classList.remove(...colorClasses);
    word.classList.add(colorClass);
  };

  const run = async () => {
    let wordIndex = 0;

    while (word.isConnected) {
      await wait(2200);

      for (let index = word.textContent.length - 1; index >= 0; index -= 1) {
        word.textContent = word.textContent.slice(0, index);
        await wait(80);
      }

      wordIndex = (wordIndex + 1) % heroWords.length;
      const next = heroWords[wordIndex];
      word.dataset.word = next.text;
      setColor(next.colorClass);
      await wait(180);

      for (let index = 1; index <= next.text.length; index += 1) {
        word.textContent = next.text.slice(0, index);
        await wait(120);
      }
    }
  };

  run();
}

// Kontaktboble — samme oppførsel som på de andre landingssidene.
function initContactWidget() {
  const widget = document.querySelector(".contact-widget");
  if (!widget) return;

  const bubble = widget.querySelector(".contact-bubble");
  const panel = widget.querySelector(".contact-panel");
  const closeButton = widget.querySelector(".contact-close");
  const choiceButtons = [...widget.querySelectorAll(".contact-choice button")];
  const form = widget.querySelector(".contact-form");
  const companyField = widget.querySelector(".contact-company-field");
  const companyInput = widget.querySelector("input[name='company']");
  const messageInput = widget.querySelector("textarea[name='message']");
  const status = widget.querySelector(".contact-status");
  let contactType = "";

  const setOpen = (isOpen) => {
    panel.hidden = !isOpen;
    bubble.setAttribute("aria-expanded", String(isOpen));

    if (isOpen) {
      choiceButtons[0].focus();
    }
  };

  const setContactType = (type) => {
    contactType = type;
    form.hidden = false;
    status.textContent = "";

    choiceButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.contactType === type);
    });

    const needsCompany = type === "prospect";

    companyField.hidden = !needsCompany;
    companyInput.required = needsCompany;

    if (needsCompany) {
      companyInput.focus();
    } else {
      companyInput.value = "";
      messageInput.focus();
    }
  };

  bubble.addEventListener("click", () => {
    setOpen(panel.hidden);
  });

  closeButton.addEventListener("click", () => {
    setOpen(false);
    bubble.focus();
  });

  choiceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setContactType(button.dataset.contactType);
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const company = companyInput.value.trim();
    const message = messageInput.value.trim();

    if (contactType === "prospect" && !company) {
      status.textContent = "Skriv inn selskap.";
      companyInput.focus();
      return;
    }

    const subject = contactType === "prospect"
      ? `Vil bli kunde${company ? `: ${company}` : ""}`
      : "Spørsmål fra kunde";
    const bodyLines = [
      contactType === "prospect" ? "Jeg ønsker å bli kunde." : "Jeg er kunde.",
      company ? `Selskap: ${company}` : "",
      message ? `Melding: ${message}` : "",
    ].filter(Boolean);

    window.location.href = `mailto:post@scopeanalytics.no?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join("\n\n"))}`;
  });

  document.addEventListener("click", (event) => {
    if (panel.hidden || widget.contains(event.target)) return;
    setOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      setOpen(false);
      bubble.focus();
    }
  });
}

// Logg inn — portalen er ikke åpen ennå, så skjemaet validerer og forklarer
// heller enn å late som om det logger noen inn.
function initLoginForm() {
  const form = document.querySelector(".auth-form");
  if (!form) return;

  const email = form.querySelector("input[name='email']");
  const password = form.querySelector("input[name='password']");
  const status = form.querySelector(".auth-status");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    status.classList.remove("is-info");

    if (!email.value.trim() || !email.checkValidity()) {
      status.textContent = "Skriv inn en gyldig e-postadresse.";
      email.focus();
      return;
    }

    if (!password.value) {
      status.textContent = "Skriv inn passordet ditt.";
      password.focus();
      return;
    }

    status.classList.add("is-info");
    status.textContent = "Portalen er ikke åpen ennå. Send oss en e-post på post@scopeanalytics.no, så ordner vi tilgang.";
  });
}

// Stolpene i bemanningsgrafen skal vokse opp først når grafen er på skjermen,
// ellers er showet over før noen ser det. is-armed skjuler dem, så den settes
// bare herfra – da står grafen ferdig tegnet om skriptet aldri kjører.
function initAdviceChart() {
  const chart = document.querySelector(".advice-chart");
  if (!chart || reducedMotion.matches) return;

  chart.classList.add("is-armed");

  const play = () => chart.classList.add("is-live");

  if (!("IntersectionObserver" in window)) {
    play();
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      play();
      observer.disconnect();
    });
  }, { threshold: 0.35 });

  observer.observe(chart);
}

initHeroWord();
initContactWidget();
initLoginForm();
initAdviceChart();
