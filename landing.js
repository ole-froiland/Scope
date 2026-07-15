/* ============================================================
   Scope · «Scope forteller»
   Regien for landingssideopplevelsen:
   - fortellerstemme som skriver seg ut
   - GSAP-scener (intro, hero, pinnede steg, demo, footer)
   - Three.js-partikkelfelt som morfer mellom former per seksjon
   Alt innhold finnes i HTML-en; uten motion-laget (redusert
   bevegelse / JS-feil) er siden fortsatt komplett og lesbar.
   ============================================================ */

import * as THREE from "three";

const motionOK = document.documentElement.classList.contains("motion");
const gsapOK = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

/* ---------- Alltid på: fungerer også uten animasjonslaget ---------- */

initBillingToggle();
initRail();
initScrollButtons();

if (motionOK && gsapOK) {
  gsap.registerPlugin(ScrollTrigger);
  prepareNarration();
  const field = createField(document.getElementById("field"));
  initIntroAndHero();
  initCursorDot();
  initMagneticButtons();
  initGenericNarration();
  initHowScene(field);
  initDemoScene();
  initFooterScene();
  initFieldSections(field);
} else {
  document.getElementById("intro")?.remove();
}

/* ============================================================
   Grunnfunksjoner
   ============================================================ */

function initBillingToggle() {
  const buttons = document.querySelectorAll("[data-billing]");
  const prices = document.querySelectorAll(".lx-price");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.toggle("is-active", b === btn));
      const key = btn.dataset.billing === "yearly" ? "yearly" : "monthly";
      prices.forEach((p) => {
        const value = p.dataset[key];
        if (value) p.innerHTML = `${value}<span>/mnd</span>`;
      });
    });
  });
}

function initRail() {
  const links = [...document.querySelectorAll("[data-rail]")];
  if (!links.length) return;
  const sections = links
    .map((link) => document.getElementById(link.dataset.rail))
    .filter(Boolean);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) =>
          link.classList.toggle("is-active", link.dataset.rail === entry.target.id)
        );
      });
    },
    { rootMargin: "-45% 0px -45% 0px" }
  );
  sections.forEach((section) => observer.observe(section));
}

function initScrollButtons() {
  document.querySelectorAll("[data-scroll-to]").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelector(btn.dataset.scrollTo)?.scrollIntoView({
        behavior: motionOK ? "smooth" : "auto",
      });
    });
  });
}

/* ============================================================
   Fortellerstemmen
   ============================================================ */

function prepareNarration() {
  document.querySelectorAll("[data-narrate]").forEach((el) => {
    el.dataset.fullText = el.textContent.trim();
    el.textContent = "";
  });
}

function typeText(el, speed = 20) {
  if (!el || el.dataset.typed) return;
  el.dataset.typed = "1";
  const full = el.dataset.fullText ?? "";
  el.classList.add("is-typing");
  let i = 0;
  const timer = window.setInterval(() => {
    i += 1;
    el.textContent = full.slice(0, i);
    if (i >= full.length) {
      window.clearInterval(timer);
      el.classList.remove("is-typing");
    }
  }, speed);
}

/* Stemmer som ikke styres av intro-tidslinjen eller steg-scenen */
function initGenericNarration() {
  document.querySelectorAll("[data-narrate]").forEach((el) => {
    if (el.closest(".lx-hero") || el.closest(".lx-step")) return;
    ScrollTrigger.create({
      trigger: el,
      start: "top 82%",
      once: true,
      onEnter: () => typeText(el),
    });
  });
}

/* ============================================================
   Intro + hero
   ============================================================ */

