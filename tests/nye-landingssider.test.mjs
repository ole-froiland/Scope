import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (name) => readFile(new URL(name, root), "utf8");

const variants = [
  { route: "kvittering", file: "landing-kvittering.html", css: "kvittering.css", js: "kvittering.js", number: "09", name: "Kvittering" },
  { route: "meny", file: "landing-meny.html", css: "meny.css", js: "meny.js", number: "10", name: "Menykortet" },
  { route: "for-etter", file: "landing-for-etter.html", css: "for-etter.css", js: "for-etter.js", number: "11", name: "Før / Etter" },
  { route: "sesong", file: "landing-sesong.html", css: "sesong.css", js: "sesong.js", number: "12", name: "Sesong" },
];

test("de fire nye retningene har korte URL-er både i devserveren og på Netlify", async () => {
  const [server, redirects] = await Promise.all([read("server.mjs"), read("_redirects")]);

  for (const { route, file } of variants) {
    const escapedFile = file.replaceAll(".", "\\.");
    assert.match(server, new RegExp(`"/${route}": "/${escapedFile}"`), route);
    assert.match(server, new RegExp(`"/${route}/"`), route);
    assert.match(redirects, new RegExp(`^/${route}\\s+/${escapedFile}\\s+200!$`, "m"), route);
    assert.match(redirects, new RegExp(`^/${route}/\\s+/${escapedFile}\\s+200!$`, "m"), route);
  }
});

test("velgersidene viser tolv retninger, med de fire nye til slutt", async () => {
  const pages = await Promise.all([read("landing-velger.html"), read("index.html")]);

  pages.forEach((html) => {
    assert.match(html, /Tolv designretninger/);

    for (const { route, number, name } of variants) {
      assert.match(html, new RegExp(`href="/${route}"`), route);
      assert.match(html, new RegExp(`<span class="option-number">${number}</span>`), route);
      assert.match(html, new RegExp(`<strong>${name}</strong>`), route);
    }
  });

  // Begge inngangene skal vise nøyaktig samme utvalg.
  assert.equal(pages[0], pages[1]);
});

test("velgerkortene har egen stil for hver nye retning", async () => {
  const css = await read("landing-velger.css");

  ["kvittering", "meny", "foretter", "sesong"].forEach((key) => {
    assert.match(css, new RegExp(`\\.page-option-${key} `), key);
  });
});

test("hver ny side står på egne filer og lastes med versjonsmerke", async () => {
  for (const { file, css, js } of variants) {
    const html = await read(file);
    const escapedCss = css.replaceAll(".", "\\.");
    const escapedJs = js.replaceAll(".", "\\.");

    assert.match(html, new RegExp(`href="${escapedCss}\\?v=`), file);
    assert.match(html, new RegExp(`src="${escapedJs}\\?v=`), file);

    // Ingen av de nye sidene skal låne stil eller skript fra de gamle.
    assert.doesNotMatch(html, /styles\.css/, file);
    assert.doesNotMatch(html, /script\.js/, file);
  }
});

test("sidene er bygget for både telefon og skjerm", async () => {
  for (const { file, css } of variants) {
    const [html, stylesheet] = await Promise.all([read(file), read(css)]);

    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/, file);
    assert.match(stylesheet, /@media \(min-width: \d+px\)/, css);
    assert.match(stylesheet, /@media \(prefers-reduced-motion: reduce\)/, css);
    // Fleksible mål framfor faste bredder, så oppsettet tåler alle skjermer.
    assert.match(stylesheet, /clamp\(/, css);
  }
});

test("sidene er tilgjengelige: språk, hopp-lenke, fokusmarkering og synlig kontaktinfo", async () => {
  for (const { file, css } of variants) {
    const [html, stylesheet] = await Promise.all([read(file), read(css)]);

    assert.match(html, /<html lang="no">/, file);
    assert.match(html, /class="skip-link" href="#hovedinnhold"/, file);
    assert.match(html, /id="hovedinnhold"/, file);
    assert.match(html, /mailto:post@scopeanalytics\.no/, file);
    assert.match(html, /tel:\+4793637295/, file);
    assert.match(html, /Org\.nr\. 936 372 295|ORG\. 936 372 295/, file);
    assert.match(html, /href="\/cookies\.html"/, file);
    assert.match(stylesheet, /:focus-visible/, css);
  }
});

