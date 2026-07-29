const typewriterWord = document.getElementById("typewriter-word");
const loginIntro = document.querySelector(".login-intro");
const pageParameters = new URLSearchParams(window.location.search);
const opensDemoDirectly = pageParameters.get("demo") === "1";
const startsLoginFlow = pageParameters.get("login") === "1";
const requestedDemoView = pageParameters.get("view");
const startsWithCollapsedSidebar = pageParameters.get("sidebar") === "collapsed";

function getNavigationType() {
  const [navigationEntry] = typeof performance.getEntriesByType === "function"
    ? performance.getEntriesByType("navigation")
    : [];

  if (navigationEntry) {
    return navigationEntry.type;
  }

  if (performance.navigation && performance.navigation.type === 1) {
    return "reload";
  }

  return "navigate";
}

function shouldShowLoginIntro() {
  if (startsLoginFlow) {
    return Boolean(loginIntro);
  }

  if (opensDemoDirectly) {
    return false;
  }

  if (!loginIntro) {
    return false;
  }

  if (
    typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return false;
  }

  return ["navigate", "reload"].includes(getNavigationType());
}

function playInteractiveLogin() {
  const progress = loginIntro.querySelector(".login-progress");
  const percent = loginIntro.querySelector("[data-login-percent]");
  const bar = loginIntro.querySelector("[data-login-progress-bar]");
  const status = loginIntro.querySelector("[data-login-status]");
  const reducedMotion = typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const duration = reducedMotion ? 900 : 2800;
  const stages = [
    { at: 0, text: "Kobler til Scope …" },
    { at: 18, text: "Henter restaurantdata …" },
    { at: 43, text: "Synkroniserer integrasjoner …" },
    { at: 68, text: "Bygger dagens oversikt …" },
    { at: 88, text: "Klargjør anbefalingene …" },
    { at: 100, text: "Klart! Åpner dashboardet …" },
  ];
  let activeStage = -1;
  let startTime;

  loginIntro.setAttribute("aria-hidden", "false");
  document.body.classList.add("show-login-intro", "is-login-loading");

  const update = (timestamp) => {
    if (startTime === undefined) startTime = timestamp;
    const elapsed = Math.min(1, (timestamp - startTime) / duration);
    const eased = 1 - Math.pow(1 - elapsed, 1.45);
    const value = elapsed >= 1 ? 100 : Math.min(99, Math.floor(eased * 100));

    if (percent) percent.textContent = String(value);
    if (bar) bar.style.transform = `scaleX(${value / 100})`;
    if (progress) progress.setAttribute("aria-valuenow", String(value));

    const nextStage = stages.findLastIndex((stage) => value >= stage.at);
    if (status && nextStage !== activeStage) {
      activeStage = nextStage;
      status.textContent = stages[nextStage].text;
    }

    if (elapsed < 1) {
      window.requestAnimationFrame(update);
      return;
    }

    document.body.classList.add("login-loading-complete");
    window.setTimeout(() => {
      window.location.replace("/enkel?demo=1");
    }, reducedMotion ? 80 : 420);
  };

  window.requestAnimationFrame(update);
}

function prepareHeroReveal() {
  const heroTitle = document.getElementById("hero-title");

  if (!heroTitle) {
    return;
  }

  let wordIndex = 0;

  heroTitle.querySelectorAll(":scope > span").forEach((line) => {
    Array.from(line.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parts = node.textContent.split(/(\s+)/);
        const fragment = document.createDocumentFragment();

        parts.forEach((part) => {
          if (part.trim() === "") {
            fragment.appendChild(document.createTextNode(part));
            return;
          }

          const wordSpan = document.createElement("span");

          wordSpan.className = "reveal-word";
          wordSpan.textContent = part;
          wordSpan.style.setProperty("--word-delay", `${wordIndex * 110}ms`);
          wordIndex += 1;
          fragment.appendChild(wordSpan);
        });

        line.replaceChild(fragment, node);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        node.classList.add("reveal-word");
        node.style.setProperty("--word-delay", `${wordIndex * 110}ms`);
        wordIndex += 1;
      }
    });
  });
}

function playLoginIntro() {
  if (startsLoginFlow) {
    playInteractiveLogin();
    return;
  }

  prepareHeroReveal();
  loginIntro.setAttribute("aria-hidden", "false");
  document.body.classList.add("show-login-intro");

  window.setTimeout(() => {
    document.body.classList.add("page-enter");
  }, 1250);

  window.setTimeout(() => {
    document.body.classList.remove("show-login-intro");
    loginIntro.setAttribute("aria-hidden", "true");
  }, 1750);
}

if (shouldShowLoginIntro()) {
  window.requestAnimationFrame(playLoginIntro);
}

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

const removalStyles = [
  "backspace",
  "select-delete",
  "backspace",
  "select-italic",
  "backspace",
  "select-bold",
];

async function backspaceWord(word) {
  for (let index = word.length; index >= 0; index -= 1) {
    typewriterWord.textContent = word.slice(0, index);
    await wait(150);
  }
}

async function selectWord(word) {
  typewriterWord.classList.add("is-selecting");

  for (let index = 1; index <= word.length; index += 1) {
    const selectionStart = word.length - index;
    typewriterWord.innerHTML = `${word.slice(0, selectionStart)}<span class="tw-sel">${word.slice(selectionStart)}</span>`;
    await wait(90);
  }

  await wait(320);
}

function clearWord() {
  typewriterWord.classList.remove("is-selecting", "is-em", "is-strong");
  typewriterWord.textContent = "";
}

async function removeWord(word, removalStyle) {
  if (removalStyle === "backspace") {
    await backspaceWord(word);
    return;
  }

  await selectWord(word);

  if (removalStyle === "select-italic") {
    typewriterWord.classList.add("is-em");
    await wait(700);
  } else if (removalStyle === "select-bold") {
    typewriterWord.classList.add("is-strong");
    await wait(700);
  }

  clearWord();
}

async function replaceWord(fromWord, nextWord, removalStyle) {
  setWordColor(fromWord.colorClass);
  await removeWord(fromWord.text, removalStyle);

  await wait(350);
  setWordColor(nextWord.colorClass);

  for (let index = 1; index <= nextWord.text.length; index += 1) {
    typewriterWord.textContent = nextWord.text.slice(0, index);
    await wait(210);
  }
}

async function runTypewriter() {
  let wordIndex = 0;
  let removalIndex = 0;

  while (typewriterWord) {
    const currentWord = words[wordIndex];
    const nextWord = words[(wordIndex + 1) % words.length];

    await wait(2200);
    await replaceWord(currentWord, nextWord, removalStyles[removalIndex % removalStyles.length]);
    wordIndex = (wordIndex + 1) % words.length;
    removalIndex += 1;
  }
}

runTypewriter();

const scopeStackCards = Array.from(document.querySelectorAll("[data-scope-card]"));
let scopeStackActiveIndex = -1;
let scopeStackFrame = 0;

function setScopeStackActiveIndex(activeIndex) {
  if (activeIndex === scopeStackActiveIndex || activeIndex < 0) {
    return;
  }

  scopeStackActiveIndex = activeIndex;
  scopeStackCards.forEach((card, index) => {
    card.classList.toggle("is-active", index === activeIndex);
  });
}

function clampScopeStackValue(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function updateScopeStack() {
  scopeStackFrame = 0;

  if (scopeStackCards.length === 0) {
    return;
  }

  const usesStickyStack = window.getComputedStyle(scopeStackCards[0]).position === "sticky";
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const transitionDistance = clampScopeStackValue(window.innerHeight * 0.58, 300, 620);
  const viewportCenter = window.innerHeight / 2;
  let activeIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;

  scopeStackCards.forEach((card, index) => {
    const cardRect = card.getBoundingClientRect();
    let overlapProgress = 0;

    if (usesStickyStack) {
      const stickyTop = Number.parseFloat(window.getComputedStyle(card).top) || 92;
      const nextCard = scopeStackCards[index + 1];

      if (cardRect.top <= stickyTop + 2) {
        activeIndex = index;
      }

      if (nextCard) {
        const distanceToStack = nextCard.getBoundingClientRect().top - stickyTop;
        overlapProgress = clampScopeStackValue(1 - distanceToStack / transitionDistance, 0, 1);

        if (overlapProgress >= 0.56) {
          activeIndex = index + 1;
        }
      }
    } else {
      const distance = Math.abs(cardRect.top + cardRect.height / 2 - viewportCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        activeIndex = index;
      }
    }

    const visualProgress = prefersReducedMotion ? 0 : overlapProgress;
    card.style.setProperty("--stack-scale", String(1 - visualProgress * 0.04));
    card.style.setProperty("--stack-lift", "0px");
    card.style.setProperty("--stack-brightness", String(1 - visualProgress * 0.12));
    const isCovered = usesStickyStack && overlapProgress > 0.985;
    card.classList.toggle("is-covered", isCovered);
    card.inert = isCovered;
  });

  setScopeStackActiveIndex(activeIndex);
}

function requestScopeStackUpdate() {
  if (scopeStackFrame) {
    return;
  }

  scopeStackFrame = window.requestAnimationFrame(updateScopeStack);
}

/* Mobilguiden: tre skjermer som kan velges med fanene eller sveipes.
   Sveipingen er ren CSS scroll-snap - her holder vi bare fanene i takt. */
const phoneTrack = document.querySelector("[data-phone-track]");
const phoneTabButtons = Array.from(document.querySelectorAll("[data-phone-tab]"));
const phoneCards = phoneTrack ? Array.from(phoneTrack.querySelectorAll("[data-phone]")) : [];

if (phoneTrack && phoneCards.length > 0) {
  let phoneFrame = 0;

  const setActivePhone = (index) => {
    phoneTabButtons.forEach((button, i) => {
      const isActive = i === index;

      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-selected", String(isActive));
    });
    phoneCards.forEach((card, i) => card.classList.toggle("is-active", i === index));
  };

  const syncActivePhone = () => {
    phoneFrame = 0;

    const trackLeft = phoneTrack.getBoundingClientRect().left;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    phoneCards.forEach((card, index) => {
      const distance = Math.abs(card.getBoundingClientRect().left - trackLeft);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    setActivePhone(closestIndex);
  };

  phoneTabButtons.forEach((button, index) => {
    button.addEventListener("click", () => {
      const card = phoneCards[index];

      if (!card) {
        return;
      }

      setActivePhone(index);

      // Bare et faktisk sveipespor kan rulle; på desktop ligger alle tre synlig.
      if (phoneTrack.scrollWidth > phoneTrack.clientWidth + 1) {
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        phoneTrack.scrollTo({
          left: card.offsetLeft - phoneCards[0].offsetLeft,
          behavior: prefersReducedMotion ? "auto" : "smooth",
        });
      }
    });
  });

  phoneTrack.addEventListener("scroll", () => {
    if (phoneFrame) {
      return;
    }

    phoneFrame = window.requestAnimationFrame(syncActivePhone);
  }, { passive: true });
}

if (scopeStackCards.length > 0) {
  updateScopeStack();
  window.addEventListener("scroll", requestScopeStackUpdate, { passive: true });
  window.addEventListener("resize", requestScopeStackUpdate);
  window.addEventListener("load", requestScopeStackUpdate, { once: true });
}

const integrationButtons = document.querySelectorAll(".integration-buttons button");
const integrationPanels = document.querySelectorAll(".integration-panel");
const demoNavButtons = document.querySelectorAll(".demo-sidebar nav button");
const demoContent = document.querySelector(".demo-content");
const demoStatLabels = document.querySelectorAll("[data-stat-label]");
const demoStatValues = document.querySelectorAll("[data-stat-value]");
const demoStatTrends = document.querySelectorAll("[data-stat-trend]");
const demoStatUnits = document.querySelectorAll("[data-stat-unit]");
const demoPageTitle = document.querySelector("[data-demo-page-title]");
const demoBrowserContent = document.querySelector(".demo-browser-content");
const demoSidebarToggle = document.querySelector("[data-demo-sidebar-toggle]");
const siteHeader = document.querySelector(".site-header");
const mobileMenu = document.querySelector("#mobile-menu");
const mobileMenuButton = document.querySelector(".mobile-menu-button");
const mobileMenuLinks = document.querySelectorAll(".mobile-menu a");
const deviceToggleButtons = document.querySelectorAll(".device-toggle-button");

const demoViews = {
  overview: {
    title: "Dagens drift",
    stats: [
      ["Dagens salg", "67 512", "12% ↑ vs sist lørdag", "kr"],
      ["Antall kjøp", "312", "", ""],
      ["Snittpris", "400", "", "kr"],
    ],
  },
  reports: {
    title: "Rapporter",
    stats: [
      ["Rapporter", "8", "", ""],
      ["Nye funn", "14", "", ""],
      ["Sist oppdatert", "09:12", "", ""],
    ],
  },
  advice: {
    title: "Råd fra Scope",
    stats: [
      ["Prioritet", "Høy", "", ""],
      ["Råd i dag", "6", "", ""],
      ["Estimert effekt", "+8%", "", ""],
    ],
  },
  effect: {
    title: "Effekt",
    stats: [
      ["Økt resultat", "+38 600", "Siste 90 dager", "kr"],
      ["Gjennomførte tiltak", "7", "", ""],
      ["Positiv effekt", "5", "", ""],
    ],
  },
  integrations: {
    title: "Integrasjoner",
    stats: [
      ["Aktive kilder", "4", "", ""],
      ["Synk i dag", "18", "", ""],
      ["Status", "OK", "", ""],
    ],
  },
  usage: {
    title: "Bruk",
    stats: [
      ["Guider", "5", "", ""],
      ["Fullført", "2", "", ""],
      ["Hjelp", "6", "svar i FAQ", ""],
    ],
  },
};

function renderDemoView(viewName) {
  const view = demoViews[viewName];

  if (!view) {
    return;
  }

  if (demoContent) {
    demoContent.dataset.activeView = viewName;
    demoContent.classList.toggle("is-reports-view", viewName === "reports");
    demoContent.classList.toggle("is-advice-view", viewName === "advice");
    demoContent.classList.toggle("is-effect-view", viewName === "effect");
    demoContent.classList.toggle("is-integrations-view", viewName === "integrations");
    demoContent.classList.toggle("is-usage-view", viewName === "usage");
  }

  if (demoPageTitle) {
    demoPageTitle.textContent = view.title;
  }

  const reportAction = document.querySelector(".new-report-button");
  const periodAction = document.querySelector("[data-demo-period]");

  if (reportAction) {
    reportAction.hidden = !["overview", "reports"].includes(viewName);
  }

  if (periodAction) {
    periodAction.hidden = viewName === "integrations";
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
  button.title = button.textContent.trim();
  button.addEventListener("click", () => {
    demoNavButtons.forEach((item) => {
      item.classList.remove("active");
    });

    button.classList.add("active");
    renderDemoView(button.dataset.view);
  });
});

if (demoBrowserContent && demoSidebarToggle) {
  demoSidebarToggle.addEventListener("click", () => {
    const isCollapsed = demoBrowserContent.classList.toggle("is-sidebar-collapsed");

    demoSidebarToggle.setAttribute("aria-expanded", String(!isCollapsed));
    demoSidebarToggle.setAttribute("aria-label", isCollapsed ? "Vis sidemeny" : "Skjul sidemeny");
  });

  if (startsWithCollapsedSidebar) {
    demoSidebarToggle.click();
  }
}

if (requestedDemoView && demoViews[requestedDemoView]) {
  document.querySelector(`[data-view="${requestedDemoView}"]`)?.click();
}

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

let deviceSwitchTimer = null;
let pendingDeviceIsMobile = null;

function setDemoDevice(selectedDevice) {
  const currentDemoMockup = document.querySelector(".mockup-box");
  const shouldUseMobile = selectedDevice === "mobile";

  if (!currentDemoMockup) {
    return;
  }

  const targetIsMobile = pendingDeviceIsMobile === null
    ? currentDemoMockup.classList.contains("is-mobile-demo")
    : pendingDeviceIsMobile;

  if (targetIsMobile === shouldUseMobile) {
    return;
  }

  window.clearTimeout(deviceSwitchTimer);

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    pendingDeviceIsMobile = null;
    currentDemoMockup.classList.remove("is-device-switching");
    currentDemoMockup.classList.toggle("is-mobile-demo", shouldUseMobile);
    return;
  }

  pendingDeviceIsMobile = shouldUseMobile;
  currentDemoMockup.classList.add("is-device-switching");

  deviceSwitchTimer = window.setTimeout(() => {
    currentDemoMockup.classList.toggle("is-mobile-demo", shouldUseMobile);
    pendingDeviceIsMobile = null;

    deviceSwitchTimer = window.setTimeout(() => {
      currentDemoMockup.classList.remove("is-device-switching");
    }, 430);
  }, 170);
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
      borderRadius: isExpanded ? "6px" : "0",
      transform: `translate(${startTransform.x}px, ${startTransform.y}px) scale(${startTransform.scaleX}, ${startTransform.scaleY})`,
      transformOrigin: "top left",
    },
    {
      borderRadius: isExpanded ? "0" : "6px",
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
  if (event.key === "Escape" && !opensDemoDirectly) {
    setDemoExpanded(false);
  }
});

if (demoMockup && themeToggle) {
  themeToggle.addEventListener("click", () => {
    const isDark = demoMockup.classList.toggle("is-dark");

    themeToggle.setAttribute("aria-label", isDark ? "Bytt til light mode" : "Bytt til dark mode");
  });
}

const demoTripletexCard = document.querySelector("[data-demo-tripletex]");
const demoTripletexConnect = document.querySelector("[data-demo-tripletex-connect]");
const demoTripletexStatus = document.querySelector("[data-demo-tripletex-status]");

if (demoTripletexCard && demoTripletexConnect && demoTripletexStatus) {
  demoTripletexConnect.addEventListener("click", () => {
    demoTripletexCard.classList.add("is-connected");
    demoTripletexStatus.hidden = false;
    demoTripletexConnect.textContent = "Tilkobling åpnet";
  });
}

const newReportButton = document.querySelector(".new-report-button");

if (newReportButton) {
  newReportButton.addEventListener("click", () => {
    const reportsButton = document.querySelector('[data-view="reports"]');

    reportsButton?.click();
  });
}

/* ===== Oversikten: interaktiv trendgraf, tiltak og dagsscore ===== */

const trendChartHost = document.querySelector("[data-trend-chart]");
const trendKicker = document.querySelector("[data-trend-kicker]");
const trendTitle = document.querySelector("[data-trend-title]");

const demoTrend = {
  hours: [10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5, 18, 18.5, 19, 19.5, 20, 20.5, 21, 21.5, 22],
  nowIndex: 12,
  now: { guests: 84, staff: 12 },
  metrics: {
    sales: {
      kicker: "Omsetning · per halvtime",
      title: "I dag mot forrige søndag",
      unit: "kr",
      today: [750, 980, 1320, 1750, 2150, 2540, 2680, 2410, 2050, 1780, 1640, 2150, 3260],
      forecast: [3260, 3870, 4460, 4950, 5350, 5540, 5260, 4760, 4030, 3190, 2350, 1510, 870],
      lastWeek: [670, 870, 1180, 1560, 1920, 2260, 2390, 2150, 1830, 1590, 1460, 1920, 2910, 3450, 3980, 4420, 4780, 4950, 4700, 4250, 3600, 2850, 2100, 1350, 780],
    },
    staff: {
      kicker: "Bemanning · per halvtime",
      title: "På jobb i dag mot forrige søndag",
      unit: "ansatte",
      today: [4, 4, 5, 5, 6, 6, 6, 7, 7, 7, 8, 10, 12],
      forecast: [12, 12, 13, 13, 13, 14, 14, 13, 13, 12, 10, 8, 6],
      lastWeek: [4, 4, 4, 5, 5, 6, 6, 6, 6, 7, 7, 9, 11, 12, 12, 13, 13, 13, 12, 12, 11, 9, 8, 6, 5],
    },
    guests: {
      kicker: "Gjester · per halvtime",
      title: "I dag mot forrige søndag",
      unit: "gjester",
      today: [6, 8, 11, 14, 18, 21, 22, 20, 17, 14, 13, 17, 26],
      forecast: [26, 31, 36, 40, 43, 45, 42, 38, 32, 26, 19, 12, 7],
      lastWeek: [5, 7, 10, 13, 16, 19, 20, 18, 15, 13, 12, 15, 23, 27, 31, 35, 38, 40, 38, 34, 29, 23, 17, 11, 6],
    },
    reservations: {
      kicker: "Reservasjoner · per halvtime",
      title: "Booket utover dagen",
      unit: "reservasjoner",
      today: [1, 1, 2, 3, 2, 3, 2, 2, 3, 2, 3, 4, 5],
      forecast: [5, 6, 7, 8, 8, 7, 6, 5, 4, 3, 2, 1, 1],
      lastWeek: [1, 1, 1, 2, 2, 3, 2, 2, 2, 2, 2, 3, 4, 5, 6, 7, 7, 6, 5, 4, 3, 2, 1, 1, 0],
    },
  },
};

const trendSeriesMeta = {
  today: { label: "I dag" },
  forecast: { label: "Estimat" },
  lastWeek: { label: "Forrige uke" },
};

const TREND_PAD = { top: 20, right: 16, bottom: 26, left: 42 };

let activeTrendMetric = "sales";
let lastTrendWidth = 0;
const visibleTrendSeries = { today: true, forecast: true, lastWeek: true };

function formatTrendNumber(value) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function trendAxisLabel(value) {
  return value >= 1000 ? `${Math.round(value / 1000)}k` : String(value);
}

function formatTrendHour(hour) {
  return `${Math.floor(hour)}:${hour % 1 ? "30" : "00"}`;
}

function trendSeriesPoints(seriesName, metric) {
  if (seriesName === "today") {
    return metric.today.map((value, index) => ({ index, value }));
  }

  if (seriesName === "forecast") {
    return metric.forecast.map((value, offset) => ({ index: demoTrend.nowIndex + offset, value }));
  }

  return metric.lastWeek.map((value, index) => ({ index, value }));
}

function renderTrendChart() {
  if (!trendChartHost) {
    return;
  }

  const metric = demoTrend.metrics[activeTrendMetric];
  const { hours, nowIndex } = demoTrend;
  const width = Math.max(trendChartHost.clientWidth || 0, 320);
  const height = 180;
  const innerWidth = width - TREND_PAD.left - TREND_PAD.right;
  const innerHeight = height - TREND_PAD.top - TREND_PAD.bottom;

  lastTrendWidth = trendChartHost.clientWidth;

  const activeSeries = ["lastWeek", "forecast", "today"].filter((name) => visibleTrendSeries[name]);
  const allValues = activeSeries.flatMap((name) => trendSeriesPoints(name, metric).map((point) => point.value));
  const rawMax = Math.max(...allValues, 1);
  const roughStep = rawMax / 4;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep));
  const step = Math.ceil(roughStep / magnitude) * magnitude;
  const maxValue = step * 4;

  const x = (index) => TREND_PAD.left + (index / (hours.length - 1)) * innerWidth;
  const y = (value) => TREND_PAD.top + (1 - value / maxValue) * innerHeight;

  const gridLines = [0, 1, 2, 3, 4].map((tick) => {
    const yPos = y(step * tick);

    return `<line x1="${TREND_PAD.left}" y1="${yPos}" x2="${width - TREND_PAD.right}" y2="${yPos}" class="trend-grid"></line>
      <text x="${TREND_PAD.left - 8}" y="${yPos + 3}" text-anchor="end">${trendAxisLabel(step * tick)}</text>`;
  }).join("");

  const xLabels = hours.map((hour, index) => (
    index % 4 === 0 ? `<text x="${x(index)}" y="${height - 7}" text-anchor="middle">${hour}</text>` : ""
  )).join("");

  const linePath = (points) => points
    .map((point, index) => `${index === 0 ? "M" : "L"}${x(point.index).toFixed(1)} ${y(point.value).toFixed(1)}`)
    .join(" ");

  const seriesPaths = activeSeries.map((name) => {
    const cssName = name === "lastWeek" ? "lastweek" : name;

    return `<path d="${linePath(trendSeriesPoints(name, metric))}" class="trend-line trend-line--${cssName}"></path>`;
  }).join("");

  const nowDot = visibleTrendSeries.today
    ? `<circle cx="${x(nowIndex)}" cy="${y(metric.today[nowIndex])}" r="4" class="trend-now-dot"></circle>`
    : "";

  trendChartHost.innerHTML = `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${metric.kicker}">
      ${gridLines}
      <line x1="${x(nowIndex)}" y1="${TREND_PAD.top}" x2="${x(nowIndex)}" y2="${height - TREND_PAD.bottom}" class="trend-now-line"></line>
      <text x="${x(nowIndex)}" y="${TREND_PAD.top - 8}" text-anchor="middle" class="trend-now-label">Nå</text>
      ${seriesPaths}
      ${nowDot}
      ${xLabels}
      <line class="trend-guide" x1="-10" x2="-10" y1="${TREND_PAD.top}" y2="${height - TREND_PAD.bottom}"></line>
    </svg>
    <div class="trend-tooltip" hidden></div>
  `;
}

