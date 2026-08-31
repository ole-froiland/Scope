// Enkel 2.0 — Scope-øyenstikkeren.
//
// Hun følger ingen bane. Posisjonen kommer av fart og akselerasjon som
// integreres hver frame, og hun styrer mot et mål som koreografien flytter på.
// Det er hele poenget: en spline gir en kurve som er jevn per definisjon, uten
// treghet, og med retningen låst til tangenten. Her faller retningen ut av den
// faktiske farten, krengningen av sideveis akselerasjon, og oversving med
// påfølgende korreksjon oppstår av seg selv fordi hun har masse.
//
// Målpunktene under bestemmer bare omtrent hvor hun skal. Alt som får det til
// å se ut som flyging — rykk, bremsing, små feilrettelser, vingeslag i utakt —
// kommer fra simuleringen.

const svg = document.querySelector(".flight");
const dragonfly = document.querySelector(".dragonfly");
const art = document.querySelector(".dragonfly-art");
const body = document.querySelector(".dragonfly-body");
const wingNodes = [...document.querySelectorAll(".wing")];
const wispSegs = [...document.querySelectorAll(".wisp-seg")];
const logo = document.querySelector(".logo");
const telescope = document.querySelector(".logo-telescope");
const word = document.querySelector(".logo-word");

// --- Koreografi ------------------------------------------------------------
// Hvert punkt gjelder fra sitt tidspunkt. «to» er normaliserte scenekoordinater.
// dart = rykk, cruise = rolig forflytning, hover = stå og korrigere.
const PLAN = [
  { t: 0, mode: "dart", to: [0.34, 0.28] },
  { t: 1.55, mode: "hover", to: [0.36, 0.27] },
  { t: 2.5, mode: "dart", to: [0.73, 0.15] },
  { t: 3.5, mode: "cruise", to: [0.88, 0.4] },
  { t: 4.45, mode: "hover", to: [0.86, 0.42] },
  { t: 5.5, mode: "dart", to: [0.5, 0.66] },
  { t: 6.4, mode: "dart", to: [0.19, 0.5] },
  { t: 7.25, mode: "hover", to: [0.21, 0.49] },
  { t: 8.4, mode: "dart", to: [0.42, 0.3] },
  { t: 9.3, mode: "orbit" },
  { t: 14.1, mode: "settle" },
];

// topSpeed og reach er andeler av korteste skjermside per sekund. turn er hvor
// bestemt hun vrir seg mot fartsretningen — lav under svev, for da skal hun
// holde retningen og bare se seg om, ikke snurre etter sin egen skjelving.
const MODES = {
  dart: { topSpeed: 1.15, reach: 3.2, push: 9, drag: 1.5, wander: 0.1, turn: 13 },
  cruise: { topSpeed: 0.55, reach: 2.0, push: 6, drag: 1.8, wander: 0.14, turn: 9 },
  hover: { topSpeed: 0.1, reach: 2.6, push: 7, drag: 3.4, wander: 0.3, turn: 1.6 },
  orbit: { topSpeed: 0.62, reach: 2.4, push: 7, drag: 1.9, wander: 0.1, turn: 9 },
  settle: { topSpeed: 0.11, reach: 2.6, push: 7, drag: 3.4, wander: 0.26, turn: 1.3 },
};

const ORBIT_LEAD = 1.15; // hvor langt foran på sirkelen målet ligger
const ORBIT_RATE = 1.05; // rad/s

const TELESCOPE_IN = [10.2, 13.1];
const WORD_IN = [13.4, 14.8];
const WISP_SECONDS = 0.32;
const VIEW_WIDTH = 1000;
const ART_REACH = 262;
const LOGO_W = 1774;
const LOGO_H = 887;
const TELESCOPE_MID = [316, 443];

const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
const mix = (a, b, k) => a + (b - a) * k;

function smoothstep(from, to, v) {
  const k = clamp((v - from) / (to - from), 0, 1);
  return k * k * (3 - 2 * k);
}

function backOut(k) {
  const c = 1.7;
  return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2);
}

// Myk pseudotilfeldighet. Summen av tre usammenlignbare sinuser vandrer
// uforutsigbart nok til å lese som levende, uten sprang.
function drift(t, seed) {
  return (
    Math.sin(t * 0.73 + seed * 1.7) * 0.5 +
    Math.sin(t * 1.91 + seed * 4.3) * 0.32 +
    Math.sin(t * 4.17 + seed * 8.9) * 0.18
  );
}