test("alle fire spør om informasjonskapsler på samme måte som de andre sidene", async () => {
  for (const { file } of variants) {
    const html = await read(file);

    assert.match(html, /cookie-consent\.css\?v=20260718-v1/, file);
    assert.match(html, /data-simple-cookie-consent/, file);
    assert.match(html, /data-cookie-choice="necessary">Kun nødvendige/, file);
    assert.match(html, /data-cookie-choice="all">Godta alle/, file);
    assert.match(html, /cookie-consent\.js\?v=20260718-v1/, file);
  }
});

test("alle fire forteller den samme historien om produktet", async () => {
  for (const { file } of variants) {
    const html = await read(file);

    assert.match(html, /Hent data/, file);
    assert.match(html, /Analyser/, file);
    assert.match(html, /Kvalitetssikre/, file);
    assert.match(html, /testkunder/i, file);
    assert.match(html, /ingen bindingstid/i, file);
  }
});

test("Kvittering skriver ut linjene og kan folde ut hvert råd", async () => {
  const [html, css, javascript] = await Promise.all([
    read("landing-kvittering.html"),
    read("kvittering.css"),
    read("kvittering.js"),
  ]);

  assert.match(html, /Du kan mat\.<br>Vi kan <span class="ink-green">tall\.<\/span>/);
  assert.equal((html.match(/class="advice-toggle"/g) || []).length, 3);
  assert.equal((html.match(/aria-expanded="false"/g) || []).length, 3);
  assert.equal((html.match(/class="advice-why"/g) || []).length, 3);
  assert.match(html, /Eksempeltall for én uke/);
  assert.match(css, /\.print-line\.is-printed/);
  assert.match(css, /\.tape-edge/);
  assert.match(javascript, /IntersectionObserver/);
  assert.match(javascript, /aria-expanded/);
  assert.match(javascript, /nb-NO/);
});

test("Menykortet serverer fire retter og kan bla i anbefalingene", async () => {
  const [html, css, javascript] = await Promise.all([
    read("landing-meny.html"),
    read("meny.css"),
    read("meny.js"),
  ]);

  assert.equal((html.match(/class="course reveal"/g) || []).length, 4);
  assert.match(html, /Første rett &middot; Hent data/);
  assert.match(html, /Til slutt &middot; Rådet/);
  assert.match(html, /data-recommend-prev/);
  assert.match(html, /data-recommend-next/);
  assert.match(html, /aria-live="polite"/);
  assert.match(css, /Cormorant Garamond/);
  assert.match(javascript, /ArrowLeft/);
  assert.match(javascript, /ArrowRight/);
});

test("Før / Etter bruker en ekte skyver som virker med tastatur og touch", async () => {
  const [html, css, javascript] = await Promise.all([
    read("landing-for-etter.html"),
    read("for-etter.css"),
    read("for-etter.js"),
  ]);

  assert.match(html, /type="range"/);
  assert.match(html, /data-compare-range/);
  assert.match(html, /aria-label="Hvor mye av «Med Scope» som vises, i prosent"/);
  assert.match(html, /class="pane pane-before"/);
  assert.match(html, /class="pane pane-after"/);
  assert.match(css, /clip-path: inset\(0 0 0 calc\(var\(--split, 50\) \* 1%\)\)/);
  assert.match(javascript, /setProperty\("--split"/);
});

test("Sesong har tolv måneder i hjulet, og hver måned har sitt eget råd", async () => {
  const [html, css, javascript] = await Promise.all([
    read("landing-sesong.html"),
    read("sesong.css"),
    read("sesong.js"),
  ]);

  // Hjulet ligger statisk i markupen, så det er riktig også uten JavaScript.
  assert.equal((html.match(/class="month"/g) || []).length, 12);
  assert.equal((html.match(/class="month-bar"/g) || []).length, 12);
  assert.equal((html.match(/data-month-button="/g) || []).length, 12);
  assert.match(html, /aria-live="polite"/);
  assert.match(css, /\.month\.is-active \.month-bar/);

  ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"].forEach((key) => {
    assert.match(html, new RegExp(`data-month="${key}"`), key);
    assert.match(javascript, new RegExp(`\\b${key}: \\{`), key);
  });
});

test("de nye sidene rører ikke filene til de andre retningene", async () => {
  const ownFiles = new Set(variants.flatMap(({ file, css, js }) => [file, css, js]));

  for (const name of ownFiles) {
    const contents = await read(name);
    ["landing-3", "landing-enkel", "landing-vakt", "landing-brutal", "landing-kombi", "landing-netflix"].forEach((other) => {
      assert.doesNotMatch(contents, new RegExp(other), `${name} → ${other}`);
    });
  }
});