function handleTrendHover(event) {
  const svg = trendChartHost?.querySelector("svg");
  const tooltip = trendChartHost?.querySelector(".trend-tooltip");
  const guide = trendChartHost?.querySelector(".trend-guide");

  if (!svg || !tooltip || !guide) {
    return;
  }

  const metric = demoTrend.metrics[activeTrendMetric];
  const { hours, nowIndex } = demoTrend;
  const rect = svg.getBoundingClientRect();
  const innerWidth = rect.width - TREND_PAD.left - TREND_PAD.right;
  const ratio = (event.clientX - rect.left - TREND_PAD.left) / innerWidth;
  const index = Math.max(0, Math.min(hours.length - 1, Math.round(ratio * (hours.length - 1))));
  const xPos = TREND_PAD.left + (index / (hours.length - 1)) * innerWidth;

  guide.setAttribute("x1", xPos);
  guide.setAttribute("x2", xPos);
  guide.classList.add("is-visible");

  const rows = [];

  if (visibleTrendSeries.today && index <= nowIndex) {
    rows.push(["today", metric.today[index]]);
  }

  if (visibleTrendSeries.forecast && index >= nowIndex) {
    rows.push(["forecast", metric.forecast[index - nowIndex]]);
  }

  if (visibleTrendSeries.lastWeek) {
    rows.push(["lastWeek", metric.lastWeek[index]]);
  }

  if (!rows.length) {
    tooltip.hidden = true;
    return;
  }

  tooltip.innerHTML = `<strong>Kl. ${formatTrendHour(hours[index])}</strong>` + rows.map(([name, value]) => {
    const cssName = name === "lastWeek" ? "lastweek" : name;
    const unit = metric.unit === "kr" ? " kr" : "";

    return `<div><i class="dot--${cssName}"></i><span>${trendSeriesMeta[name].label}</span><b>${formatTrendNumber(value)}${unit}</b></div>`;
  }).join("");
  tooltip.hidden = false;

  let left = xPos + 14;

  if (left + tooltip.offsetWidth > rect.width - 6) {
    left = xPos - tooltip.offsetWidth - 14;
  }

  tooltip.style.left = `${Math.max(left, 0)}px`;
  tooltip.style.top = "14px";
}

function hideTrendHover() {
  trendChartHost?.querySelector(".trend-guide")?.classList.remove("is-visible");
  const tooltip = trendChartHost?.querySelector(".trend-tooltip");

  if (tooltip) {
    tooltip.hidden = true;
  }
}

const trendKpiCards = document.querySelectorAll(".manager-kpi[data-kpi]");

trendKpiCards.forEach((card) => {
  card.addEventListener("click", () => {
    trendKpiCards.forEach((item) => item.classList.remove("is-active"));
    card.classList.add("is-active");
    activeTrendMetric = card.dataset.kpi;

    const metric = demoTrend.metrics[activeTrendMetric];

    if (trendKicker) trendKicker.textContent = metric.kicker;
    if (trendTitle) trendTitle.textContent = metric.title;
    renderTrendChart();
  });
});

document.querySelectorAll("[data-trend-legend] [data-series]").forEach((button) => {
  button.addEventListener("click", () => {
    const series = button.dataset.series;

    visibleTrendSeries[series] = !visibleTrendSeries[series];
    button.classList.toggle("is-on", visibleTrendSeries[series]);
    button.setAttribute("aria-pressed", String(visibleTrendSeries[series]));
    renderTrendChart();
  });
});

if (trendChartHost) {
  renderTrendChart();
  trendChartHost.addEventListener("mousemove", handleTrendHover);
  trendChartHost.addEventListener("mouseleave", hideTrendHover);

  if ("ResizeObserver" in window) {
    new ResizeObserver(() => {
      if (trendChartHost.clientWidth !== lastTrendWidth) {
        renderTrendChart();
      }
    }).observe(trendChartHost);
  } else {
    window.addEventListener("resize", renderTrendChart);
  }
}

const taskInputs = document.querySelectorAll(".manager-task-list [data-task]");
const taskStatus = document.querySelector("[data-task-status]");

taskInputs.forEach((input) => {
  input.addEventListener("change", () => {
    input.closest("li")?.classList.toggle("is-done", input.checked);

    if (taskStatus) {
      const doneCount = [...taskInputs].filter((item) => item.checked).length;

      taskStatus.textContent = `${doneCount} av ${taskInputs.length} gjort`;
    }
  });
});

const DIE_PIPS = {
  1: [[2, 2]],
  2: [[1, 1], [3, 3]],
  3: [[1, 1], [2, 2], [3, 3]],
  4: [[1, 1], [1, 3], [3, 1], [3, 3]],
  5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]],
  6: [[1, 1], [1, 3], [2, 1], [2, 3], [3, 1], [3, 3]],
};

function renderDayScore() {
  const verdictEl = document.querySelector("[data-score-verdict]");
  const valueEl = document.querySelector("[data-score-value]");
  const dieEl = document.querySelector("[data-score-die]");
  const factorsEl = document.querySelector("[data-score-factors]");

  if (!verdictEl || !valueEl || !dieEl || !factorsEl) {
    return;
  }

  const sumSoFar = (values) => values.slice(0, demoTrend.nowIndex + 1).reduce((total, value) => total + value, 0);
  const salesRatio = sumSoFar(demoTrend.metrics.sales.today) / sumSoFar(demoTrend.metrics.sales.lastWeek);
  const guestsPerStaff = demoTrend.now.guests / demoTrend.now.staff;

  const salesPoints = salesRatio >= 1.25 ? 3 : salesRatio >= 1.1 ? 2.5 : salesRatio >= 1 ? 2 : salesRatio >= 0.9 ? 1.5 : 1;
  const staffPoints = guestsPerStaff >= 6 && guestsPerStaff <= 8 ? 2.5
    : guestsPerStaff >= 5 && guestsPerStaff <= 9 ? 2
    : guestsPerStaff < 5 ? 1.5 : 1;
  const score = Math.max(1, Math.min(6, Math.round(salesPoints + staffPoints)));
  const verdicts = ["Krever handling", "Bør følges opp", "Middels", "Bra kontroll", "Sterk dag", "Topp dag"];

  verdictEl.textContent = verdicts[score - 1];
  valueEl.innerHTML = `${score}<small>/6</small>`;

  dieEl.classList.remove("is-good", "is-mid", "is-low");
  dieEl.classList.add(score >= 5 ? "is-good" : score >= 3 ? "is-mid" : "is-low");
  dieEl.innerHTML = DIE_PIPS[score].map(([row, col]) => `<b style="grid-area: ${row} / ${col}"></b>`).join("");

  const salesGood = salesRatio >= 1.05;
  const staffGood = guestsPerStaff >= 5 && guestsPerStaff <= 9;
  const salesDelta = Math.round((salesRatio - 1) * 100);

  factorsEl.innerHTML = `
    <li><i class="${salesGood ? "is-good" : "is-warn"}">${salesGood ? "✓" : "!"}</i><span>Salget ligger ${Math.abs(salesDelta)}% ${salesDelta >= 0 ? "over" : "under"} forrige søndag</span></li>
    <li><i class="${staffGood ? "is-good" : "is-warn"}">${staffGood ? "✓" : "!"}</i><span>${staffGood ? "Bemanning i balanse" : "Bemanningen bør justeres"} · ${Math.round(guestsPerStaff)} gjester per ansatt</span></li>
  `;
}

renderDayScore();

const reportFeedback = document.querySelector("[data-report-feedback]");

document.querySelectorAll("[data-report-name]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-report-name]").forEach((item) => item.classList.remove("is-open"));
    button.classList.add("is-open");

    if (reportFeedback) {
      reportFeedback.textContent = `${button.dataset.reportName} er åpnet i demovisning.`;
    }
  });
});

document.querySelectorAll(".demo-advice-list .advice-card").forEach((card) => {
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-pressed", "false");

  const toggleAdvice = () => {
    const isSelected = card.classList.toggle("is-selected");

    card.setAttribute("aria-pressed", String(isSelected));
  };

  card.addEventListener("click", toggleAdvice);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggleAdvice();
    }
  });
});

document.querySelectorAll("[data-open-advice]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelector('[data-view="advice"]')?.click();
  });
});

document.querySelectorAll("[data-manager-advice]").forEach((button) => {
  button.addEventListener("click", () => {
    const isPlanned = button.classList.toggle("is-planned");

    button.textContent = isPlanned ? "✓ Planlagt" : button.closest(".advice-featured-action") ? "Marker som planlagt" : "Planlegg";
  });
});

if (opensDemoDirectly && demoMockup) {
  document.body.classList.add("is-demo-session");
  document.body.classList.add("demo-expanded");
  document.body.appendChild(demoMockup);
  demoMockup.classList.add("is-expanded");
  expandButton?.remove();
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

const revealPrefersReducedMotion = typeof window.matchMedia === "function"
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const revealTargets = document.querySelectorAll(".section-heading, .accounting-card, .tester-block, .footer-cta, .enkel-section-head, .enkel-card, .enkel-person, .enkel-cta-copy");

if (!revealPrefersReducedMotion && "IntersectionObserver" in window && revealTargets.length > 0) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      const element = entry.target;
      const delay = parseFloat(element.style.getPropertyValue("--reveal-delay")) || 0;

      element.classList.add("is-visible");
      window.setTimeout(() => {
        element.classList.remove("reveal", "is-visible");
        element.style.removeProperty("--reveal-delay");
      }, delay + 900);
      observer.unobserve(element);
    });
  }, {
    rootMargin: "0px 0px -10% 0px",
    threshold: 0.1,
  });

  const staggerByParent = new Map();

  revealTargets.forEach((element) => {
    const staggerIndex = staggerByParent.get(element.parentElement) || 0;

    staggerByParent.set(element.parentElement, staggerIndex + 1);
    element.style.setProperty("--reveal-delay", `${staggerIndex * 90}ms`);
    element.classList.add("reveal");
    revealObserver.observe(element);
  });
}

const heroSection = document.querySelector(".hero-section");
const heroVideo = document.querySelector(".hero-video");

if (heroSection && heroVideo) {
  if (revealPrefersReducedMotion) {
    heroVideo.removeAttribute("autoplay");
    heroVideo.pause();
  } else {
    const showHeroVideo = () => {
      heroSection.classList.add("has-video");
    };

    heroVideo.addEventListener("canplay", showHeroVideo, { once: true });

    if (heroVideo.readyState >= 3) {
      showHeroVideo();
    }
  }
}

const contactWidget = document.querySelector(".contact-widget");

if (contactWidget) {
  const contactBubble = contactWidget.querySelector(".contact-bubble");
  const contactPanel = contactWidget.querySelector(".contact-panel");
  const contactClose = contactWidget.querySelector(".contact-close");
  const contactChoiceButtons = contactWidget.querySelectorAll(".contact-choice button");
  const contactForm = contactWidget.querySelector(".contact-form");
  const contactCompanyField = contactWidget.querySelector(".contact-company-field");
  const contactCompanyInput = contactWidget.querySelector("input[name='company']");
  const contactMessageInput = contactWidget.querySelector("textarea[name='message']");
  const contactStatus = contactWidget.querySelector(".contact-status");
  let contactType = "";

  function setContactOpen(isOpen) {
    contactPanel.hidden = !isOpen;
    contactBubble.setAttribute("aria-expanded", String(isOpen));

    if (isOpen) {
      contactChoiceButtons[0].focus();
    }
  }

  function setContactType(type) {
    contactType = type;
    contactForm.hidden = false;
    contactStatus.textContent = "";

    contactChoiceButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.contactType === type);
    });

    const needsCompany = type === "prospect";

    contactCompanyField.hidden = !needsCompany;
    contactCompanyInput.required = needsCompany;

    if (needsCompany) {
      contactCompanyInput.focus();
    } else {
      contactCompanyInput.value = "";
      contactMessageInput.focus();
    }
  }

  contactBubble.addEventListener("click", () => {
    setContactOpen(contactPanel.hidden);
  });

  contactClose.addEventListener("click", () => {
    setContactOpen(false);
    contactBubble.focus();
  });

  contactChoiceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setContactType(button.dataset.contactType);
    });
  });

  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const company = contactCompanyInput.value.trim();
    const message = contactMessageInput.value.trim();

    if (contactType === "prospect" && !company) {
      contactStatus.textContent = "Skriv inn selskap.";
      contactCompanyInput.focus();
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
    if (contactPanel.hidden || contactWidget.contains(event.target)) {
      return;
    }

    setContactOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !contactPanel.hidden) {
      setContactOpen(false);
      contactBubble.focus();
    }
  });
}

