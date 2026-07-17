const carousel = document.querySelector("[data-scope-carousel]");

initMobileMenu();
initContactWidget();

if (carousel) {
  const section = carousel.closest(".how-section");
  const track = carousel.querySelector("[data-carousel-track]");
  const cards = [...carousel.querySelectorAll("[data-carousel-card]")];
  const dots = [...carousel.querySelectorAll("[data-carousel-dot]")];
  const previousButton = carousel.querySelector("[data-carousel-prev]");
  const nextButton = carousel.querySelector("[data-carousel-next]");
  const count = carousel.querySelector("[data-carousel-count]");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let activeIndex = 0;
  let isAnimating = false;
  let pointerStartX = null;

  const updateActiveCard = (index) => {
    activeIndex = Math.max(0, Math.min(index, cards.length - 1));

    cards.forEach((card, cardIndex) => {
      const deckPosition = (cardIndex - activeIndex + cards.length) % cards.length;
      card.dataset.deckPosition = String(deckPosition);
      card.classList.toggle("is-active", deckPosition === 0);
      card.setAttribute("aria-hidden", deckPosition === 0 ? "false" : "true");
    });

    dots.forEach((dot, dotIndex) => {
      if (dotIndex === activeIndex) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });

    previousButton.disabled = activeIndex === 0;
    nextButton.disabled = activeIndex === cards.length - 1;
    count.textContent = `${activeIndex + 1} / ${cards.length}`;
  };

  const animateToCard = (index) => {
    const targetIndex = Math.max(0, Math.min(index, cards.length - 1));
    if (targetIndex === activeIndex || isAnimating) return;

    if (reduceMotion) {
      updateActiveCard(targetIndex);
      return;
    }

    const direction = targetIndex > activeIndex ? "forward" : "backward";
    const outgoingCard = cards[activeIndex];
    isAnimating = true;
    track.setAttribute("aria-busy", "true");
    outgoingCard.classList.add(`is-card-out-${direction}`);

    window.setTimeout(() => {
      outgoingCard.classList.remove(`is-card-out-${direction}`);
      updateActiveCard(targetIndex);

      window.setTimeout(() => {
        track.removeAttribute("aria-busy");
        isAnimating = false;
      }, 280);
    }, 320);
  };

  previousButton.addEventListener("click", () => animateToCard(activeIndex - 1));
  nextButton.addEventListener("click", () => animateToCard(activeIndex + 1));
  dots.forEach((dot, index) => dot.addEventListener("click", () => animateToCard(index)));

  track.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      animateToCard(activeIndex - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      animateToCard(activeIndex + 1);
    }
  });

  track.addEventListener("pointerdown", (event) => {
    if (!event.isPrimary) return;
    pointerStartX = event.clientX;
  });

  track.addEventListener("pointerup", (event) => {
    if (pointerStartX === null || !event.isPrimary) return;
    const distance = event.clientX - pointerStartX;
    pointerStartX = null;
    if (distance <= -45) animateToCard(activeIndex + 1);
    if (distance >= 45) animateToCard(activeIndex - 1);
  });

  track.addEventListener("pointercancel", () => {
    pointerStartX = null;
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      section.classList.add("is-visible");
      observer.disconnect();
    }, { threshold: 0.18 });
    observer.observe(section);
  } else {
    section.classList.add("is-visible");
  }

  updateActiveCard(0);
}
function initMobileMenu() {
  const menu = document.querySelector("[data-mobile-menu]");
  const toggle = document.querySelector("[data-menu-toggle]");
  if (!menu || !toggle) return;

  const mobileViewport = window.matchMedia("(max-width: 800px)");
  const menuLinks = [...menu.querySelectorAll("a[href]")];
  let closeTimer;

  const setOpen = (isOpen, restoreFocus = true) => {
    window.clearTimeout(closeTimer);
    toggle.setAttribute("aria-expanded", String(isOpen));
    toggle.setAttribute("aria-label", isOpen ? "Lukk meny" : "Åpne meny");
    document.body.classList.toggle("menu-open", isOpen);

    if (isOpen) {
      menu.hidden = false;
      window.requestAnimationFrame(() => {
        menu.classList.add("is-open");
        menuLinks[0]?.focus();
      });
      return;
    }

    menu.classList.remove("is-open");
    closeTimer = window.setTimeout(() => { menu.hidden = true; }, 220);
    if (restoreFocus) toggle.focus();
  };

  toggle.addEventListener("click", () => setOpen(!document.body.classList.contains("menu-open")));
  menuLinks.forEach((link) => link.addEventListener("click", () => setOpen(false, false)));

  document.addEventListener("keydown", (event) => {
    if (!document.body.classList.contains("menu-open")) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key !== "Tab" || !menuLinks.length) return;
    const firstLink = menuLinks[0];
    const lastLink = menuLinks[menuLinks.length - 1];
    if (event.shiftKey && document.activeElement === firstLink) {
      event.preventDefault();
      lastLink.focus();
    } else if (!event.shiftKey && document.activeElement === lastLink) {
      event.preventDefault();
      firstLink.focus();
    }
  });

  mobileViewport.addEventListener("change", (event) => {
    if (!event.matches && document.body.classList.contains("menu-open")) setOpen(false, false);
  });
}

