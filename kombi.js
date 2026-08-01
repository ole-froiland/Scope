const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function initHeroWord() {
  const word = document.querySelector("[data-hero-word]");
  const words = ["mat", "vin", "kultur", "kaffe"];
  if (!word || reducedMotion.matches) return;

  const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));

  const run = async () => {
    let wordIndex = 0;

    while (word.isConnected) {
      await wait(2200);

      for (let index = word.textContent.length - 1; index >= 0; index -= 1) {
        word.textContent = word.textContent.slice(0, index);
        await wait(80);
      }

      wordIndex = (wordIndex + 1) % words.length;
      const nextWord = words[wordIndex];
      word.dataset.word = nextWord;
      await wait(180);

      for (let index = 1; index <= nextWord.length; index += 1) {
        word.textContent = nextWord.slice(0, index);
        await wait(120);
      }
    }
  };

  run();
}

function initMobileMenu() {
  const toggle = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-mobile-menu]");
  if (!toggle || !menu) return;

  const setOpen = (isOpen, restoreFocus = false) => {
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.textContent = isOpen ? "Lukk" : "Meny";
    menu.hidden = !isOpen;
    document.body.classList.toggle("menu-open", isOpen);
    if (restoreFocus) toggle.focus();
  };

  toggle.addEventListener("click", () => setOpen(menu.hidden));
  menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setOpen(false)));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !menu.hidden) setOpen(false, true);
  });

  window.matchMedia("(min-width: 981px)").addEventListener("change", (event) => {
    if (event.matches) setOpen(false);
  });
}

function initHeaderScroll() {
  const header = document.querySelector("[data-site-header]");
  if (!header) return;

  let lastY = Math.max(window.scrollY, 0);
  let scheduled = false;

  const update = () => {
    const currentY = Math.max(window.scrollY, 0);
    const menuIsOpen = document.body.classList.contains("menu-open");

    if (menuIsOpen || currentY <= 12 || currentY < lastY) {
      header.classList.remove("is-hidden");
    } else if (currentY > lastY && currentY > header.offsetHeight) {
      header.classList.add("is-hidden");
    }

    lastY = currentY;
    scheduled = false;
  };

  window.addEventListener("scroll", () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(update);
  }, { passive: true });

  header.addEventListener("focusin", () => header.classList.remove("is-hidden"));
}

function initProcessCards() {
  const cards = [...document.querySelectorAll("[data-process-card]")];
  const list = cards[0]?.closest("ol");
  const desktop = window.matchMedia("(min-width: 641px)");
  if (!cards.length || !list) return;

  let activeIndex = Math.max(0, cards.findIndex((card) => card.classList.contains("is-active")));
  let timer = null;

  const setActive = (index) => {
    activeIndex = (index + cards.length) % cards.length;
    cards.forEach((card, cardIndex) => {
      const isActive = cardIndex === activeIndex;
      card.classList.toggle("is-active", isActive);
      card.setAttribute("aria-pressed", String(isActive));
      card.closest("li")?.classList.toggle("is-active", isActive);
    });
  };

  const stopRotation = () => {
    if (timer === null) return;
    window.clearInterval(timer);
    timer = null;
  };

  const startRotation = () => {
    stopRotation();
    if (reducedMotion.matches || !desktop.matches) return;
    timer = window.setInterval(() => setActive(activeIndex + 1), 4800);
  };

  cards.forEach((card, index) => {
    card.addEventListener("click", () => {
      stopRotation();
      setActive(index);
    });
    card.addEventListener("focus", () => {
      stopRotation();
      setActive(index);
    });
  });

  list.addEventListener("pointerenter", stopRotation);
  list.addEventListener("pointerleave", startRotation);
  list.addEventListener("focusout", (event) => {
    if (!list.contains(event.relatedTarget)) startRotation();
  });
  desktop.addEventListener("change", startRotation);

  setActive(activeIndex);
  startRotation();
}

