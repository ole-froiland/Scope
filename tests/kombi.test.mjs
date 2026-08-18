import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (name) => readFile(new URL(name, root), "utf8");

test("/kombi er tilgjengelig i devserveren og på Netlify", async () => {
  const [server, redirects] = await Promise.all([read("server.mjs"), read("_redirects")]);

  assert.match(server, /"\/kombi": "\/landing-kombi\.html"/);
  assert.match(server, /"\/brutal\/", "\/kombi\/"/);
  assert.match(redirects, /^\/kombi\s+\/landing-kombi\.html\s+200!$/m);
  assert.match(redirects, /^\/kombi\/\s+\/landing-kombi\.html\s+200!$/m);
});

test("velgersidene tilbyr Kombi som sjette designretning", async () => {
  const pages = await Promise.all([read("landing-velger.html"), read("index.html")]);

  pages.forEach((html) => {
    assert.match(html, /Sju designretninger/);
    assert.match(html, /class="page-option page-option-kombi" href="\/kombi"/);
    assert.match(html, /<span class="option-number">06<\/span>/);
    assert.match(html, /assets\/scope-kombi-logo\.png/);
  });
});

test("Kombi er en selvstendig, responsiv og interaktiv landingsside", async () => {
  const [html, css, javascript] = await Promise.all([
    read("landing-kombi.html"),
    read("kombi.css"),
    read("kombi.js"),
  ]);

  assert.match(html, /href="kombi\.css\?v=/);
  assert.match(html, /src="kombi\.js\?v=/);
  assert.match(html, /assets\/scope-kombi-logo-v2\.png/);
  assert.match(html, /data-hero-word/);
  assert.match(html, /data-word="mat"/);
  assert.match(html, /Du kan/);
  assert.match(html, /Vi kan <em>tall\.<\/em>/);
  assert.doesNotMatch(html, /data-hero-word>mat<\/span>\./);
  assert.match(html, /Klar på 1–2–3\. Ingen bindingstid\./);
  assert.equal((html.match(/class="process-card(?: is-active)?"/g) || []).length, 4);
  assert.equal((html.match(/data-process-card/g) || []).length, 4);
  assert.match(html, /class="process-card is-active"[^>]*aria-pressed="true"/);
  assert.match(html, /<h3>Hent data<\/h3>/);
  assert.match(html, /Vi kobler oss på kassa, regnskapet og bemanningen, og henter inn alle tallene dine – hver eneste natt\./);
  assert.match(html, /<h3>Analyser<\/h3>/);
  assert.match(html, /AI-en går gjennom alt, finner mønstre og avvik, og ser hva som faktisk påvirker resultatet ditt\./);
  assert.match(html, /<h3>Kvalitetssikre<\/h3>/);
  assert.match(html, /Folk som kan analyse og kjenner bransjen går gjennom funnene før de blir til råd du kan stole på\./);
  assert.match(html, /<h3>Få råd<\/h3>/);
  assert.match(html, /Du får ett tydelig neste steg med forventet effekt – ikke en rapport du må tolke selv\./);
  assert.doesNotMatch(html, /class="process-photo"/);
  assert.match(html, /Råd du faktisk kan bruke/);
  assert.match(html, /Vi søker<br>testkunder/);
  assert.match(html, /data-menu-toggle/);
  assert.match(html, /data-advice-row/);
  assert.match(html, /data-open-test-form/);
  assert.match(html, /data-lead-form/);
  assert.match(html, /class="footer-main"/);
  assert.match(html, /Personvern og informasjonskapsler/);
  assert.match(html, /href="#testkunder"/);
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\.hero-content\s*\{[^}]*text-align:\s*center/s);
  assert.match(css, /\.hero-photo\s*\{[^}]*object-fit:\s*cover/s);
  assert.match(css, /\.hero h1\s*\{[^}]*font-family:\s*"DM Sans"/s);
  assert.match(css, /\.hero-word\s*\{[^}]*font-family:\s*"Fredoka"/s);
  assert.match(css, /--hero-accent:\s*var\(--yellow\)/);
  assert.match(css, /\.hero-word\[data-word="vin"\]\s*\{[^}]*color:\s*#d88e75/s);
  assert.match(css, /\.hero-word\[data-word="kultur"\]\s*\{[^}]*color:\s*#a8c5a3/s);
  assert.match(css, /\.hero-word\[data-word="kaffe"\]\s*\{[^}]*color:\s*#d2a064/s);
  assert.match(css, /\.hero-actions \.button\s*\{[^}]*border-radius:\s*8px/s);
  assert.match(css, /\.header-cta\s*\{[^}]*border-radius:\s*8px/s);
  assert.match(css, /\.hero h1\s*\{[^}]*line-height:\s*0\.95/s);
  assert.match(css, /radial-gradient\(circle at 50% 44%, rgba\(10, 45, 29, 0\.08\), rgba\(10, 45, 29, 0\.58\) 76%\)/);
  assert.match(css, /linear-gradient\(180deg, rgba\(8, 35, 23, 0\.24\), rgba\(8, 35, 23, 0\.52\)\)/);
  assert.match(css, /--cream:\s*#fff7e6/);
  assert.match(css, /\.site-header\s*\{[^}]*background:\s*var\(--cream\)/s);
  assert.match(css, /\.brand-link\s*\{[^}]*background:\s*var\(--cream\)/s);
  assert.match(css, /\.simple-cookie-consent\[data-cookie-theme="playful"\]\s*\{[^}]*--cookie-background:\s*var\(--cream\)[^}]*box-shadow:\s*6px 6px 0 var\(--ink\)/s);
  assert.match(css, /\.simple-cookie-primary\s*\{[^}]*color:\s*var\(--ink\)[^}]*background:\s*var\(--yellow\)/s);
  assert.match(css, /\.process\s*\{[^}]*box-shadow:\s*0 0 0 100vmax var\(--yellow\)/s);
  assert.match(css, /\.process ol\s*\{[^}]*display:\s*flex/s);
  assert.match(css, /\.process-card\s*\{[^}]*border-radius:\s*12px/s);
  assert.match(css, /\.process-step\.is-active\s*\{[^}]*flex-grow:\s*1\.55/s);
  assert.match(css, /\.process-card\.is-active\s*\{[^}]*background:\s*var\(--ink\)/s);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.process ol\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(css, /\.site-header\.is-hidden\s*\{[^}]*transform:\s*translateY\(-100%\)/s);
  assert.match(javascript, /aria-expanded/);
  assert.match(javascript, /function initHeaderScroll\(\)/);
  assert.match(javascript, /function initProcessCards\(\)/);
  assert.match(javascript, /window\.setInterval/);
  assert.match(javascript, /currentY > lastY/);
  assert.match(javascript, /initHeaderScroll\(\)/);
  assert.match(javascript, /initProcessCards\(\)/);
  assert.match(javascript, /"mat",\s*"vin",\s*"kultur",\s*"kaffe"/);
  assert.match(javascript, /word\.dataset\.word = nextWord/);
  assert.match(javascript, /prefers-reduced-motion/);
  assert.match(javascript, /fetch\("\/api\/inquiries"/);

  await Promise.all([
    access(new URL("assets/scope-kombi-logo-v2.png", root)),
    access(new URL("assets/kombi-hero-chef.jpg", root)),
    access(new URL("assets/kombi-server-plate.jpg", root)),
    access(new URL("assets/kombi-outdoor-dining.jpg", root)),
  ]);
});

test("Kombi endrer ikke stilarkene til de fem eksisterende retningene", async () => {
  const existing = await Promise.all([
    read("landing-3.html"),
    read("landing.html"),
    read("landing-enkel.html"),
    read("landing-vakt.html"),
    read("landing-brutal.html"),
  ]);

  existing.forEach((html) => {
    assert.doesNotMatch(html, /kombi\.css|kombi\.js/);
  });
});

test("Kombi har komplette knapper, bildetekster og interne lenkemål", async () => {
  const html = await read("landing-kombi.html");
  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));

  for (const match of html.matchAll(/href="#([^"]+)"/g)) {
    assert.ok(ids.has(match[1]), `Mangler internt lenkemål #${match[1]}`);
  }

  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  [...html.matchAll(/<img\b[^>]*>/g)].forEach((match) => assert.match(match[0], /\salt="[^"]*"/));
  [...html.matchAll(/<button\b[^>]*>/g)].forEach((match) => assert.match(match[0], /\stype="(?:button|submit)"/));
});