function initContactWidget() {
  const widget = document.querySelector(".contact-widget");
  if (!widget) return;

  const compactViewport = window.matchMedia("(max-width: 800px)");
  const bubble = widget.querySelector(".contact-bubble");
  const panel = widget.querySelector(".contact-panel");
  const close = widget.querySelector(".contact-close");
  const back = widget.querySelector(".contact-back");
  const title = widget.querySelector("#contact-panel-title");
  const subtitle = widget.querySelector(".contact-panel-head p");
  const choices = [...widget.querySelectorAll("[data-contact-type]")];
  const choiceView = widget.querySelector(".contact-choice");
  const forms = [...widget.querySelectorAll("[data-contact-form]")];
  const success = widget.querySelector(".contact-success");
  const reset = widget.querySelector(".contact-reset");
  let contactType = "";

  const showChoice = () => {
    contactType = "";
    title.textContent = "Hei!";
    subtitle.textContent = "Hva gjelder det?";
    choiceView.hidden = false;
    back.hidden = true;
    success.hidden = true;
    forms.forEach((form) => { form.hidden = true; });
    choices[0]?.focus();
  };

  const setOpen = (isOpen) => {
    panel.hidden = !isOpen;
    bubble.setAttribute("aria-expanded", String(isOpen));
    document.body.classList.toggle("contact-open", isOpen && compactViewport.matches);
    if (isOpen) {
      const activeForm = forms.find((form) => !form.hidden);
      (activeForm?.querySelector("input:not(.contact-honeypot), select, textarea") || choices[0])?.focus();
    }
  };

  const setType = (type) => {
    contactType = type;
    const activeForm = forms.find((form) => form.dataset.contactForm === type);
    if (!activeForm) return;
    choiceView.hidden = true;
    back.hidden = false;
    success.hidden = true;
    forms.forEach((form) => { form.hidden = form !== activeForm; });
    title.textContent = type === "prospect" ? "Vil bli kunde" : "Er kunde";
    subtitle.textContent = type === "prospect" ? "Fortell litt om virksomheten deres." : "Hva trenger du hjelp med?";
    if (!activeForm.dataset.startedAt) activeForm.dataset.startedAt = String(Date.now());
    activeForm.querySelector("input:not(.contact-honeypot)")?.focus();
  };

  bubble.addEventListener("click", () => setOpen(panel.hidden));
  close.addEventListener("click", () => {
    setOpen(false);
    bubble.focus();
  });
  back.addEventListener("click", showChoice);
  choices.forEach((choice) => choice.addEventListener("click", () => setType(choice.dataset.contactType)));

  forms.forEach((form) => form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = form.querySelector(".contact-status");
    const submit = form.querySelector(".contact-submit");
    form.querySelectorAll("[aria-invalid='true']").forEach((field) => field.removeAttribute("aria-invalid"));

    if (form.dataset.contactForm === "prospect" && !form.querySelector("input[name='systems']:checked")) {
      status.textContent = "Velg minst ett system dere bruker.";
      form.querySelector("input[name='systems']")?.focus();
      return;
    }
    if (!form.checkValidity()) {
      const invalidField = form.querySelector(":invalid");
      invalidField?.setAttribute("aria-invalid", "true");
      invalidField?.focus();
      status.textContent = invalidField?.validity.typeMismatch ? "Skriv inn en gyldig e-postadresse." : "Fyll ut de obligatoriske feltene.";
      return;
    }

    const formData = new FormData(form);
    const payload = {
      inquiryType: contactType,
      name: formData.get("name"),
      company: formData.get("company"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      message: formData.get("message"),
      website: formData.get("website"),
      formStartedAt: Number(form.dataset.startedAt),
      ...(contactType === "customer" ? {
        subject: formData.get("subject"),
        category: formData.get("category"),
      } : {
        businessType: formData.get("businessType"),
        locations: Number(formData.get("locations")),
        systems: formData.getAll("systems"),
      }),
    };

    submit.disabled = true;
    submit.textContent = contactType === "prospect" ? "Sender forespørsel …" : "Sender spørsmål …";
    status.textContent = "Sender sikkert …";
    try {
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Innsendingen mislyktes. Prøv igjen.");
      form.hidden = true;
      back.hidden = true;
      success.hidden = false;
      success.querySelector("strong").textContent = contactType === "prospect" ? "Takk! Vi tar kontakt for å se om Scope passer for dere." : "Takk! Vi har mottatt spørsmålet ditt.";
      success.querySelector(".contact-reference").textContent = `Referanse: #${result.referenceNumber}`;
      success.querySelector(".contact-success-detail").textContent = "Vi svarer så snart vi kan.";
      if ("BroadcastChannel" in window) {
        const channel = new BroadcastChannel("scope-inquiries");
        channel.postMessage({ referenceNumber: result.referenceNumber });
        channel.close();
      }
      reset.focus();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      submit.disabled = false;
      submit.textContent = contactType === "prospect" ? "Send forespørsel" : "Send spørsmål";
    }
  }));

  reset.addEventListener("click", () => {
    forms.forEach((form) => {
      form.reset();
      form.removeAttribute("data-started-at");
      form.querySelector(".contact-status").textContent = "";
    });
    showChoice();
  });

  document.addEventListener("click", (event) => {
    if (!panel.hidden && !widget.contains(event.target)) setOpen(false);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) {
      setOpen(false);
      bubble.focus();
    }
  });
  compactViewport.addEventListener("change", () => {
    document.body.classList.toggle("contact-open", !panel.hidden && compactViewport.matches);
  });
}
