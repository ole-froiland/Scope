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

test("den dekorative videoen viser aldri iOS sin start-knapp", () => {
  assert.match(html, /<video class="hero-video"[^>]*aria-hidden="true"/);
  assert.match(
    css,
    /\.hero-video::-webkit-media-controls-start-playback-button[\s\S]*?display: none !important/
  );
});