const cookieName = "scope_cookie_preferences";
const defaultCookiePreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

function getCookieValue(name) {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
}

function readCookiePreferences() {
  const savedPreferences = getCookieValue(cookieName);

  if (!savedPreferences) {
    return null;
  }

  try {
    return {
      ...defaultCookiePreferences,
      ...JSON.parse(decodeURIComponent(savedPreferences)),
      necessary: true,
    };
  } catch (error) {
    return null;
  }
}

function writeCookiePreferences(preferences) {
  const normalizedPreferences = {
    necessary: true,
    analytics: Boolean(preferences.analytics),
    marketing: Boolean(preferences.marketing),
    updatedAt: new Date().toISOString(),
  };
  const maxAge = 60 * 60 * 24 * 365;

  document.cookie = `${cookieName}=${encodeURIComponent(JSON.stringify(normalizedPreferences))}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
  return normalizedPreferences;
}

const onboardingOverlay = document.querySelector(".onboarding-overlay");

if (onboardingOverlay) {
  const onboardingDialog = onboardingOverlay.querySelector(".onboarding-dialog");
  const onboardingSteps = Array.from(onboardingOverlay.querySelectorAll("[data-onboarding-step]"));
  const onboardingCurrent = onboardingOverlay.querySelector("[data-onboarding-current]");
  const onboardingProgress = onboardingOverlay.querySelector("[data-onboarding-progress]");
  const onboardingActions = onboardingOverlay.querySelector("[data-onboarding-actions]");
  const onboardingBack = onboardingOverlay.querySelector("[data-onboarding-back]");
  const onboardingNext = onboardingOverlay.querySelector("[data-onboarding-next]");
  const companySearch = onboardingOverlay.querySelector("[data-company-search]");
  const companySpinner = onboardingOverlay.querySelector("[data-company-spinner]");
  const companyHelp = onboardingOverlay.querySelector("[data-company-help]");
  const companyResults = onboardingOverlay.querySelector("[data-company-results]");
  const companySelected = onboardingOverlay.querySelector("[data-company-selected]");
  const selectedCompanyName = onboardingOverlay.querySelector("[data-selected-company-name]");
  const selectedCompanyMeta = onboardingOverlay.querySelector("[data-selected-company-meta]");
  const contactName = onboardingOverlay.querySelector("[data-contact-name]");
  const contactEmail = onboardingOverlay.querySelector("[data-contact-email]");
  const contactError = onboardingOverlay.querySelector("[data-contact-error]");
  const tripletexCard = onboardingOverlay.querySelector("[data-tripletex-card]");
  const tripletexConnect = onboardingOverlay.querySelector("[data-tripletex-connect]");
  const tripletexNote = onboardingOverlay.querySelector("[data-tripletex-note]");
  const summaryCompany = onboardingOverlay.querySelector("[data-summary-company]");
  const summaryContact = onboardingOverlay.querySelector("[data-summary-contact]");
  let currentOnboardingStep = 0;
  let selectedCompany = null;
  let tripletexSelected = false;
  let companySearchTimer;
  let companySearchController;
  let lastFocusedElement;

  function formatOrganizationNumber(value) {
    return String(value || "").replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
  }

  function getCompanyMeta(company) {
    const organizationForm = company.organisasjonsform?.beskrivelse || "Virksomhet";
    const city = company.forretningsadresse?.poststed || company.postadresse?.poststed;

    return [formatOrganizationNumber(company.organisasjonsnummer), organizationForm, city]
      .filter(Boolean)
      .join(" · ");
  }

  function updateOnboardingStep(step) {
    currentOnboardingStep = Math.max(0, Math.min(step, onboardingSteps.length - 1));

    onboardingSteps.forEach((onboardingStep, index) => {
      const isActive = index === currentOnboardingStep;

      onboardingStep.hidden = !isActive;
      onboardingStep.classList.toggle("is-active", isActive);
    });

    const displayedStep = Math.min(currentOnboardingStep + 1, 3);
    onboardingCurrent.textContent = displayedStep;
    onboardingProgress.style.width = `${Math.min(displayedStep / 3, 1) * 100}%`;
    onboardingActions.hidden = currentOnboardingStep === 3;
    onboardingBack.hidden = currentOnboardingStep === 0;
    onboardingNext.disabled = currentOnboardingStep === 0
      ? !selectedCompany
      : currentOnboardingStep === 2 && !tripletexSelected;
    onboardingNext.firstChild.textContent = currentOnboardingStep === 2 ? "Fullfør " : "Fortsett ";

    if (currentOnboardingStep === 0) {
      window.setTimeout(() => companySearch.focus(), 50);
    } else if (currentOnboardingStep === 1) {
      window.setTimeout(() => contactName.focus(), 50);
    } else if (currentOnboardingStep === 2) {
      window.setTimeout(() => tripletexConnect.focus(), 50);
    }
  }

  function openOnboarding(event) {
    event?.preventDefault();
    lastFocusedElement = document.activeElement;
    onboardingOverlay.hidden = false;
    document.body.classList.add("has-onboarding");
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}#onboarding`);
    updateOnboardingStep(currentOnboardingStep);
  }

  function closeOnboarding() {
    onboardingOverlay.hidden = true;
    document.body.classList.remove("has-onboarding");

    if (window.location.hash === "#onboarding") {
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }

    lastFocusedElement?.focus();
  }

  function renderCompanyResults(companies) {
    companyResults.replaceChildren();

    companies.forEach((company) => {
      const result = document.createElement("button");
      const details = document.createElement("span");
      const name = document.createElement("strong");
      const meta = document.createElement("span");
      const action = document.createElement("small");

      result.type = "button";
      result.className = "company-result";
      result.setAttribute("role", "option");
      name.textContent = company.navn;
      meta.textContent = getCompanyMeta(company);
      action.textContent = "Velg";
      details.append(name, meta);
      result.append(details, action);
      result.addEventListener("click", () => {
        selectedCompany = company;
        selectedCompanyName.textContent = company.navn;
        selectedCompanyMeta.textContent = getCompanyMeta(company);
        companyResults.hidden = true;
        companySearch.parentElement.hidden = true;
        companyHelp.hidden = true;
        companySelected.hidden = false;
        onboardingNext.disabled = false;
        onboardingNext.focus();
      });
      companyResults.appendChild(result);
    });

    companyResults.hidden = companies.length === 0;
    companyHelp.textContent = companies.length === 0
      ? "Ingen selskaper funnet. Prøv et annet navn eller organisasjonsnummer."
      : `${companies.length} forslag funnet`;
  }

  async function searchCompanies(query) {
    const digits = query.replace(/\D/g, "");
    const searchesByOrganizationNumber = digits.length === 9;
    const searchValue = searchesByOrganizationNumber ? digits : query.trim();

    companySearchController?.abort();
    companySearchController = null;
    companySpinner.hidden = true;

    if ((!searchesByOrganizationNumber && searchValue.length < 2) || (digits.length > 0 && digits.length < 9 && !/[a-zæøå]/i.test(query))) {
      companyResults.hidden = true;
      companyHelp.textContent = digits.length > 0 ? "Skriv hele organisasjonsnummeret." : "Skriv minst to tegn for å søke.";
      return;
    }

    const searchController = new AbortController();

    companySearchController = searchController;
    companySpinner.hidden = false;
    companyHelp.textContent = "Søker i Brønnøysundregistrene …";

    const parameters = new URLSearchParams({ size: "6" });

    if (searchesByOrganizationNumber) {
      parameters.set("organisasjonsnummer", searchValue);
    } else {
      parameters.set("navn", searchValue);
      parameters.set("navnMetodeForSoek", "FORTLOEPENDE");
    }

    try {
      const response = await fetch(`https://data.brreg.no/enhetsregisteret/api/enheter?${parameters}`, {
        headers: { Accept: "application/vnd.brreg.enhetsregisteret.enhet.v2+json" },
        signal: searchController.signal,
      });

      if (!response.ok) {
        throw new Error(`Selskapsøket svarte med ${response.status}`);
      }

      const payload = await response.json();
      if (companySearchController === searchController) {
        renderCompanyResults(payload._embedded?.enheter || []);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        companyResults.hidden = true;
        companyHelp.textContent = "Søket er midlertidig utilgjengelig. Prøv igjen om litt.";
      }
    } finally {
      if (companySearchController === searchController) {
        companySpinner.hidden = true;
      }
    }
  }

  companySearch.addEventListener("input", () => {
    window.clearTimeout(companySearchTimer);
    companySearchTimer = window.setTimeout(() => searchCompanies(companySearch.value), 320);
  });

  onboardingOverlay.querySelector("[data-company-change]").addEventListener("click", () => {
    selectedCompany = null;
    companySelected.hidden = true;
    companySearch.parentElement.hidden = false;
    companyHelp.hidden = false;
    companyResults.hidden = true;
    onboardingNext.disabled = true;
    companySearch.select();
  });

  tripletexConnect.addEventListener("click", () => {
    tripletexSelected = !tripletexSelected;
    tripletexCard.classList.toggle("is-selected", tripletexSelected);
    tripletexConnect.textContent = tripletexSelected ? "Valgt ✓" : "Velg";
    tripletexNote.hidden = !tripletexSelected;
    onboardingNext.disabled = !tripletexSelected;
  });

  onboardingBack.addEventListener("click", () => updateOnboardingStep(currentOnboardingStep - 1));
  onboardingNext.addEventListener("click", () => {
    if (currentOnboardingStep === 1) {
      const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.value.trim());

      if (!contactName.value.trim()) {
        contactError.textContent = "Skriv inn navnet ditt for å fortsette.";
        contactName.focus();
        return;
      }

      if (!emailIsValid) {
        contactError.textContent = "Skriv inn en gyldig e-postadresse.";
        contactEmail.focus();
        return;
      }

      contactError.textContent = "";
    }

    if (currentOnboardingStep === 2) {
      summaryCompany.textContent = selectedCompany.navn;
      summaryContact.textContent = `${contactName.value.trim()} · ${contactEmail.value.trim()}`;
      registerScopeOnboarding();
    }

    updateOnboardingStep(currentOnboardingStep + 1);
  });

  // Registrerer kunden i Scope når oppsummeringen vises, og åpner for den
  // ekte onboardingveiviseren. Feiler stille dersom serveren ikke kjører.
  const startSetupLink = onboardingOverlay.querySelector("[data-start-setup]");
  let scopeRegistrationStarted = false;

  async function registerScopeOnboarding() {
    if (scopeRegistrationStarted || !selectedCompany || !startSetupLink) return;
    scopeRegistrationStarted = true;
    try {
      const response = await fetch("/api/onboarding/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: selectedCompany.navn,
          orgNumber: selectedCompany.organisasjonsnummer || "",
          contact: contactName.value.trim(),
          email: contactEmail.value.trim(),
          phone: onboardingOverlay.querySelector("[data-contact-phone]")?.value.trim() || "",
        }),
      });
      if (response.ok) {
        startSetupLink.hidden = false;
      }
    } catch {
      scopeRegistrationStarted = false;
    }
  }

  document.querySelectorAll("[data-onboarding-open]").forEach((button) => button.addEventListener("click", openOnboarding));
  onboardingOverlay.querySelectorAll("[data-onboarding-close]").forEach((button) => button.addEventListener("click", closeOnboarding));
  window.addEventListener("hashchange", () => {
    if (window.location.hash === "#onboarding" && onboardingOverlay.hidden) {
      openOnboarding();
    }
  });
  onboardingOverlay.addEventListener("click", (event) => {
    if (event.target === onboardingOverlay) {
      closeOnboarding();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (onboardingOverlay.hidden) {
      return;
    }

    if (event.key === "Escape") {
      closeOnboarding();
      return;
    }

    if (event.key === "Tab") {
      const focusableElements = Array.from(onboardingDialog.querySelectorAll("a[href], button:not([disabled]):not([hidden]), input:not([disabled])"))
        .filter((element) => element.offsetParent !== null);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  });

  if (window.location.hash === "#onboarding" || new URLSearchParams(window.location.search).get("onboarding") === "1") {
    openOnboarding();
  }
}

const cookieConsent = document.querySelector(".cookie-consent");

if (cookieConsent) {
  const consentAnalyticsInput = cookieConsent.querySelector("input[name='consent-analytics']");
  const consentMarketingInput = cookieConsent.querySelector("input[name='consent-marketing']");
  const savedPreferences = readCookiePreferences();

  function closeCookieConsent() {
    cookieConsent.hidden = true;
    document.body.classList.remove("has-cookie-consent");
  }

  function saveCookieConsent(preferences) {
    writeCookiePreferences(preferences);
    closeCookieConsent();
  }

  if (!savedPreferences) {
    cookieConsent.hidden = false;
    document.body.classList.add("has-cookie-consent");
  } else {
    consentAnalyticsInput.checked = Boolean(savedPreferences.analytics);
    consentMarketingInput.checked = Boolean(savedPreferences.marketing);
  }

  cookieConsent.querySelectorAll("[data-cookie-consent]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.cookieConsent;

      if (action === "all") {
        saveCookieConsent({ analytics: true, marketing: true });
        return;
      }

      if (action === "necessary") {
        saveCookieConsent({ analytics: false, marketing: false });
        return;
      }

      saveCookieConsent({
        analytics: consentAnalyticsInput.checked,
        marketing: consentMarketingInput.checked,
      });
    });
  });
}

const cookieSettingsForm = document.querySelector(".cookie-settings-form");

if (cookieSettingsForm) {
  const analyticsInput = cookieSettingsForm.querySelector("input[name='analytics']");
  const marketingInput = cookieSettingsForm.querySelector("input[name='marketing']");
  const cookieStatus = cookieSettingsForm.querySelector(".cookie-status");

  function renderCookiePreferences(preferences) {
    const renderedPreferences = preferences || defaultCookiePreferences;

    analyticsInput.checked = Boolean(renderedPreferences.analytics);
    marketingInput.checked = Boolean(renderedPreferences.marketing);
  }

  function saveCookiePreferences(preferences, message) {
    const savedPreferences = writeCookiePreferences(preferences);

    renderCookiePreferences(savedPreferences);
    cookieStatus.textContent = message;

    if (cookieConsent) {
      cookieConsent.hidden = true;
      document.body.classList.remove("has-cookie-consent");
    }
  }

  renderCookiePreferences(readCookiePreferences());

  cookieSettingsForm.querySelectorAll("[data-cookie-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.cookieAction;

      saveCookiePreferences({
        analytics: action === "all",
        marketing: action === "all",
      }, action === "all" ? "Alle valg er lagret." : "Kun nødvendige cookies er lagret.");
    });
  });

  cookieSettingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveCookiePreferences({
      analytics: analyticsInput.checked,
      marketing: marketingInput.checked,
    }, "Cookie-valgene dine er lagret.");
  });
}

/* ===== Sammenhengende Scope-produktdemo ===== */

const scopeDemoStorageKey = "scope-product-demo-v1";

function readScopeDemoState() {
  try {
    return JSON.parse(window.localStorage.getItem(scopeDemoStorageKey)) || {};
  } catch (error) {
    return {};
  }
}

function writeScopeDemoState(patch) {
  const nextState = { ...readScopeDemoState(), ...patch };

  try {
    window.localStorage.setItem(scopeDemoStorageKey, JSON.stringify(nextState));
  } catch (error) {
    // Demoen fungerer fortsatt uten lagring dersom nettleseren blokkerer localStorage.
  }

  return nextState;
}

