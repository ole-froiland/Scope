import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [html, css, javascript] = await Promise.all([
  readFile(new URL("../landing-enkel.html", import.meta.url), "utf8"),
  readFile(new URL("../styles.css", import.meta.url), "utf8"),
  readFile(new URL("../script.js", import.meta.url), "utf8"),
]);

test("mobilappen bruker egen komposisjon og fire valg i bunnmenyen", () => {
  assert.match(html, /class="scope-mobile-app" data-scope-mobile-app/);
  assert.equal((html.match(/data-mobile-nav=/g) || []).length, 4);
  assert.match(html, /data-mobile-nav="overview"[\s\S]*?>Nå</);
  assert.match(html, /data-mobile-nav="reports"[\s\S]*?>Rapporter</);
  assert.match(html, /data-mobile-nav="advice"[\s\S]*?>Råd</);
  assert.match(html, /data-mobile-nav="more"[\s\S]*?>Mer</);
  assert.match(css, /@media \(max-width: 767px\)[\s\S]*?\.is-demo-session \.demo-browser-content\s*\{\s*display: none !important;/);
  assert.match(css, /\.scope-mobile-nav\s*\{[\s\S]*?env\(safe-area-inset-bottom\)/);
});

test("mobilvisningene gjenbruker produktdata og beholder valgt side", () => {
  assert.match(javascript, /scopeReports\s*\.filter/);
  assert.match(javascript, /scopeAdvice\.filter/);
  assert.match(javascript, /connectedIntegrationIds\(\)/);
  assert.match(javascript, /writeScopeDemoState\(\{ mobileView \}\)/);
  assert.match(javascript, /mobileScrollPositions\[mobileView\]/);
  assert.match(javascript, /window\.addEventListener\("popstate"/);
});

test("mobilrapporten støtter story, sveip og pause", () => {
  assert.match(javascript, /function renderMobileStory\(\)/);
  assert.match(javascript, /data-mobile-story-prev/);
  assert.match(javascript, /data-mobile-story-next/);
  assert.match(javascript, /data-mobile-pause-story/);
  assert.match(javascript, /mobileStory\.addEventListener\("touchstart"/);
  assert.match(javascript, /mobileStory\.addEventListener\("touchend"/);
});
