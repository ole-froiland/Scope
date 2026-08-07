import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (name) => readFile(new URL(`../${name}`, import.meta.url), "utf8");
const [html, css, javascript, mainJavascript] = await Promise.all([
  read("landing-enkel.html"),
  read("enkel-showcase.css"),
  read("enkel-showcase.js"),
  read("script.js"),
]);

test("Enkel viser en interaktiv rådsboks rett under heroen", () => {
  const heroStart = html.indexOf('<section class="slide hero-section"');
  const heroEnd = html.indexOf("</section>", heroStart);
  const showcaseStart = html.indexOf('<section class="advice-showcase"');
  const howStart = html.indexOf('<section class="slide" id="how"');
  const showcase = html.slice(showcaseStart, howStart);

  assert.ok(heroStart >= 0 && heroEnd < showcaseStart && showcaseStart < howStart);
  assert.equal((showcase.match(/data-showcase-advice/g) || []).length, 4);
  assert.equal((showcase.match(/aria-pressed="true"/g) || []).length, 1);
  assert.match(html, /id="advice-showcase-detail"/);
  assert.match(html, /class="advice-preview-copy" aria-live="polite"/);
  assert.match(html, /class="advice-preview-cta" href="#onboarding" data-onboarding-open>[\s\S]*?<span>Sett i gang<\/span>/);
  assert.match(html, /href="enkel-showcase\.css\?v=20260806-v55"/);
  assert.equal((showcase.match(/class="advice-item-number"/g) || []).length, 4);
  assert.equal((showcase.match(/data-advice-tone="(?:blue|orange|green|red)"/g) || []).length, 5);
  assert.doesNotMatch(showcase, /Se alle innsikter|advice-all-link/);
  assert.doesNotMatch(showcase, /advice-window-chrome|advice-window-bar|advice-window-brand/);
  assert.match(showcase, /class="advice-browser-bar"/);
  assert.match(showcase, /class="advice-browser-address">scope\.app \/ bistro-kvartalet/);
  assert.doesNotMatch(showcase, /God morgen, Ida|Her er rådene dine for i dag\.|Dagens fire grep/);
  assert.doesNotMatch(showcase, /data-advice-autoplay-toggle|data-advice-autoplay-label|>Auto</);
  assert.doesNotMatch(showcase, /class="advice-workspace-intro"|class="advice-preview-label"/);
  assert.match(showcase, /class="advice-detail-graphic" aria-hidden="true"/);
  assert.match(showcase, /src="assets\/icons\/heroicons-chart-bar-square\.svg"/);
  assert.match(showcase, /class="advice-detail-label" data-advice-label/);
  assert.doesNotMatch(showcase, /class="advice-preview-visual"/);
  assert.match(html, /src="assets\/hero-restaurant-clean\.mp4"/);
  assert.match(html, /src="enkel-showcase\.js\?v=20260804-v5"/);
});