function initReveal() {
  const items = [...document.querySelectorAll("[data-reveal]")];
  if (!items.length || reducedMotion.matches || !("IntersectionObserver" in window)) return;

  document.documentElement.classList.add("reveal-ready");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8%", threshold: 0.1 });

  items.forEach((item) => observer.observe(item));
}

function initAdvice() {
  const rows = [...document.querySelectorAll("[data-advice-row]")];
  const detail = document.querySelector("[data-advice-detail]");
  if (!rows.length || !detail) return;

  rows.forEach((row) => row.addEventListener("click", () => {
    rows.forEach((candidate) => {
      const isActive = candidate === row;
      candidate.classList.toggle("is-active", isActive);
      candidate.setAttribute("aria-pressed", String(isActive));
      const label = candidate.querySelector("small");
      if (label) label.textContent = isActive ? "Åpent" : "Se hvorfor";
    });
    detail.textContent = row.dataset.detail;
  }));
}

function initTestFormDialog() {
  const dialog = document.querySelector("[data-test-form-wrap]");
  const openButtons = [...document.querySelectorAll("[data-open-test-form]")];
  const closeButton = document.querySelector("[data-close-test-form]");
  const firstInput = dialog?.querySelector("input:not([type='hidden'])");
  if (!dialog || !openButtons.length || !closeButton) return;

  let opener = null;
  const setOpen = (isOpen) => {
    dialog.hidden = !isOpen;
    document.body.classList.toggle("form-open", isOpen);
    if (isOpen) {
      firstInput?.focus();
    } else {
      opener?.focus();
    }
  };

  openButtons.forEach((button) => button.addEventListener("click", (event) => {
    event.preventDefault();
    opener = button;
    setOpen(true);
  }));

  closeButton.addEventListener("click", () => setOpen(false));
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !dialog.hidden) setOpen(false);
  });
}

function initLeadForm() {
  const form = document.querySelector("[data-lead-form]");
  const success = document.querySelector("[data-form-success]");
  if (!form || !success) return;

  const status = form.querySelector("[data-form-status]");
  const submit = form.querySelector("button[type='submit']");
  const reference = success.querySelector("[data-form-reference]");
  form.dataset.startedAt = String(Date.now());

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "";
    form.querySelectorAll("[aria-invalid='true']").forEach((field) => field.removeAttribute("aria-invalid"));

    if (!form.checkValidity()) {
      const invalid = form.querySelector(":invalid");
      invalid?.setAttribute("aria-invalid", "true");
      invalid?.focus();
      status.textContent = invalid?.validity.typeMismatch
        ? "Skriv inn en gyldig e-postadresse."
        : "Fyll ut de obligatoriske feltene.";
      return;
    }

    const formData = new FormData(form);
    const payload = {
      inquiryType: "prospect",
      name: formData.get("name"),
      company: formData.get("company"),
      email: formData.get("email"),
      phone: "",
      businessType: formData.get("businessType"),
      locations: Number(formData.get("locations")),
      systems: formData.getAll("systems"),
      message: "Ønsker å delta som testkunde via Kombi-landingssiden.",
      website: formData.get("website"),
      formStartedAt: Number(form.dataset.startedAt),
    };

    submit.disabled = true;
    submit.textContent = "Sender …";
    status.textContent = "Sender forespørselen …";

    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Innsendingen mislyktes. Prøv igjen.");
      form.hidden = true;
      success.hidden = false;
      reference.textContent = result.referenceNumber ? `Referanse: #${result.referenceNumber}` : "Vi svarer så snart vi kan.";
      success.focus?.();
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Innsendingen mislyktes. Prøv igjen.";
    } finally {
      submit.disabled = false;
      submit.textContent = "Send forespørsel";
    }
  });
}

initHeroWord();
initMobileMenu();
initHeaderScroll();
initProcessCards();
initReveal();
initAdvice();
initTestFormDialog();
initLeadForm();
