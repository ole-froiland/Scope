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

test("Clean viser et lesbart AI-dashboard i kortere telefonrammer", () => {
  assert.doesNotMatch(cleanHtml, /class="krone-icon"/);
  assert.doesNotMatch(cleanHtml, />4 800<|>3 200<|>2 150</);
  assert.equal((cleanHtml.match(/assets\/icons\/heroicons-light-bulb\.svg/g) || []).length, 3);
  assert.equal((cleanHtml.match(/assets\/icons\/heroicons-chart-bar-square\.svg/g) || []).length, 3);
  assert.equal((cleanHtml.match(/assets\/icons\/heroicons-user-circle\.svg/g) || []).length, 3);
  assert.match(cleanHtml, /Scope, din AI-rådgiver/);
  assert.match(cleanHtml, /Netto økonomisk gevinst/);
  assert.match(cleanHtml, /12 °C · Overskyet/);
  assert.match(cleanCss, /\.phone-advice-card\s*\{[^}]*grid-template-columns:\s*26px minmax\(0, 1fr\)/);
  assert.match(cleanCss, /\.phone-mockup\s*\{[^}]*aspect-ratio:\s*20 \/ 39/);
  assert.match(cleanCss, /\.testers-section\s*\{[^}]*background:\s*linear-gradient\([^}]*var\(--scope-cream\)/);
  assert.match(cleanCss, /\.clean-footer\s*\{[^}]*background:\s*var\(--scope-blue-dark\)/);
});
