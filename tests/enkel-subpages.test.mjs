import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const subpages = {
  "enkel-kunder.html": "Kunder",
  "enkel-integrasjoner.html": "Integrasjoner",
  "enkel-om-oss.html": "Om oss",
  "enkel-faq.html": "Ofte stilte spørsmål",
};

const read = (name) => readFile(new URL(`../${name}`, import.meta.url), "utf8");

const [landingEnkel, css, javascript, ...pages] = await Promise.all([
  read("landing-enkel.html"),
  read("styles.css"),
  read("script.js"),
  ...Object.keys(subpages).map(read),
]);

const byName = Object.fromEntries(Object.keys(subpages).map((name, index) => [name, pages[index]]));

test("/enkel lenker til sine egne undersider, ikke til Leken sine", () => {
  Object.keys(subpages).forEach((name) => {
    assert.match(landingEnkel, new RegExp(`href="/${name.replace(".", "\\.")}"`), name);
  });

  ["customers.html", "integrations.html", "about.html", "faq.html"].forEach((leken) => {
    assert.doesNotMatch(landingEnkel, new RegExp(`href="${leken.replace(".", "\\.")}`), leken);
  });

  ["ole-froiland", "sigurd-dahl", "simon-korsberg"].forEach((anchor) => {
    assert.match(landingEnkel, new RegExp(`href="/enkel-om-oss\\.html#${anchor}"`), anchor);
  });
});

test("undersidene bruker Enkel-uttrykket, ikke Leken sine compact-klasser", () => {
  Object.entries(byName).forEach(([name, html]) => {
    assert.match(html, /<main class="enkel-page">/, name);
    assert.match(html, /<header class="site-header">/, name);
    assert.doesNotMatch(html, /compact-/, name);
    assert.doesNotMatch(html, /marketing-page/, name);
  });
});

test("undersidene deler toppmeny, aktiv side og handlinger med /enkel", () => {
  Object.entries(byName).forEach(([name, html]) => {
    Object.entries(subpages).forEach(([target, label]) => {
      const href = `/${target}`;
      const active = target === name ? ' aria-current="page"' : "";
      assert.match(html, new RegExp(`<a href="${href.replace(".", "\\.")}"${active}>${label}</a>`), `${name} → ${label}`);
    });

    assert.match(html, /class="header-button ghost" href="\/enkel\?login=1"/, name);
    assert.match(html, /class="header-button solid" href="\/enkel#onboarding"/, name);
    assert.match(html, /class="enkel-cta-button" href="\/enkel#onboarding"/, name);
    assert.match(html, /styles\.css\?v=20260729-enkel-subpages-v1/, name);
  });
});

test("hver underside har sitt eget innhold", () => {
  assert.match(byName["enkel-kunder.html"], /Laget for serverings&shy;bransjen/);
  assert.equal((byName["enkel-kunder.html"].match(/class="enkel-card[ "]/g) || []).length, 4);

  assert.equal((byName["enkel-integrasjoner.html"].match(/data-category=/g) || []).length, 4);
  assert.equal((byName["enkel-integrasjoner.html"].match(/data-panel=/g) || []).length, 4);
  assert.equal((byName["enkel-integrasjoner.html"].match(/class="accounting-card"/g) || []).length, 32);

  ["ole-froiland", "sigurd-dahl", "simon-korsberg"].forEach((anchor) => {
    assert.match(byName["enkel-om-oss.html"], new RegExp(`class="enkel-person" id="${anchor}"`), anchor);
  });

  assert.ok((byName["enkel-faq.html"].match(/<details>/g) || []).length >= 6);
});

test("Enkel-stilene er egne og henger sammen med skriptet", () => {
  assert.match(css, /Undersider for \/enkel/);
  [".enkel-page", ".enkel-hero", ".enkel-card", ".enkel-person", ".enkel-faq-list", ".enkel-cta"].forEach((selector) => {
    assert.match(css, new RegExp(`\\${selector}\\b`), selector);
  });

  // Undersidene dropper footer-pilen, så toppluften må komme fra footeren selv.
  assert.match(css, /\.enkel-page \+ \.site-footer\s*\{[^}]*padding-top/);
  // width/height-attributtene på <img> ville ellers overstyre aspect-ratio.
  assert.match(css, /\.enkel-person img\s*\{[\s\S]*?height: auto;[\s\S]*?aspect-ratio: 3 \/ 4/);

  assert.match(javascript, /revealTargets[\s\S]*?\.enkel-section-head[\s\S]*?\.enkel-cta-copy/);
});

test("Leken beholder sine egne undersider", async () => {
  const [landingLeken, customers] = await Promise.all([read("landing.html"), read("customers.html")]);

  ["customers.html", "integrations.html", "about.html", "faq.html"].forEach((page) => {
    assert.match(landingLeken, new RegExp(`href="${page.replace(".", "\\.")}"`), page);
  });

  assert.match(customers, /compact-marketing-page/);
  assert.doesNotMatch(landingLeken, /enkel-kunder\.html/);
});