test("rådsboksen følger Enkel-stilen og stabler innholdet på små skjermer", () => {
  assert.match(css, /\.advice-showcase\s*\{[^}]*--advice-showcase-overlap:[^}]*margin-top:\s*calc\(-1 \* var\(--advice-showcase-overlap\)\)/s);
  assert.match(css, /\.hero-section\s*\{[^}]*min-height:\s*calc\(100svh \+ 72px\)/s);
  assert.match(css, /--advice-showcase-overlap:\s*clamp\(120px, 12vw, 176px\)/);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*?\.hero-section\s*\{[^}]*min-height:\s*calc\(100svh \+ 40px\)[\s\S]*?--advice-showcase-overlap:\s*72px/s);
  assert.match(css, /\.advice-showcase-inner\s*\{[^}]*width:\s*min\(1320px, 100%\)/s);
  assert.match(css, /#ffffff var\(--advice-showcase-overlap\)[\s\S]*?#ffffff 100%/);
  assert.match(css, /\.advice-showcase\s*\{[^}]*border-bottom:\s*0/s);
  assert.match(css, /#how\s*\{[^}]*background:\s*#ffffff/s);
  assert.match(css, /\.advice-showcase::after\s*\{[^}]*bottom:\s*0[^}]*height:\s*clamp\(64px, 7vw, 88px\)[^}]*background:\s*#ffffff/s);
  assert.match(css, /\.advice-window\s*\{[^}]*box-shadow:\s*0 20px 58px rgba\(25, 43, 78, 0\.09\)/s);
  assert.match(css, /\.advice-window-chrome\s*\{[^}]*min-height:\s*44px/s);
  assert.match(css, /\.advice-window-bar\s*\{[^}]*min-height:\s*78px[^}]*background:\s*#ffffff/s);
  assert.match(css, /\.advice-preview-item\s*\{[^}]*min-height:\s*82px/s);
  assert.match(css, /\.advice-preview-item\.is-active\s*\{[^}]*background:\s*var\(--advice-soft\)[^}]*box-shadow:\s*inset 4px 0 var\(--advice-accent\)/s);
  assert.match(css, /\.advice-preview-detail\s*\{[^}]*min-height:\s*430px[^}]*background:\s*#ffffff/s);
  assert.match(css, /\.advice-showcase-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 0\.94fr\) minmax\(0, 1\.06fr\)/s);
  assert.match(css, /\.advice-item-number\s*\{[^}]*font-size:\s*1\.65rem/s);
  assert.match(css, /\.advice-preview-cta\s*\{[^}]*background:\s*var\(--advice-accent\)/s);
  assert.match(css, /\.advice-preview-cta span\s*\{[^}]*color:\s*#ffffff/s);
  assert.match(css, /\.header-button\.solid\s*\{[^}]*background:\s*#064dff/s);
  assert.match(css, /\.button\.primary\s*\{[^}]*background:\s*#ff3c38/s);
  assert.match(css, /\.contact-bubble\s*\{[^}]*background:\s*#00bd7b/s);
  assert.match(css, /@media \(min-width: 861px\)[\s\S]*?\.scope-stack\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
  assert.match(css, /@media \(min-width: 1100px\)[\s\S]*?\.scope-stack\s*\{[^}]*grid-template-columns:\s*repeat\(4, minmax\(0, 1fr\)\)/s);
  assert.match(css, /@media \(min-width: 901px\)[\s\S]*?\.advice-window-chrome\s*\{[^}]*min-height:\s*34px[\s\S]*?\.advice-preview-detail\s*\{[^}]*height:\s*420px[^}]*min-height:\s*420px/s);
  assert.match(css, /@media \(min-width: 861px\)[\s\S]*?\.scope-panel,[\s\S]*?position:\s*relative;[^}]*min-height:\s*350px/s);
  assert.match(css, /@media \(max-width: 900px\)[\s\S]*?\.advice-showcase-grid\s*\{[^}]*grid-template-columns:\s*1fr/s);
  assert.match(css, /@media \(max-width: 620px\)[\s\S]*?\.advice-preview-lower\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) 88px/s);
  assert.match(css, /\/\* Refined advice workspace \*\/[\s\S]*?\.advice-preview-list\s*\{[^}]*grid-template-rows:\s*repeat\(4, minmax\(0, 1fr\)\)/s);
  assert.match(css, /\.advice-preview-item\s*\{[^}]*border-radius:\s*14px[^}]*background:\s*color-mix/s);
  assert.match(css, /\.advice-detail-label\s*\{[^}]*background:\s*var\(--advice-soft\)/s);
  assert.match(css, /@media \(min-width: 901px\)[\s\S]*?\.advice-preview-menu,[\s\S]*?height:\s*420px/s);
  assert.match(css, /\/\* Browser workspace layout \*\/[\s\S]*?\.advice-browser-bar\s*\{[^}]*min-height:\s*52px/s);
  assert.match(css, /\/\* Browser workspace layout \*\/[\s\S]*?\.advice-showcase-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 0\.72fr\) minmax\(0, 1\.28fr\)/s);
  assert.match(css, /@media \(min-width: 901px\)[\s\S]*?\.advice-preview-menu,[\s\S]*?height:\s*390px[^}]*min-height:\s*390px/s);
  assert.match(css, /\.advice-item-copy strong\s*\{[^}]*text-overflow:\s*ellipsis[^}]*white-space:\s*nowrap/s);
  assert.match(css, /\/\* Browser workspace final overrides \*\/[\s\S]*?height:\s*390px[^}]*min-height:\s*390px/s);
  assert.match(css, /\/\* White advice cards with a larger active state \*\/[\s\S]*?\.advice-preview-item,[\s\S]*?background:\s*#ffffff/s);
  assert.match(css, /\.advice-preview-item\.is-active,[\s\S]*?transform:\s*scale\(1\.035\)[^}]*box-shadow:\s*inset 4px 0 var\(--advice-accent\)/s);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.advice-preview-item\.is-active,[\s\S]*?transform:\s*none/s);
  assert.match(css, /\/\* Crisp white square advice cards \*\/[\s\S]*?border-radius:\s*0;[^}]*background:\s*#ffffff !important;[^}]*background-image:\s*none/s);
  assert.match(css, /\.advice-preview-item:not\(\.is-active\)\s*\{[^}]*box-shadow:\s*none/s);
  assert.match(css, /\.advice-item-number,[\s\S]*?border-radius:\s*0;[^}]*background:\s*#ffffff/s);
  assert.match(css, /\/\* Square detail card without a visible autoplay control \*\/[\s\S]*?\.advice-preview-detail\s*\{[^}]*border-radius:\s*0/s);
  assert.match(css, /\/\* Compact animated advice workspace \*\/[\s\S]*?\.advice-preview-detail\s*\{[^}]*box-shadow:\s*0 12px 30px/s);
  assert.match(css, /\/\* Compact animated advice workspace \*\/[\s\S]*?\.advice-window\s*\{[^}]*border-radius:\s*24px 24px 0 0/s);
  assert.match(css, /\/\* Compact animated advice workspace \*\/[\s\S]*?height:\s*470px;[^}]*min-height:\s*470px/s);
  assert.match(css, /@keyframes advice-graphic-float/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.advice-detail-graphic \.advice-chart-icon,[\s\S]*?animation:\s*none/s);
});

