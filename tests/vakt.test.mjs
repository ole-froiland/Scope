import assert from "node:assert/strict";
import { readFile, readdir, access } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (name) => readFile(new URL(name, root), "utf8");

const SUBPAGES = [
  "vakt-kunder.html",
  "vakt-integrasjoner.html",
  "vakt-om-oss.html",
  "vakt-faq.html",
  "vakt-kontakt.html",
  "vakt-personvern.html",
  "vakt-vilkar.html",
  "vakt-logg-inn.html",
];

const ALL_PAGES = ["landing-vakt.html", ...SUBPAGES];

const [landing, css, js, server, velger, index] = await Promise.all([
  read("landing-vakt.html"),
  read("vakt.css"),
  read("vakt.js"),
  read("server.mjs"),
  read("landing-velger.html"),
  read("index.html"),
]);

const pages = Object.fromEntries(
  await Promise.all(ALL_PAGES.map(async (name) => [name, await read(name)]))
);

test("/vakt er rutet både i devserveren og på Netlify", async () => {
  const redirects = await read("_redirects");
  assert.match(redirects, /^\/vakt\s+\/landing-vakt\.html\s+200!$/m);
  assert.match(redirects, /^\/vakt\/\s+\/landing-vakt\.html\s+200!$/m);
  assert.match(server, /"\/vakt": "\/landing-vakt\.html"/);
  assert.match(server, /"\/clean\/", "\/leken\/", "\/enkel\/", "\/vakt\/", "\/brutal\/"/);
});

test("velgersiden beholder Vakt som fjerde retning", () => {
  [velger, index].forEach((html) => {
    assert.match(html, /Seks designretninger/);
    assert.match(html, /class="page-option page-option-vakt" href="\/vakt"/);
    assert.match(html, /<strong>Vakt<\/strong>/);
  });
});

