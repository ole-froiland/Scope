// Scope #19 — Notion: hero, demovindu og logobånd.
const heroTypewriter = document.querySelector("[data-n-hero-typewriter]");
if (heroTypewriter) {
  const phrases = ["din AI-rådgiver.", "laget for restaurantbransjen."];
  const tones = ["blue", "green"];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let phrase = 0;
  let characters = phrases[0].length;
  let deleting = true;
  let timer;
  const tick = () => {
    if (document.hidden) { timer = setTimeout(tick, 250); return; }
    characters += deleting ? -1 : 1;
    heroTypewriter.textContent = phrases[phrase].slice(0, characters);
    let delay = deleting ? 45 : 85;
    if (characters === 0) {
      phrase = (phrase + 1) % phrases.length;
      heroTypewriter.dataset.tone = tones[phrase];
      deleting = false;
      delay = 350;
    } else if (characters === phrases[phrase].length && !deleting) {
      deleting = true;
      delay = 2600;
    }
    timer = setTimeout(tick, delay);
  };
  const updateTyping = () => {
    clearTimeout(timer);
    phrase = 0;
    characters = phrases[0].length;
    deleting = true;
    heroTypewriter.textContent = phrases[0];
    heroTypewriter.dataset.tone = tones[0];
    if (!reducedMotion.matches) timer = setTimeout(tick, 2600);
  };
  reducedMotion.addEventListener("change", updateTyping);
  updateTyping();
}

const pill = document.querySelector("[data-n-pill]");

// Samme skrivemaskin som /enkel: ordet skrives bokstav for bokstav og slettes med backspace eller markering.
if (pill && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const word = pill.querySelector("[data-n-word]");
  const words = [
    ["mat", "blue"], ["vin", "red"], ["kultur", "green"], ["kaffe", "blue"],
    ["indisk", "red"], ["stemning", "green"], ["tartar", "blue"],
  ];
  const removals = ["backspace", "select", "backspace", "select-italic", "backspace", "select-bold"];
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const remove = async (text, style) => {
    if (style === "backspace") {
      for (let i = text.length; i >= 0; i -= 1) { word.textContent = text.slice(0, i); await wait(150); }
      return;
    }
    word.classList.add("is-selecting");
    for (let i = 1; i <= text.length; i += 1) {
      const start = text.length - i;
      word.innerHTML = `${text.slice(0, start)}<span class="n-sel">${text.slice(start)}</span>`;
      await wait(90);
    }
    await wait(320);
    if (style === "select-italic") { word.classList.add("is-em"); await wait(700); }
    if (style === "select-bold") { word.classList.add("is-strong"); await wait(700); }
    word.classList.remove("is-selecting", "is-em", "is-strong");
    word.textContent = "";
  };

  (async () => {
    for (let n = 0; ; n += 1) {
      await wait(2200);
      const [text] = words[n % words.length];
      const [next, tone] = words[(n + 1) % words.length];
      await remove(text, removals[n % removals.length]);
      await wait(350);
      pill.dataset.tone = tone;
      for (let i = 1; i <= next.length; i += 1) { word.textContent = next.slice(0, i); await wait(210); }
    }
  })();
}

// Bakgrunnsvideoen står stille for dem som har slått av bevegelse.
const heroVideo = document.querySelector("[data-n-hero-video]");
if (heroVideo && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  heroVideo.removeAttribute("autoplay");
  heroVideo.pause();
}

// Den faktiske /test-flaten i miniatyr. embed=1 holder demotilstanden i minnet.
const dashboardPreview = document.querySelector("[data-n-dashboard-preview]");
const demoDialog = document.querySelector("#n-demo-dialog");
if (dashboardPreview && demoDialog) {
  const previewFrame = dashboardPreview.querySelector("iframe");
  const liveFrame = demoDialog.querySelector("iframe");
  const openButton = document.querySelector("[data-n-demo-open]");
  const loading = demoDialog.querySelector("[data-n-demo-loading]");
  const fitPreview = () => dashboardPreview.style.setProperty("--n-demo-scale", String(dashboardPreview.clientWidth / 1840));
  new ResizeObserver(fitPreview).observe(dashboardPreview);
  fitPreview();

  const useLightTheme = (frame) => {
    const app = frame.contentDocument?.body;
    if (app) {
      app.dataset.theme = "light";
      if (frame === previewFrame) {
        app.style.overflow = "hidden";
        const content = app.querySelector(".content-body");
        if (content) content.style.overflow = "hidden";
      }
      app.querySelector("a.brand")?.setAttribute("href", "/test?embed=1#oversikt");
      if (frame === liveFrame) frame.contentDocument.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !frame.contentDocument.querySelector("dialog[open]")) {
          event.preventDefault();
          demoDialog.close();
        }
      });
    }
  };
  previewFrame.addEventListener("load", () => useLightTheme(previewFrame));
  liveFrame.addEventListener("load", () => {
    if (!liveFrame.hasAttribute("src")) return;
    useLightTheme(liveFrame);
    loading.hidden = true;
  });
  openButton.addEventListener("click", () => {
    if (!liveFrame.hasAttribute("src")) liveFrame.src = liveFrame.dataset.src;
    demoDialog.showModal();
    document.body.classList.add("is-demo-open");
  });
  demoDialog.querySelector("[data-n-demo-close]").addEventListener("click", () => demoDialog.close());
  demoDialog.addEventListener("close", () => {
    document.body.classList.remove("is-demo-open");
    openButton.focus({ preventScroll: true });
  });
}

const logoMarquee = document.querySelector("[data-n-logos]");
const logoContent = document.querySelector("[data-n-logo-content]");

if (logoMarquee && logoContent) {
  const slot = logoContent.closest(".n-integrations");
  const topbar = document.querySelector(".n-topbar");
  let pendingFrame = 0;

  const positionLogos = () => {
    pendingFrame = 0;
    const bounds = slot.getBoundingClientRect();
    const naturalTop = bounds.top + logoContent.offsetTop;
    const offset = Math.min(0, innerHeight - logoContent.offsetHeight - naturalTop);
    logoContent.style.setProperty("--n-logo-viewport", `${document.documentElement.clientWidth}px`);
    logoContent.style.setProperty("--n-logo-offset", `${offset}px`);
    logoContent.classList.toggle("is-floating", offset < 0);
    slot.classList.toggle("is-landed", offset === 0);
    logoMarquee.classList.toggle("is-visible", offset === 0 && bounds.bottom > (topbar?.offsetHeight || 0));
  };

  const schedulePosition = () => {
    if (!pendingFrame) pendingFrame = requestAnimationFrame(positionLogos);
  };

  addEventListener("scroll", schedulePosition, { passive: true });
  addEventListener("resize", schedulePosition);
  new ResizeObserver(schedulePosition).observe(slot);
  positionLogos();
}