function initIntroAndHero() {
  const intro = document.getElementById("intro");
  intro.style.animation = "none"; // JS tar over for CSS-sikkerhetsnettet

  const lines = document.querySelectorAll(".lx-line > span");
  const after = [".lx-lead", ".lx-cta-row", ".lx-scroll-cue"];
  gsap.set(lines, { yPercent: 118 });
  gsap.set(after, { opacity: 0, y: 26 });
  gsap.set(".lx-header", { opacity: 0, y: -18 });

  const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
  tl.from(intro.querySelectorAll(".intro-dots .dot"), {
    y: -50,
    opacity: 0,
    scale: 0.3,
    stagger: 0.09,
    duration: 0.55,
    ease: "back.out(2.2)",
  })
    .from(intro.querySelector(".intro-name"), { opacity: 0, x: -14, duration: 0.4 }, "-=0.12")
    .to(intro, { yPercent: -100, duration: 0.8, ease: "power4.inOut", delay: 0.4 })
    .set(intro, { display: "none" })
    .add(() => typeText(document.querySelector(".lx-hero .lx-voice")), "-=0.45")
    .to(lines, { yPercent: 0, duration: 0.95, stagger: 0.13, ease: "power4.out" }, "-=0.15")
    .to(after, { opacity: 1, y: 0, duration: 0.7, stagger: 0.09 }, "-=0.45")
    .to(".lx-header", { opacity: 1, y: 0, duration: 0.5 }, "<");
}

/* ============================================================
   Mikrointeraksjoner
   ============================================================ */

function initCursorDot() {
  const dot = document.querySelector(".cursor-dot");
  if (!dot || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  const pos = { x: -100, y: -100 };
  const target = { x: -100, y: -100 };
  const look = { scale: 1, opacity: 1 };

  window.addEventListener("pointermove", (e) => {
    target.x = e.clientX;
    target.y = e.clientY;
  });

  gsap.ticker.add(() => {
    pos.x += (target.x - pos.x) * 0.22;
    pos.y += (target.y - pos.y) * 0.22;
    dot.style.transform = `translate(${pos.x - 4}px, ${pos.y - 4}px) scale(${look.scale})`;
    dot.style.opacity = look.opacity;
  });

  const grow = () => gsap.to(look, { scale: 3, opacity: 0.35, duration: 0.3 });
  const shrink = () => gsap.to(look, { scale: 1, opacity: 1, duration: 0.3 });

  document.querySelectorAll("a, button").forEach((el) => {
    el.addEventListener("pointerenter", grow);
    el.addEventListener("pointerleave", shrink);
  });
}

function initMagneticButtons() {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const rect = el.getBoundingClientRect();
      const dx = e.clientX - (rect.left + rect.width / 2);
      const dy = e.clientY - (rect.top + rect.height / 2);
      gsap.to(el, { x: dx * 0.28, y: dy * 0.32, duration: 0.4, ease: "power3.out" });
    });
    el.addEventListener("pointerleave", () => {
      gsap.to(el, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.45)" });
    });
  });
}

/* ============================================================
   «Slik virker Scope» — pinnet stegscene
   ============================================================ */

function initHowScene(field) {
  const section = document.querySelector(".lx-how");
  const steps = [...section.querySelectorAll(".lx-step")];
  const progress = [...section.querySelectorAll("[data-progress]")];
  let current = -1;

  const activate = (index) => {
    if (index === current) return;
    const prev = current >= 0 ? steps[current] : null;
    const next = steps[index];
    current = index;

    progress.forEach((li, i) => li.classList.toggle("is-active", i <= index));
    field?.setState(next.dataset.field);
    typeText(next.querySelector("[data-narrate]"));

    if (prev && prev !== next) {
      gsap.to(prev, {
        opacity: 0,
        y: -26,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => prev.classList.remove("is-active"),
      });
    }
    next.classList.add("is-active");
    gsap.fromTo(
      next,
      { opacity: 0, y: 34 },
      { opacity: 1, y: 0, duration: 0.55, ease: "power3.out", delay: prev ? 0.22 : 0 }
    );
  };

  const mm = gsap.matchMedia();

  mm.add("(min-width: 900px)", () => {
    section.classList.add("is-pinned");
    gsap.set(steps, { clearProps: "opacity,transform" });

    const trigger = ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: () => "+=" + steps.length * window.innerHeight * 0.85,
      pin: ".lx-how-pin",
      onUpdate: (self) => {
        const index = Math.min(steps.length - 1, Math.floor(self.progress * steps.length));
        if (index !== current) activate(index);
      },
      onEnter: () => activate(0),
    });

    return () => {
      section.classList.remove("is-pinned");
      trigger.kill();
    };
  });

  mm.add("(max-width: 899px)", () => {
    const triggers = steps.map((step, i) =>
      ScrollTrigger.create({
        trigger: step,
        start: "top 70%",
        once: true,
        onEnter: () => {
          field?.setState(step.dataset.field);
          typeText(step.querySelector("[data-narrate]"));
          progress.forEach((li, j) => li.classList.toggle("is-active", j <= i));
        },
      })
    );
    return () => triggers.forEach((t) => t.kill());
  });
}

