const typewriterWord = document.getElementById("typewriter-word");

const wait = (duration) => new Promise((resolve) => {
  window.setTimeout(resolve, duration);
});

const words = [
  { text: "mat", colorClass: "is-red" },
  { text: "vin", colorClass: "is-blue" },
  { text: "kultur", colorClass: "is-green" },
  { text: "kaffe", colorClass: "is-brown" },
  { text: "indisk", colorClass: "is-orange" },
  { text: "stemning", colorClass: "is-gold" },
  { text: "tartar", colorClass: "is-green" },
];

function setWordColor(colorClass) {
  typewriterWord.classList.remove("is-red", "is-blue", "is-green", "is-brown", "is-orange", "is-gold");
  typewriterWord.classList.add(colorClass);
}

async function replaceWord(fromWord, nextWord) {
  setWordColor(fromWord.colorClass);

  for (let index = fromWord.text.length; index >= 0; index -= 1) {
    typewriterWord.textContent = fromWord.text.slice(0, index);
    await wait(150);
  }

  await wait(350);
  setWordColor(nextWord.colorClass);

  for (let index = 1; index <= nextWord.text.length; index += 1) {
    typewriterWord.textContent = nextWord.text.slice(0, index);
    await wait(210);
  }
}

async function runTypewriter() {
  let wordIndex = 0;

  while (typewriterWord) {
    const currentWord = words[wordIndex];
    const nextWord = words[(wordIndex + 1) % words.length];

    await wait(2200);
    await replaceWord(currentWord, nextWord);
    wordIndex = (wordIndex + 1) % words.length;
  }
}

runTypewriter();

const processGrid = document.querySelector("#how .process-grid");
const revealCards = document.querySelectorAll("#how .simple-box");
const howSection = document.querySelector("#how");
let hasShownSwipeDemo = false;

function revealProcessCards() {
  revealCards.forEach((card) => {
    card.classList.add("is-visible");
  });
}

if (processGrid && revealCards.length > 0) {
  revealCards.forEach((card, index) => {
    card.style.setProperty("--reveal-delay", `${index * 560}ms`);
  });

  processGrid.classList.add("reveal-ready");

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      if (!entries.some((entry) => entry.isIntersecting)) {
        return;
      }

      revealProcessCards();
      observer.disconnect();
    }, {
      rootMargin: "-15% 0px -15% 0px",
      threshold: 0,
    });

    revealObserver.observe(howSection);
  } else {
    revealProcessCards();
  }
}

if (howSection && "IntersectionObserver" in window) {
  const swipeDemoObserver = new IntersectionObserver((entries, observer) => {
    if (hasShownSwipeDemo || !entries.some((entry) => entry.isIntersecting)) {
      return;
    }

    hasShownSwipeDemo = true;
    howSection.classList.add("show-swipe-demo");
    window.setTimeout(() => {
      howSection.classList.remove("show-swipe-demo");
    }, 2300);
    observer.disconnect();
  }, {
    rootMargin: "-20% 0px -20% 0px",
    threshold: 0,
  });

  swipeDemoObserver.observe(howSection);
}

const integrationButtons = document.querySelectorAll(".integration-buttons button");
const integrationPanels = document.querySelectorAll(".integration-panel");
const demoNavButtons = document.querySelectorAll(".demo-sidebar nav button");
const demoContent = document.querySelector(".demo-content");
const demoStatLabels = document.querySelectorAll("[data-stat-label]");
const demoStatValues = document.querySelectorAll("[data-stat-value]");
const demoStatTrends = document.querySelectorAll("[data-stat-trend]");
const demoStatUnits = document.querySelectorAll("[data-stat-unit]");
const siteHeader = document.querySelector(".site-header");
const mobileMenu = document.querySelector("#mobile-menu");
const mobileMenuButton = document.querySelector(".mobile-menu-button");
const mobileMenuLinks = document.querySelectorAll(".mobile-menu a");
const deviceToggleButtons = document.querySelectorAll(".device-toggle-button");

const demoViews = {
  overview: {
    stats: [
      ["Dagens salg", "67 512", "12% ↑ vs sist lørdag", "kr"],
      ["Antall kjøp", "312", "", ""],
      ["Snittpris", "400", "", "kr"],
    ],
  },
  reports: {
    stats: [
      ["Rapporter", "8", "", ""],
      ["Nye funn", "14", "", ""],
      ["Sist oppdatert", "09:12", "", ""],
    ],
  },
  advice: {
    stats: [
      ["Prioritet", "Høy", "", ""],
      ["Råd i dag", "6", "", ""],
      ["Estimert effekt", "+8%", "", ""],
    ],
  },
  integrations: {
    stats: [
      ["Aktive kilder", "4", "", ""],
      ["Synk i dag", "18", "", ""],
      ["Status", "OK", "", ""],
    ],
  },
};

