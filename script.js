const typewriterWord = document.getElementById("typewriter-word");
const loginIntro = document.querySelector(".login-intro");
const pageParameters = new URLSearchParams(window.location.search);
const opensDemoDirectly = pageParameters.get("demo") === "1";
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
const scopeStackNavButtons = Array.from(document.querySelectorAll("[data-scope-nav]"));
let scopeStackFrame = 0;
let scopeStackActiveIndex = -1;

function setScopeStackActiveIndex(activeIndex) {
  if (activeIndex === scopeStackActiveIndex) {
    return;
  }

  scopeStackActiveIndex = activeIndex;
  scopeStackNavButtons.forEach((button, index) => {
    const isActive = index === activeIndex;

    button.classList.toggle("is-active", isActive);
    if (isActive) {
      button.setAttribute("aria-current", "step");
    } else {
      button.removeAttribute("aria-current");
    }
  });
}

function updateScopeStack() {
  scopeStackFrame = 0;
  let activeIndex = 0;

  scopeStackCards.forEach((card, index) => {
    const nextCard = scopeStackCards[index + 1];
    const stickyTop = Number.parseFloat(window.getComputedStyle(card).top) || 88;
    const cardTop = card.getBoundingClientRect().top;
    let overlapProgress = 0;

    if (cardTop <= stickyTop + 2) {
      activeIndex = index;
    }

    if (nextCard) {
      const distanceToStack = nextCard.getBoundingClientRect().top - stickyTop;
      overlapProgress = Math.min(Math.max(1 - distanceToStack / 280, 0), 1);
    }

    card.style.setProperty("--stack-scale", String(1 - overlapProgress * 0.045));
    card.style.setProperty("--stack-lift", `${overlapProgress * -7}px`);
    card.style.setProperty("--stack-brightness", String(1 - overlapProgress * 0.13));
    card.classList.toggle("is-covered", overlapProgress > 0.96);
  });

  setScopeStackActiveIndex(activeIndex);
}

function requestScopeStackUpdate() {
  if (scopeStackFrame) {
    return;
  }

  scopeStackFrame = window.requestAnimationFrame(updateScopeStack);
}

function getDocumentOffsetTop(element) {
  let offsetTop = 0;
  let currentElement = element;

  while (currentElement) {
    offsetTop += currentElement.offsetTop;
    currentElement = currentElement.offsetParent;
  }

  return offsetTop;
}

if (scopeStackCards.length > 0) {
  updateScopeStack();
  window.addEventListener("scroll", requestScopeStackUpdate, { passive: true });
  window.addEventListener("resize", requestScopeStackUpdate);
}

scopeStackNavButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const card = scopeStackCards[Number(button.dataset.scopeNav)];

    if (!card) {
      return;
    }

    const stickyTop = Number.parseFloat(window.getComputedStyle(card).top) || 88;
    const cardTop = getDocumentOffsetTop(card);
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    window.scrollTo({
      top: cardTop - stickyTop,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  });
});

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
};

