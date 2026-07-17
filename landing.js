(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  document.documentElement.classList.toggle("has-motion", !reduceMotion.matches);
  const hasMotion = !reduceMotion.matches;
  const hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  const compactViewport = window.matchMedia("(max-width: 720px)");

  if (initIntroPage()) return;

  initLoader();
  initHeader();
  initMobileMenu();
  initProductTabs();
  initBilling();
  initContactWidget();
  initStoryCardObserver();
  initCarousels();
  initStickyCta();
  revealEverything();

  if (hasMotion && hasGsap) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    initScrollReveals();
    if (!compactViewport.matches) {
      initSceneMotion();
    }
    initHeroWorld();
    initStoryCards();
    initDashboard();
    initBento();
    initMagneticButtons();
  }

  function initIntroPage() {
    const page = document.querySelector("[data-intro-page]");
    if (!page) return false;

    const target = page.dataset.introTarget || "landing.html";
    const skip = page.querySelector("[data-intro-skip]");
    const status = page.querySelector("[data-intro-status]");
    let hasLeft = false;

    const leave = () => {
      if (hasLeft) return;
      hasLeft = true;
      try {
        window.localStorage.setItem("scope-intro-seen", "1");
      } catch {
        // Introen skal fungere også når nettleseren blokkerer lokal lagring.
      }
      page.classList.add("is-leaving");
      window.setTimeout(() => window.location.assign(target), reduceMotion.matches ? 0 : 320);
    };

    skip?.addEventListener("click", leave);
    window.setTimeout(() => {
      if (status) status.textContent = "Oversikten er klar";
    }, reduceMotion.matches ? 120 : 1900);
    window.setTimeout(leave, reduceMotion.matches ? 650 : 2850);
    return true;
  }

  function revealEverything() {
    document.querySelectorAll(".reveal, .reveal-card").forEach((element) => {
      element.style.visibility = "visible";
    });
  }

  function initHeader() {
    const header = document.querySelector("[data-header]");
    if (!header) return;

    let previousY = window.scrollY;
    let ticking = false;

    const update = () => {
      const currentY = window.scrollY;
      header.classList.toggle("is-scrolled", currentY > 24);
      const canHide = !compactViewport.matches && !document.body.classList.contains("menu-open");
      header.classList.toggle("is-hidden", canHide && currentY > previousY && currentY > 240);
      previousY = currentY;
      ticking = false;
    };

    window.addEventListener("scroll", () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  }

  function initMobileMenu() {
    const menu = document.querySelector("[data-mobile-menu]");
    const toggle = document.querySelector("[data-menu-toggle]");
    const closeButton = menu?.querySelector("[data-menu-close]");
    const label = toggle?.querySelector("[data-menu-toggle-label]");
    if (!menu || !toggle || !closeButton) return;

    let closeTimer;
    let returnFocus = toggle;

    const focusableElements = () => Array.from(menu.querySelectorAll("a[href], button:not([disabled])"));

    const setOpen = (isOpen, restoreFocus = true) => {
      window.clearTimeout(closeTimer);
      toggle.setAttribute("aria-expanded", String(isOpen));
      if (label) label.textContent = isOpen ? "Lukk" : "Meny";
      document.body.classList.toggle("menu-open", isOpen);
      document.querySelector("[data-header]")?.classList.remove("is-hidden");
      window.dispatchEvent(new Event("scope:overlaychange"));

      if (isOpen) {
        returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : toggle;
        menu.hidden = false;
        window.requestAnimationFrame(() => {
          menu.classList.add("is-open");
          closeButton.focus();
        });
        return;
      }

      menu.classList.remove("is-open");
      closeTimer = window.setTimeout(() => { menu.hidden = true; }, 280);
      if (restoreFocus && returnFocus instanceof HTMLElement) returnFocus.focus();
    };

    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    closeButton.addEventListener("click", () => setOpen(false));
    menu.addEventListener("click", (event) => {
      if (event.target === menu || event.target.closest("a")) setOpen(false, event.target === menu);
    });
    document.addEventListener("keydown", (event) => {
      if (menu.hidden) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusableElements();
      if (!elements.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    window.matchMedia("(min-width: 1121px)").addEventListener("change", (event) => {
      if (event.matches && !menu.hidden) setOpen(false, false);
    });
  }

  function initProductTabs() {
    const groups = Array.from(document.querySelectorAll("[data-product-tabs]"));
    const tabs = Array.from(document.querySelectorAll("[data-product-tab]"));
    const views = Array.from(document.querySelectorAll("[data-view]"));
    if (!tabs.length || !views.length) return;

    const activate = (name, focusTarget = null) => {
      tabs.forEach((tab) => {
        const isActive = tab.dataset.productTab === name;
        tab.classList.toggle("is-active", isActive);
        tab.setAttribute("aria-selected", String(isActive));
        tab.tabIndex = isActive ? 0 : -1;
      });
      if (focusTarget) focusTarget.focus();
      views.forEach((view) => {
        const isActive = view.dataset.view === name;
        view.classList.toggle("is-active", isActive);
        view.setAttribute("aria-hidden", String(!isActive));
      });

      if (hasMotion && hasGsap && !compactViewport.matches) {
        const activeView = views.find((view) => view.dataset.view === name);
        window.gsap.fromTo(activeView, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "power2.out" });
        if (name === "today") animateDashboardContent();
        if (name === "report") animateReportLine();
      }
    };

    groups.forEach((group) => {
      const groupTabs = Array.from(group.querySelectorAll("[data-product-tab]"));
      groupTabs.forEach((tab, index) => {
        tab.tabIndex = tab.classList.contains("is-active") ? 0 : -1;
        tab.addEventListener("click", () => activate(tab.dataset.productTab));
        tab.addEventListener("keydown", (event) => {
          if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(event.key)) return;
          event.preventDefault();
          const direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : -1;
          const nextTab = groupTabs[(index + direction + groupTabs.length) % groupTabs.length];
          activate(nextTab.dataset.productTab, nextTab);
        });
      });
    });

    const adviceItems = Array.from(document.querySelectorAll("[data-advice-item]"));
    const detailTitle = document.querySelector("[data-advice-detail-title]");
    const detailCopy = document.querySelector("[data-advice-detail-copy]");

    adviceItems.forEach((item) => {
      item.addEventListener("click", () => {
        adviceItems.forEach((candidate) => {
          const isExpanded = candidate === item;
          candidate.classList.toggle("is-expanded", isExpanded);
          candidate.setAttribute("aria-expanded", String(isExpanded));
        });
        if (detailTitle) detailTitle.textContent = item.dataset.detailTitle;
        if (detailCopy) detailCopy.textContent = item.dataset.detailCopy;
      });
    });
  }

  function initBilling() {
    const buttons = Array.from(document.querySelectorAll("[data-billing]"));
    const prices = Array.from(document.querySelectorAll(".pricing .price"));
    const toggle = document.querySelector(".billing-toggle");
    if (!buttons.length) return;

    const renderAmount = (amount) => {
      let digitIndex = 0;
      return Array.from(amount).map((character) => {
        if (!/\d/.test(character)) {
          return '<span class="price-static">' + (character === " " ? "&nbsp;" : character) + "</span>";
        }

        const currentDigitIndex = digitIndex;
        digitIndex += 1;
        const strip = Array.from("0123456789", (digit) => "<span>" + digit + "</span>").join("");
        return '<span class="digit"><span class="digit-strip" style="--digit-index: ' + currentDigitIndex + "; transform: translateY(-" + character + 'em)">' + strip + "</span></span>";
      }).join("");
    };

    const setPrice = (price, amount, suffix) => {
      const number = price.querySelector(".price-number");
      const digitStrips = Array.from(number.querySelectorAll(".digit-strip"));
      const targetDigits = Array.from(amount).filter((character) => /\d/.test(character));

      if (digitStrips.length === targetDigits.length) {
        digitStrips.forEach((strip, index) => {
          strip.style.transform = "translateY(-" + targetDigits[index] + "em)";
        });
      } else {
        number.innerHTML = renderAmount(amount);
      }

      price.querySelector(".price-period").textContent = suffix;
    };

    prices.forEach((price) => {
      const [amount, suffix = "/mnd"] = price.dataset.monthly.split("|");
      price.innerHTML = '<span class="price-number">' + renderAmount(amount) + '</span><span class="price-period">' + suffix + "</span>";
    });

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        if (button.classList.contains("is-active")) return;
        const period = button.dataset.billing === "yearly" ? "yearly" : "monthly";
        buttons.forEach((candidate) => candidate.classList.toggle("is-active", candidate === button));
        toggle.classList.toggle("is-yearly", period === "yearly");
        prices.forEach((price) => {
          const value = price.dataset[period];
          if (!value) return;
          const [amount, suffix = "/mnd"] = value.split("|");
          setPrice(price, amount, suffix);
        });
      });
    });
  }

  function initContactWidget() {
    const widget = document.querySelector(".contact-widget");
    if (!widget) return;

    const bubble = widget.querySelector(".contact-bubble");
    const panel = widget.querySelector(".contact-panel");
    const close = widget.querySelector(".contact-close");
    const back = widget.querySelector(".contact-back");
    const title = widget.querySelector("#contact-panel-title");
    const subtitle = widget.querySelector(".contact-panel-head p");
    const choices = Array.from(widget.querySelectorAll("[data-contact-type]"));
    const choiceView = widget.querySelector(".contact-choice");
    const forms = Array.from(widget.querySelectorAll("[data-contact-form]"));
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
      choices[0].focus();
    };

    const setOpen = (isOpen) => {
      panel.hidden = !isOpen;
      bubble.setAttribute("aria-expanded", String(isOpen));
      document.body.classList.toggle("contact-open", isOpen && compactViewport.matches);
      window.dispatchEvent(new Event("scope:overlaychange"));
      if (isOpen) {
        const activeForm = forms.find((form) => !form.hidden);
        (activeForm?.querySelector("input:not(.contact-honeypot), select, textarea") || choices[0]).focus();
      }
    };

    const setType = (type) => {
      contactType = type;
      const activeForm = forms.find((form) => form.dataset.contactForm === type);
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
      status.classList.remove("is-success");
      form.querySelectorAll("[aria-invalid='true']").forEach((field) => field.removeAttribute("aria-invalid"));
      if (form.dataset.contactForm === "prospect" && !form.querySelector("input[name='systems']:checked")) {
        status.textContent = "Velg minst ett system dere bruker.";
        form.querySelector("input[name='systems']")?.focus();
        return;
      }
      if (!form.checkValidity()) {
        const invalidField = form.querySelector(":invalid");
        if (invalidField) {
          invalidField.setAttribute("aria-invalid", "true");
          invalidField.focus();
        }
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
        success.querySelector(".contact-reset").focus();
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

    let contactTicking = false;
    const updateMobileVisibility = () => {
      widget.classList.toggle("is-mobile-visible", compactViewport.matches && window.scrollY > 160);
      contactTicking = false;
    };
    window.addEventListener("scroll", () => {
      if (!contactTicking) {
        window.requestAnimationFrame(updateMobileVisibility);
        contactTicking = true;
      }
    }, { passive: true });
    compactViewport.addEventListener("change", updateMobileVisibility);
    updateMobileVisibility();
  }

  function initStickyCta() {
    const cta = document.querySelector("[data-sticky-cta]");
    const hero = document.querySelector(".hero");
    const footer = document.querySelector(".site-footer");
    if (!cta || !hero || !footer) return;

    const blockers = Array.from(document.querySelectorAll("[data-sticky-blocker]"));
    let ticking = false;
    const update = () => {
      const isMobile = compactViewport.matches;
      const hasPassedHero = hero.getBoundingClientRect().bottom <= 90;
      const isNearFooter = footer.getBoundingClientRect().top <= window.innerHeight + 70;
      const hasOverlay = document.body.classList.contains("menu-open") || document.body.classList.contains("contact-open");
      const hasVisibleBlocker = blockers.some((blocker) => {
        const rect = blocker.getBoundingClientRect();
        const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
        return visibleHeight > Math.min(72, rect.height * 0.15);
      });
      const isVisible = isMobile && hasPassedHero && !isNearFooter && !hasOverlay && !hasVisibleBlocker;
      document.body.classList.toggle("sticky-cta-blocked", hasVisibleBlocker);
      cta.classList.toggle("is-visible", isVisible);
      cta.setAttribute("aria-hidden", String(!isVisible));
      cta.tabIndex = isVisible ? 0 : -1;
      document.body.classList.toggle("sticky-cta-visible", isVisible);
      ticking = false;
    };
    const requestUpdate = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate, { passive: true });
    compactViewport.addEventListener("change", requestUpdate);
    window.addEventListener("scope:overlaychange", requestUpdate);
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(requestUpdate, { threshold: [0, 0.15] });
      blockers.forEach((blocker) => observer.observe(blocker));
    }
    update();
  }

  function initStoryCardObserver() {
    const cards = Array.from(document.querySelectorAll(".story-card"));
    if (!cards.length) return;

    if (reduceMotion.matches || !("IntersectionObserver" in window)) {
      cards.forEach((card) => card.classList.add("is-story-active"));
      return;
    }

    document.documentElement.classList.add("story-observer-ready");
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-story-active");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.35 });
    cards.forEach((card) => observer.observe(card));
  }

  function initCarousels() {
    document.querySelectorAll("[data-carousel]").forEach((carousel) => {
      const name = carousel.dataset.carousel;
      const controls = document.querySelector(`[data-carousel-controls="${name}"]`);
      const items = Array.from(carousel.querySelectorAll("[data-carousel-item]"));
      const previous = controls?.querySelector("[data-carousel-prev]");
      const next = controls?.querySelector("[data-carousel-next]");
      const status = controls?.querySelector("[data-carousel-status]");
      const dots = controls?.querySelector("[data-carousel-dots]");
      if (!controls || !previous || !next || !status || !dots || !items.length) return;

      if (carousel.dataset.carouselMode === "deck") {
        initCardDeck(carousel, items, previous, next, status, dots);
        return;
      }

      let activeIndex = 0;
      let frame = 0;
      items.forEach((item, index) => {
        item.setAttribute("role", "group");
        item.setAttribute("aria-label", `${index + 1} av ${items.length}`);
        const dot = document.createElement("i");
        dots.append(dot);
      });
      const dotItems = Array.from(dots.children);

      const render = (index) => {
        activeIndex = Math.max(0, Math.min(index, items.length - 1));
        status.textContent = `${activeIndex + 1} / ${items.length}`;
        previous.disabled = activeIndex === 0;
        next.disabled = activeIndex === items.length - 1;
        dotItems.forEach((dot, dotIndex) => dot.classList.toggle("is-active", dotIndex === activeIndex));
      };

      const findClosest = () => {
        const left = carousel.getBoundingClientRect().left;
        const index = items.reduce((closest, item, itemIndex) => (
          Math.abs(item.getBoundingClientRect().left - left) < Math.abs(items[closest].getBoundingClientRect().left - left) ? itemIndex : closest
        ), 0);
        render(index);
        frame = 0;
      };

      const goTo = (index) => {
        const target = Math.max(0, Math.min(index, items.length - 1));
        carousel.scrollTo({ left: items[target].offsetLeft - carousel.offsetLeft, behavior: reduceMotion.matches ? "auto" : "smooth" });
        render(target);
      };

      previous.addEventListener("click", () => goTo(activeIndex - 1));
      next.addEventListener("click", () => goTo(activeIndex + 1));
      carousel.addEventListener("scroll", () => {
        if (!frame) frame = window.requestAnimationFrame(findClosest);
      }, { passive: true });
      carousel.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        goTo(activeIndex + (event.key === "ArrowRight" ? 1 : -1));
      });
      if ("ResizeObserver" in window) new ResizeObserver(findClosest).observe(carousel);
      render(0);
    });
  }

  function initCardDeck(deck, items, previous, next, status, dots) {
    let activeIndex = 0;
    let isMoving = false;
    let pointerStart = null;

    items.forEach((item, index) => {
      item.setAttribute("role", "group");
      item.setAttribute("aria-label", `${index + 1} av ${items.length}`);
      const dot = document.createElement("i");
      dots.append(dot);
    });
    const dotItems = Array.from(dots.children);

    const render = () => {
      items.forEach((item, itemIndex) => {
        const position = (itemIndex - activeIndex + items.length) % items.length;
        item.style.setProperty("--deck-position", String(position));
        item.classList.toggle("is-active", position === 0);
        item.setAttribute("aria-hidden", String(position !== 0));
      });
      status.textContent = `${activeIndex + 1} / ${items.length}`;
      dotItems.forEach((dot, dotIndex) => dot.classList.toggle("is-active", dotIndex === activeIndex));
      previous.disabled = false;
      next.disabled = false;
    };

    const move = (direction) => {
      if (isMoving) return;
      const outgoing = items[activeIndex];

      if (reduceMotion.matches) {
        activeIndex = (activeIndex + direction + items.length) % items.length;
        render();
        return;
      }

      isMoving = true;
      outgoing.classList.add(direction > 0 ? "is-deck-exiting-next" : "is-deck-exiting-previous");
      window.setTimeout(() => {
        activeIndex = (activeIndex + direction + items.length) % items.length;
        outgoing.classList.remove("is-deck-exiting-next", "is-deck-exiting-previous");
        render();
        isMoving = false;
      }, 420);
    };

    previous.addEventListener("click", () => move(-1));
    next.addEventListener("click", () => move(1));
    deck.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      move(event.key === "ArrowRight" ? 1 : -1);
    });
    deck.addEventListener("pointerdown", (event) => {
      if (!event.isPrimary) return;
      pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
      deck.setPointerCapture?.(event.pointerId);
    });
    deck.addEventListener("pointerup", (event) => {
      if (!pointerStart || pointerStart.id !== event.pointerId) return;
      const deltaX = event.clientX - pointerStart.x;
      const deltaY = event.clientY - pointerStart.y;
      pointerStart = null;
      if (Math.abs(deltaX) < 44 || Math.abs(deltaX) <= Math.abs(deltaY)) return;
      move(deltaX < 0 ? 1 : -1);
    });
    deck.addEventListener("pointercancel", () => { pointerStart = null; });
    render();
  }

  function initLoader() {
    const loader = document.querySelector(".loader");
    if (!loader) return;

    if (reduceMotion.matches) {
      loader.remove();
      return;
    }

    const removeLoader = () => loader.remove();
    loader.addEventListener("animationend", (event) => {
      if (event.target === loader && event.animationName === "loader-slide-up") removeLoader();
    }, { once: true });
    window.setTimeout(removeLoader, 1900);
  }

  function initScrollReveals() {
    const gsap = window.gsap;

    document.querySelectorAll(".section-intro, .benefits-heading, .integration-copy, .pricing-heading").forEach((block) => {
      gsap.from(block.children, {
        autoAlpha: 0,
        y: 34,
        stagger: 0.1,
        duration: 0.75,
        ease: "power3.out",
        scrollTrigger: { trigger: block, start: "top 82%", once: true },
      });
    });

    gsap.utils.toArray(".ticker").forEach((ticker) => {
      gsap.from(ticker, {
        scaleX: 0,
        transformOrigin: "left center",
        duration: 0.8,
        ease: "power3.inOut",
        scrollTrigger: { trigger: ticker, start: "top 94%", once: true },
      });
    });
  }

  function initSceneMotion() {
    const gsap = window.gsap;
    const scenes = gsap.utils.toArray("[data-scene]").slice(1);

    scenes.forEach((scene) => {
      gsap.fromTo(scene,
        { clipPath: "inset(2.5% 1.2% 2.5% 1.2% round 22px)" },
        {
          clipPath: "inset(0% 0% 0% 0% round 0px)",
          duration: 0.75,
          ease: "power2.out",
          scrollTrigger: { trigger: scene, start: "top 88%", once: true },
        }
      );
    });

    gsap.from(".product-copy > *:not(.product-demo-link):not(.product-demo-note)", {
      autoAlpha: 0,
      x: -34,
      stagger: 0.1,
      duration: 0.7,
      ease: "power3.out",
      scrollTrigger: { trigger: ".product-copy", start: "top 78%", once: true },
    });

    gsap.to(".dashboard-orbit-one", {
      y: -70,
      rotation: 35,
      ease: "none",
      scrollTrigger: { trigger: ".product", start: "top bottom", end: "bottom top", scrub: 1.2 },
    });
    gsap.to(".dashboard-orbit-two", {
      y: 55,
      rotation: -28,
      ease: "none",
      scrollTrigger: { trigger: ".product", start: "top bottom", end: "bottom top", scrub: 1.2 },
    });
    gsap.to(".ticker-track", {
      xPercent: -8,
      ease: "none",
      scrollTrigger: { trigger: ".ticker", start: "top bottom", end: "bottom top", scrub: 1 },
    });
  }

  function initHeroWorld() {
    const gsap = window.gsap;

    const world = document.querySelector(".signal-world");
    const sources = gsap.utils.toArray(".orbit-source");
    const adviceWindow = document.querySelector(".advice-window");
    const checks = gsap.utils.toArray(".advice-task > b");
    const taskTitles = gsap.utils.toArray(".advice-task strong");
    const cursor = document.querySelector(".advice-cursor");
    const impact = document.querySelector(".advice-impact");
    if (!world || !sources.length || !adviceWindow || !cursor || !impact) return;

    const worldRect = world.getBoundingClientRect();
    const centerX = worldRect.left + worldRect.width / 2;
    const centerY = worldRect.top + worldRect.height / 2;
    const sourceRects = sources.map((card) => card.getBoundingClientRect());
    const gather = sourceRects.map((rect) => {
      return { x: centerX - (rect.left + rect.width / 2), y: centerY - (rect.top + rect.height / 2) };
    });
    const sourceCenters = sourceRects.map((rect) => {
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    const compactOrbit = worldRect.width <= 480;
    const widestSource = Math.max(...sourceRects.map((rect) => rect.width));
    const orbitStartAngle = compactOrbit ? -135 : -90;
    const radiusX = compactOrbit
      ? Math.max(0, (worldRect.width - widestSource) / 2 - 8) * Math.SQRT2
      : Math.min(worldRect.width * 0.41, 292);
    const radiusY = Math.min(worldRect.height * (compactOrbit ? 0.37 : 0.4), compactOrbit ? 215 : 240);
    const radiusVariation = compactOrbit ? 0.35 : 1;
    const cardProfiles = [
      { radiusX: 1.06, radiusY: 1.04, angle: -6, rotation: -6 },
      { radiusX: 1.03, radiusY: 1.1, angle: 5, rotation: 5 },
      { radiusX: 1.08, radiusY: 1.02, angle: -4, rotation: -2 },
      { radiusX: 1.02, radiusY: 1.08, angle: 7, rotation: 3 },
    ];
    const pointAt = (angle, cardIndex) => {
      const profile = cardProfiles[cardIndex];
      const radians = (angle + profile.angle) * Math.PI / 180;
      const cardRadiusX = radiusX * (1 + (profile.radiusX - 1) * radiusVariation);
      const cardRadiusY = radiusY * (1 + (profile.radiusY - 1) * radiusVariation);
      return { x: centerX + Math.cos(radians) * cardRadiusX, y: centerY + Math.sin(radians) * cardRadiusY };
    };
    const slotFor = (cardIndex, slotIndex) => ({
      x: pointAt(orbitStartAngle + slotIndex * 90, cardIndex).x - sourceCenters[cardIndex].x,
      y: pointAt(orbitStartAngle + slotIndex * 90, cardIndex).y - sourceCenters[cardIndex].y,
    });
    const topOffsets = sources.map((_, index) => slotFor(index, 0));
    const cursorRect = cursor.getBoundingClientRect();
    const clickTargets = checks.map((check) => {
      const rect = check.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2 - cursorRect.left,
        y: rect.top + rect.height / 2 - cursorRect.top,
      };
    });

    gsap.set(sources, { x: (index) => topOffsets[index].x, y: (index) => topOffsets[index].y, rotation: (index) => cardProfiles[index].rotation, autoAlpha: 0, scale: 0.72 });
    gsap.set(adviceWindow, { autoAlpha: 0, scale: 0.78 });
    gsap.set(cursor, { autoAlpha: 0, x: 0, y: 0 });
    gsap.set(impact, { autoAlpha: 0, y: 8 });
    gsap.to(".orbit-one", { rotation: 360, duration: 34, repeat: -1, ease: "none" });
    gsap.to(".orbit-two", { rotation: -360, duration: 50, repeat: -1, ease: "none" });

    const timeline = gsap.timeline({ delay: 3.2, repeat: -1, repeatDelay: 1.05, defaults: { ease: "power3.out" } });
    const addClockwiseArc = (cardIndex, fromSlot, position) => {
      const startAngle = orbitStartAngle + fromSlot * 90;
      const keyframes = [15, 30, 45, 60, 75, 90].map((step) => {
        const angle = startAngle + step;
        const point = pointAt(angle, cardIndex);
        const profile = cardProfiles[cardIndex];
        return {
          x: point.x - sourceCenters[cardIndex].x,
          y: point.y - sourceCenters[cardIndex].y,
          rotation: profile.rotation + Math.sin((angle + profile.angle) * Math.PI / 180) * 1.8,
          duration: 0.16,
          ease: "none",
        };
      });
      timeline.to(sources[cardIndex], { keyframes }, position);
    };

    timeline.to(sources[0], { autoAlpha: 1, scale: 1, duration: 0.6, ease: "back.out(1.7)" });

    timeline.addLabel("secondPoint", "+=0.7");
    addClockwiseArc(0, 0, "secondPoint");
    timeline.to(sources[1], { autoAlpha: 1, scale: 1, duration: 0.55, ease: "back.out(1.7)" }, "secondPoint+=0.32");

    timeline.addLabel("thirdPoint", "+=0.7");
    addClockwiseArc(0, 1, "thirdPoint");
    addClockwiseArc(1, 0, "thirdPoint");
    timeline.to(sources[2], { autoAlpha: 1, scale: 1, duration: 0.55, ease: "back.out(1.7)" }, "thirdPoint+=0.32");

    timeline.addLabel("fourthPoint", "+=0.7");
    addClockwiseArc(0, 2, "fourthPoint");
    addClockwiseArc(1, 1, "fourthPoint");
    addClockwiseArc(2, 0, "fourthPoint");
    timeline.to(sources[3], { autoAlpha: 1, scale: 1, duration: 0.55, ease: "back.out(1.7)" }, "fourthPoint+=0.32");

    timeline
      .to(sources, { x: (index) => gather[index].x, y: (index) => gather[index].y, scale: 0.16, autoAlpha: 0, duration: 0.88, stagger: 0.09, ease: "power3.in" }, "+=1.55")
      .to(adviceWindow, { autoAlpha: 1, scale: 1, duration: 0.62, ease: "back.out(1.5)" }, "+=0.18")
      .to(cursor, { autoAlpha: 1, x: clickTargets[0].x - 22, y: clickTargets[0].y - 20, duration: 0.42 }, "+=0.35")
      .to(cursor, { x: clickTargets[0].x, y: clickTargets[0].y, duration: 0.48, ease: "power2.inOut" })
      .to(checks[0], { color: "#fff", backgroundColor: "#31d69b", borderColor: "#31d69b", duration: 0.24 })
      .to(taskTitles[0], { color: "#77766f", textDecorationLine: "line-through", duration: 0.24 }, "<")
      .to(cursor, { x: clickTargets[1].x, y: clickTargets[1].y, duration: 0.52, ease: "power2.inOut" }, "+=0.4")
      .to(checks[1], { color: "#fff", backgroundColor: "#31d69b", borderColor: "#31d69b", duration: 0.24 })
      .to(taskTitles[1], { color: "#77766f", textDecorationLine: "line-through", duration: 0.24 }, "<")
      .to(cursor, { x: clickTargets[2].x, y: clickTargets[2].y, duration: 0.52, ease: "power2.inOut" }, "+=0.4")
      .to(checks[2], { color: "#fff", backgroundColor: "#31d69b", borderColor: "#31d69b", duration: 0.24 })
      .to(taskTitles[2], { color: "#77766f", textDecorationLine: "line-through", duration: 0.24 }, "<")
      .to(cursor, { autoAlpha: 0, duration: 0.25 })
      .to(impact, { autoAlpha: 1, y: 0, duration: 0.58, ease: "back.out(1.5)" }, "+=0.25")
      .to({}, { duration: 3.2 })
      .to(adviceWindow, { autoAlpha: 0, scale: 0.82, duration: 0.5 })
      .set(sources, { x: (index) => topOffsets[index].x, y: (index) => topOffsets[index].y, rotation: (index) => cardProfiles[index].rotation, scale: 0.72 })
      .set(checks, { color: "transparent", backgroundColor: "#fff", borderColor: "#c8c7c1" })
      .set(taskTitles, { clearProps: "color,textDecorationLine" })
      .set(impact, { autoAlpha: 0, y: 8 })
      .set(cursor, { autoAlpha: 0, x: 0, y: 0 });

    gsap.to(".signal-world", {
      yPercent: 12,
      ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 },
    });
  }

  function initStoryCards() {
    const gsap = window.gsap;
    const cards = document.querySelectorAll(".story-card");
    gsap.set(cards, { visibility: "visible" });
    if (!window.matchMedia("(min-width: 1121px)").matches && !compactViewport.matches) {
      gsap.from(cards, {
        autoAlpha: 0,
        y: compactViewport.matches ? 24 : 80,
        rotation: (index) => [-2, 2, -1][index] || 0,
        stagger: 0.14,
        duration: compactViewport.matches ? 0.55 : 0.85,
        ease: "power3.out",
        scrollTrigger: { trigger: ".story-grid", start: "top 78%", once: true },
      });
    }
  }

  function initDashboard() {
    const gsap = window.gsap;
    const dashboard = document.querySelector("[data-dashboard]");
    if (!dashboard) return;

    gsap.from(dashboard, {
      autoAlpha: 0,
      y: compactViewport.matches ? 24 : 70,
      rotationY: compactViewport.matches ? 0 : -9,
      duration: compactViewport.matches ? 0.55 : 1,
      ease: "power3.out",
      scrollTrigger: {
        trigger: dashboard,
        start: "top 78%",
        once: true,
        onEnter: animateDashboardContent,
      },
    });
    gsap.from(".product-points li", {
      autoAlpha: 0,
      x: -24,
      stagger: 0.1,
      duration: 0.55,
      scrollTrigger: { trigger: ".product-points", start: "top 85%", once: true },
    });
  }

  function animateDashboardContent() {
    if (!hasGsap) return;
    const gsap = window.gsap;
    gsap.fromTo(".bar-chart i", { scaleY: 0 }, { scaleY: 1, stagger: 0.045, duration: 0.65, ease: "power3.out" });
    gsap.fromTo(".dash-kpis article", { opacity: 0, y: 12 }, { opacity: 1, y: 0, stagger: 0.07, duration: 0.45 });
    runCounters(document.querySelector("[data-view='today']"));
  }

  function runCounters(scope) {
    if (!scope || !hasGsap) return;
    scope.querySelectorAll("[data-count]").forEach((element) => {
      const end = Number(element.dataset.count);
      if (!Number.isFinite(end)) return;
      const state = { value: 0 };
      window.gsap.to(state, {
        value: end,
        duration: 1.2,
        ease: "power3.out",
        onUpdate: () => { element.textContent = Math.round(state.value).toLocaleString("nb-NO"); },
      });
    });
  }

  function animateReportLine() {
    if (!hasGsap) return;
    const path = document.querySelector(".report-line path");
    if (!path || typeof path.getTotalLength !== "function") return;
    const length = path.getTotalLength();
    window.gsap.fromTo(path, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: 1.1, ease: "power2.out" });
  }

  function initBento() {
    const gsap = window.gsap;
    const cards = document.querySelectorAll(".benefit-card");
    gsap.set(cards, { visibility: "visible" });
    gsap.from(".benefit-bento", {
      autoAlpha: 0,
      y: 24,
      duration: 0.55,
      ease: "power3.out",
      clearProps: "opacity,visibility,transform",
      scrollTrigger: { trigger: ".benefit-bento", start: "top 80%", once: true },
    });
  }

  function initLogoCloud() {
    window.gsap.from(".logo-pill", {
      autoAlpha: 0,
      scale: 0.82,
      rotation: () => window.gsap.utils.random(-5, 5),
      stagger: 0.08,
      duration: 0.55,
      ease: "back.out(1.6)",
      scrollTrigger: { trigger: ".logo-cloud", start: "top 82%", once: true },
    });
  }

  function initMagneticButtons() {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    document.querySelectorAll(".magnetic").forEach((button) => {
      button.addEventListener("pointermove", (event) => {
        const rect = button.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        window.gsap.to(button, { x: x * 0.16, y: y * 0.22, duration: 0.35, ease: "power3.out" });
      });
      button.addEventListener("pointerleave", () => {
        window.gsap.to(button, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, .45)" });
      });
    });
  }

})();