function renderDemoView(viewName) {
  const view = demoViews[viewName];

  if (!view) {
    return;
  }

  if (demoContent) {
    demoContent.classList.toggle("is-empty-view", viewName === "reports");
    demoContent.classList.toggle("is-advice-view", viewName === "advice");
    demoContent.classList.toggle("is-integrations-view", viewName === "integrations");
  }

  view.stats.forEach(([label, value, trend, unit], index) => {
    if (demoStatLabels[index]) {
      demoStatLabels[index].textContent = label;
    }

    if (demoStatValues[index]) {
      demoStatValues[index].textContent = value;
    }

    if (demoStatTrends[index]) {
      demoStatTrends[index].textContent = trend || "";
    }

    if (demoStatUnits[index]) {
      demoStatUnits[index].textContent = unit || "";
    }
  });

}

integrationButtons.forEach((button) => {
  button.addEventListener("click", () => {
    integrationButtons.forEach((item) => {
      item.classList.remove("is-active");
    });

    button.classList.add("is-active");

    integrationPanels.forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.panel === button.dataset.category);
    });
  });
});

demoNavButtons.forEach((button) => {
  button.addEventListener("click", () => {
    demoNavButtons.forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");
    renderDemoView(button.dataset.view);
  });
});

function setMobileMenuOpen(isOpen) {
  if (!siteHeader || !mobileMenu || !mobileMenuButton) {
    return;
  }

  siteHeader.classList.toggle("is-menu-open", isOpen);
  mobileMenu.classList.toggle("is-open", isOpen);
  mobileMenuButton.setAttribute("aria-expanded", String(isOpen));
  mobileMenuButton.setAttribute("aria-label", isOpen ? "Lukk meny" : "Åpne meny");
}

if (siteHeader && mobileMenu && mobileMenuButton) {
  mobileMenuButton.addEventListener("click", () => {
    setMobileMenuOpen(!mobileMenu.classList.contains("is-open"));
  });

  mobileMenuLinks.forEach((link) => {
    link.addEventListener("click", () => {
      setMobileMenuOpen(false);
    });
  });
}

let deviceAnimation = null;