function renderDemoView(viewName) {
  const view = demoViews[viewName];

  if (!view) {
    return;
  }

  if (demoContent) {
    demoContent.classList.toggle("is-reports-view", viewName === "reports");
    demoContent.classList.toggle("is-advice-view", viewName === "advice");
    demoContent.classList.toggle("is-effect-view", viewName === "effect");
    demoContent.classList.toggle("is-integrations-view", viewName === "integrations");
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

function setDemoDevice(selectedDevice) {
  const currentDemoMockup = document.querySelector(".mockup-box");
  const shouldUseMobile = selectedDevice === "mobile";

  if (!currentDemoMockup || currentDemoMockup.classList.contains("is-mobile-demo") === shouldUseMobile) {
    return;
  }

  currentDemoMockup.classList.toggle("is-mobile-demo", shouldUseMobile);
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

const demoPeriodButton = document.querySelector("[data-demo-period]");
const demoPeriodMenu = document.querySelector("[data-demo-period-menu]");

const demoPeriodData = {
  today: {
    label: "I dag",
    kpis: [
      { label: "Omsetning i dag", context: "93% av dagsmål", value: "67 512 <small>kr</small>", delta: "<b>↑ 12%</b> mot forrige søndag", progress: "93%" },
      { label: "Personalkost", context: "Mål: under 28%", value: "27,5<small>%</small>", delta: "<b>Innenfor mål</b> · 8 på jobb" },
      { label: "Forventet slutt", context: "Dagsmål 72 000 kr", value: "75 400 <small>kr</small>", delta: "<b>+3 400 kr</b> over mål" },
      { label: "Reservasjoner", context: "I kveld", value: "48<small> / 62</small>", delta: "Størst trykk kl. 18–20" },
    ],
    chartKicker: "Omsetning gjennom dagen",
    chartTitle: "På vei mot dagsmålet",
    chartGoal: "72 000 kr <small>mål</small>",
    scale: ["20k", "15k", "10k", "5k", "0"],
    bars: [
      { pct: 23, label: "10" },
      { pct: 34, label: "12" },
      { pct: 49, label: "14" },
      { pct: 90, label: "16", rush: true, value: "≈ 18 100 kr" },
      { pct: 84, label: "18", forecast: true },
      { pct: 62, label: "20", forecast: true },
      { pct: 35, label: "22", forecast: true },
    ],
    note: "Estimert slutt: <strong>75 400 kr</strong>",
  },
  yesterday: {
    label: "I går",
    kpis: [
      { label: "Omsetning i går", context: "113% av dagsmål", value: "81 200 <small>kr</small>", delta: "<b>↑ 9%</b> mot forrige lørdag", progress: "100%" },
      { label: "Personalkost", context: "Mål: under 28%", value: "26,1<small>%</small>", delta: "<b>Innenfor mål</b> · 9 på jobb" },
      { label: "Sluttresultat", context: "Dagsmål 72 000 kr", value: "81 200 <small>kr</small>", delta: "<b>+9 200 kr</b> over mål" },
      { label: "Reservasjoner", context: "Lørdag kveld", value: "59<small> / 62</small>", delta: "Fullbooket kl. 19–21" },
    ],
    chartKicker: "Omsetning gjennom dagen",
    chartTitle: "Endte 9 200 kr over mål",
    chartGoal: "72 000 kr <small>mål</small>",
    scale: ["20k", "15k", "10k", "5k", "0"],
    bars: [
      { pct: 21, label: "10" },
      { pct: 36, label: "12" },
      { pct: 52, label: "14" },
      { pct: 79, label: "16" },
      { pct: 96, label: "18", rush: true, value: "19 100 kr" },
      { pct: 84, label: "20" },
      { pct: 55, label: "22" },
    ],
    note: "Resultat: <strong>81 200 kr</strong>",
  },
  week: {
    label: "Siste 7 dager",
    kpis: [
      { label: "Omsetning siste 7 dager", context: "102% av ukesmål", value: "428 650 <small>kr</small>", delta: "<b>↑ 8,4%</b> mot forrige uke", progress: "100%" },
      { label: "Personalkost", context: "Mål: under 28%", value: "27,5<small>%</small>", delta: "<b>Innenfor mål</b> · snitt 8,2 årsverk" },
      { label: "Driftsmargin", context: "Denne uken", value: "14,8<small>%</small>", delta: "<b>↑ 2,1 pp</b> mot forrige uke" },
      { label: "Antall kjøp", context: "Denne uken", value: "2 214", delta: "312 av dem i dag" },
    ],
    chartKicker: "Omsetning per dag",
    chartTitle: "Beste uke denne måneden",
    chartGoal: "420 000 kr <small>ukesmål</small>",
    scale: ["80k", "60k", "40k", "20k", "0"],
    bars: [
      { pct: 52, label: "Man" },
      { pct: 64, label: "Tir" },
      { pct: 58, label: "Ons" },
      { pct: 76, label: "Tor" },
      { pct: 94, label: "Fre" },
      { pct: 100, label: "Lør", rush: true, value: "82 400 kr" },
      { pct: 72, label: "Søn" },
    ],
    note: "Sum: <strong>428 650 kr</strong>",
  },
};

function applyDemoPeriod(periodKey) {
  const data = demoPeriodData[periodKey];

  if (!data) {
    return;
  }

  document.querySelectorAll(".manager-kpis .manager-kpi").forEach((card, index) => {
    const kpi = data.kpis[index];

    if (!kpi) {
      return;
    }

    const label = card.querySelector("div:first-child > span");
    const context = card.querySelector("div:first-child > small");
    const value = card.querySelector(":scope > strong");
    const delta = card.querySelector(":scope > p");
    const progress = card.querySelector(".manager-progress i");

    if (label) label.textContent = kpi.label;
    if (context) context.textContent = kpi.context;
    if (value) value.innerHTML = kpi.value;
    if (delta) delta.innerHTML = kpi.delta;
    if (progress && kpi.progress) progress.style.setProperty("--progress", kpi.progress);
  });

  const chartKicker = document.querySelector(".manager-sales-panel .manager-panel-head span");
  const chartTitle = document.querySelector(".manager-sales-panel .manager-panel-head h5");
  const chartGoal = document.querySelector(".manager-sales-panel .manager-panel-head > strong");
  const chartNote = document.querySelector(".manager-chart-note p");
  const forecastLegend = document.querySelector(".manager-chart-note .note-forecast");

  if (chartKicker) chartKicker.textContent = data.chartKicker;
  if (chartTitle) chartTitle.textContent = data.chartTitle;
  if (chartGoal) chartGoal.innerHTML = data.chartGoal;
  if (chartNote) chartNote.innerHTML = data.note;
  forecastLegend?.toggleAttribute("hidden", !data.bars.some((bar) => bar.forecast));

  document.querySelectorAll(".manager-sales-panel .chart-scale span").forEach((tick, index) => {
    if (data.scale[index] !== undefined) {
      tick.textContent = data.scale[index];
    }
  });

  document.querySelectorAll(".manager-hourly-bars > div").forEach((column, index) => {
    const bar = data.bars[index];

    if (!bar) {
      return;
    }

    column.classList.toggle("is-rush", Boolean(bar.rush));
    column.classList.toggle("is-forecast", Boolean(bar.forecast));
    column.querySelector("i")?.style.setProperty("--hour", `${bar.pct}%`);

    const barValue = column.querySelector("b");
    const barLabel = column.querySelector("span");

    if (barValue) barValue.textContent = bar.value || "";
    if (barLabel) barLabel.textContent = bar.label;
  });
}

function setDemoPeriodMenuOpen(isOpen) {
  if (!demoPeriodButton || !demoPeriodMenu) {
    return;
  }

  demoPeriodMenu.hidden = !isOpen;
  demoPeriodButton.setAttribute("aria-expanded", String(isOpen));
}

if (demoPeriodButton && demoPeriodMenu) {
  demoPeriodButton.addEventListener("click", (event) => {
    event.stopPropagation();
    setDemoPeriodMenuOpen(demoPeriodMenu.hidden);
  });

  demoPeriodMenu.querySelectorAll("[data-period]").forEach((option) => {
    option.addEventListener("click", () => {
      demoPeriodMenu.querySelectorAll("[data-period]").forEach((item) => item.classList.remove("is-active"));
      option.classList.add("is-active");
      demoPeriodButton.firstChild.textContent = `${demoPeriodData[option.dataset.period]?.label ?? option.textContent} `;
      applyDemoPeriod(option.dataset.period);
      setDemoPeriodMenuOpen(false);
    });
  });

  document.addEventListener("click", (event) => {
    if (!demoPeriodMenu.hidden && !demoPeriodMenu.contains(event.target)) {
      setDemoPeriodMenuOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setDemoPeriodMenuOpen(false);
    }
  });
}

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

const revealPrefersReducedMotion = typeof window.matchMedia === "function"
  && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const revealTargets = document.querySelectorAll(".section-heading, .accounting-card, .price-card, .footer-cta");

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
    }

    updateOnboardingStep(currentOnboardingStep + 1);
  });

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