test("Vakt bruker sitt eget stilsett og skript, ikke de andre variantenes", () => {
  ALL_PAGES.forEach((name) => {
    const html = pages[name];
    assert.match(html, /href="vakt\.css\?v=/, name);
    assert.match(html, /src="vakt\.js\?v=/, name);
    assert.doesNotMatch(html, /href="styles\.css/, name);
    assert.doesNotMatch(html, /href="landing(-3|-velger)?\.css/, name);
    assert.doesNotMatch(html, /src="script\.js/, name);
  });
});

test("alle sidene deler samme toppmeny, innlogging og hovedhandling", () => {
  ALL_PAGES.forEach((name) => {
    const html = pages[name];
    assert.match(html, /<header class="vakt-header">/, name);
    assert.match(html, /<footer class="vakt-footer">/, name);
    assert.match(html, /class="header-login" href="\/vakt-logg-inn\.html"/, name);
    assert.match(html, /class="button button-amber" href="\/vakt-kontakt\.html">Bli testkunde</, name);
    assert.match(html, /SCOPE ANALYTICS AS · 936 372 295 · post@scopeanalytics\.no/, name);
    assert.match(html, /<html lang="no">/, name);
  });
});

test("undersidene markerer hvilken side du står på", () => {
  const nav = {
    "vakt-kunder.html": "Kunder",
    "vakt-integrasjoner.html": "Integrasjoner",
    "vakt-om-oss.html": "Om oss",
    "vakt-faq.html": "Spørsmål",
  };

  Object.entries(nav).forEach(([file, label]) => {
    assert.match(
      pages[file],
      new RegExp(`<a href="/${file.replace(".", "\\.")}" aria-current="page">${label}</a>`),
      file
    );
  });
});

test("hver side har én h1 og en egen tittel og beskrivelse", () => {
  const titles = new Set();
  ALL_PAGES.forEach((name) => {
    const html = pages[name];
    assert.equal((html.match(/<h1[ >]/g) || []).length, 1, `${name} skal ha nøyaktig én h1`);
    const title = html.match(/<title>([^<]+)<\/title>/);
    assert.ok(title, `${name} mangler tittel`);
    assert.equal(titles.has(title[1]), false, `${name} deler tittel med en annen side`);
    titles.add(title[1]);
    assert.match(html, /<meta name="description" content="[^"]{40,}">/, name);
  });
});

test("ingen lenke peker i tomme luften", async () => {
  const files = new Set(await readdir(new URL(".", root)));
  const aliases = new Set(["/vakt", "/clean", "/leken", "/enkel"]);

  for (const name of ALL_PAGES) {
    const hrefs = [...pages[name].matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    for (const href of hrefs) {
      if (href.startsWith("mailto:") || href.startsWith("data:") || href.startsWith("http")) continue;
      if (href.startsWith("#")) {
        assert.match(pages[name], new RegExp(`id="${href.slice(1)}"`), `${name} → ${href}`);
        continue;
      }
      if (aliases.has(href)) continue;
      const target = href.replace(/^\//, "").split(/[?#]/)[0];
      assert.equal(files.has(target), true, `${name} lenker til ${href}, som ikke finnes`);
    }
  }
});

test("alle bilder finnes og har alternativ tekst", async () => {
  for (const name of ALL_PAGES) {
    const imgs = [...pages[name].matchAll(/<img\s[^>]*>/g)].map((m) => m[0]);
    for (const img of imgs) {
      const src = img.match(/src="([^"]+)"/);
      const alt = img.match(/alt="([^"]*)"/);
      assert.ok(src, `${name}: img uten src`);
      assert.ok(alt && alt[1].trim().length > 0, `${name}: ${src[1]} mangler alt-tekst`);
      await access(new URL(src[1], root));
    }
  }
});

test("klokke-railen og seksjonene på forsiden hører sammen", () => {
  const hours = [...landing.matchAll(/data-hour="([^"]+)"/g)].map((m) => m[1]);
  const railHours = [...landing.matchAll(/data-rail-link="([^"]+)"/g)].map((m) => m[1]);

  assert.deepEqual(hours, railHours, "railen skal ha nøyaktig de klokkeslettene seksjonene har");
  assert.equal(hours.length, 7);

  // Hver rail-lenke må peke på en seksjon som finnes
  [...landing.matchAll(/data-rail-link="[^"]+" ?><span>/g)];
  [...landing.matchAll(/<a href="#(kl-\d+)" data-rail-link=/g)].forEach((m) => {
    assert.match(landing, new RegExp(`id="${m[1]}"`), m[1]);
  });

  // Døgnet skal skifte fra natt til dag og tilbake
  assert.match(landing, /<div class="daybreak"/);
  assert.match(landing, /<div class="dusk"/);
  assert.equal((landing.match(/data-hour-tone="light"/g) || []).length, 3);
});

test("forsiden leverer verdiløftet, ikke bare stemning", () => {
  assert.match(landing, /Vi tar <em>nattevakta\.<\/em>/);
  assert.match(landing, /Bli testkunde/);
  // Konkrete tall med kilde, ikke runde påstander
  assert.match(landing, /\+4 520 kr/);
  assert.match(landing, /\+3 900 kr/);
  assert.match(landing, /\+1 230 kr/);
  // Regnestykket skal si tydelig at det er et estimat
  assert.match(landing, /Et regnestykke, ikke et løfte/);
  // Demotall skal merkes som demotall
  assert.match(landing, /fra demodriften vår/);
});

test("regnestykket regner ut fra prosentpoengene som står i teksten", () => {
  assert.match(landing, /data-calc-points="2\.1"/);
  assert.match(landing, /29,6 % til 27,5 %/);
  assert.match(js, /revenue \* \(points \/ 100\)/);
  assert.match(js, /Intl\.NumberFormat\("nb-NO"/);
});

test("filteret på systemer dekker kategoriene som finnes", () => {
  ["landing-vakt.html", "vakt-integrasjoner.html"].forEach((name) => {
    const html = pages[name];
    const filters = new Set(
      [...html.matchAll(/data-filter="([^"]+)"/g)].map((m) => m[1]).filter((v) => v !== "all")
    );
    const categories = new Set([...html.matchAll(/data-category="([^"]+)"/g)].map((m) => m[1]));
    assert.deepEqual([...categories].sort(), [...filters].sort(), name);
    assert.ok(categories.size >= 4, name);
  });
});

test("skjemaet ber ikke om mer enn det trenger, og lover ikke feil", () => {
  const contact = pages["vakt-kontakt.html"];
  const form = contact.slice(contact.indexOf("<form"), contact.indexOf("</form>"));
  const fields = [...form.matchAll(/name="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(fields, ["name", "company", "email", "phone", "message"]);
  assert.doesNotMatch(contact, /type="password"/);
  assert.match(contact, /Du kan be oss slette dem når som helst/);
  // Faller tilbake til e-post hvis endepunktet ikke finnes (Netlify er statisk)
  assert.match(js, /mailto:post@scopeanalytics\.no/);
});

test("siden er brukbar uten mus og uten animasjon", () => {
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /\[data-reveal\]\s*\{[^}]*opacity: 1;[^}]*transform: none/);
  assert.match(css, /:focus-visible\s*\{[^}]*outline: 3px solid var\(--amber\)/);
  ALL_PAGES.forEach((name) => {
    assert.match(pages[name], /class="visually-hidden" href="#hovedinnhold"/, name);
    assert.match(pages[name], /id="hovedinnhold"/, name);
  });
});

test("Vakt rører ikke de andre variantenes filer", async () => {
  const files = await readdir(new URL(".", root));
  const owned = files.filter((f) => f.startsWith("vakt") || f === "landing-vakt.html");
  owned.forEach((f) => {
    assert.equal(path.extname(f) === "" ? false : true, true);
  });
  // De tre eksisterende landingssidene skal ikke referere til Vakt-filene
  ["landing-3.html", "landing.html", "landing-enkel.html"].forEach(async (name) => {
    const html = await read(name);
    assert.doesNotMatch(html, /vakt\.css|vakt\.js/, name);
  });
});