const scopeReports = [
  {
    id: "day-2026-07-14", type: "day", typeLabel: "Dagsrapport", period: "Tirsdag 14. juli 2026", date: "2026-07-14", location: "Varm Burger AS", tone: "green", status: "5/6 · Sterk dag",
    metrics: [["Omsetning", "67 512 kr"], ["Mot forrige tirsdag", "+12 %"], ["Oppsummert", "2 bra · 1 følg opp"]],
    slides: [
      { eyebrow: "Dagsrapport", title: "Slik gikk tirsdagen", value: "67 512 kr", text: "12 % over forrige tirsdag. En sterk dag med god flyt gjennom hele kvelden.", tone: "green" },
      { eyebrow: "Sterkeste tidspunkt", title: "18:00–20:00", value: "24 %", text: "av dagens omsetning kom i dette tidsrommet.", tone: "blue", bars: [34, 46, 58, 86, 100, 74] },
      { eyebrow: "Kapasitet", title: "Her ble det litt trangt", value: "84 gjester", text: "7 gjester per servitør. Kapasiteten var presset, men fortsatt håndterbar.", tone: "yellow" },
      { eyebrow: "Bør følges opp", title: "Varekosten på øl", value: "+4 pp", text: "over målet. Pris og svinn bør kontrolleres før helgen.", tone: "red" },
      { eyebrow: "Dagens vurdering", title: "Sterk dag", value: "5 av 6", text: "Høyt salg, god bemanning og ett tydelig forbedringspunkt.", tone: "purple" },
      { eyebrow: "I morgen", title: "Gjør dette først", text: "Sett inn én ekstra i servering fra kl. 17 og kontroller vareuttaket på øl før åpning.", tone: "pink", points: ["Ekstra servering fra kl. 17", "Kontroller vareuttak før åpning"] },
    ],
  },
  { id: "day-2026-07-13", type: "day", typeLabel: "Dagsrapport", period: "Mandag 13. juli 2026", date: "2026-07-13", location: "Varm Burger AS", tone: "green", status: "4/6 · God kontroll", metrics: [["Omsetning", "54 280 kr"], ["Driftsmargin", "13,9 %"], ["Råd", "1 nytt"]], slides: [] },
  { id: "day-2026-07-12", type: "day", typeLabel: "Dagsrapport", period: "Søndag 12. juli 2026", date: "2026-07-12", location: "Varm Burger Majorstuen", tone: "green", status: "5/6 · Sterk dag", metrics: [["Omsetning", "61 940 kr"], ["Gjester", "296"], ["Personalkost", "27,1 %"]], slides: [] },
  { id: "day-2026-07-11", type: "day", typeLabel: "Dagsrapport", period: "Lørdag 11. juli 2026", date: "2026-07-11", location: "Varm Burger AS", tone: "green", status: "6/6 · Topp dag", metrics: [["Omsetning", "82 400 kr"], ["Mot budsjett", "+16 %"], ["Avvik", "0"]], slides: [] },
  {
    id: "week-28", type: "week", typeLabel: "Ukesrapport", period: "Uke 28", date: "2026-07-13", location: "Varm Burger AS", tone: "blue", status: "3 nye råd",
    metrics: [["Omsetning", "428 650 kr"], ["Resultat", "+8,4 %"], ["Personalkost", "27,5 %"]],
    slides: [
      { eyebrow: "Ukesrapport", title: "Uke 28 oppsummert", value: "428 650 kr", text: "8,4 % opp fra forrige uke.", tone: "blue" },
      { eyebrow: "Ukens beste dag", title: "Lørdag", value: "82 400 kr", text: "Kvelden leverte både høy omsetning og god margin.", tone: "green" },
      { eyebrow: "Når tjente dere mest?", title: "Fredag og lørdag kveld", text: "Toppen kom mellom kl. 18 og 20.", tone: "purple", bars: [42, 48, 55, 64, 88, 100, 72] },
      { eyebrow: "Bemanningen", title: "Innenfor målet", value: "27,5 %", text: "Personalkost mot mål på 28 %.", tone: "yellow" },
      { eyebrow: "Det som gikk bra", title: "To tydelige styrker", tone: "green", points: ["Salget økte på fem av sju dager", "Bemanningen traff rushet bedre enn forrige uke"] },
      { eyebrow: "Bør følges opp", title: "Varekost og tirsdagskveld", tone: "red", points: ["Svinn på søtpotetfries", "Lav lønnsomhet siste åpningstime tirsdag"] },
      { eyebrow: "Scope anbefaler", title: "Tre råd for neste uke", tone: "pink", points: ["Ekstra servitør fredag 16–18", "Øk Cheeseburger med 5 kr", "Reduser innkjøpet av søtpotetfries"] },
      { eyebrow: "Slik ligger dere an", title: "Sterk uke", value: "+18 400 kr", text: "mulig månedlig effekt dersom rådene gjennomføres.", tone: "purple" },
    ],
  },
  { id: "week-27", type: "week", typeLabel: "Ukesrapport", period: "Uke 27", date: "2026-07-06", location: "Varm Burger AS", tone: "blue", status: "2 nye råd", metrics: [["Omsetning", "395 410 kr"], ["Driftsmargin", "13,8 %"], ["Råd", "2 nye"]], slides: [] },
  { id: "week-26", type: "week", typeLabel: "Ukesrapport", period: "Uke 26", date: "2026-06-29", location: "Varm Burger Majorstuen", tone: "blue", status: "4/6 · Bra uke", metrics: [["Omsetning", "381 900 kr"], ["Personalkost", "28,2 %"], ["Effekt", "+7 600 kr"]], slides: [] },
  { id: "week-25", type: "week", typeLabel: "Ukesrapport", period: "Uke 25", date: "2026-06-22", location: "Varm Burger AS", tone: "blue", status: "1 nytt råd", metrics: [["Omsetning", "369 740 kr"], ["Mot budsjett", "+2,8 %"], ["Råd", "1 nytt"]], slides: [] },
  {
    id: "month-2026-06", type: "month", typeLabel: "Månedsrapport", period: "Juni 2026", date: "2026-06-30", location: "Varm Burger AS", tone: "purple", status: "Lønnsomhet opp 2,1 pp",
    metrics: [["Omsetning", "1 842 300 kr"], ["Driftsmargin", "14,8 %"], ["Personalkost", "27,5 %"]],
    slides: [
      { eyebrow: "Månedsrapport", title: "Juni oppsummert", value: "1 842 300 kr", text: "En måned med jevn vekst og bedre lønnsomhet.", tone: "purple" },
      { eyebrow: "Utvikling", title: "Mot mai", value: "+9,2 %", text: "Omsetningen økte uten at personalkosten løp fra salget.", tone: "green" },
      { eyebrow: "Driftsmargin", title: "Bedre lønnsomhet", value: "14,8 %", text: "2,1 prosentpoeng over forrige måned.", tone: "blue" },
      { eyebrow: "Personalkost", title: "Innenfor målet", value: "27,5 %", text: "0,5 prosentpoeng under målet på 28 %.", tone: "green" },
      { eyebrow: "Varekost", title: "Stabilt nivå", value: "31,2 %", text: "Søtpotetfries og øl er kategoriene som bør følges tettest.", tone: "yellow" },
      { eyebrow: "Beste dag", title: "Lørdag 27. juni", value: "82 400 kr", text: "Månedens høyeste dagsomsetning.", tone: "purple" },
      { eyebrow: "Beste uke", title: "Uke 26", value: "381 900 kr", text: "Høy kapasitet og god vareflyt.", tone: "yellow" },
      { eyebrow: "Svakeste tidspunkt", title: "Tirsdag 21:00–22:00", value: "55 kr", text: "i gjennomsnittlig salg per åpen time.", tone: "red" },
      { eyebrow: "Gjennomførte råd", title: "Fem tiltak fullført", value: "5", text: "Tre har allerede dokumentert positiv effekt.", tone: "pink" },
      { eyebrow: "Dokumentert effekt", title: "Gjennomførte råd", value: "+21 700 kr", text: "skapt gjennom bemanning, pris og mindre svinn.", tone: "green" },
      { eyebrow: "Månedens læring", title: "Kapasitet lønner seg når timingen er presis", text: "Ekstra bemanning ga størst verdi i de to mest hektiske timene, ikke gjennom hele vakten.", tone: "blue" },
      { eyebrow: "Neste måned", title: "Anbefalt fokus", tone: "pink", points: ["Behold bemanningsnivået fredag", "Reduser svinn på sideretter", "Test ny pris på Cheeseburger"] },
    ],
  },
  { id: "month-2026-05", type: "month", typeLabel: "Månedsrapport", period: "Mai 2026", date: "2026-05-31", location: "Varm Burger AS", tone: "purple", status: "Stabil måned", metrics: [["Omsetning", "1 686 900 kr"], ["Driftsmargin", "12,7 %"], ["Råd gjennomført", "3"]], slides: [] },
  { id: "month-2026-04", type: "month", typeLabel: "Månedsrapport", period: "April 2026", date: "2026-04-30", location: "Varm Burger Majorstuen", tone: "purple", status: "Margin opp 1,4 pp", metrics: [["Omsetning", "1 593 400 kr"], ["Varekost", "31,2 %"], ["Effekt", "+12 300 kr"]], slides: [] },
];

scopeReports.forEach((report) => {
  if (!report.slides.length) {
    report.slides = [
      { eyebrow: report.typeLabel, title: report.period, value: report.metrics[0][1], text: report.status, tone: report.tone },
      { eyebrow: "Nøkkeltall", title: "Det viktigste fra perioden", tone: "yellow", points: report.metrics.map(([label, value]) => `${label}: ${value}`) },
      { eyebrow: "Scope oppsummerer", title: "God kontroll", text: "Driften utviklet seg stabilt. Åpne Råd for å se anbefalte neste steg.", tone: "green" },
    ];
  }
});

const scopeAdvice = [
  { id: "staff-friday", title: "Sett inn én ekstra servitør fredag kl. 16–18", reason: "30 % av ukesalget kommer i dette tidsrommet, og ventetiden øker når dere passerer 7 gjester per servitør.", date: "2026-07-13", report: "week-28", reportLabel: "Ukesrapport · Uke 28", period: "week-28", location: "Varm Burger AS", category: "Bemanning", effect: 6200, cost: 1680, confidence: 92, basis: "8 fredager · salg, vaktplan og gjestetrykk", status: "new", documented: null, history: ["Generert 13. juli 2026"] },
  { id: "burger-price", title: "Øk prisen på Cheeseburger med 5 kr", reason: "Cheeseburger har vært toppselger i ni uker og tåler en moderat prisjustering.", date: "2026-07-13", report: "week-28", reportLabel: "Ukesrapport · Uke 28", period: "week-28", location: "Varm Burger AS", category: "Pris", effect: 3900, cost: 0, confidence: 87, basis: "9 uker · salg, volum og produktmargin", status: "new", documented: null, history: ["Generert 13. juli 2026"] },
  { id: "fries-purchase", title: "Reduser innkjøpet av søtpotetfries", reason: "Svinnet ligger 2,8 prosentpoeng over normalen de siste fire ukene.", date: "2026-07-13", report: "week-28", reportLabel: "Ukesrapport · Uke 28", period: "week-28", location: "Varm Burger AS", category: "Varekost", effect: 2750, cost: 0, confidence: 89, basis: "4 uker · innkjøp, salg og svinn", status: "planned", documented: null, history: ["Generert 13. juli 2026", "Planlagt 14. juli 2026"] },
  { id: "tuesday-close", title: "Steng én time tidligere på tirsdager", reason: "Siste åpningstime har lavere salg enn direkte lønnskostnad.", date: "2026-07-06", report: "week-27", reportLabel: "Ukesrapport · Uke 27", period: "week-27", location: "Varm Burger AS", category: "Åpningstid", effect: 1230, cost: 0, confidence: 84, basis: "6 tirsdager · salg og bemanning", status: "awaiting", documented: null, history: ["Generert 6. juli 2026", "Gjennomført 8. juli 2026", "Effekt måles"] },
  { id: "discount-pause", title: "Pause rabattkoden mellom kl. 18 og 20", reason: "38 bookinger gjør at salget forventes å holde seg uten rabatt i rushet.", date: "2026-07-06", report: "week-27", reportLabel: "Ukesrapport · Uke 27", period: "week-27", location: "Varm Burger Majorstuen", category: "Kampanjer", effect: 4700, cost: 0, confidence: 82, basis: "6 uker · booking, kampanje og salg", status: "declined", documented: null, history: ["Generert 6. juli 2026", "Avvist 7. juli 2026"] },
  { id: "extra-friday-done", title: "Ekstra servitør fredag kveld", reason: "Høyere kapasitet skulle redusere kø og løfte salget i hovedrushet.", date: "2026-06-22", report: "week-25", reportLabel: "Ukesrapport · Uke 25", period: "june", location: "Varm Burger AS", category: "Kapasitet", effect: 14200, cost: 3200, confidence: 94, basis: "12 fredager · salg, køtid og bemanning", status: "completed", documented: 14200, history: ["Generert 22. juni 2026", "Planlagt 23. juni 2026", "Gjennomført 26. juni 2026", "Effekt dokumentert 10. juli 2026"] },
  { id: "price-done", title: "Prisjustering på Cheeseburger", reason: "Stabil etterspørsel gjorde at en liten prisøkning kunne gjennomføres uten målbar nedgang i volum.", date: "2026-06-29", report: "week-26", reportLabel: "Ukesrapport · Uke 26", period: "june", location: "Varm Burger AS", category: "Pris", effect: 11700, cost: 0, confidence: 90, basis: "10 uker · salg, volum og produktmargin", status: "completed", documented: 11700, history: ["Generert 29. juni 2026", "Planlagt 30. juni 2026", "Gjennomført 1. juli 2026", "Effekt dokumentert 14. juli 2026"] },
  { id: "waste-done", title: "Reduser porsjonen med søtpotetfries", reason: "Porsjonen var større enn det gjestene vanligvis spiste opp.", date: "2026-06-22", report: "week-25", reportLabel: "Ukesrapport · Uke 25", period: "june", location: "Varm Burger AS", category: "Varekost", effect: 8900, cost: 500, confidence: 91, basis: "5 uker · svinn og produktkost", status: "completed", documented: 8900, history: ["Generert 22. juni 2026", "Gjennomført 25. juni 2026", "Effekt dokumentert 2. juli 2026"] },
];

const adviceStatusLabels = { new: "Nytt", planned: "Planlagt", completed: "Gjennomført", declined: "Avvist", awaiting: "Avventer resultat" };
const adviceStatusFilterMap = { all: null, new: "new", planned: "planned", completed: "completed", declined: "declined" };

const scopeIntegrations = [
  { id: "tripletex", name: "Tripletex", category: "Regnskap", description: "Regnskap, lønn, fakturaer og bank", logo: "assets/logos/tripletex.svg", sync: "09:12", defaultConnected: true },
  { id: "lightspeed", name: "Lightspeed", category: "Kasse", description: "Salg, produkter og åpningstider", logo: "assets/logos/lightspeed.svg", sync: "09:14", defaultConnected: true },
  { id: "tamigo", name: "Tamigo", category: "Bemanning", description: "Vaktplaner, timer og personalkostnad", logo: "assets/logos/tamigo.svg", sync: "09:08", defaultConnected: true },
  { id: "poweroffice", name: "PowerOffice", category: "Regnskap", description: "Bilag, bank og lønn", logo: "assets/logos/poweroffice-farge01.png" },
  { id: "planday", name: "Planday", category: "Bemanning", description: "Vakter, timer og fravær", logo: "assets/logos/planday.png" },
  { id: "foodora", name: "Foodora", category: "Levering", description: "Ordre, salg og leveringstid", logo: "assets/logos/foodora.png" },
  { id: "wolt", name: "Wolt", category: "Levering", description: "Ordre, produkter og kampanjer", logo: "assets/logos/wolt.jpg" },
  { id: "munu", name: "Munu", category: "Kasse", description: "Salg, produkter og betaling", logo: "assets/logos/munu.svg" },
  { id: "gastroplanner", name: "GastroPlanner", category: "Booking", description: "Reservasjoner og gjesteflyt", logo: "assets/logos/gastroplanner.jpeg" },
];

const scopeGuides = [
  { id: "getting-started", title: "Kom i gang med Scope", description: "Se hvordan Oversikt-siden fungerer.", duration: "1 min", image: "assets/story-cards/collect-data.png", steps: ["Dette er Oversikt. Her ser du hvordan driften går akkurat nå.", "Trykk på et nøkkeltall for å endre grafen.", "Kryss av tiltak når de er gjort – dagsvurderingen oppdateres automatisk."] },
  { id: "reports", title: "Slik leser du en rapport", description: "Bla gjennom dags-, uke- og månedsrapporter.", duration: "2 min", image: "assets/story-cards/analyze.png", steps: ["Velg Dag, Uke eller Måned øverst.", "Bruk søk og filtre for å finne riktig periode.", "Åpne et rapportkort og bla gjennom historien med piltastene."] },
  { id: "advice", title: "Slik bruker du rådene", description: "Planlegg, gjennomfør og følg effekten av et råd.", duration: "2 min", image: "assets/story-cards/advice.png", steps: ["Filtrer rådene etter status eller kategori.", "Planlegg et råd med dato og ansvarlig.", "Marker tiltaket som gjennomført når det er gjort."] },
  { id: "effect", title: "Slik ser du effekten", description: "Se hva Scope har forbedret over tid.", duration: "1 min", image: "assets/story-cards/quality.png", steps: ["Velg perioden du vil se.", "Hovedtallet viser kun dokumentert positiv effekt.", "Åpne tiltaket for å se rådet som skapte effekten."] },
  { id: "integrations", title: "Koble til et nytt system", description: "Legg til en integrasjon på noen få steg.", duration: "2 min", image: "assets/story-cards/collect-data.png", steps: ["Finn systemet i Integrasjoner.", "Velg restaurant og hvilke data Scope får tilgang til.", "Bekreft tilkoblingen og vent på første synk."] },
];

const productDemoState = readScopeDemoState();
let activeReportType = ["day", "week", "month"].includes(productDemoState.reportType) ? productDemoState.reportType : "day";
let activeAdviceFilter = ["all", "new", "planned", "completed", "declined"].includes(productDemoState.adviceFilter) ? productDemoState.adviceFilter : "all";
let activeReportId = null;
let activeReportSlide = 0;
let activeAdviceId = null;
let activeIntegrationId = null;
let integrationStep = 0;
let activeGuideId = null;
let activeGuideStep = 0;
let reportRenderTimer = null;

function formatScopeCurrency(value) {
  return `${String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} kr`;
}

function showScopeToast(message, tone = "success") {
  const toast = document.querySelector("[data-scope-toast]");

  if (!toast) return;
  toast.textContent = message;
  toast.dataset.tone = tone;
  toast.hidden = false;
  window.clearTimeout(showScopeToast.timer);
  showScopeToast.timer = window.setTimeout(() => { toast.hidden = true; }, 2600);
}

function openScopeModal(modal) {
  if (!modal) return;
  modal.hidden = false;
  document.body.classList.add("has-scope-modal");
  window.setTimeout(() => modal.querySelector("button, input, select, textarea, [tabindex='0']")?.focus(), 20);
}

function closeScopeModal(modal) {
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.toggle("has-scope-modal", Boolean(document.querySelector(".scope-app-modal:not([hidden])")));
}

document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", () => closeScopeModal(button.closest(".scope-app-modal")));
});

function createReportCard(report) {
  return `<button class="scope-report-card tone-${report.tone}" type="button" data-open-report="${report.id}">
    <span class="scope-report-type">${report.typeLabel}</span>
    <span class="scope-report-period">${report.period}</span>
    <small>${report.location}</small>
    <span class="scope-report-metrics">${report.metrics.map(([label, value]) => `<span><small>${label}</small><strong>${value}</strong></span>`).join("")}</span>
    <span class="scope-report-status">${report.status}</span>
    <span class="scope-card-action">Åpne rapport <b>→</b></span>
  </button>`;
}

function renderReportLibrary({ loading = false } = {}) {
  const host = document.querySelector("[data-report-library]");
  const count = document.querySelector("[data-report-result-count]");
  if (!host) return;

  if (loading) {
    host.setAttribute("aria-busy", "true");
    host.innerHTML = `<div class="scope-loading-state"><i></i><span>Henter rapporter …</span></div>`;
    return;
  }

  const search = document.querySelector("[data-report-search]")?.value.trim().toLowerCase() || "";
  const date = document.querySelector("[data-report-date]")?.value || "";
  const location = document.querySelector("[data-report-location]")?.value || "all";
  const sort = document.querySelector("[data-report-sort]")?.value || "newest";
  const matches = scopeReports
    .filter((report) => report.type === activeReportType)
    .filter((report) => !search || `${report.typeLabel} ${report.period} ${report.location}`.toLowerCase().includes(search))
    .filter((report) => !date || report.date >= date)
    .filter((report) => location === "all" || report.location === location)
    .sort((a, b) => sort === "oldest" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));

  host.removeAttribute("aria-busy");
  host.innerHTML = matches.length ? matches.map(createReportCard).join("") : `<div class="scope-empty-state"><strong>Ingen rapporter passer filtrene</strong><p>Prøv en annen periode, restaurant eller et kortere søk.</p><button type="button" data-reset-reports>Nullstill filtre</button></div>`;
  if (count) count.textContent = `${matches.length} ${matches.length === 1 ? "rapport" : "rapporter"}`;
}

