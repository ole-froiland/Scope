import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (name) => readFile(new URL(name, root), "utf8");

const variants = [
  { route: "drift", file: "landing-drift.html", number: "13", name: "Drift", theme: "drift" },
  { route: "signal", file: "landing-signal.html", number: "14", name: "Signal", theme: "signal" },
  { route: "vertskap", file: "landing-vertskap.html", number: "15", name: "Vertskap", theme: "vertskap" },
];

test("de tre profesjonelle retningene har korte URL-er lokalt og på Netlify", async () => {
  const [server, redirects] = await Promise.all([read("server.mjs"), read("_redirects")]);

  for (const { route, file } of variants) {
    assert.match(server, new RegExp(`"/${route}": "/${file.replaceAll(".", "\\.")}"`), route);
    assert.match(server, new RegExp(`"/${route}/"`), route);
    assert.match(redirects, new RegExp(`^/${route}\\s+/${file.replaceAll(".", "\\.")}\\s+200!$`, "m"), route);
    assert.match(redirects, new RegExp(`^/${route}/\\s+/${file.replaceAll(".", "\\.")}\\s+200!$`, "m"), route);
  }
});

test("velgersidene viser femten retninger og de tre nye til slutt", async () => {
  const pages = await Promise.all([read("landing-velger.html"), read("index.html")]);

  for (const html of pages) {
    assert.match(html, /Femten designretninger/);
    for (const { route, number, name } of variants) {
      assert.match(html, new RegExp(`href="/${route}"`), route);
      assert.match(html, new RegExp(`<span class="option-number">${number}</span>`), route);
      assert.match(html, new RegExp(`<strong>${name}</strong>`), route);
    }
  }

  assert.equal(pages[0], pages[1]);
});

test("alle tre følger den avtalte salgsstrukturen og søker testkunder", async () => {
  for (const { file, theme } of variants) {
    const html = await read(file);
    assert.match(html, new RegExp(`<body data-theme="${theme}">`), file);
    assert.match(html, /<section class="hero/);
    assert.match(html, /id="hvorfor"/);
    assert.match(html, /id="slik"/);
    assert.match(html, /id="eksempel"/);
    assert.match(html, /id="testkunder"/);
    assert.match(html, /Vi søker testkunder/i);
    assert.match(html, /ingen bindingstid/i);
    assert.match(html, /mailto:post@scopeanalytics\.no/);
    assert.match(html, /tel:\+4793637295/);
  }
});

test("bildene brukes der de bærer historien, og alle har alternativ tekst", async () => {
  const [drift, signal, vertskap] = await Promise.all(variants.map(({ file }) => read(file)));
  assert.match(drift, /<img class="hero-photo"[^>]+alt="[^"]+"/);
  assert.match(vertskap, /<img class="hero-photo"[^>]+alt="[^"]+"/);
  assert.match(signal, /class="hero-visual signal-board"[^>]+aria-label="[^"]+"/);
});

test("fellesstilen er responsiv og respekterer redusert bevegelse", async () => {
  const css = await read("proff.css");
  assert.match(css, /@media \(min-width: 760px\)/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /clamp\(/);
  assert.match(css, /:focus-visible/);
});

test("rådseksempelet er enkelt, tastaturvennlig og oppdaterer samme innhold", async () => {
  const [javascript, ...pages] = await Promise.all([read("proff.js"), ...variants.map(({ file }) => read(file))]);
  assert.match(javascript, /addEventListener\("click"/);
  assert.match(javascript, /setAttribute\("aria-pressed"/);
  assert.match(javascript, /prefers-reduced-motion: reduce/);

  for (const html of pages) {
    assert.equal((html.match(/data-advice-button=/g) || []).length, 3);
    assert.match(html, /aria-live="polite"/);
    assert.match(html, /data-advice-title/);
    assert.match(html, /data-advice-effect/);
  }
});

test("sidene deler tilgjengelighet, kontaktinfo og samtykke", async () => {
  for (const { file } of variants) {
    const html = await read(file);
    assert.match(html, /<html lang="no">/);
    assert.match(html, /class="skip-link" href="#hovedinnhold"/);
    assert.match(html, /id="hovedinnhold"/);
    assert.match(html, /Org\.nr\. 936 372 295/);
    assert.match(html, /href="\/cookies\.html"/);
    assert.match(html, /data-simple-cookie-consent/);
    assert.match(html, /data-cookie-choice="necessary">Kun nødvendige/);
    assert.match(html, /data-cookie-choice="all">Godta alle/);
    assert.match(html, /proff\.css\?v=20260901-v1/);
    assert.match(html, /proff\.js\?v=20260901-v1/);
  }
});