function setDemoDevice(selectedDevice) {
  const currentDemoMockup = document.querySelector(".mockup-box");
  const shouldUseMobile = selectedDevice === "mobile";

  if (!currentDemoMockup || currentDemoMockup.classList.contains("is-mobile-demo") === shouldUseMobile) {
    return;
  }

  if (deviceAnimation) {
    deviceAnimation.cancel();
  }

  currentDemoMockup.classList.add("is-device-measuring");
  const startRect = currentDemoMockup.getBoundingClientRect();

  currentDemoMockup.classList.toggle("is-mobile-demo", shouldUseMobile);

  const endRect = currentDemoMockup.getBoundingClientRect();
  currentDemoMockup.classList.remove("is-device-measuring");

  const deltaX = startRect.left - endRect.left;
  const deltaY = startRect.top - endRect.top;
  const scaleX = startRect.width / endRect.width;
  const scaleY = startRect.height / endRect.height;
  const finalTransform = shouldUseMobile ? "translateY(4px)" : "none";

  deviceAnimation = currentDemoMockup.animate([
    {
      borderRadius: shouldUseMobile ? "8px" : "44px",
      transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`,
      transformOrigin: "top left",
    },
    {
      borderRadius: shouldUseMobile ? "44px" : "8px",
      transform: finalTransform,
      transformOrigin: "top left",
    },
  ], {
    duration: 950,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
  });

  deviceAnimation.addEventListener("finish", () => {
    deviceAnimation = null;
  }, { once: true });
}

deviceToggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const selectedDevice = button.dataset.device;

    deviceToggleButtons.forEach((item) => {
      item.classList.remove("is-active");
      item.setAttribute("aria-pressed", "false");
    });

    button.classList.add("is-active");
    button.setAttribute("aria-pressed", "true");
    setDemoDevice(selectedDevice);
  });
});

const demoMockup = document.querySelector(".mockup-box");
const expandButton = document.querySelector(".expand-button");
const themeToggle = document.querySelector(".theme-toggle");
let collapsedDemoRect = null;
let demoAnimation = null;

function setDemoExpanded(isExpanded) {
  if (!demoMockup || !expandButton) {
    return;
  }

  if (demoAnimation) {
    demoAnimation.cancel();
  }

  demoMockup.classList.add("is-fullscreen-animating");
  const startRect = demoMockup.getBoundingClientRect();
  let endRect;

  if (isExpanded) {
    collapsedDemoRect = startRect;
    demoMockup.classList.add("is-expanded");
    document.body.classList.add("demo-expanded");
    endRect = demoMockup.getBoundingClientRect();
  } else {
    endRect = collapsedDemoRect;
  }

  expandButton.setAttribute("aria-label", isExpanded ? "Lukk demo" : "Utvid demo");

  if (!endRect) {
    demoMockup.classList.toggle("is-expanded", isExpanded);
    document.body.classList.toggle("demo-expanded", isExpanded);
    demoMockup.classList.remove("is-fullscreen-animating");
    return;
  }

  const startTransform = isExpanded
    ? {
      x: startRect.left - endRect.left,
      y: startRect.top - endRect.top,
      scaleX: startRect.width / endRect.width,
      scaleY: startRect.height / endRect.height,
    }
    : {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
    };
  const endTransform = isExpanded
    ? {
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
    }
    : {
      x: endRect.left - startRect.left,
      y: endRect.top - startRect.top,
      scaleX: endRect.width / startRect.width,
      scaleY: endRect.height / startRect.height,
    };

  demoAnimation = demoMockup.animate([
    {
      borderRadius: isExpanded ? "8px" : "0",
      transform: `translate(${startTransform.x}px, ${startTransform.y}px) scale(${startTransform.scaleX}, ${startTransform.scaleY})`,
      transformOrigin: "top left",
    },
    {
      borderRadius: isExpanded ? "0" : "8px",
      transform: `translate(${endTransform.x}px, ${endTransform.y}px) scale(${endTransform.scaleX}, ${endTransform.scaleY})`,
      transformOrigin: "top left",
    },
  ], {
    duration: 950,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    fill: "both",
  });

  demoAnimation.addEventListener("finish", () => {
    const finishedAnimation = demoAnimation;

    if (!isExpanded) {
      demoMockup.classList.remove("is-expanded");
      document.body.classList.remove("demo-expanded");
    }

    window.requestAnimationFrame(() => {
      if (finishedAnimation) {
        finishedAnimation.cancel();
      }

      window.requestAnimationFrame(() => {
        demoMockup.classList.remove("is-fullscreen-animating");

        if (demoAnimation === finishedAnimation) {
          demoAnimation = null;
        }
      });
    });
  }, { once: true });
}

document.addEventListener("click", (event) => {
  const clickedExpandButton = event.target.closest(".expand-button");

  if (!clickedExpandButton || !demoMockup) {
    return;
  }

  setDemoExpanded(!demoMockup.classList.contains("is-expanded"));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setDemoExpanded(false);
  }
});

if (demoMockup && themeToggle) {
  themeToggle.addEventListener("click", () => {
    const isDark = demoMockup.classList.toggle("is-dark");

    themeToggle.setAttribute("aria-label", isDark ? "Bytt til light mode" : "Bytt til dark mode");
  });
}

const billingToggle = document.querySelector(".billing-toggle");

function renderPriceHTML(amountText) {
  return Array.from(amountText)
    .map((ch) => {
      if (/\d/.test(ch)) {
        const strip = "0123456789"
          .split("")
          .map((d) => `<span>${d}</span>`)
          .join("");
        return `<span class="digit"><span class="digit-strip" style="transform: translateY(-${ch}em)">${strip}</span></span>`;
      }
      return `<span class="price-static">${ch === " " ? "&nbsp;" : ch}</span>`;
    })
    .join("");
}

function setPrice(priceEl, amountText, periodText) {
  const numberSpan = priceEl.querySelector(".price-number");
  const periodSpan = priceEl.querySelector(".price-period");

  const existingDigits = numberSpan.querySelectorAll(".digit-strip");
  const newChars = Array.from(amountText);
  const newDigits = newChars.filter((c) => /\d/.test(c));
  const newStatics = newChars.filter((c) => !/\d/.test(c));

  if (existingDigits.length === newDigits.length) {
    existingDigits.forEach((strip, i) => {
      strip.style.transform = `translateY(-${newDigits[i]}em)`;
    });
    numberSpan.querySelectorAll(".price-static").forEach((el, idx) => {
      if (newStatics[idx] !== undefined) {
        el.innerHTML = newStatics[idx] === " " ? "&nbsp;" : newStatics[idx];
      }
    });
  } else {
    numberSpan.innerHTML = renderPriceHTML(amountText);
  }

  if (periodSpan) periodSpan.textContent = periodText;
}

if (billingToggle) {
  document.querySelectorAll(".price-card .price").forEach((priceEl) => {
    const monthly = priceEl.dataset.monthly;
    if (!monthly) return;
    const [amount, period] = monthly.split("|");
    priceEl.innerHTML = `<span class="price-number">${renderPriceHTML(amount)}</span><span class="price-period">${period}</span>`;
  });

  billingToggle.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-billing]");
    if (!button) return;

    billingToggle.querySelectorAll("button").forEach((b) => b.classList.remove("is-active"));
    button.classList.add("is-active");

    const mode = button.dataset.billing;
    document.querySelectorAll(".price-card .price").forEach((priceEl) => {
      const data = priceEl.dataset[mode];
      if (!data) return;
      const [targetAmount, targetPeriod] = data.split("|");
      setPrice(priceEl, targetAmount, targetPeriod);
    });
  });
}
const reminderAddButton = document.querySelector(".reminder-add");
const reminderList = document.querySelector(".reminder-list");

if (reminderAddButton && reminderList) {
  reminderAddButton.addEventListener("click", () => {
    const text = window.prompt("Ny huskepunkt:");
    if (!text) return;

    const li = document.createElement("li");
    li.innerHTML = `
      <label>
        <span class="reminder-text"></span>
        <input type="checkbox">
        <span class="reminder-check" aria-hidden="true"></span>
      </label>
    `;
    li.querySelector(".reminder-text").textContent = text.trim();
    reminderList.appendChild(li);
  });
}
