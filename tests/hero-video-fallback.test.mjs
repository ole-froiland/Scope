import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import test from "node:test";

const [javascript, css, html, showcaseCss] = await Promise.all([
  readFile(new URL("../script.js", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8"),
  readFile(new URL("../landing-enkel.html", import.meta.url), "utf8"),
  readFile(new URL("../enkel-showcase.css", import.meta.url), "utf8"),
]);

const heroSetup = javascript.match(/if \(heroSection && heroVideo\) \{([\s\S]*?)\n\}/)?.[1] || "";
const heroBefore = css.match(/\.hero-section::before \{([\s\S]*?)\n\}/)?.[1] || "";

test("heroen bytter til video først når den faktisk spiller", () => {
  // «canplay» fyrer også når nettleseren nekter å autospille — strømsparings-
  // modus, Lite datamodus eller Auto-Play satt til Aldri på iOS. Brukes den
  // som signal, skjules reserveflaten bak en video som står på første frame.
  assert.match(heroSetup, /addEventListener\("playing", showHeroVideo/);
  assert.doesNotMatch(heroSetup, /addEventListener\("canplay"/);
  assert.match(heroSetup, /if \(!heroVideo\.paused && heroVideo\.readyState >= 3\)/);
});

test("avvist autospill lar reserveflaten stå", () => {
  assert.match(heroSetup, /heroVideo\.play\(\)/);
  assert.match(heroSetup, /heroPlayAttempt\.catch\(/);

  // Reserveflaten skjules bare når .has-video er satt, og .has-video settes
  // bare fra «playing».
  assert.match(css, /\.hero-section\.has-video::before\s*\{[^}]*visibility: hidden/);
});

test("reserveflaten er en animert WebP, ikke et stillbilde med panorering", async () => {
  // Animerte bilder er ikke medieelementer og rammes ikke av autospill-
  // sperrene i iOS. De beveger seg også i strømsparingsmodus, der <video>
  // nekter å starte. En CSS-panorering på et stillbilde gjorde ikke det —
  // og ville uansett konkurrert med bevegelsen i bildet.
  assert.match(heroBefore, /background-image: url\("assets\/hero-restaurant\.webp"\)/);
  assert.doesNotMatch(heroBefore, /animation:/);
  assert.doesNotMatch(css, /@keyframes hero-live/);

  const webp = await readFile(new URL("../assets/hero-restaurant.webp", import.meta.url));
  assert.equal(webp.subarray(0, 4).toString("latin1"), "RIFF");
  assert.equal(webp.subarray(8, 12).toString("latin1"), "WEBP");
  // ANIM-blokken finnes bare i animerte WebP-filer.
  assert.ok(webp.includes(Buffer.from("ANIM", "latin1")), "WebP-en er ikke animert");

  // Den erstatter en PNG på 2,3 MB og skal ikke gjøre siden tyngre.
  const [{ size: webpSize }, { size: pngSize }] = await Promise.all([
    stat(new URL("../assets/hero-restaurant.webp", import.meta.url)),
    stat(new URL("../assets/hero-restaurant.png", import.meta.url)),
  ]);
  assert.ok(webpSize < pngSize, `WebP ${webpSize} B er ikke mindre enn PNG ${pngSize} B`);
});

test("Enkel bruker ren hero-video og ren reserveflate", async () => {
  assert.match(showcaseCss, /\.hero-section::before\s*\{[^}]*background-image:\s*url\("assets\/hero-restaurant\.png"\)/s);
  assert.match(html, /<source src="assets\/hero-restaurant-clean\.mp4" type="video\/mp4">/);

  const [{ size: videoSize }, { size: sourceSize }] = await Promise.all([
    stat(new URL("../assets/hero-restaurant-clean.mp4", import.meta.url)),
    stat(new URL("../assets/hero-restaurant.mp4", import.meta.url)),
  ]);
  assert.ok(videoSize > 0 && videoSize <= sourceSize, "Den rene videoen mangler eller er unødvendig stor");
});

test("redusert bevegelse bytter tilbake til stillbildet", () => {
  // Et animert bilde kan ikke pauses med CSS, så det må byttes ut.
  const reduced = css.match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}\n\n\/\*/g)?.join("") || css;
  assert.match(
    reduced,
    /\.hero-section::before \{\s*background-image: url\("assets\/hero-restaurant\.png"\);\s*\}/
  );
});

test("den dekorative videoen viser aldri iOS sin start-knapp", () => {
  assert.match(html, /<video class="hero-video"[^>]*aria-hidden="true"/);
  assert.match(
    css,
    /\.hero-video::-webkit-media-controls-start-playback-button[\s\S]*?display: none !important/
  );
});
