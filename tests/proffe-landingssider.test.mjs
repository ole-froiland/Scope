import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (name) => readFile(new URL(name, root), "utf8");
const variants = [
  { route: "drift", file: "landing-drift.html", css: "drift.css", js: "drift.js", number: "13", name: "Drift" },
  { route: "signal", file: "landing-signal.html", css: "signal.css", js: "signal.js", number: "14", name: "Signal" },
  { route: "vertskap", file: "landing-vertskap.html", css: "vertskap.css", js: "vertskap.js", number: "15", name: "Vertskap" },
];

test("de tre kreative retningene har korte URL-er lokalt og på Netlify", async () => {
  const [server, redirects] = await Promise.all([read("server.mjs"), read("_redirects")]);
  for (const { route, file } of variants) {
    assert.match(server, new RegExp(`"/${route}": "/${file.replaceAll(".", "\\.")}"`), route);
    assert.match(server, new RegExp(`"/${route}/"`), route);
    assert.match(redirects, new RegExp(`^/${route}\\s+/${file.replaceAll(".", "\\.")}\\s+200!$`, "m"), route);
  }
});

test("velgersidene viser alle sytten retninger", async () => {
  const pages = await Promise.all([read("landing-velger.html"), read("index.html")]);
  for (const html of pages) {
    assert.match(html, /Sytten designretninger/);
    for (const { route, number, name } of variants) {
      assert.match(html, new RegExp(`href="/${route}"`), route);
      assert.match(html, new RegExp(`<span class="option-number">${number}</span>`), route);
      assert.match(html, new RegExp(`<strong>${name}</strong>`), route);
    }
  }
  assert.equal(pages[0], pages[1]);
});

test("hver retning har egen komposisjon, stil og interaksjon", async () => {
  for (const variant of variants) {
    const html = await read(variant.file);
    assert.match(html, new RegExp(`href="${variant.css.replaceAll(".", "\\.")}\\?v=`), variant.file);
    assert.match(html, new RegExp(`src="${variant.js.replaceAll(".", "\\.")}\\?v=`), variant.file);
    assert.doesNotMatch(html, /proff\.(css|js)/, variant.file);
    for (const other of variants.filter(({ route }) => route !== variant.route)) {
      assert.doesNotMatch(html, new RegExp(`${other.route}\\.(css|js)`), `${variant.route} → ${other.route}`);
    }
  }
});

test("alle tre har hero, forklaring, testkunde-søk og tydelig kontakt", async () => {
  for (const { file } of variants) {
    const html = await read(file);
    assert.match(html, /<h1[^>]*>/, file);
    assert.match(html, /id="slik"/, file);
    assert.match(html, /id="testkunder"/, file);
    assert.match(html, /Vi søker/i, file);
    assert.match(html, /ingen bindingstid/i, file);
    assert.match(html, /mailto:post@scopeanalytics\.no/, file);
    assert.match(html, /tel:\+4793637295/, file);
  }
});

test("Drift bruker et klikkbart døgnkart med fire serviceøyeblikk", async () => {
  const [html, css, javascript] = await Promise.all([read("landing-drift.html"), read("drift.css"), read("drift.js")]);
  assert.match(html, /Se dagen før den skjer/);
  assert.equal((html.match(/data-shift=/g) || []).length, 4);
  assert.match(html, /class="day-track"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(css, /Barlow Condensed/);
  assert.match(javascript, /prep:/);
  assert.match(javascript, /close:/);
  await access(new URL("assets/drift-restaurant-day.png", root));
});

test("Signal lar fire datakilder påvirke ett råd", async () => {
  const [html, css, javascript] = await Promise.all([read("landing-signal.html"), read("signal.css"), read("signal.js")]);
  assert.match(html, /Fire datastrømmer/);
  assert.equal((html.match(/data-source=/g) || []).length, 4);
  assert.match(html, /data-signal-title/);
  assert.match(css, /IBM Plex Mono/);
  assert.match(css, /--acid:\s*#b8ff52/);
  ["kasse", "regnskap", "bemanning", "vaer"].forEach((key) => assert.match(javascript, new RegExp(`${key}:`)));
});

test("Vertskap er en redaksjonell journal med tre historier", async () => {
  const [html, css, javascript] = await Promise.all([read("landing-vertskap.html"), read("vertskap.css"), read("vertskap.js")]);
  assert.match(html, /Servicejournalen/);
  assert.match(html, /data-journal-next/);
  assert.match(html, /data-journal-photo/);
  assert.match(html, /Vi søker<br><em>10<\/em> testrestauranter/);
  assert.match(css, /Newsreader/);
  assert.match(css, /Caveat/);
  assert.equal((javascript.match(/number:"Nr\./g) || []).length, 3);
});

test("alle tre er responsive, tilgjengelige og bruker ekte bildeassets", async () => {
  for (const { file, css } of variants) {
    const [html, stylesheet] = await Promise.all([read(file), read(css)]);
    assert.match(html, /<html lang="no">/);
    assert.match(html, /class="skip-link" href="#hovedinnhold"/);
    assert.match(html, /id="hovedinnhold"/);
    assert.match(html, /data-simple-cookie-consent/);
    assert.match(html, /href="\/cookies\.html"/);
    assert.match(stylesheet, /:focus-visible/);
    assert.match(stylesheet, /@media\s*\(max-width:\s*650px\)/);
    assert.match(stylesheet, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    assert.doesNotMatch(stylesheet, /data:image\/svg|linear-gradient/);
    const imageTags = [...html.matchAll(/<img\s+[^>]*>/g)].map(([tag]) => tag);
    assert.ok(imageTags.length > 0, file);
    imageTags.forEach((tag) => assert.match(tag, /alt="[^"]*"/, `${file}: ${tag}`));
  }
});
