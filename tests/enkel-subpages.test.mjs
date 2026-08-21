import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
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
    assert.match(html, /styles\.css\?v=20260821-green-logo-v1/, name);
  });
});

test("Enkel bruker den grønne Scope-logoen og matchende handlingsknapper", async () => {
  await access(new URL("../assets/scope-green-logo.png", import.meta.url));

  [landingEnkel, ...pages].forEach((html) => {
    assert.match(html, /<body class="enkel-site">/);
    assert.match(html, /class="scope-brand-logo" src="assets\/scope-green-logo\.png"/);
  });

  assert.match(css, /--scope-brand-green:\s*#285f2a/);
  assert.match(css, /\.enkel-site \.header-button\.solid\s*\{[^}]*background:\s*var\(--scope-brand-green\)/s);
  assert.match(css, /\.enkel-site \.contact-submit\s*\{[^}]*background:\s*var\(--scope-brand-green\)/s);
  assert.match(css, /\.enkel-site \.onboarding-next\s*\{[^}]*background:\s*var\(--scope-brand-green\)/s);
  assert.match(css, /\.enkel-site \.integration-buttons button\.is-active\[data-color="blue"\]\s*\{[^}]*background:\s*var\(--scope-brand-green\)/s);
});

test("hver underside har sitt eget innhold", () => {
  assert.match(byName["enkel-kunder.html"], /Laget for serverings&shy;bransjen/);
  assert.equal((byName["enkel-kunder.html"].match(/class="enkel-panel[ "]/g) || []).length, 4);

  assert.equal((byName["enkel-integrasjoner.html"].match(/data-category=/g) || []).length, 4);
  assert.equal((byName["enkel-integrasjoner.html"].match(/data-panel=/g) || []).length, 4);
  assert.equal((byName["enkel-integrasjoner.html"].match(/class="accounting-card"/g) || []).length, 32);
  assert.equal((byName["enkel-integrasjoner.html"].match(/class="enkel-step[ "]/g) || []).length, 3);

  ["ole-froiland", "sigurd-dahl", "simon-korsberg"].forEach((anchor) => {
    assert.match(byName["enkel-om-oss.html"], new RegExp(`class="enkel-person[^"]*" id="${anchor}"`), anchor);
  });

  assert.ok((byName["enkel-faq.html"].match(/<details>/g) || []).length >= 6);
});

test("hver underside holder seg til én overskrift og én ingress", () => {
  Object.entries(byName).forEach(([name, html]) => {
    const main = html.slice(html.indexOf("<main"), html.indexOf("</main>"));

    assert.equal((main.match(/<h1[ >]/g) || []).length, 1, `${name}: én h1`);
    assert.equal((main.match(/class="enkel-lead"/g) || []).length, 1, `${name}: én ingress`);

    // Ingressen skal være kort nok til å leses i ett blikk.
    const lead = main.match(/class="enkel-lead">([^<]*)</)[1];
    assert.ok(lead.length <= 130, `${name}: ingress på ${lead.length} tegn`);

    // Ingen seksjonsoverskrift som bare gjentar heroen. Integrasjoner har én,
    // fordi «Slik kobler vi oss på» er en ny idé og ikke en omskriving.
    const titles = (main.match(/class="enkel-section-title"/g) || []).length;
    assert.ok(titles <= (name === "enkel-integrasjoner.html" ? 1 : 0), `${name}: ${titles} seksjonsoverskrift(er)`);
  });
});

test("de tonede flatene bruker landingssidens egne aksentfarger og strektegning", () => {
  const art = [byName["enkel-kunder.html"], byName["enkel-integrasjoner.html"]];
  art.forEach((html) => {
    // Samme hånd som .scope-panel-art på /enkel.
    assert.match(html, /stroke="#171715" stroke-width="7"/);
    assert.match(html, /class="art-accent"/);
  });

  assert.match(byName["enkel-kunder.html"], /class="enkel-panel enkel-panel--red"/);
  assert.match(byName["enkel-kunder.html"], /class="enkel-panel enkel-panel--green"/);

  // Nummerering bare der rekkefølgen faktisk betyr noe.
  assert.doesNotMatch(byName["enkel-kunder.html"], /enkel-step-num/);
  assert.equal((byName["enkel-integrasjoner.html"].match(/enkel-step-num/g) || []).length, 3);
});

test("Enkel-stilene er egne og henger sammen med skriptet", () => {
  assert.match(css, /Undersider for \/enkel/);
  [".enkel-page", ".enkel-hero", ".enkel-panel", ".enkel-step", ".enkel-person", ".enkel-faq-list", ".enkel-cta"].forEach((selector) => {
    assert.match(css, new RegExp(`\\${selector}\\b`), selector);
  });

  // Undersidene dropper footer-pilen, så toppluften må komme fra footeren selv.
  assert.match(css, /\.enkel-page \+ \.site-footer\s*\{[^}]*padding-top/);
  // width/height-attributtene på <img> ville ellers overstyre aspect-ratio.
  assert.match(css, /\.enkel-person img\s*\{[\s\S]*?height: auto;[\s\S]*?aspect-ratio: 4 \/ 5/);

  assert.match(javascript, /revealTargets[\s\S]*?\.enkel-panel[\s\S]*?\.enkel-cta-copy/);
});

test("Leken beholder sine egne undersider", async () => {
  const [landingLeken, customers] = await Promise.all([read("landing.html"), read("customers.html")]);

  ["customers.html", "integrations.html", "about.html", "faq.html"].forEach((page) => {
    assert.match(landingLeken, new RegExp(`href="${page.replace(".", "\\.")}"`), page);
  });

  assert.match(customers, /compact-marketing-page/);
  assert.doesNotMatch(landingLeken, /enkel-kunder\.html/);
});