function queueReportRender() {
  window.clearTimeout(reportRenderTimer);
  renderReportLibrary({ loading: true });
  reportRenderTimer = window.setTimeout(() => renderReportLibrary(), 180);
}

function renderReportSlide() {
  const report = scopeReports.find((item) => item.id === activeReportId);
  const host = document.querySelector("[data-report-slide]");
  const title = document.querySelector("[data-report-dialog-title]");
  const progress = document.querySelector("[data-report-progress]");
  const jumps = document.querySelector("[data-report-jumps]");
  if (!report || !host || !title || !progress || !jumps) return;

  const slide = report.slides[activeReportSlide];
  title.textContent = `${report.typeLabel} · ${report.period}`;
  progress.innerHTML = report.slides.map((_, index) => `<i class="${index <= activeReportSlide ? "is-on" : ""}"></i>`).join("");
  jumps.innerHTML = report.slides.map((_, index) => `<button type="button" class="${index === activeReportSlide ? "is-active" : ""}" data-report-jump="${index}" aria-label="Gå til del ${index + 1}">${index + 1}</button>`).join("");
  host.className = `scope-report-slide tone-${slide.tone || report.tone}`;
  host.innerHTML = `<article class="scope-wrapped-slide">
    <span>${slide.eyebrow}</span><h2>${slide.title}</h2>${slide.value ? `<strong>${slide.value}</strong>` : ""}${slide.text ? `<p>${slide.text}</p>` : ""}
    ${slide.bars ? `<div class="scope-slide-bars" aria-label="Enkel utviklingsgraf">${slide.bars.map((value) => `<i style="--value:${value}%"></i>`).join("")}</div>` : ""}
    ${slide.points ? `<ul>${slide.points.map((point) => `<li>${point}</li>`).join("")}</ul>` : ""}
    <small>Del ${activeReportSlide + 1} av ${report.slides.length}</small>
  </article>`;
  document.querySelector("[data-report-prev]").disabled = activeReportSlide === 0;
  document.querySelector("[data-report-next]").textContent = activeReportSlide === report.slides.length - 1 ? "Ferdig" : "Neste";
}

function openReport(reportId) {
  const report = scopeReports.find((item) => item.id === reportId);
  if (!report) return;
  activeReportId = reportId;
  activeReportSlide = 0;
  renderReportSlide();
  openScopeModal(document.querySelector("[data-report-viewer]"));
}

function moveReportSlide(direction) {
  const report = scopeReports.find((item) => item.id === activeReportId);
  if (!report) return;
  const nextIndex = activeReportSlide + direction;
  if (nextIndex >= report.slides.length) {
    closeScopeModal(document.querySelector("[data-report-viewer]"));
    return;
  }
  activeReportSlide = Math.max(0, nextIndex);
  renderReportSlide();
}

document.querySelector("[data-report-library]")?.addEventListener("click", (event) => {
  const card = event.target.closest("[data-open-report]");
  const reset = event.target.closest("[data-reset-reports]");
  if (card) openReport(card.dataset.openReport);
  if (reset) {
    document.querySelector("[data-report-search]").value = "";
    document.querySelector("[data-report-date]").value = "";
    document.querySelector("[data-report-location]").value = "all";
    document.querySelector("[data-report-sort]").value = "newest";
    writeScopeDemoState({ reportSearch: "", reportDate: "", reportLocation: "all", reportSort: "newest" });
    renderReportLibrary();
  }
});

document.querySelector("[data-report-tabs]")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-report-type]");
  if (!button) return;
  activeReportType = button.dataset.reportType;
  button.parentElement.querySelectorAll("button").forEach((item) => item.classList.toggle("is-active", item === button));
  writeScopeDemoState({ reportType: activeReportType });
  queueReportRender();
});

document.querySelectorAll("[data-report-search], [data-report-date], [data-report-location], [data-report-sort]").forEach((control) => {
  control.addEventListener(control.matches("input[type='search']") ? "input" : "change", () => {
    writeScopeDemoState({
      reportSearch: document.querySelector("[data-report-search]")?.value,
      reportDate: document.querySelector("[data-report-date]")?.value,
      reportLocation: document.querySelector("[data-report-location]")?.value,
      reportSort: document.querySelector("[data-report-sort]")?.value,
    });
    queueReportRender();
  });
});

document.querySelector("[data-report-prev]")?.addEventListener("click", () => moveReportSlide(-1));
document.querySelector("[data-report-next]")?.addEventListener("click", () => moveReportSlide(1));
document.querySelector("[data-report-jumps]")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-report-jump]");
  if (!button) return;
  activeReportSlide = Number(button.dataset.reportJump);
  renderReportSlide();
});

const reportSlideHost = document.querySelector("[data-report-slide]");
let reportTouchStart = 0;
reportSlideHost?.addEventListener("touchstart", (event) => { reportTouchStart = event.changedTouches[0].clientX; }, { passive: true });
reportSlideHost?.addEventListener("touchend", (event) => {
  const distance = event.changedTouches[0].clientX - reportTouchStart;
  if (Math.abs(distance) > 45) moveReportSlide(distance < 0 ? 1 : -1);
}, { passive: true });

function getAdviceState(advice) {
  const saved = readScopeDemoState().advice || {};
  return { ...advice, ...(saved[advice.id] || {}) };
}

function saveAdviceState(adviceId, patch) {
  const state = readScopeDemoState();
  const advice = { ...(state.advice || {}) };
  advice[adviceId] = { ...(advice[adviceId] || {}), ...patch };
  writeScopeDemoState({ advice });
}

function adviceCardHTML(advice) {
  const item = getAdviceState(advice);
  const net = item.effect - item.cost;
  const documented = item.documented ? `<span class="scope-documented-effect"><small>Dokumentert effekt</small><strong>+${formatScopeCurrency(item.documented)}</strong></span>` : "";
  return `<article class="scope-advice-card status-${item.status}" data-advice-id="${item.id}">
    <div class="scope-advice-card-head"><span class="scope-advice-category">${item.category}</span><span class="scope-status-pill">${adviceStatusLabels[item.status]}</span></div>
    <h5>${item.title}</h5><p>${item.reason}</p>
    <div class="scope-advice-meta"><span><small>Generert</small><strong>${new Date(`${item.date}T12:00:00`).toLocaleDateString("no-NO", { day: "numeric", month: "short", year: "numeric" })}</strong></span><span><small>Fra rapport</small><strong>${item.reportLabel}</strong></span><span><small>Sikkerhet</small><strong>${item.confidence} %</strong></span><span><small>Datagrunnlag</small><strong>${item.basis}</strong></span></div>
    <div class="scope-advice-impact"><span><small>Forventet netto effekt</small><strong>+${formatScopeCurrency(net)}/mnd</strong></span>${documented}</div>
    <div class="scope-advice-actions">
      ${!["completed", "declined", "awaiting"].includes(item.status) ? `<button type="button" data-advice-plan>${item.status === "planned" ? "Endre plan" : "Planlegg"}</button>` : ""}
      ${!["completed", "declined", "awaiting"].includes(item.status) ? `<button type="button" data-advice-complete>Marker som gjennomført</button>` : ""}
      ${!["completed", "declined"].includes(item.status) ? `<button type="button" data-advice-decline>Avvis</button>` : ""}
      <button type="button" data-advice-details>Se detaljer</button>
      <button type="button" data-advice-report>Se opprinnelig ukesrapport</button>
    </div>
  </article>`;
}

function renderAdviceLibrary() {
  const host = document.querySelector("[data-advice-library]");
  if (!host) return;
  const period = document.querySelector("[data-advice-period]")?.value || "all";
  const category = document.querySelector("[data-advice-category]")?.value || "all";
  const location = document.querySelector("[data-advice-location]")?.value || "all";
  const impact = document.querySelector("[data-advice-impact]")?.value || "all";
  const expectedStatus = adviceStatusFilterMap[activeAdviceFilter];
  const matches = scopeAdvice.filter((advice) => {
    const item = getAdviceState(advice);
    const net = item.effect - item.cost;
    const impactMatches = impact === "all" || (impact === "high" && net > 5000) || (impact === "medium" && net >= 2000 && net <= 5000) || (impact === "low" && net < 2000);
    const statusMatches = !expectedStatus || item.status === expectedStatus || (activeAdviceFilter === "completed" && item.status === "awaiting");

    return statusMatches && (period === "all" || item.period === period) && (category === "all" || item.category === category) && (location === "all" || item.location === location) && impactMatches;
  });
  host.innerHTML = matches.length ? matches.map(adviceCardHTML).join("") : `<div class="scope-empty-state"><strong>Ingen råd i denne visningen</strong><p>Prøv en annen status eller nullstill filtrene.</p><button type="button" data-reset-advice>Vis alle råd</button></div>`;
}

function openAdvicePlanner(adviceId) {
  const advice = getAdviceState(scopeAdvice.find((item) => item.id === adviceId));
  const modal = document.querySelector("[data-advice-plan-modal]");
  const form = document.querySelector("[data-advice-plan-form]");
  if (!advice || !modal || !form) return;
  activeAdviceId = adviceId;
  form.reset();
  form.querySelector("[data-plan-title]").textContent = advice.title;
  form.elements.date.value = advice.plan?.date || "2026-07-18";
  form.elements.owner.value = advice.plan?.owner || "";
  form.elements.comment.value = advice.plan?.comment || "";
  form.querySelector("[data-plan-error]").textContent = "";
  openScopeModal(modal);
}

function renderAdviceDetail(adviceId) {
  const advice = getAdviceState(scopeAdvice.find((item) => item.id === adviceId));
  const host = document.querySelector("[data-advice-detail]");
  if (!advice || !host) return;
  const net = advice.effect - advice.cost;
  host.innerHTML = `<header><div><span>${advice.category} · ${adviceStatusLabels[advice.status]}</span><h4 id="advice-detail-title">${advice.title}</h4></div><button type="button" data-close-modal>Lukk</button></header>
    <section><h5>Hva Scope anbefaler</h5><p>${advice.reason}</p></section>
    <div class="scope-detail-metrics"><span><small>Forventet effekt</small><strong>+${formatScopeCurrency(advice.effect)}</strong></span><span><small>Forventet kostnad</small><strong>${formatScopeCurrency(advice.cost)}</strong></span><span><small>Netto forventet effekt</small><strong>+${formatScopeCurrency(net)}</strong></span><span><small>Sikkerhetsnivå</small><strong>${advice.confidence} %</strong></span></div>
    <section><h5>Datagrunnlag</h5><p>${advice.basis}. Perioden er sammenlignet med tilsvarende dager og tidspunkt.</p><button type="button" data-detail-report="${advice.report}">Åpne ${advice.reportLabel}</button></section>
    <div class="scope-before-after"><article><span>Før tiltaket</span><strong>${advice.category === "Bemanning" ? "8 gjester per servitør" : "Utgangspunkt målt"}</strong><small>Referanseperioden</small></article><article><span>Etter tiltaket</span><strong>${advice.documented ? `+${formatScopeCurrency(advice.documented)}` : "Måles etter gjennomføring"}</strong><small>${advice.documented ? "Dokumentert forbedring" : "Forventet resultat"}</small></article></div>
    <section><h5>Status og historikk</h5><ol>${(advice.history || []).map((entry) => `<li>${entry}</li>`).join("")}</ol></section>`;
  host.querySelector("[data-close-modal]")?.addEventListener("click", () => closeScopeModal(host.closest(".scope-app-modal")));
  host.querySelector("[data-detail-report]")?.addEventListener("click", (event) => {
    closeScopeModal(host.closest(".scope-app-modal"));
    openReport(event.currentTarget.dataset.detailReport);
  });
}

document.querySelector("[data-advice-tabs]")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-advice-filter]");
  if (!button) return;
  activeAdviceFilter = button.dataset.adviceFilter;
  button.parentElement.querySelectorAll("button").forEach((item) => item.classList.toggle("is-active", item === button));
  writeScopeDemoState({ adviceFilter: activeAdviceFilter });
  renderAdviceLibrary();
});

document.querySelectorAll("[data-advice-period], [data-advice-category], [data-advice-location], [data-advice-impact]").forEach((control) => control.addEventListener("change", () => {
  writeScopeDemoState({
    advicePeriod: document.querySelector("[data-advice-period]")?.value,
    adviceCategory: document.querySelector("[data-advice-category]")?.value,
    adviceLocation: document.querySelector("[data-advice-location]")?.value,
    adviceImpact: document.querySelector("[data-advice-impact]")?.value,
  });
  renderAdviceLibrary();
}));

document.querySelector("[data-advice-library]")?.addEventListener("click", (event) => {
  const card = event.target.closest("[data-advice-id]");
  if (!card) {
    if (event.target.closest("[data-reset-advice]")) {
      activeAdviceFilter = "all";
      document.querySelector("[data-advice-tabs]")?.querySelectorAll("button").forEach((button) => button.classList.toggle("is-active", button.dataset.adviceFilter === "all"));
      document.querySelector("[data-advice-period]").value = "all";
      document.querySelector("[data-advice-category]").value = "all";
      document.querySelector("[data-advice-location]").value = "all";
      document.querySelector("[data-advice-impact]").value = "all";
      writeScopeDemoState({ adviceFilter: "all", advicePeriod: "all", adviceCategory: "all", adviceLocation: "all", adviceImpact: "all" });
      renderAdviceLibrary();
    }
    return;
  }
  const adviceId = card.dataset.adviceId;
  if (event.target.closest("[data-advice-plan]")) openAdvicePlanner(adviceId);
  if (event.target.closest("[data-advice-complete]")) {
    const base = getAdviceState(scopeAdvice.find((item) => item.id === adviceId));
    saveAdviceState(adviceId, { status: "awaiting", history: [...(base.history || []), "Gjennomført 15. juli 2026", "Effekt måles nå"] });
    renderAdviceLibrary();
    showScopeToast("Tiltaket er gjennomført. Scope følger nå effekten.");
  }
  if (event.target.closest("[data-advice-decline]")) {
    const base = getAdviceState(scopeAdvice.find((item) => item.id === adviceId));
    saveAdviceState(adviceId, { status: "declined", history: [...(base.history || []), "Avvist 15. juli 2026"] });
    renderAdviceLibrary();
    showScopeToast("Rådet er flyttet til Avvist.", "neutral");
  }
  if (event.target.closest("[data-advice-details]")) {
    renderAdviceDetail(adviceId);
    openScopeModal(document.querySelector("[data-advice-detail-modal]"));
  }
  if (event.target.closest("[data-advice-report]")) openReport(getAdviceState(scopeAdvice.find((item) => item.id === adviceId)).report);
});

document.querySelector("[data-advice-plan-form]")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const error = form.querySelector("[data-plan-error]");
  if (!form.elements.date.value || !form.elements.owner.value) {
    error.textContent = "Velg dato og ansvarlig før du bekrefter.";
    return;
  }
  const base = getAdviceState(scopeAdvice.find((item) => item.id === activeAdviceId));
  saveAdviceState(activeAdviceId, {
    status: "planned",
    plan: { date: form.elements.date.value, owner: form.elements.owner.value, comment: form.elements.comment.value.trim() },
    history: [...(base.history || []), `Planlagt ${new Date(`${form.elements.date.value}T12:00:00`).toLocaleDateString("no-NO") } · ${form.elements.owner.value}`],
  });
  closeScopeModal(form.closest(".scope-app-modal"));
  renderAdviceLibrary();
  showScopeToast("Tiltaket er planlagt og lagret.");
});

const effectPeriods = {
  "30": { total: 14200, caption: "Dokumentert effekt de siste 30 dagene", metrics: [["Økt omsetning", "+18 600 kr"], ["Redusert personalkost", "+4 200 kr"], ["Redusert varekost", "+3 900 kr"], ["Forbedret margin", "+0,8 pp"], ["Gjennomførte tiltak", "3"], ["Positiv effekt", "3"]], points: [1800, 3400, 5900, 8400, 11200, 14200] },
  "90": { total: 38600, caption: "Dokumentert effekt de siste 90 dagene", metrics: [["Økt omsetning", "+47 200 kr"], ["Redusert personalkost", "+11 400 kr"], ["Redusert varekost", "+8 900 kr"], ["Forbedret margin", "+2,1 pp"], ["Gjennomførte tiltak", "7"], ["Positiv effekt", "5"]], points: [2100, 5700, 9800, 15100, 22600, 30100, 38600] },
  year: { total: 74200, caption: "Dokumentert effekt hittil i 2026", metrics: [["Økt omsetning", "+91 300 kr"], ["Redusert personalkost", "+22 800 kr"], ["Redusert varekost", "+16 400 kr"], ["Forbedret margin", "+3,4 pp"], ["Gjennomførte tiltak", "12"], ["Positiv effekt", "9"]], points: [4200, 10900, 18600, 29800, 42100, 58900, 74200] },
};

