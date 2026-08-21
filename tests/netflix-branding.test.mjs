import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const read = (name) => readFile(new URL(`../${name}`, import.meta.url), "utf8");

test("Netflix bruker den grønne Scope-logoen og matchende handlingsknapper", async () => {
  const [landing, login, css] = await Promise.all([
    read("landing-netflix.html"),
    read("netflix-logg-inn.html"),
    read("netflix.css"),
    access(new URL("../assets/scope-green-logo.png", import.meta.url)),
  ]);

  [landing, login].forEach((html) => {
    assert.match(html, /src="assets\/scope-green-logo\.png"/);
    assert.doesNotMatch(html, /scope-neon-wordmark\.png/);
    assert.match(html, /netflix\.css\?v=20260821-green-brand-v2/);
  });

  assert.doesNotMatch(landing, /<p class="tagline-kicker">/);
  assert.match(css, /\.hero-logo img\s*\{[^}]*height:\s*clamp\(58px, 7vw, 88px\)/s);

  assert.match(css, /--brand-green:\s*#285f2a/);
  ["login", "cta", "contact-bubble", "auth-submit"].forEach((className) => {
    assert.match(css, new RegExp(`\\.${className}\\s*\\{[^}]*background:\\s*var\\(--brand-green\\)`, "s"), className);
  });
});