const wings = wingNodes.map((node, i) => ({
  parts: [
    { el: node.querySelector(".wing-main"), lag: 0 },
    { el: node.querySelector(".wing-echo-1"), lag: 0.85 },
    { el: node.querySelector(".wing-echo-2"), lag: 1.7 },
  ],
  base: Number(node.dataset.base),
  len: Number(node.dataset.len),
  span: Number(node.dataset.span),
  side: Number(node.dataset.side),
  pair: Number(node.dataset.pair),
  // Ingen to vinger er helt i takt.
  jitter: (i - 1.5) * 0.09,
}));

const scene = { ready: false, short: 600, scale: 1, center: [500, 320], place: null };

// --- Flygetilstand ---------------------------------------------------------
const fly = {
  pos: [0, 0],
  vel: [0, 0],
  heading: 0,
  bank: 0,
  pitch: 0,
  tail: 0,
  wingPhase: 0,
  lift: 0, // «høyde» — leses som liten skalaendring
  orbitAngle: null,
  history: [],
  seeded: false,
};

function layout() {
  const rect = svg.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return;

  const ratio = clamp(rect.width / rect.height, 0.25, 4);
  const viewHeight = Math.round(VIEW_WIDTH / ratio);
  const short = Math.min(VIEW_WIDTH, viewHeight);
  svg.setAttribute("viewBox", `0 0 ${VIEW_WIDTH} ${viewHeight}`);

  const margin = short * 0.17;
  const spanX = VIEW_WIDTH - margin * 2;
  const spanY = viewHeight - margin * 2;
  const place = ([u, v]) => [margin + u * spanX, margin + v * spanY];

  const previous = scene.short;
  scene.short = short;
  scene.place = place;
  scene.scale = (short * 0.115) / ART_REACH;
  scene.center = [VIEW_WIDTH / 2, viewHeight * 0.5];
  scene.orbit = short * 0.29;
  scene.viewHeight = viewHeight;

  const logoWidth = short * 0.46;
  const logoScale = logoWidth / LOGO_W;
  logo.setAttribute(
    "transform",
    `translate(${scene.center[0] - logoWidth / 2} ${scene.center[1] - (LOGO_H * logoScale) / 2}) scale(${logoScale})`,
  );

  const stroke = short * 0.009;
  wispSegs.forEach((seg, i) => {
    seg.setAttribute("stroke-width", (stroke * (1 - i / wispSegs.length)).toFixed(2));
    seg.setAttribute("stroke-opacity", (0.3 * (1 - i / wispSegs.length)).toFixed(3));
  });

  if (!fly.seeded) {
    // Starter utenfor lerretet oppe til venstre, allerede i fart.
    fly.pos = place([-0.22, -0.16]);
    fly.vel = [short * 0.55, short * 0.42];
    fly.heading = Math.atan2(fly.vel[1], fly.vel[0]);
    fly.seeded = true;
  } else if (previous && previous !== short) {
    const k = short / previous;
    fly.pos = [fly.pos[0] * k, fly.pos[1] * k];
    fly.vel = [fly.vel[0] * k, fly.vel[1] * k];
    fly.history.length = 0;
  }

  scene.ready = true;
  if (still) {
    fly.pos = [scene.center[0] - short * 0.12, scene.center[1] + short * 0.19];
    fly.vel = [0, 0];
    fly.heading = 0;
    render(WORD_IN[1] + 2);
  }
}

// Hva hun vil akkurat nå: et målpunkt og en modus.
function intent(t) {
  let step = PLAN[0];
  for (const entry of PLAN) {
    if (t >= entry.t) step = entry;
    else break;
  }

  if (step.mode === "orbit") {
    if (fly.orbitAngle === null) {
      fly.orbitAngle = Math.atan2(fly.pos[1] - scene.center[1], fly.pos[0] - scene.center[0]);
    }
    const angle = fly.orbitAngle + (t - step.t) * ORBIT_RATE + ORBIT_LEAD;
    return {
      mode: "orbit",
      target: [
        scene.center[0] + Math.cos(angle) * scene.orbit,
        scene.center[1] + Math.sin(angle) * scene.orbit,
      ],
    };
  }

  if (step.mode === "settle") {
    return {
      mode: "settle",
      target: [scene.center[0] - scene.short * 0.12, scene.center[1] + scene.short * 0.19],
    };
  }

  return { mode: step.mode, target: scene.place(step.to) };
}

