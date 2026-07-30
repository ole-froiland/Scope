/* Scope — landingsside "Vakt".
   Frittstående. Alt er valgfritt: mangler et element, hopper funksjonen over. */

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------- Meny */

  /* Klokkelinja skal legge seg rett under toppmenyen, uansett høyde på den */
  function trackHeaderHeight() {
    var header = document.querySelector(".vakt-header");
    if (!header) return;

    function measure() {
      document.documentElement.style.setProperty("--header-h", header.offsetHeight + "px");
    }

    measure();
    window.addEventListener("resize", measure);
    if ("ResizeObserver" in window) new ResizeObserver(measure).observe(header);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  }

  function setupMenu() {
    var toggle = document.querySelector("[data-menu-toggle]");
    var panel = document.querySelector("[data-menu-panel]");
    if (!toggle || !panel) return;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Lukk meny" : "Åpne meny");
      panel.dataset.open = open ? "true" : "false";
      document.body.style.overflow = open ? "hidden" : "";
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    panel.addEventListener("click", function (event) {
      if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setOpen(false);
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 900) setOpen(false);
    });
  }

  /* ------------------------------------------------------ Innfading */

  function setupReveal() {
    var items = document.querySelectorAll("[data-reveal]");
    if (!items.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      items.forEach(function (item) {
        item.classList.add("is-in");
      });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var delay = Number(entry.target.dataset.revealDelay || 0);
          setTimeout(function () {
            entry.target.classList.add("is-in");
          }, delay);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );

    items.forEach(function (item) {
      observer.observe(item);
    });
  }

  /* ------------------------------------------------- Bongen skrives ut */

  function setupTicket() {
    var ticket = document.querySelector("[data-ticket]");
    if (!ticket) return;

    var lines = ticket.querySelectorAll("[data-print]");
    if (reduceMotion) {
      ticket.classList.add("is-printing");
      return;
    }

    lines.forEach(function (line, index) {
      line.style.animationDelay = 260 + index * 62 + "ms";
    });

    window.requestAnimationFrame(function () {
      ticket.classList.add("is-printing");
    });
  }

  /* ------------------------------------------- Klokke-rail og klokkelinje */

  function setupClock() {
    var stops = Array.prototype.slice.call(document.querySelectorAll("[data-hour]"));
    if (!stops.length) return;

    var railLinks = document.querySelectorAll("[data-rail-link]");
    var barTime = document.querySelector("[data-bar-time]");
    var barLabel = document.querySelector("[data-bar-label]");
    var barFill = document.querySelector("[data-bar-fill]");
    var body = document.body;
    var current = null;
    var ticking = false;

    function update() {
      ticking = false;
      var marker = window.innerHeight * 0.42;
      var active = stops[0];

      stops.forEach(function (stop) {
        if (stop.getBoundingClientRect().top <= marker) active = stop;
      });

      var doc = document.documentElement;
      var scrollable = doc.scrollHeight - window.innerHeight;
      var progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      if (barFill) barFill.style.width = (progress * 100).toFixed(1) + "%";

      if (active === current) return;
      current = active;

      var hour = active.dataset.hour;
      var label = active.dataset.hourLabel || "";

      railLinks.forEach(function (link) {
        link.setAttribute("aria-current", link.dataset.railLink === hour ? "true" : "false");
      });

      if (barTime) barTime.textContent = hour;
      if (barLabel) barLabel.textContent = label;

      // Klokke-railen bytter farge når siden går fra natt til dag
      body.classList.toggle("is-light", active.dataset.hourTone === "light");
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  /* ------------------------------------------------------- Regnestykket */

  function setupCalculator() {
    var input = document.querySelector("[data-calc-input]");
    if (!input) return;

    var revenueOut = document.querySelector("[data-calc-revenue]");
    var yearOut = document.querySelector("[data-calc-year]");
    var monthOut = document.querySelector("[data-calc-month]");
    var points = Number(input.dataset.calcPoints || 2.1);

    var nb = new Intl.NumberFormat("nb-NO", { maximumFractionDigits: 0 });

    function render() {
      var revenue = Number(input.value);
      var saved = revenue * (points / 100);

      if (revenueOut) revenueOut.textContent = nb.format(revenue) + " kr";
      if (yearOut) yearOut.textContent = nb.format(Math.round(saved / 1000) * 1000) + " kr";
      if (monthOut) {
        monthOut.textContent =
          "Det er " + nb.format(Math.round(saved / 12 / 100) * 100) + " kr i måneden.";
      }
    }

    input.addEventListener("input", render);
    render();
  }

  /* -------------------------------------------------- Filter på systemer */

  function setupFilter() {
    var chips = document.querySelectorAll("[data-filter]");
    if (!chips.length) return;

    var items = document.querySelectorAll("[data-category]");
    var count = document.querySelector("[data-filter-count]");

    function apply(value) {
      var shown = 0;
      items.forEach(function (item) {
        var match = value === "all" || item.dataset.category === value;
        item.hidden = !match;
        if (match) shown += 1;
      });
      chips.forEach(function (chip) {
        chip.setAttribute("aria-pressed", chip.dataset.filter === value ? "true" : "false");
      });
      if (count) count.textContent = shown + (shown === 1 ? " system" : " systemer");
    }

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        apply(chip.dataset.filter);
      });
    });

    apply("all");
  }

  /* ------------------------------------------------------ Kontaktskjema */

  function setupContactForm() {
    var form = document.querySelector("[data-contact-form]");
    if (!form) return;

    var status = form.querySelector("[data-form-status]");
    var submit = form.querySelector("button[type='submit']");

    function show(message) {
      if (!status) return;
      status.hidden = false;
      status.textContent = message;
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!form.reportValidity()) return;

      var data = new FormData(form);
      var name = String(data.get("name") || "").trim();
      var company = String(data.get("company") || "").trim();
      var email = String(data.get("email") || "").trim();
      var phone = String(data.get("phone") || "").trim();
      var message = String(data.get("message") || "").trim();

      var body =
        "Navn: " + name + "\n" +
        "Sted: " + company + "\n" +
        "E-post: " + email + "\n" +
        "Telefon: " + phone + "\n\n" +
        message;

      if (submit) submit.disabled = true;
      show("Sender …");

      fetch("/api/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name,
          company: company,
          email: email,
          phone: phone,
          message: message,
          topic: "testkunde",
          source: "vakt",
        }),
      })
        .then(function (response) {
          if (!response.ok) throw new Error("avvist");
          form.reset();
          if (submit) submit.disabled = false;
          show("Takk. Vi svarer på e-post innen én virkedag.");
        })
        .catch(function () {
          if (submit) submit.disabled = false;
          show("Vi fikk ikke sendt skjemaet herfra. Vi har åpnet en e-post med det du skrev — trykk send, så tar vi den derfra.");
          window.location.href =
            "mailto:post@scopeanalytics.no" +
            "?subject=" + encodeURIComponent("Testkunde: " + (company || name)) +
            "&body=" + encodeURIComponent(body);
        });
    });
  }

  function init() {
    trackHeaderHeight();
    setupMenu();
    setupReveal();
    setupTicket();
    setupClock();
    setupCalculator();
    setupFilter();
    setupContactForm();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
