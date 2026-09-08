import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (name) => readFile(new URL(`../${name}`, import.meta.url), "utf8");
const [html, css, arbCss, arbJavascript, mainJavascript] = await Promise.all([
  read("landing-enkel.html"),
  read("enkel-showcase.css"),
  read("enkel-arbeidsflate.css"),
  read("enkel-arbeidsflate.js"),
  read("script.js"),
]);

const arbStart = html.indexOf('<section class="advice-showcase scope-arb"');
const arb = html.slice(arbStart, html.indexOf('<section class="slide" id="how"'));

test("Enkel viser Scope-arbeidsflaten rett under heroen", () => {
  const heroStart = html.indexOf('<section class="slide hero-section"');
  const heroEnd = html.indexOf("</section>", heroStart);
  const howStart = html.indexOf('<section class="slide" id="how"');

  assert.ok(heroStart >= 0 && heroEnd < arbStart && arbStart < howStart);

  // Et vindu med sidepanel, tre kolonner og ni kort.
  assert.match(arb, /class="arb-titlebar"/);
  assert.match(arb, /class="arb-sidebar"/);
  assert.equal((arb.match(/data-arb-col=/g) || []).length, 3);
  assert.equal((arb.match(/data-arb-card="/g) || []).length, 9);
  assert.equal((arb.match(/data-arb-dropzone/g) || []).length, 3);

  // Tre visninger som alle har et ekte panel.
  assert.equal((arb.match(/data-arb-view="/g) || []).length, 3);
  assert.equal((arb.match(/role="tabpanel"/g) || []).length, 3);
  assert.equal((arb.match(/data-arb-panel="/g) || []).length, 3);
  assert.match(arb, /data-arb-panel="liste" hidden/);
  assert.match(arb, /data-arb-panel="tidslinje" hidden/);

  // Én ekte handling ut av flaten, og en ærlig bildetekst under vinduet.
  assert.equal((arb.match(/data-onboarding-open/g) || []).length, 1);
  assert.match(arb, /class="arb-caption">Skjermbildet viser Scope med tall fra en eksempelrestaurant/);

  assert.doesNotMatch(arb, /advice-browser-bar|advice-preview-item|advice-window|notat-/);
  assert.match(html, /href="enkel-arbeidsflate\.css\?v=/);
  assert.match(html, /src="enkel-arbeidsflate\.js\?v=/);
  assert.doesNotMatch(html, /enkel-showcase\.js|enkel-notat\./);
  assert.match(html, /src="assets\/hero-restaurant-clean\.mp4"/);
});

test("tallene på tavlen og i listen går opp", () => {
  const kroner = (value) => Number(value.replace(/\s/g, ""));

  // Kortene i «Nye råd» skal summere til anslaget i undertittelen.
  const nyeStart = arb.indexOf('data-arb-col="nye"');
  const nye = arb.slice(nyeStart, arb.indexOf('data-arb-col="igang"'));
  const anslag = [...nye.matchAll(/class="arb-card-amount">≈ ([\d\s]+) kr</g)].map((m) => kroner(m[1]));
  const undertittel = kroner(/data-arb-new-sum>≈ ([\d\s]+) kr/.exec(arb)[1]);

  assert.equal(anslag.length, 3);
  assert.equal((nye.match(/class="arb-card-amount is-quiet">Ikke tallfestet</g) || []).length, 1);
  assert.equal(anslag.reduce((a, b) => a + b, 0), undertittel);

  // Listevisningens fotrad skal stemme med de målte radene over.
  const malt = [...arb.matchAll(/class="arb-right arb-plus">\+ ([\d\s]+) kr</g)].map((m) => kroner(m[1]));
  const sum = malt.pop();

  assert.equal(malt.length, 3);
  assert.equal(malt.reduce((a, b) => a + b, 0), sum);
});

test("heroen bruker Vanguard med Athelas på den kursiverte kontrasten", () => {
  assert.match(css, /\.hero-section \.hero-content h1\s*\{[^}]*font-family:\s*"Vanguard CF", Vanguard,/s);
  assert.match(css, /\.hero-section \.hero-content h1 em\s*\{[^}]*font-family:\s*Athelas,/s);
  assert.match(html, /<span>Vi kan <em>tall\.<\/em><\/span>/);
});

test("arbeidsflaten ser ut som et program, ikke som en plakat", () => {
  // Vindusramme, sidepanel og hovedflate.
  assert.match(arbCss, /\.enkel-site \.arb-window\s*\{[^}]*border-radius:\s*12px[^}]*background:\s*#ffffff/s);
  assert.match(arbCss, /\.enkel-site \.arb-shell\s*\{[^}]*grid-template-columns:\s*232px minmax\(0, 1fr\)/s);
  assert.match(arbCss, /\.enkel-site \.arb-board\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/s);
  assert.match(arbCss, /\.enkel-site \.arb-card\s*\{[^}]*border-radius:\s*6px[^}]*background:\s*#ffffff/s);

  // Dra-tilstandene finnes i stilarket, ikke bare i skriptet.
  assert.match(arbCss, /\.enkel-site \.arb-card\.is-dragging\s*\{\s*opacity:\s*0\.35/);
  assert.match(arbCss, /\.enkel-site \.arb-col-body\.is-dropzone\s*\{/);
  assert.match(arbCss, /\.enkel-site \.arb-card-ghost\s*\{[^}]*position:\s*fixed/s);

  // Trefargemerket brukes bare i fanemerket i tittellinjen — én forekomst hver.
  assert.equal((arbCss.match(/#064dff/g) || []).length, 1);
  assert.equal((arbCss.match(/#ff3c38/g) || []).length, 1);
  assert.equal((arbCss.match(/#00bd7b/g) || []).length, 1);

  // Alt er scopet, slik at Netflix-varianten beholder sin egen boks.
  assert.doesNotMatch(arbCss, /^\.arb-/m);
  assert.match(css, /\.advice-preview-item\s*\{/);
});

test("arbeidsflaten legger bort sidepanelet og stabler kolonnene på små skjermer", () => {
  assert.match(arbCss, /@media \(max-width: 999px\)[\s\S]*?\.enkel-site \.arb-sidebar\s*\{\s*display:\s*none/s);
  // På smale skjermer blir tavlen en vannrett kanban i stedet for én høy stabel.
  assert.match(arbCss, /@media \(max-width: 999px\)[\s\S]*?\.enkel-site \.arb-board\s*\{[^}]*grid-auto-flow:\s*column[^}]*overflow-x:\s*auto/s);
  assert.match(arbCss, /@media \(max-width: 999px\)[\s\S]*?\.enkel-site \.arb-col\s*\{\s*scroll-snap-align:\s*start/s);
  assert.match(arbCss, /@media \(max-width: 620px\)[\s\S]*?\.enkel-site \.arb-table\s*\{[^}]*overflow-x:\s*auto/s);
  assert.match(arbCss, /@media \(min-width: 1000px\)[\s\S]*?\.enkel-site \.arb-shell\s*\{\s*height:\s*620px/s);
  assert.match(arbCss, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation:\s*none/s);
});

test("kortene kan dras mellom kolonnene, og et råd kan settes i gang", () => {
  // Fanene bytter panel og holder tastaturnavigasjonen i orden.
  assert.match(arbJavascript, /panel\.hidden = panel\.dataset\.arbPanel !== name/);
  assert.match(arbJavascript, /view\.setAttribute\("aria-selected", String\(isActive\)\)/);
  assert.match(arbJavascript, /event\.key !== "ArrowRight" && event\.key !== "ArrowLeft"/);

  // Dra-og-slipp: bare på presise pekere, med terskel før draget starter.
  assert.match(arbJavascript, /window\.matchMedia\("\(pointer: fine\)"\)/);
  assert.match(arbJavascript, /Math\.hypot\(dx, dy\) < 6/);
  assert.match(arbJavascript, /drag\.card\.classList\.add\("is-dragging"\)/);
  assert.match(arbJavascript, /zone\.append\(drag\.card\)/);
  assert.match(arbJavascript, /arbSuppressClick/);

  // «Sett i gang» flytter kortet og oppdaterer tellerne.
  assert.match(arbJavascript, /target\.prepend\(card\)/);
  assert.match(arbJavascript, /toLocaleTimeString\("nb-NO"/);
  assert.match(arbJavascript, /function refreshCounts\(\)/);

  // Råd uten kronesum skal aldri telle med i anslaget.
  assert.match(arbJavascript, /amount\.classList\.contains\("is-quiet"\)/);
  assert.match(arbJavascript, /toLocaleString\("nb-NO"\)/);

  // Grunnlaget bak hvert av de ni rådene ligger i skriptet.
  assert.match(arbJavascript, /const arbDetails = \{/);
  assert.equal((arbJavascript.match(/^\s{4}\d:\s\{$/gm) || []).length, 9);
});

test("produktvisningen viser tre rene og responsive mobilskjermer", () => {
  const demoStart = html.indexOf('<section class="slide" id="demo"');
  const demoEnd = html.indexOf('<div class="demo-legacy-mockup"', demoStart);
  const demo = html.slice(demoStart, demoEnd);

  assert.match(demo, /data-phone-track data-phone-showcase-all aria-label="Tre skjermer fra Scope">/);
  assert.equal((demo.match(/data-phone-tab=/g) || []).length, 3);
  assert.equal((demo.match(/class="phone is-active"/g) || []).length, 1);
  assert.equal((demo.match(/data-phone="(?:advice|home|user)"/g) || []).length, 3);
  assert.doesNotMatch(demo, /demo-launch-link|Åpne demoen/);
  assert.doesNotMatch(demo, /data-phone="(?:home|user)"[^>]*hidden/);
  assert.doesNotMatch(demo, /role="tabpanel"/);
  assert.match(mainJavascript, /!phoneTrack\.hasAttribute\("data-phone-showcase-all"\)/);
  assert.doesNotMatch(mainJavascript, /setActivePhone\(0\)/);
  assert.match(css, /\/\* Clean three-phone product gallery \*\/[\s\S]*?\.phone-tabs\s*\{[^}]*display:\s*none/s);
  assert.match(css, /body:not\(\.is-demo-session\) #how\s*\{[^}]*border-bottom:\s*0/s);
  assert.match(css, /body:not\(\.is-demo-session\) #how\s*\{[^}]*min-height:\s*0[^}]*padding-bottom:\s*clamp\(24px, 3vw, 40px\)/s);
  assert.match(css, /\/\* Clean three-phone product gallery \*\/[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/s);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*?\.phone-track\s*\{[^}]*display:\s*flex[^}]*overflow-x:\s*auto/s);
  assert.match(css, /@media \(max-width: 700px\)[\s\S]*?\.phone-swipe-hint\s*\{[^}]*display:\s*block/s);
});

test("landingssiden viser innholdet rolig og trinnvis ved scrolling", () => {
  assert.match(html, /src="script\.js\?v=20260811-scroll-reveal-v11"/);
  assert.match(html, /<h2 class="demo-stage-label" id="demo-title">Ett klart neste steg\.<\/h2>/);
  assert.match(html, /<p>Råd som gir mer overskudd\.<\/p>/);
  assert.doesNotMatch(html, /Hele driften\.|Innsikt som gjør hverdagen enklere\./);
  assert.match(mainJavascript, /const scopeLandingRevealGroups = \[/);
  assert.match(mainJavascript, /targets: document\.querySelectorAll\("#how \.scope-stack-step, #how \.scope-carousel-progress"\),\s*staggerStep: 90/);
  assert.match(mainJavascript, /targets: document\.querySelectorAll\("#demo \.demo-stage-copy, #demo \.phone"\),\s*staggerStep: 110/);
  assert.match(mainJavascript, /targets: document\.querySelectorAll\("#testkunder \.tester-copy, #testkunder \.tester-detail"\),\s*staggerStep: 110/);
  assert.match(mainJavascript, /const scopeLandingRevealTargets = scopeLandingRevealGroups\.flatMap/);
  assert.match(mainJavascript, /scopeLandingRevealObserver\.observe\(group\.trigger\)/);
  assert.match(css, /\.scope-scroll-reveal\s*\{[^}]*opacity:\s*0[^}]*translate:\s*0 18px[^}]*0\.72s/s);
  assert.match(css, /\.scope-scroll-reveal\.is-scope-reveal-visible\s*\{[^}]*opacity:\s*1[^}]*translate:\s*0 0/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.scope-scroll-reveal\s*\{[^}]*opacity:\s*1[^}]*transition:\s*none/s);
});

test("Slik virker Scope bruker fem store fotokort i en automatisk karusell", () => {
  const howStart = html.indexOf('<section class="slide" id="how"');
  const demoStart = html.indexOf('<section class="slide" id="demo"');
  const how = html.slice(howStart, demoStart);

  assert.equal((how.match(/class="scope-panel-media"/g) || []).length, 5);
  assert.equal((how.match(/assets\/scope-how\/(?:hent-data|analyser|kvalitetssikre|fa-rad)\.jpg/g) || []).length, 4);
  assert.match(how, /assets\/kombi-server-plate\.jpg/);
  assert.equal((how.match(/data-scope-card tabindex="0"/g) || []).length, 5);
  assert.doesNotMatch(how, /scope-panel-art|<svg/);
  assert.doesNotMatch(how, /scope-steps-head|scope-steps-title|<h2>Slik virker Scope<\/h2>/);
  assert.deepEqual([...how.matchAll(/class="scope-panel-num">(\d)<\/span>/g)].map((match) => match[1]), ["1", "2", "3", "4", "5"]);
  assert.match(how, /Koble opp systemene dine/);
  assert.match(how, /under 30 minutter/);
  assert.equal((how.match(/data-scope-dot="[0-4]"/g) || []).length, 5);
  assert.doesNotMatch(how, /Bla gjennom|data-scope-prev|data-scope-next/);
  assert.match(css, /\/\* Large photographic Scope process cards \*\//);
  assert.match(css, /#how \.scope-panel-num\s*\{[^}]*background:\s*transparent[^}]*color:\s*#ffffff/s);
  assert.match(css, /\.scope-panel-media img\s*\{[^}]*object-fit:\s*cover/s);
  assert.match(css, /#how \.scope-panel\.is-active\s*\{[^}]*transform:\s*translateY\(-6px\) scale\(1\.02\)[^}]*border:\s*0[^}]*box-shadow:\s*none/s);
  assert.match(css, /#how \.scope-panel,[\s\S]*?#how \.scope-panel\.is-active\s*\{[^}]*border-radius:\s*0/s);
  assert.match(css, /@media \(min-width: 1100px\)[\s\S]*?#how \.scope-panel,[\s\S]*?aspect-ratio:\s*1 \/ 1\.35/s);
  assert.match(css, /\/\* Flowing five-step restaurant carousel \*\/[\s\S]*?#how \.scope-stack\s*\{[^}]*display:\s*flex[^}]*gap:\s*clamp\(16px, 1\.8vw, 26px\)[^}]*overflow-x:\s*auto/s);
  assert.match(css, /#how \.scope-stack-step\s*\{[^}]*flex:\s*0 0 clamp\(320px, 29vw, 410px\)[^}]*scroll-snap-align:\s*center/s);
  assert.match(css, /#how \.scope-panel-title\s*\{[^}]*font-size:\s*clamp\(2\.1rem, 3\.2vw, 3\.5rem\)/s);
  assert.match(css, /#how \.scope-carousel-progress\s*\{[^}]*justify-content:\s*center/s);
  assert.match(mainJavascript, /restartScopeStackAutoPlay/);
  assert.match(mainJavascript, /window\.setInterval\(\(\) => \{/);
  assert.match(mainJavascript, /scopeStackTrack\.scrollTo\(\{/);
  assert.match(mainJavascript, /setScopeStackActiveIndex\(closestIndex, false\)/);
  assert.match(mainJavascript, /scopeStackAutoDirection = -1/);
  assert.match(mainJavascript, /scopeStackProgressButtons\.forEach\(\(button, index\) => \{/);
  assert.match(mainJavascript, /button\.setAttribute\("aria-current", "step"\)/);
  assert.match(mainJavascript, /card\.addEventListener\("mouseenter", activateCard\)/);
  assert.match(mainJavascript, /card\.addEventListener\("focusin", activateCard\)/);
});

test("toppmenyen skjules ved nedrulling og testkunde-seksjonen bruker dyp blå", () => {
  assert.match(html, /<header class="site-header" data-scroll-hide>/);
  assert.match(html, /src="script\.js\?v=20260811-scroll-reveal-v11"/);
  assert.match(css, /\.site-header\[data-scroll-hide\]\.is-scroll-hidden\s*\{[^}]*transform:\s*translateY\(-105%\)/s);
  assert.match(css, /body\.page-enter \.site-header\[data-scroll-hide\]\.is-scroll-hidden\s*\{[^}]*animation:\s*none[^}]*transform:\s*translateY\(-105%\)/s);
  assert.match(css, /#testkunder\s*\{[^}]*margin-top:\s*clamp\(48px, 5vw, 84px\)[^}]*background:\s*#123a8c/s);
  assert.match(css, /#testkunder\s*\{[^}]*padding-top:\s*clamp\(54px, 5vw, 76px\)[^}]*padding-bottom:\s*clamp\(54px, 5vw, 76px\)/s);
  assert.match(mainJavascript, /siteHeader\?\.matches\("\[data-scroll-hide\]"\)/);
  assert.match(mainJavascript, /currentScrollY > 120 && scrollDelta > 4/);
  assert.match(mainJavascript, /scrollDelta < -4/);
});