// Ett fysikksteg. Kjøres i små faste biter så oppførselen ikke henger på
// bildefrekvensen.
function step(t, dt) {
  const { mode, target } = intent(t);
  const cfg = MODES[mode];
  const short = scene.short;

  const toX = target[0] - fly.pos[0];
  const toY = target[1] - fly.pos[1];
  const range = Math.hypot(toX, toY) || 1e-6;

  // Bremser ned mot målet, men sent nok til at tregheten bærer henne forbi.
  const want = Math.min(cfg.topSpeed * short, range * cfg.reach);
  const wantX = (toX / range) * want;
  const wantY = (toY / range) * want;

  let accX = (wantX - fly.vel[0]) * cfg.push;
  let accY = (wantY - fly.vel[1]) * cfg.push;

  // Småfeil hun hele tiden retter opp. Dette er det som skiller et levende
  // dyr fra en interpolert verdi.
  const w = cfg.wander * short;
  accX += drift(t, 1.3) * w;
  accY += drift(t, 5.1) * w;

  fly.vel[0] += accX * dt;
  fly.vel[1] += accY * dt;
  fly.vel[0] -= fly.vel[0] * cfg.drag * dt;
  fly.vel[1] -= fly.vel[1] * cfg.drag * dt;

  fly.pos[0] += fly.vel[0] * dt;
  fly.pos[1] += fly.vel[1] * dt;

  const speed = Math.hypot(fly.vel[0], fly.vel[1]);

  // Retningen følger farten, med treghet — men myndigheten til å vri seg
  // vokser med farten. Nesten stillestående har hun ingen: da holder hun
  // retningen og ser seg bare langsomt om. Uten den demningen ville hun snurre
  // etter retningen på sin egen sveveskjelving, og det leser som tilfeldig
  // rotasjon framfor flyging.
  const wantHeading = Math.atan2(fly.vel[1], fly.vel[0]);
  let turn = wantHeading - fly.heading;
  while (turn > Math.PI) turn -= Math.PI * 2;
  while (turn < -Math.PI) turn += Math.PI * 2;
  const authority = cfg.turn * clamp(speed / (short * 0.3), 0, 1);
  fly.heading += turn * Math.min(1, dt * authority);
  // Litt liv i retningen uansett, så hun aldri står helt spikret.
  fly.heading += drift(t, 9.4) * 0.32 * dt;

  const cos = Math.cos(fly.heading);
  const sin = Math.sin(fly.heading);
  // Akselerasjonen deles i «framover» og «sideveis» i hennes eget system.
  const forward = (accX * cos + accY * sin) / short;
  const lateral = (-accX * sin + accY * cos) / short;

  // Krenger inn i svingen, stuper litt når hun tar sats, retter seg opp når
  // hun bremser.
  fly.bank += (clamp(lateral * 0.11, -0.7, 0.7) - fly.bank) * Math.min(1, dt * 6);
  fly.pitch += (clamp(forward * 0.09, -0.5, 0.5) - fly.pitch) * Math.min(1, dt * 5);
  // Bakkroppen henger etter og svinger ut motsatt vei.
  fly.tail += (clamp(-lateral * 5.5, -40, 40) - fly.tail) * Math.min(1, dt * 7);
  // Liten høydevariasjon, så flukten ikke er helt flat.
  fly.lift += (drift(t, 2.7) * 0.5 - fly.lift) * Math.min(1, dt * 2.2);

  // Vingene: raskere når hun står og svever, litt saktere i full fart.
  const effort = clamp(Math.hypot(accX, accY) / (short * 6), 0, 1);
  const hz = mix(23, 19, clamp(speed / (short * 0.9), 0, 1)) + effort * 3;
  fly.wingPhase += dt * hz * Math.PI * 2;
  fly.effort = effort;
  fly.speed = speed;
}

