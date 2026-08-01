import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (name) => readFile(new URL(name, root), "utf8");

test("/brutal er tilgjengelig i devserveren og på Netlify", async () => {
  const [server, redirects] = await Promise.all([read("server.mjs"), read("_redirects")]);

  assert.match(server, /"\/brutal": "\/landing-brutal\.html"/);
  assert.match(server, /"\/clean\/", "\/leken\/", "\/enkel\/", "\/vakt\/", "\/brutal\/"/);
  assert.match(redirects, /^\/brutal\s+\/landing-brutal\.html\s+200!$/m);
  assert.match(redirects, /^\/brutal\/\s+\/landing-brutal\.html\s+200!$/m);
});

test("velgersiden beholder Brutal som femte av seks designretninger", async () => {
  const pages = await Promise.all([read("landing-velger.html"), read("index.html")]);

  pages.forEach((html) => {
    assert.match(html, /Seks designretninger/);
    assert.match(html, /class="page-option page-option-brutal" href="\/brutal"/);
    assert.match(html, /<span class="option-number">05<\/span>/);
    assert.match(html, /<strong>Brutal<\/strong>/);
  });
});

test("Brutal er en selvstendig, tydelig og responsiv landingsside", async () => {
  const [html, css, javascript] = await Promise.all([
    read("landing-brutal.html"),
    read("brutal.css"),
    read("brutal.js"),
  ]);

  assert.match(html, /href="brutal\.css\?v=/);
  assert.match(html, /src="brutal\.js\?v=/);
  assert.doesNotMatch(html, /href="(?:styles|landing|vakt)\.css/);
  assert.match(html, /AI-rådgiver for restaurant, bar og kafé/);
  assert.match(html, /Scope kobler kassa, regnskapet, vaktlista og været/);
  assert.match(html, /assets\/scope-brutal-logo\.png/);
  assert.match(html, /href="\/landing-3-test-gratis\.html"/);
  assert.match(html, /href="\/landing-3-logg-inn\.html"/);
  assert.match(html, /SCOPE ANALYTICS AS · 936 372 295/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(javascript, /aria-expanded/);

  await access(new URL("assets/scope-brutal-logo.png", root));
});

test("Brutal endrer ikke stilarkene til de fire eksisterende retningene", async () => {
  const existing = await Promise.all([
    read("landing-3.html"),
    read("landing.html"),
    read("landing-enkel.html"),
    read("landing-vakt.html"),
  ]);

  existing.forEach((html) => {
    assert.doesNotMatch(html, /brutal\.css|brutal\.js/);
  });
});