/* ============================================================
   Demo-scenen
   ============================================================ */

function formatNumber(value) {
  return String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function initDemoScene() {
  const shot = document.querySelector(".lx-shot");
  if (!shot) return;

  gsap.from(".lx-cameo", {
    opacity: 0,
    y: 24,
    duration: 0.7,
    ease: "power3.out",
    scrollTrigger: { trigger: ".lx-cameo", start: "top 82%", once: true },
  });

  gsap.from(shot, {
    opacity: 0,
    y: 64,
    duration: 0.9,
    ease: "power3.out",
    scrollTrigger: { trigger: shot, start: "top 78%", once: true },
  });

  ScrollTrigger.create({
    trigger: shot,
    start: "top 70%",
    once: true,
    onEnter: () => {
      document.querySelectorAll("[data-count]").forEach((el) => {
        const end = Number(el.dataset.count);
        const state = { v: 0 };
        gsap.to(state, {
          v: end,
          duration: 1.6,
          ease: "power3.out",
          onUpdate: () => (el.textContent = formatNumber(state.v)),
        });
      });
      gsap.from(".lx-trend-bars i", {
        scaleY: 0,
        stagger: 0.05,
        duration: 0.8,
        ease: "power3.out",
        delay: 0.2,
      });
    },
  });
}

/* ============================================================
   Footer-scenen
   ============================================================ */

function initFooterScene() {
  gsap.from(".lx-founders figure", {
    opacity: 0,
    y: 44,
    stagger: 0.12,
    duration: 0.7,
    ease: "back.out(1.6)",
    scrollTrigger: { trigger: ".lx-founders", start: "top 85%", once: true },
  });
}

/* ============================================================
   Partikkelfeltet — seksjonskobling
   ============================================================ */

function initFieldSections(field) {
  if (!field) return;
  document.querySelectorAll("section[data-field], footer[data-field]").forEach((el) => {
    ScrollTrigger.create({
      trigger: el,
      start: "top 55%",
      end: "bottom 45%",
      onEnter: () => field.setState(el.dataset.field),
      onEnterBack: () => field.setState(el.dataset.field),
    });
  });
}

/* ============================================================
   Partikkelfeltet — Three.js
   ============================================================ */

function createField(canvas) {
  if (!canvas) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
  } catch {
    canvas.remove();
    return null;
  }

  const COUNT = window.matchMedia("(max-width: 768px)").matches ? 1600 : 4200;
  const CAMERA_Z = 95;

  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 1, 400);
  camera.position.z = CAMERA_Z;

  /* Synlig utsnitt i world-koordinater ved z = 0 */
  const view = { w: 100, h: 65 };
  const updateView = () => {
    const height = 2 * CAMERA_Z * Math.tan((camera.fov * Math.PI) / 360);
    view.h = height;
    view.w = height * camera.aspect;
  };

  /* Faste egenskaper per punkt */
  const seeds = new Float32Array(COUNT);
  const eases = new Float32Array(COUNT);
  const accent = new Uint8Array(COUNT); // 0 = nøytral, 1 = blå, 2 = rød, 3 = grønn
  for (let i = 0; i < COUNT; i += 1) {
    seeds[i] = Math.random() * Math.PI * 2;
    eases[i] = 0.028 + Math.random() * 0.05;
    const r = Math.random();
    accent[i] = r < 0.92 ? 0 : r < 0.947 ? 1 : r < 0.973 ? 2 : 3;
  }

  const BRAND = {
    blue: new THREE.Color("#064dff"),
    red: new THREE.Color("#ff3c38"),
    green: new THREE.Color("#00bd7b"),
    ink: new THREE.Color("#5a5e66"),
  };
  const accentColor = (i) =>
    accent[i] === 1 ? BRAND.blue : accent[i] === 2 ? BRAND.red : accent[i] === 3 ? BRAND.green : BRAND.ink;

  const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

  /* ---------- Tilstander (posisjons- og fargemål) ---------- */

  const STATE_STYLE = {
    chaos: { opacity: 0.6, wobble: 1.1 },
    stream: { opacity: 0.9, wobble: 0.8 },
    chart: { opacity: 0.9, wobble: 0.4 },
    grid: { opacity: 0.85, wobble: 0.12 },
    triad: { opacity: 0.95, wobble: 0.45 },
    margins: { opacity: 0.3, wobble: 0.9 },
  };

  function buildState(name) {
    const pos = new Float32Array(COUNT * 3);
    const col = new Float32Array(COUNT * 3);
    const { w, h } = view;

    for (let i = 0; i < COUNT; i += 1) {
      const o = i * 3;
      let x = 0;
      let y = 0;
      let z = 0;
      let color = accentColor(i);

      if (name === "stream") {
        const t = Math.random();
        x = (t - 0.5) * w * 1.05;
        y = (0.5 - t) * h * 0.6 + Math.sin(t * 9 + seeds[i]) * 2.4 + gauss() * 1.8;
        z = (Math.random() - 0.5) * 16;
      } else if (name === "chart") {
        const t = Math.random();
        x = (t - 0.5) * w * 0.82;
        const base = -h * 0.18 + t * h * 0.36 + Math.sin(t * 6.5) * h * 0.05 + Math.sin(t * 13 + 1.4) * h * 0.018;
        y = base + gauss() * 1.15;
        z = (Math.random() - 0.5) * 8;
        if (t > 0.93 && accent[i] === 0) color = BRAND.blue;
      } else if (name === "grid") {
        const cols = Math.max(8, Math.round(Math.sqrt((COUNT * (w * 0.8)) / (h * 0.55))));
        const rows = Math.ceil(COUNT / cols);
        const cx = i % cols;
        const cy = Math.floor(i / cols);
        x = ((cx / (cols - 1)) - 0.5) * w * 0.8 + gauss() * 0.12;
        y = ((cy / Math.max(1, rows - 1)) - 0.5) * h * 0.55 + gauss() * 0.12;
        z = 0;
        if (accent[i] === 2) {
          /* De røde avvikene stikker ut av rutenettet */
          x += gauss() * 3.2;
          y += gauss() * 3.2;
          z = 6;
        } else if (accent[i] !== 0) {
          color = BRAND.ink;
        }
      } else if (name === "triad") {
        /* Tre tette klynger som svever som logoen, over midten av skjermen */
        const cluster = i % 3;
        const centerX = (cluster - 1) * w * 0.085;
        const radius = Math.abs(gauss()) * h * 0.055;
        const angle = Math.random() * Math.PI * 2;
        const tilt = Math.random() * Math.PI;
        x = centerX + radius * Math.cos(angle) * Math.sin(tilt);
        y = h * 0.31 + radius * Math.sin(angle) * Math.sin(tilt) * 0.9;
        z = radius * Math.cos(tilt) * 0.6;
        color = cluster === 0 ? BRAND.blue : cluster === 1 ? BRAND.red : BRAND.green;
      } else if (name === "margins") {
        const side = Math.random() < 0.5 ? -1 : 1;
        x = side * (w * 0.38 + Math.random() * w * 0.14);
        y = (Math.random() - 0.5) * h * 0.98;
        z = (Math.random() - 0.5) * 30;
      } else {
        /* chaos */
        x = (Math.random() - 0.5) * w * 0.96;
        y = (Math.random() - 0.5) * h * 0.96;
        z = (Math.random() - 0.5) * 38;
      }

      pos[o] = x;
      pos[o + 1] = y;
      pos[o + 2] = z;
      col[o] = color.r;
      col[o + 1] = color.g;
      col[o + 2] = color.b;
    }
    return { pos, col };
  }

  /* ---------- Geometri og materiale ---------- */

  const geometry = new THREE.BufferGeometry();
  const displayPos = new Float32Array(COUNT * 3);
  const basePos = new Float32Array(COUNT * 3);
  const currentCol = new Float32Array(COUNT * 3);
  geometry.setAttribute("position", new THREE.BufferAttribute(displayPos, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(currentCol, 3));

  const sprite = (() => {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d");
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 30);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.7, "rgba(255,255,255,1)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(32, 32, 30, 0, Math.PI * 2);
    ctx.fill();
    return new THREE.CanvasTexture(c);
  })();

  const material = new THREE.PointsMaterial({
    size: 0.55,
    map: sprite,
    transparent: true,
    alphaTest: 0.12,
    vertexColors: true,
    depthWrite: false,
    opacity: STATE_STYLE.chaos.opacity,
  });

  scene.add(new THREE.Points(geometry, material));

  /* ---------- Tilstandsbytte ---------- */

  let stateName = "";
  let targetPos = basePos;
  let targetCol = currentCol;
  let wobbleAmp = STATE_STYLE.chaos.wobble;

  function setState(name) {
    if (!name || name === stateName || !STATE_STYLE[name]) return;
    stateName = name;
    const built = buildState(name);
    targetPos = built.pos;
    targetCol = built.col;
    wobbleAmp = STATE_STYLE[name].wobble;
    gsap.to(material, { opacity: STATE_STYLE[name].opacity, duration: 1.1, ease: "power2.out" });
  }

  /* Startpunkt: kaos, spredt fra sentrum */
  {
    const first = buildState("chaos");
    stateName = "chaos";
    targetPos = first.pos;
    targetCol = first.col;
    basePos.set(first.pos);
    displayPos.set(first.pos);
    currentCol.set(first.col);
  }

  /* ---------- Peker og kamera ---------- */

  const mouse = { x: 0, y: 0, worldX: 9999, worldY: 9999 };
  window.addEventListener("pointermove", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    mouse.worldX = mouse.x * (view.w / 2);
    mouse.worldY = -mouse.y * (view.h / 2);
  });

  /* ---------- Størrelse ---------- */

  function resize() {
    const { innerWidth: w, innerHeight: h } = window;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    updateView();
    /* Bygg målet på nytt slik at formen passer nytt utsnitt */
    const rebuilt = buildState(stateName || "chaos");
    targetPos = rebuilt.pos;
    targetCol = rebuilt.col;
  }
  resize();
  window.addEventListener("resize", resize);

  /* ---------- Render-løkke ---------- */

  const clock = new THREE.Clock();
  let rafId = 0;

  function tick() {
    rafId = window.requestAnimationFrame(tick);
    const dt = Math.min(clock.getDelta(), 0.05);
    const k = dt * 60;
    const t = clock.elapsedTime;
    const repelRadius = 7;
    const repelR2 = repelRadius * repelRadius;

    for (let i = 0; i < COUNT; i += 1) {
      const o = i * 3;
      const ease = Math.min(1, eases[i] * k);

      basePos[o] += (targetPos[o] - basePos[o]) * ease;
      basePos[o + 1] += (targetPos[o + 1] - basePos[o + 1]) * ease;
      basePos[o + 2] += (targetPos[o + 2] - basePos[o + 2]) * ease;

      const seed = seeds[i];
      let x = basePos[o] + Math.sin(t * 0.6 + seed) * wobbleAmp;
      let y = basePos[o + 1] + Math.cos(t * 0.5 + seed * 1.7) * wobbleAmp;
      const z = basePos[o + 2] + Math.sin(t * 0.4 + seed * 2.3) * wobbleAmp;

      const dx = x - mouse.worldX;
      const dy = y - mouse.worldY;
      if (Math.abs(dx) < repelRadius && Math.abs(dy) < repelRadius) {
        const d2 = dx * dx + dy * dy;
        if (d2 < repelR2 && d2 > 0.0001) {
          const push = (1 - Math.sqrt(d2) / repelRadius) * 2.6;
          const inv = 1 / Math.sqrt(d2);
          x += dx * inv * push;
          y += dy * inv * push;
        }
      }

      displayPos[o] = x;
      displayPos[o + 1] = y;
      displayPos[o + 2] = z;

      const colEase = Math.min(1, 0.045 * k);
      currentCol[o] += (targetCol[o] - currentCol[o]) * colEase;
      currentCol[o + 1] += (targetCol[o + 1] - currentCol[o + 1]) * colEase;
      currentCol[o + 2] += (targetCol[o + 2] - currentCol[o + 2]) * colEase;
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;

    camera.position.x += (mouse.x * 3.4 - camera.position.x) * 0.04;
    camera.position.y += (-mouse.y * 2.2 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  tick();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.cancelAnimationFrame(rafId);
    } else {
      clock.getDelta();
      tick();
    }
  });

  return { setState };
}
