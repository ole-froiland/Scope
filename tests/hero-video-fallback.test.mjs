import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [javascript, css, html] = await Promise.all([
  readFile(new URL("../script.js", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8"),
  readFile(new URL("../landing-enkel.html", import.meta.url), "utf8"),
]);

const heroSetup = javascript.match(/if \(heroSection && heroVideo\) \{([\s\S]*?)\n\}/)?.[1] || "";

test("heroen bytter til video først når den faktisk spiller", () => {
  // «canplay» fyrer også når nettleseren nekter å autospille — strømsparings-
  // modus, Lite datamodus eller Auto-Play satt til Aldri på iOS. Brukes den
  // som signal, skjules stillbildet bak en video som står på første frame.
  assert.match(heroSetup, /addEventListener\("playing", showHeroVideo/);
  assert.doesNotMatch(heroSetup, /addEventListener\("canplay"/);

  // Snarveien må også sjekke at videoen ikke står stille.
  assert.match(heroSetup, /if \(!heroVideo\.paused && heroVideo\.readyState >= 3\)/);
});

test("avvist autospill lar det animerte stillbildet stå", () => {
  assert.match(heroSetup, /heroVideo\.play\(\)/);
  assert.match(heroSetup, /heroPlayAttempt\.catch\(/);

  // Stillbildet skjules bare når .has-video er satt, og .has-video settes nå
  // bare fra «playing».
  assert.match(css, /\.hero-section\.has-video::before\s*\{[^}]*visibility: hidden/);
  assert.match(css, /\.hero-section::before\s*\{[\s\S]*?animation: hero-live/);
});

test("stillbildet beveger seg nok til å leses som bevegelse", () => {
  // Målt i headless Chromium på 390 px bredde: 26s med 1.05 → 1.14 ga
  // 2,4 px/s og oppfattes som stillestående på en telefon. 18s med
  // 1.06 → 1.22 gir 9,8 px/s.
  assert.match(css, /animation: hero-live 18s ease-in-out infinite alternate/);

  const keyframes = css.match(/@keyframes hero-live \{([\s\S]*?)\n\}/)?.[1] || "";
  const scales = [...keyframes.matchAll(/scale\(([\d.]+)\)/g)].map((m) => Number(m[1]));

  assert.equal(scales.length, 3);
  assert.ok(
    Math.max(...scales) - Math.min(...scales) >= 0.14,
    `skalaspennet er ${(Math.max(...scales) - Math.min(...scales)).toFixed(2)}, for lite til å synes`
  );
});

test("den dekorative videoen viser aldri iOS sin start-knapp", () => {
  assert.match(html, /<video class="hero-video"[^>]*aria-hidden="true"/);
  assert.match(
    css,
    /\.hero-video::-webkit-media-controls-start-playback-button[\s\S]*?display: none !important/
  );
});