function renderEffect(period = "90") {
  const data = effectPeriods[period] || effectPeriods["90"];
  const total = document.querySelector("[data-effect-total]");
  const caption = document.querySelector("[data-effect-caption]");
  const metrics = document.querySelector("[data-effect-metrics]");
  const chart = document.querySelector("[data-effect-chart]");
  const actions = document.querySelector("[data-effect-actions]");
  if (!total || !caption || !metrics || !chart || !actions) return;
  total.textContent = `+${formatScopeCurrency(data.total)}`;
  caption.textContent = data.caption;
  metrics.innerHTML = data.metrics.map(([label, value], index) => `<article class="tone-${["green", "yellow", "purple", "blue", "pink", "green"][index]}"><span>${label}</span><strong>${value}</strong></article>`).join("");
  const width = 700;
  const height = 220;
  const max = Math.max(...data.points);
  const path = data.points.map((value, index) => `${index ? "L" : "M"}${40 + index * ((width - 80) / (data.points.length - 1))} ${height - 35 - (value / max) * 145}`).join(" ");
  chart.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Dokumentert effekt over tid"><line x1="40" y1="185" x2="660" y2="185"></line><path d="${path}"></path>${data.points.map((value, index) => `<circle cx="${40 + index * ((width - 80) / (data.points.length - 1))}" cy="${height - 35 - (value / max) * 145}" r="5"></circle>`).join("")}<text x="40" y="210">Start</text><text x="660" y="210" text-anchor="end">Nå</text></svg>`;
  actions.innerHTML = [
    ["extra-friday-done", "Ekstra servitør fredag", "+14 200 kr", "26. juni 2026"],
    ["price-done", "Prisjustering på Cheeseburger", "+11 700 kr", "1. juli 2026"],
    ["waste-done", "Redusert svinn", "+8 900 kr", "25. juni 2026"],
  ].map(([id, name, value, date]) => `<button type="button" data-effect-advice="${id}"><span><strong>${name}</strong><small>${date} · fra ukesrapport</small></span><b>${value}</b><em>Se råd →</em></button>`).join("");
}

document.querySelector("[data-effect-periods]")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-effect-period]");
  if (!button) return;
  button.parentElement.querySelectorAll("button").forEach((item) => item.classList.toggle("is-active", item === button));
  const custom = button.dataset.effectPeriod === "custom";
  document.querySelector("[data-custom-period]").hidden = !custom;
  writeScopeDemoState({ effectPeriod: button.dataset.effectPeriod });
  if (!custom) renderEffect(button.dataset.effectPeriod);
});

document.querySelector("[data-effect-apply]")?.addEventListener("click", () => {
  const from = document.querySelector("[data-effect-from]").value;
  const to = document.querySelector("[data-effect-to]").value;
  if (!from || !to || from > to) {
    showScopeToast("Velg en gyldig periode.", "error");
    return;
  }
  renderEffect("90");
  document.querySelector("[data-effect-caption]").textContent = `Dokumentert effekt fra ${new Date(`${from}T12:00:00`).toLocaleDateString("no-NO")} til ${new Date(`${to}T12:00:00`).toLocaleDateString("no-NO")}`;
  writeScopeDemoState({ effectPeriod: "custom", effectFrom: from, effectTo: to });
  showScopeToast("Den egendefinerte perioden er lagret.");
});

document.querySelector("[data-effect-actions]")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-effect-advice]");
  if (!button) return;
  renderAdviceDetail(button.dataset.effectAdvice);
  openScopeModal(document.querySelector("[data-advice-detail-modal]"));
});

function connectedIntegrationIds() {
  const saved = readScopeDemoState().integrations;
  return Array.isArray(saved) ? saved : scopeIntegrations.filter((item) => item.defaultConnected).map((item) => item.id);
}

function saveConnectedIntegrationIds(ids) {
  writeScopeDemoState({ integrations: [...new Set(ids)] });
}

function integrationCardContent(item, connected) {
  return `<div class="scope-integration-logo"><img src="${item.logo}" alt="${item.name}"></div><div><span>${item.category}</span><h5>${item.name}</h5><p>${item.description}</p></div>${connected ? `<span class="scope-sync-state"><i></i><strong>Tilkoblet</strong><small>Sist synkronisert ${item.sync || "nå"}</small></span><button type="button" data-manage-integration="${item.id}">Administrer</button>` : `<button type="button" data-connect-integration="${item.id}">Koble til</button>`}`;
}

function renderIntegrations() {
  const connectedHost = document.querySelector("[data-connected-list]");
  const library = document.querySelector("[data-integration-library]");
  const count = document.querySelector("[data-connected-count]");
  if (!connectedHost || !library || !count) return;
  const connectedIds = connectedIntegrationIds();
  const search = document.querySelector("[data-integration-search]")?.value.trim().toLowerCase() || "";
  const connected = scopeIntegrations.filter((item) => connectedIds.includes(item.id));
  const available = scopeIntegrations.filter((item) => !connectedIds.includes(item.id) && (!search || `${item.name} ${item.category}`.toLowerCase().includes(search)));
  count.textContent = String(connected.length);
  connectedHost.innerHTML = connected.map((item) => `<article>${integrationCardContent(item, true)}</article>`).join("");
  library.innerHTML = available.length ? available.map((item) => `<article>${integrationCardContent(item, false)}</article>`).join("") : `<div class="scope-empty-state"><strong>Ingen flere systemer funnet</strong><p>Prøv et annet søk, eller alle aktuelle systemer er allerede tilkoblet.</p></div>`;
}

function renderIntegrationDialog() {
  const item = scopeIntegrations.find((integration) => integration.id === activeIntegrationId);
  const dialog = document.querySelector("[data-integration-dialog]");
  if (!item || !dialog) return;
  const isConnected = connectedIntegrationIds().includes(item.id);
  if (isConnected && integrationStep === -1) {
    dialog.innerHTML = `<header><div><span>${item.category}</span><h4 id="integration-dialog-title">Administrer ${item.name}</h4></div><button type="button" data-close-integration>Lukk</button></header><div class="scope-connection-summary"><img src="${item.logo}" alt="${item.name}"><span><strong>Tilkoblet</strong><small>Sist synkronisert ${item.sync || "nå"}</small></span></div><p>${item.description}. Tilkoblingen fungerer og data flyter inn i Scope.</p><footer><button type="button" data-sync-integration>Synkroniser nå</button><button class="is-danger" type="button" data-disconnect-integration>Koble fra</button></footer>`;
    return;
  }
  const steps = [
    `<header><div><span>Steg 1 av 4</span><h4 id="integration-dialog-title">Koble til ${item.name}</h4></div><button type="button" data-close-integration>Lukk</button></header><label><span>Restaurant eller avdeling</span><select data-integration-location><option>Varm Burger AS</option><option>Varm Burger Majorstuen</option></select></label><footer><button class="is-primary" type="button" data-integration-next>Neste</button></footer>`,
    `<header><div><span>Steg 2 av 4</span><h4 id="integration-dialog-title">Bekreft datatilgang</h4></div><button type="button" data-close-integration>Lukk</button></header><div class="scope-access-list"><label><input type="checkbox" checked> Salg og produkter</label><label><input type="checkbox" checked> Historiske transaksjoner</label><label><input type="checkbox" checked> Åpningstider og avdelinger</label></div><p>Scope bruker bare dataene til rapporter, råd og effektmåling.</p><footer><button type="button" data-integration-back>Tilbake</button><button class="is-primary" type="button" data-integration-next>Koble til</button></footer>`,
    `<header><div><span>Steg 3 av 4</span><h4 id="integration-dialog-title">Kobler til ${item.name}</h4></div></header><div class="scope-connecting-state"><i></i><strong>Oppretter sikker forbindelse …</strong><small>Dette tar bare et øyeblikk i demoen.</small></div>`,
    `<header><div><span>Steg 4 av 4</span><h4 id="integration-dialog-title">${item.name} er tilkoblet</h4></div><button type="button" data-close-integration>Lukk</button></header><div class="scope-success-state"><strong>Vellykket tilkobling</strong><p>Første synkronisering er fullført. Dataene er klare i Scope.</p></div><footer><button class="is-primary" type="button" data-finish-integration>Ferdig</button></footer>`,
  ];
  dialog.innerHTML = steps[integrationStep];
  if (integrationStep === 2) {
    window.setTimeout(() => {
      saveConnectedIntegrationIds([...connectedIntegrationIds(), item.id]);
      integrationStep = 3;
      renderIntegrationDialog();
      renderIntegrations();
    }, 900);
  }
}

function openIntegrationDialog(id, manage = false) {
  activeIntegrationId = id;
  integrationStep = manage ? -1 : 0;
  renderIntegrationDialog();
  openScopeModal(document.querySelector("[data-integration-modal]"));
}

document.querySelector("[data-connected-list]")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-manage-integration]");
  if (button) openIntegrationDialog(button.dataset.manageIntegration, true);
});
document.querySelector("[data-integration-library]")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-connect-integration]");
  if (button) openIntegrationDialog(button.dataset.connectIntegration);
});
document.querySelector("[data-integration-search]")?.addEventListener("input", (event) => {
  writeScopeDemoState({ integrationSearch: event.currentTarget.value });
  renderIntegrations();
});

document.querySelector("[data-integration-dialog]")?.addEventListener("click", (event) => {
  if (event.target.closest("[data-close-integration]")) closeScopeModal(event.currentTarget.closest(".scope-app-modal"));
  if (event.target.closest("[data-integration-next]")) { integrationStep += 1; renderIntegrationDialog(); }
  if (event.target.closest("[data-integration-back]")) { integrationStep = Math.max(0, integrationStep - 1); renderIntegrationDialog(); }
  if (event.target.closest("[data-finish-integration]")) { closeScopeModal(event.currentTarget.closest(".scope-app-modal")); showScopeToast("Integrasjonen er tilkoblet og lagret."); }
  if (event.target.closest("[data-sync-integration]")) { showScopeToast("Synkroniseringen er fullført."); }
  if (event.target.closest("[data-disconnect-integration]")) {
    saveConnectedIntegrationIds(connectedIntegrationIds().filter((id) => id !== activeIntegrationId));
    closeScopeModal(event.currentTarget.closest(".scope-app-modal"));
    renderIntegrations();
    showScopeToast("Integrasjonen er koblet fra.", "neutral");
  }
});

function renderGuideLibrary() {
  const host = document.querySelector("[data-guide-library]");
  if (!host) return;
  host.innerHTML = scopeGuides.map((guide) => `<article><img src="${guide.image}" alt=""><div><span>${guide.duration}</span><h5>${guide.title}</h5><p>${guide.description}</p><button type="button" data-open-guide="${guide.id}">Se guide</button></div></article>`).join("");
}

function renderGuideDialog() {
  const guide = scopeGuides.find((item) => item.id === activeGuideId);
  const dialog = document.querySelector("[data-guide-dialog]");
  if (!guide || !dialog) return;
  dialog.innerHTML = `<header><div><span>${guide.duration}</span><h4 id="guide-dialog-title">${guide.title}</h4></div><button type="button" data-close-guide>Lukk</button></header><div class="scope-guide-progress">${guide.steps.map((_, index) => `<i class="${index <= activeGuideStep ? "is-on" : ""}"></i>`).join("")}</div><div class="scope-guide-stage"><img src="${guide.image}" alt=""><span>Steg ${activeGuideStep + 1} av ${guide.steps.length}</span><h5>${guide.steps[activeGuideStep]}</h5><p>Prøv gjerne funksjonen selv når guiden er lukket.</p></div><footer><button type="button" data-guide-prev ${activeGuideStep === 0 ? "disabled" : ""}>Forrige</button><button class="is-primary" type="button" data-guide-next>${activeGuideStep === guide.steps.length - 1 ? "Ferdig" : "Neste"}</button></footer>`;
}

document.querySelector("[data-guide-library]")?.addEventListener("click", (event) => {
  const button = event.target.closest("[data-open-guide]");
  if (!button) return;
  activeGuideId = button.dataset.openGuide;
  activeGuideStep = 0;
  renderGuideDialog();
  openScopeModal(document.querySelector("[data-guide-modal]"));
});
document.querySelector("[data-guide-dialog]")?.addEventListener("click", (event) => {
  const guide = scopeGuides.find((item) => item.id === activeGuideId);
  if (!guide) return;
  if (event.target.closest("[data-close-guide]")) closeScopeModal(event.currentTarget.closest(".scope-app-modal"));
  if (event.target.closest("[data-guide-prev]")) { activeGuideStep = Math.max(0, activeGuideStep - 1); renderGuideDialog(); }
  if (event.target.closest("[data-guide-next]")) {
    if (activeGuideStep === guide.steps.length - 1) {
      closeScopeModal(event.currentTarget.closest(".scope-app-modal"));
      showScopeToast("Guiden er fullført.");
    } else {
      activeGuideStep += 1;
      renderGuideDialog();
    }
  }
});

document.addEventListener("keydown", (event) => {
  const reportViewer = document.querySelector("[data-report-viewer]");
  if (event.key === "Escape") document.querySelectorAll(".scope-app-modal:not([hidden])").forEach(closeScopeModal);
  if (reportViewer && !reportViewer.hidden && event.key === "ArrowRight") moveReportSlide(1);
  if (reportViewer && !reportViewer.hidden && event.key === "ArrowLeft") moveReportSlide(-1);
});

demoNavButtons.forEach((button) => {
  button.addEventListener("click", () => writeScopeDemoState({ activeView: button.dataset.view }));
});

function initializeScopeProductDemo() {
  const state = readScopeDemoState();
  const reportTypeButton = document.querySelector(`[data-report-type="${activeReportType}"]`);
  reportTypeButton?.parentElement.querySelectorAll("button").forEach((button) => button.classList.toggle("is-active", button === reportTypeButton));
  if (state.reportSearch) document.querySelector("[data-report-search]").value = state.reportSearch;
  if (state.reportDate) document.querySelector("[data-report-date]").value = state.reportDate;
  if (state.reportLocation) document.querySelector("[data-report-location]").value = state.reportLocation;
  if (state.reportSort) document.querySelector("[data-report-sort]").value = state.reportSort;
  const adviceFilterButton = document.querySelector(`[data-advice-filter="${activeAdviceFilter}"]`);
  adviceFilterButton?.parentElement.querySelectorAll("button").forEach((button) => button.classList.toggle("is-active", button === adviceFilterButton));
  if (state.advicePeriod) document.querySelector("[data-advice-period]").value = state.advicePeriod;
  if (state.adviceCategory) document.querySelector("[data-advice-category]").value = state.adviceCategory;
  if (state.adviceLocation) document.querySelector("[data-advice-location]").value = state.adviceLocation;
  if (state.adviceImpact) document.querySelector("[data-advice-impact]").value = state.adviceImpact;
  if (state.integrationSearch) document.querySelector("[data-integration-search]").value = state.integrationSearch;
  renderReportLibrary();
  renderAdviceLibrary();
  const effectPeriod = ["30", "90", "year", "custom"].includes(state.effectPeriod) ? state.effectPeriod : "90";
  const effectPeriodButton = document.querySelector(`[data-effect-period="${effectPeriod}"]`);
  effectPeriodButton?.parentElement.querySelectorAll("button").forEach((button) => button.classList.toggle("is-active", button === effectPeriodButton));
  const customPeriod = document.querySelector("[data-custom-period]");
  if (customPeriod) customPeriod.hidden = effectPeriod !== "custom";
  if (state.effectFrom) document.querySelector("[data-effect-from]").value = state.effectFrom;
  if (state.effectTo) document.querySelector("[data-effect-to]").value = state.effectTo;
  renderEffect(effectPeriod === "custom" ? "90" : effectPeriod);
  if (effectPeriod === "custom" && state.effectFrom && state.effectTo) {
    document.querySelector("[data-effect-caption]").textContent = `Dokumentert effekt fra ${new Date(`${state.effectFrom}T12:00:00`).toLocaleDateString("no-NO")} til ${new Date(`${state.effectTo}T12:00:00`).toLocaleDateString("no-NO")}`;
  }
  renderIntegrations();
  renderGuideLibrary();
  const initialView = requestedDemoView && demoViews[requestedDemoView] ? requestedDemoView : (state.activeView && demoViews[state.activeView] ? state.activeView : "overview");
  document.querySelector(`[data-view="${initialView}"]`)?.click();
}

initializeScopeProductDemo();

/* ===== Egen mobilkomposisjon for Scope-demoen ===== */

const scopeMobileApp = document.querySelector("[data-scope-mobile-app]");