function render(t) {
  const short = scene.short;

  // Vingene. Forpar og bakpar går i motfase når hun svever — slik ekte
  // øyenstikkere sparer kraft — og nærmer seg samme fase når hun tar sats.
  const pairOffset = mix(Math.PI, 0.4, fly.effort);
  const amplitude = 15 + fly.effort * 7;
  for (const wing of wings) {
    const base = fly.wingPhase + (wing.pair ? pairOffset : 0) + wing.jitter;
    // Krengning gjør at den ene siden vender bort fra oss og korter inn.
    const roll = clamp(1 - fly.bank * wing.side * 0.62, 0.18, 1.7);
    for (const part of wing.parts) {
      const phase = base - part.lag;
      const project = 0.3 + 0.7 * Math.abs(Math.cos(phase));
      const angle = wing.base + Math.sin(phase) * amplitude;
      const span = wing.span * project * roll;
      part.el.setAttribute(
        "transform",
        `translate(-25 0) rotate(${angle.toFixed(2)}) scale(${wing.len} ${span.toFixed(4)})`,
      );
    }
  }

  body.setAttribute("d", `M 0 0 Q -118 ${(18 + fly.tail * 0.45).toFixed(1)} -235 ${(8 + fly.tail).toFixed(1)}`);

  // Krengningen gir også et lite sideglipp, så kroppsaksen ikke ligger
  // spikret på fartsretningen.
  const facing = ((fly.heading + fly.bank * 0.18) * 180) / Math.PI;
  dragonfly.setAttribute(
    "transform",
    `translate(${fly.pos[0].toFixed(2)} ${fly.pos[1].toFixed(2)}) rotate(${facing.toFixed(2)})`,
  );

  // Stup korter inn kroppen; høyde leses som størrelse.
  const height = 1 + fly.lift * 0.05;
  const foreshorten = 1 - Math.abs(fly.pitch) * 0.16;
  art.setAttribute(
    "transform",
    `scale(${(scene.scale * foreshorten * height).toFixed(4)} ${(scene.scale * height).toFixed(4)})`,
  );

  // Slepestreken bygges av faktiske posisjoner og falmer på et tredels sekund.
  fly.history.push([fly.pos[0], fly.pos[1], t]);
  while (fly.history.length && t - fly.history[0][2] > WISP_SECONDS) fly.history.shift();
  const pts = fly.history;
  const per = Math.max(1, Math.floor(pts.length / wispSegs.length));
  wispSegs.forEach((seg, i) => {
    const from = i * per;
    const to = Math.min(pts.length - 1, from + per);
    if (to - from < 1) {
      seg.removeAttribute("d");
      return;
    }
    let d = `M ${pts[from][0].toFixed(1)} ${pts[from][1].toFixed(1)}`;
    for (let k = from + 1; k <= to; k += 1) d += ` L ${pts[k][0].toFixed(1)} ${pts[k][1].toFixed(1)}`;
    seg.setAttribute("d", d);
  });

  const telescopeIn = smoothstep(TELESCOPE_IN[0], TELESCOPE_IN[1], t);
  const wordIn = smoothstep(WORD_IN[0], WORD_IN[1], t);
  logo.style.opacity = String(Math.max(telescopeIn, wordIn));
  const pop = 0.9 + 0.1 * telescopeIn;
  telescope.setAttribute(
    "transform",
    `translate(${TELESCOPE_MID[0]} ${TELESCOPE_MID[1]}) scale(${pop.toFixed(4)}) translate(${-TELESCOPE_MID[0]} ${-TELESCOPE_MID[1]})`,
  );
  telescope.style.opacity = String(telescopeIn);
  word.setAttribute("transform", `translate(${(-150 * (1 - backOut(wordIn))).toFixed(1)} 0)`);
  word.style.opacity = String(wordIn);
}

let previous = 0;
let carry = 0;
let simTime = 0;
const STEP = 1 / 240;

function frame(now) {
  requestAnimationFrame(frame);
  if (!scene.ready) return;
  if (!previous) previous = now;

  // Faner i bakgrunnen leverer ett gigantisk sprang. Vi kapper det, og lar
  // klokka følge de stegene vi faktisk regner ut framfor veggklokka — ellers
  // ville koreografien hoppe videre mens kroppen ble stående igjen. Slik blir
  // en skjult fane bare en pause.
  carry += Math.min((now - previous) / 1000, 0.25);
  previous = now;

  let guard = 0;
  while (carry >= STEP && guard < 400) {
    step(simTime, STEP);
    simTime += STEP;
    carry -= STEP;
    guard += 1;
  }
  render(simTime);
}

if (svg && dragonfly && art && body && logo && wings.length === 4) {
  layout();
  new ResizeObserver(layout).observe(svg);
  if (!still) requestAnimationFrame(frame);
}