test("valg av råd oppdaterer detaljene og pressed-tilstanden", () => {
  assert.match(javascript, /adviceShowcaseDetail\?\.querySelector\("\[data-advice-title\]"\)/);
  assert.match(javascript, /item\.classList\.toggle\("is-active", isSelected\)/);
  assert.match(javascript, /item\.setAttribute\("aria-pressed", String\(isSelected\)\)/);
  assert.match(javascript, /adviceShowcaseTitle\.textContent = selectedItem\.dataset\.adviceTitle/);
  assert.match(javascript, /adviceShowcaseLabel\.textContent = selectedItem\.dataset\.adviceLabel/);
  assert.match(javascript, /adviceShowcaseDetail\.dataset\.adviceTone = selectedItem\.dataset\.adviceTone/);
  assert.match(javascript, /window\.setInterval\(\(\) => \{/);
  assert.match(javascript, /const nextIndex = \(selectedIndex \+ 1\) % adviceShowcaseItems\.length/);
  assert.match(javascript, /adviceShowcaseAutoplayToggle\?\.addEventListener\("click"/);
  assert.match(javascript, /adviceShowcaseMotionQuery\.matches/);
});

test("mobilpresentasjonen viser tre telefoner samtidig uten dekorativ bakgrunn", () => {
  const demoStart = html.indexOf('<section class="slide" id="demo"');
  const demoEnd = html.indexOf('<div class="demo-legacy-mockup"', demoStart);
  const demo = html.slice(demoStart, demoEnd);

  assert.match(demo, /data-phone-track data-phone-showcase-all/);
  assert.equal((demo.match(/data-phone-tab=/g) || []).length, 3);
  assert.equal((demo.match(/class="phone is-active"/g) || []).length, 1);
  assert.equal((demo.match(/data-phone="(?:advice|home|user)"/g) || []).length, 3);
  assert.doesNotMatch(demo, /data-phone="(?:home|user)" hidden/);
  assert.match(mainJavascript, /!phoneTrack\.hasAttribute\("data-phone-showcase-all"\)/);
  assert.match(css, /\/\* Three-phone mobile showcase \*\/[\s\S]*?\.demo-product-color\s*\{[^}]*display:\s*none/s);
  assert.match(css, /\/\* Three-phone mobile showcase \*\/[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/s);
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
  assert.match(css, /\/\* Flowing five-step restaurant carousel \*\/[\s\S]*?#how \.scope-stack\s*\{[^}]*display:\s*flex[^}]*gap:\s*clamp\(22px, 2\.2vw, 34px\)[^}]*overflow-x:\s*auto/s);
  assert.match(css, /#how \.scope-stack-step\s*\{[^}]*flex:\s*0 0 clamp\(360px, 34vw, 480px\)[^}]*scroll-snap-align:\s*center/s);
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

test("toppmenyen skjules ved nedrulling og testkunde-seksjonen bruker Scope-blå", () => {
  assert.match(html, /<header class="site-header" data-scroll-hide>/);
  assert.match(html, /src="script\.js\?v=20260806-scroll-header-v8"/);
  assert.match(css, /\.site-header\[data-scroll-hide\]\.is-scroll-hidden\s*\{[^}]*transform:\s*translateY\(-105%\)/s);
  assert.match(css, /body\.page-enter \.site-header\[data-scroll-hide\]\.is-scroll-hidden\s*\{[^}]*animation:\s*none[^}]*transform:\s*translateY\(-105%\)/s);
  assert.match(css, /#testkunder\s*\{[^}]*margin-top:\s*clamp\(48px, 5vw, 84px\)[^}]*background:\s*#064dff/s);
  assert.match(css, /#testkunder\s*\{[^}]*padding-top:\s*clamp\(54px, 5vw, 76px\)[^}]*padding-bottom:\s*clamp\(54px, 5vw, 76px\)/s);
  assert.match(mainJavascript, /siteHeader\?\.matches\("\[data-scroll-hide\]"\)/);
  assert.match(mainJavascript, /currentScrollY > 120 && scrollDelta > 4/);
  assert.match(mainJavascript, /scrollDelta < -4/);
});
