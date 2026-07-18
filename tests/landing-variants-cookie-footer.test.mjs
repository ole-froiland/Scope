import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [cleanHtml, playfulHtml, cleanCss, consentCss, consentJs] = await Promise.all([
  readFile(new URL("../landing-3.html", import.meta.url), "utf8"),
  readFile(new URL("../landing.html", import.meta.url), "utf8"),
  readFile(new URL("../landing-3.css", import.meta.url), "utf8"),
  readFile(new URL("../cookie-consent.css", import.meta.url), "utf8"),
  readFile(new URL("../cookie-consent.js", import.meta.url), "utf8"),
]);

test("Clean og Leken viser en enkel cookie-godkjenning", () => {
  [cleanHtml, playfulHtml].forEach((html) => {
    assert.match(html, /cookie-consent\.css\?v=20260718-v1/);
    assert.match(html, /data-simple-cookie-consent/);
    assert.match(html, /data-cookie-choice="necessary">Kun nødvendige/);
    assert.match(html, /data-cookie-choice="all">Godta alle/);
    assert.match(html, /cookie-consent\.js\?v=20260718-v1/);
  });

  assert.match(consentJs, /scope_cookie_preferences/);
  assert.match(consentJs, /Max-Age=\$\{maxAge\}; Path=\/; SameSite=Lax/);
  assert.match(consentCss, /\.simple-cookie-consent\[hidden\]\s*\{\s*display: none/);
});

test("Clean har en responsiv footer med viktige lenker", () => {
  assert.match(cleanHtml, /<footer class="clean-footer"/);
  assert.match(cleanHtml, /href="\/landing-3-kunder\.html">Kunder/);
  assert.match(cleanHtml, /href="\/cookies\.html">Cookie-innstillinger/);
  assert.match(cleanHtml, /href="\/landing-3-logg-inn\.html">Logg inn/);
  assert.match(cleanHtml, /SCOPE ANALYTICS AS · 936 372 295/);
  assert.match(cleanCss, /\.clean-footer-inner/);
  assert.match(cleanCss, /@media \(max-width: 800px\)[\s\S]*?\.clean-footer-inner\s*\{\s*grid-template-columns: 1fr/);
});