if (scopeMobileApp) {
  const mobileMain = scopeMobileApp.querySelector("[data-mobile-main]");
  const mobileSheet = scopeMobileApp.querySelector("[data-mobile-sheet]");
  const mobileSheetPanel = scopeMobileApp.querySelector("[data-mobile-sheet-panel]");
  const mobileStory = scopeMobileApp.querySelector("[data-mobile-story]");
  const mobileToast = scopeMobileApp.querySelector("[data-mobile-toast]");
  const mobileLocationButton = scopeMobileApp.querySelector("[data-mobile-location]");
  const mobileViews = ["overview", "reports", "advice", "effect", "integrations", "usage", "profile"];
  const mobileMoreViews = ["effect", "integrations", "usage", "profile"];
  const mobileScrollPositions = {};
  const mobileState = readScopeDemoState();
  let mobileView = mobileViews.includes(mobileState.mobileView)
    ? mobileState.mobileView
    : (mobileViews.includes(requestedDemoView) ? requestedDemoView : "overview");
  let mobileAdviceFilter = ["new", "planned", "completed", "all"].includes(mobileState.mobileAdviceFilter)
    ? mobileState.mobileAdviceFilter
    : "new";
  let mobileReportType = ["day", "week", "month"].includes(mobileState.reportType) ? mobileState.reportType : "day";
  let mobileReportFilters = {
    date: mobileState.reportDate || "",
    location: mobileState.reportLocation || "all",
    sort: mobileState.reportSort || "newest",
  };
  let mobileReportLoadingTimer = null;
  let mobileStoryReportId = null;
  let mobileStorySlide = 0;
  let mobileStoryPaused = false;
  let mobileStoryTimer = null;
  let mobileTouchStart = 0;

  function mobileIcon(name) {
    const icons = {
      effect: '<path d="M3.5 17.5 9 11.5l4 4L20.5 7"></path><path d="M15 6.5h5.5V12"></path>',
      integrations: '<path d="M7 7h4v4H7zM13 13h4v4h-4z"></path><path d="M11 9h2a2 2 0 0 1 2 2v2M9 11v5a2 2 0 0 0 2 2h2"></path>',
      guide: '<path d="M5 4.5h11a2 2 0 0 1 2 2V20H7a2 2 0 0 1-2-2Z"></path><path d="M7 17h11M9 8h5M9 11h5"></path>',
      help: '<circle cx="12" cy="12" r="9"></circle><path d="M9.5 9.3a2.7 2.7 0 1 1 3.1 2.7c-.6.2-.9.7-.9 1.5M12 17h.01"></path>',
      profile: '<circle cx="12" cy="8" r="3.5"></circle><path d="M5.5 20a6.5 6.5 0 0 1 13 0"></path>',
      logout: '<path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10"></path>',
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.help}</svg>`;
  }

  function showMobileToast(message, tone = "success") {
    mobileToast.textContent = message;
    mobileToast.dataset.tone = tone;
    mobileToast.hidden = false;
    window.clearTimeout(showMobileToast.timer);
    showMobileToast.timer = window.setTimeout(() => { mobileToast.hidden = true; }, 2800);
  }

  function setMobileNavState() {
    scopeMobileApp.querySelectorAll("[data-mobile-nav]").forEach((button) => {
      const target = button.dataset.mobileNav;
      const active = target === mobileView || (target === "more" && mobileMoreViews.includes(mobileView));
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
  }

  function mobileTrendMarkup() {
    const values = demoTrend.metrics.sales.today;
    const forecast = demoTrend.metrics.sales.forecast;
    const width = 340;
    const height = 188;
    const pad = { x: 18, top: 18, bottom: 24 };
    const max = Math.max(...values, ...forecast) * 1.08;
    const x = (index) => pad.x + (index / (values.length - 1)) * (width - pad.x * 2);
    const y = (value) => height - pad.bottom - (value / max) * (height - pad.top - pad.bottom);
    const actualPoints = values.slice(0, demoTrend.nowIndex + 1).map((value, index) => `${x(index)},${y(value)}`).join(" ");
    const estimateValues = values.slice(0, demoTrend.nowIndex + 1).concat(forecast.slice(1));
    const estimatePoints = estimateValues.map((value, index) => `${x(index)},${y(value)}`).join(" ");
    const nowX = x(demoTrend.nowIndex);
    return `<div class="scope-mobile-chart" data-mobile-trend>
      <div class="scope-mobile-chart-key"><span><i></i>Faktisk</span><span><i></i>Estimat</span></div>
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Omsetning i dag med faktisk omsetning og estimat">
        <line class="grid" x1="${pad.x}" y1="${y(max * .33)}" x2="${width - pad.x}" y2="${y(max * .33)}"></line>
        <line class="grid" x1="${pad.x}" y1="${y(max * .66)}" x2="${width - pad.x}" y2="${y(max * .66)}"></line>
        <polyline class="estimate" points="${estimatePoints}"></polyline>
        <polyline class="actual" points="${actualPoints}"></polyline>
        <line class="now" x1="${nowX}" y1="${pad.top}" x2="${nowX}" y2="${height - pad.bottom}"></line>
        <circle class="now-dot" cx="${nowX}" cy="${y(values[demoTrend.nowIndex])}" r="5"></circle>
        <text x="${nowX}" y="12" text-anchor="middle">Nå</text>
        <text x="${pad.x}" y="183">10</text><text x="${x(6)}" y="183" text-anchor="middle">16</text><text x="${width - pad.x}" y="183" text-anchor="end">22</text>
      </svg>
      <output data-mobile-chart-tooltip hidden></output>
    </div>`;
  }

  function mobileNowPage() {
    return `<section class="scope-mobile-page scope-mobile-now" aria-labelledby="mobile-now-title">
      <div class="scope-mobile-greeting"><span>God ettermiddag</span><h1 id="mobile-now-title">Slik ligger dagen an</h1><em>Travelt</em></div>
      <section aria-labelledby="mobile-kpi-title">
        <div class="scope-mobile-section-head"><h2 id="mobile-kpi-title">Nøkkeltall</h2><span>Sveip for flere</span></div>
        <div class="scope-mobile-kpis" aria-label="Nøkkeltall, sveip horisontalt">
          <article class="tone-green"><span>Omsetning</span><strong>67 512 <small>kr</small></strong><p>12 % over sist søndag</p></article>
          <article class="tone-yellow"><span>Gjester nå</span><strong>84</strong><p>Travelt</p></article>
          <article class="tone-purple"><span>På jobb</span><strong>12</strong><p>Godt bemannet</p></article>
          <article class="tone-pink"><span>Reservasjoner</span><strong>38</strong><p>Mange etter kl. 18</p></article>
        </div>
      </section>
      <article class="scope-mobile-recommendation">
        <span>Scope anbefaler nå</span><h2>Sett inn én ekstra i servering fra kl. 17</h2><p>Trykket forventes å øke mellom 17 og 19.</p>
        <div class="scope-mobile-impact"><span><small>Forventet effekt</small><strong>+4 520 kr/mnd</strong></span><em>Høy prioritet</em></div>
        <div class="scope-mobile-actions"><button type="button" data-mobile-why="staff-friday">Se hvorfor</button><button class="is-primary" type="button" data-mobile-plan="staff-friday">Planlegg</button></div>
      </article>
      <article class="scope-mobile-card scope-mobile-trend-card">
        <div class="scope-mobile-card-head"><div><span>Utvikling</span><h2>Omsetning i dag</h2></div><button type="button" data-mobile-nav-jump="reports">Se mer</button></div>
        ${mobileTrendMarkup()}
      </article>
      <article class="scope-mobile-card scope-mobile-assessment">
        <div><span>Dagens vurdering</span><strong>Sterk dag · 5/6</strong></div>
        <p><b>Bra:</b> Salget er 12 % over forrige søndag.</p><p><b>Følg opp:</b> Trykket øker fra kl. 17.</p>
      </article>
    </section>`;
  }

  function reportAdviceCount(report) {
    return scopeAdvice.filter((advice) => advice.report === report.id && getAdviceState(advice).status === "new").length;
  }

  function mobileReportCard(report) {
    const primaryMetric = report.metrics[0];
    const secondary = report.metrics[1]?.[1] || report.status;
    const adviceCount = reportAdviceCount(report);
    return `<button class="scope-mobile-report-card tone-${report.tone}" type="button" data-mobile-open-report="${report.id}">
      <span>${report.typeLabel} · ${report.period}</span><strong>${primaryMetric[1]}</strong><p>${secondary}${adviceCount ? ` · ${adviceCount} ${adviceCount === 1 ? "nytt råd" : "nye råd"}` : ` · ${report.status}`}</p><i>Åpne <b>→</b></i>
    </button>`;
  }

  function filteredMobileReports() {
    return scopeReports
      .filter((report) => report.type === mobileReportType)
      .filter((report) => !mobileReportFilters.date || report.date >= mobileReportFilters.date)
      .filter((report) => mobileReportFilters.location === "all" || report.location === mobileReportFilters.location)
      .sort((a, b) => mobileReportFilters.sort === "oldest" ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));
  }

  function mobileReportsPage({ loading = false } = {}) {
    const reports = filteredMobileReports();
    const cards = loading
      ? '<div class="scope-mobile-loading"><i></i><strong>Henter rapporter …</strong></div>'
      : reports.length
        ? reports.map(mobileReportCard).join("")
        : '<div class="scope-mobile-empty"><strong>Ingen rapporter passer filtrene</strong><p>Prøv en annen dato eller restaurant.</p><button type="button" data-mobile-reset-report-filters>Nullstill filtre</button></div>';
    return `<section class="scope-mobile-page" aria-labelledby="mobile-reports-title">
      <header class="scope-mobile-page-head"><div><h1 id="mobile-reports-title">Rapporter</h1><p>Dag for dag, uke for uke og måned for måned.</p></div><button type="button" data-mobile-open-report-filters>Filtrer</button></header>
      <div class="scope-mobile-segments" role="tablist" aria-label="Rapporttype">
        ${[["day", "Dag"], ["week", "Uke"], ["month", "Måned"]].map(([value, label]) => `<button type="button" role="tab" aria-selected="${mobileReportType === value}" class="${mobileReportType === value ? "is-active" : ""}" data-mobile-report-type="${value}">${label}</button>`).join("")}
      </div>
      <div class="scope-mobile-card-list" data-mobile-report-list aria-live="polite">${cards}</div>
    </section>`;
  }

  function mobileAdviceCard(advice) {
    const item = getAdviceState(advice);
    const net = item.effect - item.cost;
    const canPlan = ["new", "planned"].includes(item.status);
    return `<article class="scope-mobile-advice-card" data-mobile-advice-id="${item.id}">
      <div><span>${item.category}</span><em>${adviceStatusLabels[item.status]}</em></div>
      <h2>${item.title}</h2><p>${item.reason}</p><strong>+${formatScopeCurrency(net)}/mnd</strong>
      <footer><button type="button" data-mobile-why="${item.id}">Se hvorfor</button><button class="is-primary" type="button" ${canPlan ? `data-mobile-plan="${item.id}"` : `data-mobile-advice-detail="${item.id}"`}>${canPlan ? (item.status === "planned" ? "Endre plan" : "Planlegg") : "Se status"}</button></footer>
    </article>`;
  }

  function mobileAdvicePage() {
    const expected = mobileAdviceFilter === "all" ? null : mobileAdviceFilter;
    const advice = scopeAdvice.filter((item) => !expected || getAdviceState(item).status === expected);
    return `<section class="scope-mobile-page" aria-labelledby="mobile-advice-title">
      <header class="scope-mobile-page-head"><div><h1 id="mobile-advice-title">Råd fra Scope</h1><p>Konkrete grep som styrker driften.</p></div></header>
      <div class="scope-mobile-segments scope-mobile-advice-tabs" role="tablist" aria-label="Rådstatus">
        ${[["new", "Nye"], ["planned", "Planlagt"], ["completed", "Gjennomført"], ["all", "Alle"]].map(([value, label]) => `<button type="button" role="tab" aria-selected="${mobileAdviceFilter === value}" class="${mobileAdviceFilter === value ? "is-active" : ""}" data-mobile-advice-filter="${value}">${label}</button>`).join("")}
      </div>
      <div class="scope-mobile-card-list">${advice.length ? advice.map(mobileAdviceCard).join("") : '<div class="scope-mobile-empty"><strong>Ingen råd her ennå</strong><p>Nye råd vises når Scope finner et konkret forbedringspunkt.</p><button type="button" data-mobile-advice-filter="all">Vis alle råd</button></div>'}</div>
    </section>`;
  }

  function mobileEffectPage() {
    const data = effectPeriods["90"];
    const width = 330;
    const height = 150;
    const max = Math.max(...data.points);
    const points = data.points.map((value, index) => `${18 + index * ((width - 36) / (data.points.length - 1))},${height - 18 - (value / max) * 112}`).join(" ");
    return `<section class="scope-mobile-page" aria-labelledby="mobile-effect-title">
      <header class="scope-mobile-page-head"><div><span>Dokumentert verdi</span><h1 id="mobile-effect-title">Effekt</h1><p>Hva tiltakene faktisk har forbedret.</p></div></header>
      <article class="scope-mobile-effect-hero"><span>Økt lønnsomhet</span><strong>+38 600 kr</strong><p>Siste 90 dager</p></article>
      <div class="scope-mobile-effect-metrics"><article><span>Økt omsetning</span><strong>+47 200 kr</strong></article><article><span>Sparte kostnader</span><strong>+20 300 kr</strong></article><article><span>Forbedret margin</span><strong>+2,1 pp</strong></article></div>
      <article class="scope-mobile-card scope-mobile-effect-chart"><span>Utvikling</span><h2>Verdien bygger seg opp</h2><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Dokumentert effekt over tid"><line x1="18" y1="132" x2="312" y2="132"></line><polyline points="${points}"></polyline>${data.points.map((value, index) => `<circle cx="${18 + index * ((width - 36) / (data.points.length - 1))}" cy="${height - 18 - (value / max) * 112}" r="4"></circle>`).join("")}</svg></article>
    </section>`;
  }

  function mobileIntegrationsPage() {
    const connectedIds = connectedIntegrationIds();
    const connected = scopeIntegrations.filter((item) => connectedIds.includes(item.id));
    return `<section class="scope-mobile-page" aria-labelledby="mobile-integrations-title">
      <header class="scope-mobile-page-head"><div><span>Datagrunnlaget</span><h1 id="mobile-integrations-title">Integrasjoner</h1><p>Systemene Scope henter data fra.</p></div></header>
      <div class="scope-mobile-health"><i></i><span><strong>Alle systemer fungerer</strong><small>${connected.length} systemer tilkoblet · sist oppdatert 09:14</small></span></div>
      <div class="scope-mobile-integration-list">${connected.map((item) => `<article><img src="${item.logo}" alt=""><span><strong>${item.name}</strong><small>${item.category} · synkronisert ${item.sync || "nå"}</small></span><em>Tilkoblet</em></article>`).join("")}</div>
      <button class="scope-mobile-wide-action" type="button" data-mobile-add-system>Legg til system</button>
    </section>`;
  }

  function mobileUsagePage() {
    const [featured, ...guides] = scopeGuides;
    return `<section class="scope-mobile-page" aria-labelledby="mobile-usage-title">
      <header class="scope-mobile-page-head"><div><span>Hjelp og guider</span><h1 id="mobile-usage-title">Lær å bruke Scope</h1><p>Korte guider du kan følge i eget tempo.</p></div></header>
      <button class="scope-mobile-featured-guide" type="button" data-mobile-guide="${featured.id}"><img src="${featured.image}" alt=""><span><small>Start her · ${featured.duration}</small><strong>${featured.title}</strong><p>${featured.description}</p></span></button>
      <div class="scope-mobile-guide-list">${guides.map((guide) => `<button type="button" data-mobile-guide="${guide.id}"><span><strong>${guide.title}</strong><small>${guide.description}</small></span><em>${guide.duration} →</em></button>`).join("")}</div>
    </section>`;
  }

  function mobileProfilePage() {
    return `<section class="scope-mobile-page" aria-labelledby="mobile-profile-title">
      <header class="scope-mobile-page-head"><div><h1 id="mobile-profile-title">Profil</h1><p>Bruker og restauranttilgang.</p></div></header>
      <article class="scope-mobile-profile-card"><img src="assets/profile-ola.png" alt="Ola Nordmann"><div><strong>Ola Nordmann</strong><span>Daglig leder</span><small>ola@varmburger.no</small></div></article>
      <div class="scope-mobile-settings-list"><button type="button" data-mobile-location>Restaurant <span>Varm Burger AS →</span></button><button type="button" data-mobile-notifications>Varsler <span>På →</span></button></div>
    </section>`;
  }

  function renderMobilePage({ restoreScroll = true } = {}) {
    window.clearTimeout(mobileReportLoadingTimer);
    const pages = {
      overview: mobileNowPage,
      reports: mobileReportsPage,
      advice: mobileAdvicePage,
      effect: mobileEffectPage,
      integrations: mobileIntegrationsPage,
      usage: mobileUsagePage,
      profile: mobileProfilePage,
    };
    mobileMain.innerHTML = pages[mobileView]();
    mobileMain.dataset.mobileView = mobileView;
    setMobileNavState();
    requestAnimationFrame(() => { mobileMain.scrollTop = restoreScroll ? (mobileScrollPositions[mobileView] || 0) : 0; });
  }

  function navigateMobile(view, { push = true, restoreScroll = true } = {}) {
    if (!mobileViews.includes(view)) return;
    mobileScrollPositions[mobileView] = mobileMain.scrollTop;
    mobileView = view;
    writeScopeDemoState({ mobileView });
    if (push) history.pushState({ scopeMobileView: view }, "", `#mobile-${view}`);
    renderMobilePage({ restoreScroll });
    mobileMain.focus({ preventScroll: true });
  }

  function openMobileSheet(content, label) {
    mobileSheetPanel.innerHTML = content;
    mobileSheetPanel.setAttribute("aria-label", label);
    mobileSheet.hidden = false;
    document.body.classList.add("has-mobile-sheet");
    history.pushState({ scopeMobileView: mobileView, scopeMobileOverlay: "sheet" }, "", "#mobile-sheet");
    requestAnimationFrame(() => mobileSheetPanel.querySelector("button, input, select, textarea")?.focus());
  }

  function hideMobileSheet() {
    mobileSheet.hidden = true;
    mobileSheetPanel.innerHTML = "";
    document.body.classList.remove("has-mobile-sheet");
  }

  function requestCloseMobileOverlay() {
    if (history.state?.scopeMobileOverlay) history.back();
    else {
      hideMobileSheet();
      closeMobileStory();
    }
  }

  function moreSheetMarkup() {
    const items = [
      ["effect", "Effekt", "Dokumentert verdi"],
      ["integrations", "Integrasjoner", "Systemstatus og datakilder"],
      ["usage", "Lær å bruke Scope", "Korte guider"],
      ["help", "Spør om hjelp", "Vi svarer raskt"],
      ["profile", "Profil", "Ola Nordmann"],
      ["logout", "Logg ut", "Avslutt demoøkten"],
    ];
    return `<header class="scope-mobile-sheet-head"><div><span>Flere valg</span><h2>Mer</h2></div><button type="button" data-mobile-close-sheet aria-label="Lukk">×</button></header><div class="scope-mobile-more-list">${items.map(([id, label, text]) => `<button type="button" data-mobile-more="${id}">${mobileIcon(id)}<span><strong>${label}</strong><small>${text}</small></span><em>→</em></button>`).join("")}</div>`;
  }

  function openReportFilters() {
    openMobileSheet(`<header class="scope-mobile-sheet-head"><div><span>Rapporter</span><h2>Filtrer</h2></div><button type="button" data-mobile-close-sheet aria-label="Lukk">×</button></header>
      <form class="scope-mobile-form" data-mobile-report-filter-form>
        <label><span>Fra dato</span><input type="date" name="date" value="${mobileReportFilters.date}"></label>
        <label><span>Restaurant</span><select name="location"><option value="all">Alle restauranter</option><option value="Varm Burger AS" ${mobileReportFilters.location === "Varm Burger AS" ? "selected" : ""}>Varm Burger AS</option><option value="Varm Burger Majorstuen" ${mobileReportFilters.location === "Varm Burger Majorstuen" ? "selected" : ""}>Varm Burger Majorstuen</option></select></label>
        <label><span>Sortering</span><select name="sort"><option value="newest" ${mobileReportFilters.sort === "newest" ? "selected" : ""}>Nyeste først</option><option value="oldest" ${mobileReportFilters.sort === "oldest" ? "selected" : ""}>Eldste først</option></select></label>
        <footer><button type="button" data-mobile-reset-report-filters>Nullstill</button><button class="is-primary" type="submit">Vis rapporter</button></footer>
      </form>`, "Filtrer rapporter");
  }

  function openAdviceWhy(adviceId) {
    const advice = getAdviceState(scopeAdvice.find((item) => item.id === adviceId));
    if (!advice) return;
    openMobileSheet(`<header class="scope-mobile-sheet-head"><div><span>${advice.category}</span><h2>Hvorfor dette rådet?</h2></div><button type="button" data-mobile-close-sheet aria-label="Lukk">×</button></header>
      <div class="scope-mobile-sheet-copy"><h3>${advice.title}</h3><p>${advice.reason}</p><dl><div><dt>Forventet netto effekt</dt><dd>+${formatScopeCurrency(advice.effect - advice.cost)}/mnd</dd></div><div><dt>Sikkerhet</dt><dd>${advice.confidence} %</dd></div><div><dt>Datagrunnlag</dt><dd>${advice.basis}</dd></div></dl><button class="scope-mobile-wide-action" type="button" data-mobile-plan="${advice.id}">Planlegg</button></div>`, "Begrunnelse for råd");
  }

  function openAdvicePlannerMobile(adviceId) {
    const advice = getAdviceState(scopeAdvice.find((item) => item.id === adviceId));
    if (!advice) return;
    const plan = advice.plan || {};
    openMobileSheet(`<header class="scope-mobile-sheet-head"><div><span>Planlegg tiltak</span><h2>${advice.title}</h2></div><button type="button" data-mobile-close-sheet aria-label="Lukk">×</button></header>
      <form class="scope-mobile-form" data-mobile-plan-form data-advice-id="${advice.id}">
        <label><span>Dato</span><input type="date" name="date" min="2026-07-15" value="${plan.date || "2026-07-18"}" required></label>
        <label><span>Tid</span><input type="time" name="time" value="${plan.time || "16:00"}" required></label>
        <label><span>Ansvarlig</span><select name="owner" required><option value="">Velg person</option>${["Ola Nordmann", "Emma Johansen", "Jonas Berg"].map((owner) => `<option ${plan.owner === owner ? "selected" : ""}>${owner}</option>`).join("")}</select></label>
        <label><span>Kommentar</span><textarea name="comment" rows="3" placeholder="Hva må avklares?">${plan.comment || ""}</textarea></label>
        <p class="scope-mobile-form-error" data-mobile-form-error aria-live="polite"></p>
        <footer><button type="button" data-mobile-close-sheet>Avbryt</button><button class="is-primary" type="submit">Lagre</button></footer>
      </form>`, "Planlegg råd");
  }

  function openAdviceDetailMobile(adviceId) {
    const advice = getAdviceState(scopeAdvice.find((item) => item.id === adviceId));
    if (!advice) return;
    openMobileSheet(`<header class="scope-mobile-sheet-head"><div><span>${advice.category} · ${adviceStatusLabels[advice.status]}</span><h2>${advice.title}</h2></div><button type="button" data-mobile-close-sheet aria-label="Lukk">×</button></header><div class="scope-mobile-sheet-copy"><p>${advice.reason}</p><dl><div><dt>Forventet effekt</dt><dd>+${formatScopeCurrency(advice.effect)}</dd></div><div><dt>Status</dt><dd>${adviceStatusLabels[advice.status]}</dd></div></dl><h3>Historikk</h3><ol>${advice.history.map((entry) => `<li>${entry}</li>`).join("")}</ol></div>`, "Råddetaljer");
  }

  function openLocationSheet() {
    openMobileSheet(`<header class="scope-mobile-sheet-head"><div><span>Arbeidsområde</span><h2>Velg restaurant</h2></div><button type="button" data-mobile-close-sheet aria-label="Lukk">×</button></header><div class="scope-mobile-choice-list"><button type="button" class="is-selected" data-mobile-select-location="Varm Burger AS"><span><strong>Varm Burger AS</strong><small>Sentrum · åpen nå</small></span><em>✓</em></button><button type="button" data-mobile-select-location="Varm Burger Majorstuen"><span><strong>Varm Burger Majorstuen</strong><small>Majorstuen · åpen nå</small></span><em></em></button></div>`, "Velg restaurant");
  }

  function openAddSystemSheet() {
    const connected = connectedIntegrationIds();
    const available = scopeIntegrations.filter((item) => !connected.includes(item.id));
    openMobileSheet(`<header class="scope-mobile-sheet-head"><div><span>Integrasjoner</span><h2>Legg til system</h2></div><button type="button" data-mobile-close-sheet aria-label="Lukk">×</button></header><div class="scope-mobile-system-list">${available.length ? available.map((item) => `<button type="button" data-mobile-connect-system="${item.id}"><img src="${item.logo}" alt=""><span><strong>${item.name}</strong><small>${item.category} · ${item.description}</small></span><em>Koble til</em></button>`).join("") : '<div class="scope-mobile-empty"><strong>Alle systemene er tilkoblet</strong><p>Det finnes ingen flere systemer i demoen.</p></div>'}</div>`, "Legg til system");
  }

  function openGuideSheet(guideId, step = 0) {
    const guide = scopeGuides.find((item) => item.id === guideId);
    if (!guide) return;
    const content = `<header class="scope-mobile-sheet-head"><div><span>${guide.duration}</span><h2>${guide.title}</h2></div><button type="button" data-mobile-close-sheet aria-label="Lukk">×</button></header><div class="scope-mobile-guide-stage" data-mobile-guide-stage="${guide.id}" data-guide-step="${step}"><div>${guide.steps.map((_, index) => `<i class="${index <= step ? "is-on" : ""}"></i>`).join("")}</div><img src="${guide.image}" alt=""><span>Steg ${step + 1} av ${guide.steps.length}</span><h3>${guide.steps[step]}</h3><p>Prøv gjerne funksjonen selv når guiden er lukket.</p><footer><button type="button" data-mobile-guide-prev ${step === 0 ? "disabled" : ""}>Forrige</button><button class="is-primary" type="button" data-mobile-guide-next>${step === guide.steps.length - 1 ? "Ferdig" : "Neste"}</button></footer></div>`;
    if (mobileSheet.hidden) openMobileSheet(content, "Guide");
    else mobileSheetPanel.innerHTML = content;
  }

  function renderMobileStory() {
    const report = scopeReports.find((item) => item.id === mobileStoryReportId);
    if (!report) return;
    const slide = report.slides[mobileStorySlide];
    mobileStory.className = `scope-mobile-story tone-${slide.tone || report.tone}`;
    mobileStory.innerHTML = `<div class="scope-mobile-story-progress">${report.slides.map((_, index) => `<i class="${index <= mobileStorySlide ? "is-on" : ""}"></i>`).join("")}</div>
      <header><button type="button" data-mobile-close-story aria-label="Lukk rapport">×</button><strong>${report.typeLabel} · ${report.period}</strong><button type="button" data-mobile-pause-story aria-label="${mobileStoryPaused ? "Fortsett" : "Pause"}">${mobileStoryPaused ? "▶" : "Ⅱ"}</button></header>
      <article><span>${slide.eyebrow}</span><h1>${slide.title}</h1>${slide.value ? `<strong>${slide.value}</strong>` : ""}${slide.text ? `<p>${slide.text}</p>` : ""}${slide.bars ? `<div class="scope-mobile-story-bars">${slide.bars.map((value) => `<i style="--value:${value}%"></i>`).join("")}</div>` : ""}${slide.points ? `<ul>${slide.points.map((point) => `<li>${point}</li>`).join("")}</ul>` : ""}<small>${mobileStorySlide + 1} av ${report.slides.length}</small></article>
      <button class="scope-mobile-story-tap is-left" type="button" data-mobile-story-prev aria-label="Forrige del"></button><button class="scope-mobile-story-tap is-right" type="button" data-mobile-story-next aria-label="Neste del"></button>`;
    scheduleMobileStory();
  }

  function scheduleMobileStory() {
    window.clearTimeout(mobileStoryTimer);
    if (mobileStoryPaused || mobileStory.hidden) return;
    const report = scopeReports.find((item) => item.id === mobileStoryReportId);
    if (!report || mobileStorySlide >= report.slides.length - 1) return;
    mobileStoryTimer = window.setTimeout(() => moveMobileStory(1), 6000);
  }

  function openMobileStory(reportId) {
    if (!scopeReports.some((item) => item.id === reportId)) return;
    mobileStoryReportId = reportId;
    mobileStorySlide = 0;
    mobileStoryPaused = false;
    mobileStory.hidden = false;
    history.pushState({ scopeMobileView: mobileView, scopeMobileOverlay: "story" }, "", "#mobile-report");
    renderMobileStory();
  }

  function closeMobileStory() {
    window.clearTimeout(mobileStoryTimer);
    mobileStory.hidden = true;
    mobileStory.className = "scope-mobile-story";
    mobileStory.innerHTML = "";
    mobileStoryReportId = null;
  }

  function moveMobileStory(direction) {
    const report = scopeReports.find((item) => item.id === mobileStoryReportId);
    if (!report) return;
    const next = mobileStorySlide + direction;
    if (next >= report.slides.length) {
      requestCloseMobileOverlay();
      return;
    }
    mobileStorySlide = Math.max(0, next);
    renderMobileStory();
  }

  scopeMobileApp.querySelector(".scope-mobile-nav").addEventListener("click", (event) => {
    const button = event.target.closest("[data-mobile-nav]");
    if (!button) return;
    if (button.dataset.mobileNav === "more") openMobileSheet(moreSheetMarkup(), "Mer");
    else navigateMobile(button.dataset.mobileNav);
  });

  scopeMobileApp.querySelector("[data-mobile-open-profile]").addEventListener("click", () => navigateMobile("profile"));
  mobileLocationButton.addEventListener("click", openLocationSheet);

  mobileMain.addEventListener("click", (event) => {
    const navJump = event.target.closest("[data-mobile-nav-jump]");
    const reportType = event.target.closest("[data-mobile-report-type]");
    const report = event.target.closest("[data-mobile-open-report]");
    const adviceFilter = event.target.closest("[data-mobile-advice-filter]");
    const why = event.target.closest("[data-mobile-why]");
    const plan = event.target.closest("[data-mobile-plan]");
    const detail = event.target.closest("[data-mobile-advice-detail]");
    if (navJump) navigateMobile(navJump.dataset.mobileNavJump);
    if (reportType) {
      mobileReportType = reportType.dataset.mobileReportType;
      activeReportType = mobileReportType;
      writeScopeDemoState({ reportType: mobileReportType });
      mobileMain.innerHTML = mobileReportsPage({ loading: true });
      mobileReportLoadingTimer = window.setTimeout(renderMobilePage, 220);
    }
    if (report) openMobileStory(report.dataset.mobileOpenReport);
    if (event.target.closest("[data-mobile-open-report-filters]")) openReportFilters();
    if (event.target.closest("[data-mobile-reset-report-filters]")) {
      mobileReportFilters = { date: "", location: "all", sort: "newest" };
      writeScopeDemoState({ reportDate: "", reportLocation: "all", reportSort: "newest" });
      renderMobilePage({ restoreScroll: false });
    }
    if (adviceFilter) {
      mobileAdviceFilter = adviceFilter.dataset.mobileAdviceFilter;
      writeScopeDemoState({ mobileAdviceFilter });
      renderMobilePage({ restoreScroll: false });
    }
    if (why) openAdviceWhy(why.dataset.mobileWhy);
    if (plan) openAdvicePlannerMobile(plan.dataset.mobilePlan);
    if (detail) openAdviceDetailMobile(detail.dataset.mobileAdviceDetail);
    if (event.target.closest("[data-mobile-add-system]")) openAddSystemSheet();
    const guide = event.target.closest("[data-mobile-guide]");
    if (guide) openGuideSheet(guide.dataset.mobileGuide);
    if (event.target.closest("[data-mobile-location]")) openLocationSheet();
    if (event.target.closest("[data-mobile-notifications]")) showMobileToast("Varsler er slått på.", "neutral");
  });

  mobileMain.addEventListener("pointerdown", (event) => {
    const chart = event.target.closest("[data-mobile-trend]");
    if (!chart) return;
    const bounds = chart.querySelector("svg").getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const values = demoTrend.metrics.sales.today;
    const index = Math.round(ratio * (values.length - 1));
    const tooltip = chart.querySelector("[data-mobile-chart-tooltip]");
    tooltip.textContent = `${demoTrend.hours[index]}:00 · ${formatScopeCurrency(values[index])}`;
    tooltip.style.left = `${Math.max(12, Math.min(bounds.width - 126, event.clientX - bounds.left - 54))}px`;
    tooltip.hidden = false;
  });

  mobileSheet.addEventListener("click", (event) => {
    if (event.target.closest("[data-mobile-close-sheet]") || event.target.closest("[data-mobile-scrim]")) {
      requestCloseMobileOverlay();
      return;
    }
    const more = event.target.closest("[data-mobile-more]");
    if (more) {
      const target = more.dataset.mobileMore;
      if (mobileViews.includes(target)) {
        hideMobileSheet();
        mobileView = target;
        writeScopeDemoState({ mobileView });
        history.replaceState({ scopeMobileView: target }, "", `#mobile-${target}`);
        renderMobilePage({ restoreScroll: false });
      } else if (target === "help") {
        window.location.href = "mailto:post@scopeanalytics.no?subject=Hjelp%20med%20Scope";
      } else if (target === "logout") {
        mobileSheetPanel.innerHTML = `<header class="scope-mobile-sheet-head"><div><span>Demo</span><h2>Vil du logge ut?</h2></div><button type="button" data-mobile-close-sheet aria-label="Lukk">×</button></header><div class="scope-mobile-sheet-copy"><p>Du går tilbake til Scope-forsiden. Lagrede demovalg blir liggende til neste gang.</p><button class="scope-mobile-wide-action" type="button" data-mobile-confirm-logout>Logg ut</button></div>`;
      }
    }
    const plan = event.target.closest("[data-mobile-plan]");
    if (plan) openAdvicePlannerMobile(plan.dataset.mobilePlan);
    if (event.target.closest("[data-mobile-reset-report-filters]")) {
      mobileReportFilters = { date: "", location: "all", sort: "newest" };
      writeScopeDemoState({ reportDate: "", reportLocation: "all", reportSort: "newest" });
      requestCloseMobileOverlay();
      renderMobilePage({ restoreScroll: false });
    }
    const location = event.target.closest("[data-mobile-select-location]");
    if (location) {
      mobileLocationButton.querySelector("strong").textContent = location.dataset.mobileSelectLocation;
      writeScopeDemoState({ mobileLocation: location.dataset.mobileSelectLocation });
      requestCloseMobileOverlay();
      showMobileToast("Restaurant er byttet.");
    }
    const integration = event.target.closest("[data-mobile-connect-system]");
    if (integration) {
      const item = scopeIntegrations.find((candidate) => candidate.id === integration.dataset.mobileConnectSystem);
      integration.disabled = true;
      integration.querySelector("em").textContent = "Kobler til …";
      window.setTimeout(() => {
        saveConnectedIntegrationIds([...connectedIntegrationIds(), item.id]);
        renderIntegrations();
        hideMobileSheet();
        history.replaceState({ scopeMobileView: "integrations" }, "", "#mobile-integrations");
        mobileView = "integrations";
        writeScopeDemoState({ mobileView });
        renderMobilePage({ restoreScroll: false });
        showMobileToast(`${item.name} er tilkoblet.`);
      }, 700);
    }
    const guideStage = event.target.closest("[data-mobile-guide-stage]");
    if (guideStage) {
      const guide = scopeGuides.find((item) => item.id === guideStage.dataset.mobileGuideStage);
      const step = Number(guideStage.dataset.guideStep);
      if (event.target.closest("[data-mobile-guide-prev]")) openGuideSheet(guide.id, Math.max(0, step - 1));
      if (event.target.closest("[data-mobile-guide-next]")) {
        if (step >= guide.steps.length - 1) {
          requestCloseMobileOverlay();
          showMobileToast("Guiden er fullført.");
        } else openGuideSheet(guide.id, step + 1);
      }
    }
    if (event.target.closest("[data-mobile-confirm-logout]")) window.location.href = "index.html";
  });

  mobileSheet.addEventListener("submit", (event) => {
    event.preventDefault();
    if (event.target.matches("[data-mobile-report-filter-form]")) {
      const data = new FormData(event.target);
      mobileReportFilters = { date: data.get("date"), location: data.get("location"), sort: data.get("sort") };
      writeScopeDemoState({ reportDate: mobileReportFilters.date, reportLocation: mobileReportFilters.location, reportSort: mobileReportFilters.sort });
      requestCloseMobileOverlay();
      renderMobilePage({ restoreScroll: false });
    }
    if (event.target.matches("[data-mobile-plan-form]")) {
      const form = event.target;
      const data = new FormData(form);
      const error = form.querySelector("[data-mobile-form-error]");
      if (!data.get("date") || !data.get("time") || !data.get("owner")) {
        error.textContent = "Velg dato, tid og ansvarlig før du lagrer.";
        return;
      }
      const adviceId = form.dataset.adviceId;
      const base = getAdviceState(scopeAdvice.find((item) => item.id === adviceId));
      saveAdviceState(adviceId, {
        status: "planned",
        plan: { date: data.get("date"), time: data.get("time"), owner: data.get("owner"), comment: String(data.get("comment") || "").trim() },
        history: [...(base.history || []), `Planlagt ${new Date(`${data.get("date")}T12:00:00`).toLocaleDateString("no-NO")} kl. ${data.get("time")} · ${data.get("owner")}`],
      });
      activeAdviceFilter = "planned";
      renderAdviceLibrary();
      requestCloseMobileOverlay();
      renderMobilePage();
      showMobileToast("Tiltaket er planlagt og lagret.");
    }
  });

  mobileStory.addEventListener("click", (event) => {
    if (event.target.closest("[data-mobile-close-story]")) requestCloseMobileOverlay();
    if (event.target.closest("[data-mobile-pause-story]")) {
      mobileStoryPaused = !mobileStoryPaused;
      renderMobileStory();
    }
    if (event.target.closest("[data-mobile-story-prev]")) moveMobileStory(-1);
    if (event.target.closest("[data-mobile-story-next]")) moveMobileStory(1);
  });
  mobileStory.addEventListener("touchstart", (event) => { mobileTouchStart = event.changedTouches[0].clientX; }, { passive: true });
  mobileStory.addEventListener("touchend", (event) => {
    const distance = event.changedTouches[0].clientX - mobileTouchStart;
    if (Math.abs(distance) > 45) moveMobileStory(distance < 0 ? 1 : -1);
  }, { passive: true });

  window.addEventListener("popstate", (event) => {
    hideMobileSheet();
    closeMobileStory();
    if (mobileViews.includes(event.state?.scopeMobileView)) navigateMobile(event.state.scopeMobileView, { push: false });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && (!mobileSheet.hidden || !mobileStory.hidden)) requestCloseMobileOverlay();
  });

  const savedLocation = mobileState.mobileLocation;
  if (savedLocation) mobileLocationButton.querySelector("strong").textContent = savedLocation;
  history.replaceState({ ...(history.state || {}), scopeMobileView: mobileView }, "", window.location.href);
  renderMobilePage({ restoreScroll: false });
}
