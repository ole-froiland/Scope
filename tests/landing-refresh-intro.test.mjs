import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [html, css, js] = await Promise.all([
  readFile(new URL("../landing.html", import.meta.url), "utf8"),
  readFile(new URL("../landing.css", import.meta.url), "utf8"),
  readFile(new URL("../landing.js", import.meta.url), "utf8"),
]);

test("landingssiden viser en kort intro som glir opp ved refresh", () => {
  assert.match(html, /<div class="loader" aria-hidden="true">[\s\S]*?<strong>scope<\/strong>/);
  assert.match(css, /animation:\s*loader-slide-up\s+\.68s[^;]*\.68s\s+both/);
  assert.match(css, /animation:\s*loader-dot-in\s+\.34s/);
  assert.match(css, /animation:\s*loader-word-in\s+\.32s/);
  assert.match(css, /@keyframes loader-slide-up\s*\{[^}]*translateY\(-100%\)/);
  assert.match(js, /initLoader\(\);/);
  assert.match(js, /event\.animationName === "loader-slide-up"/);
});

test("refresh-introen blokkerer ikke brukere med redusert bevegelse", () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.loader \{ display: none !important; \}/);
  assert.match(js, /if \(reduceMotion\.matches\) \{\s*loader\.remove\(\);/);
});
