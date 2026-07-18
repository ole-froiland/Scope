import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [html, css] = await Promise.all([
  readFile(new URL("../landing.html", import.meta.url), "utf8"),
  readFile(new URL("../landing.css", import.meta.url), "utf8"),
]);

function fontSizes(selector) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return Array.from(
    css.matchAll(new RegExp(`${escapedSelector}\\s*\\{[^}]*font-size:\\s*([\\d.]+)px`, "g")),
    (match) => Number(match[1])
  );
}

function hasFontSizeAtLeast(selector, minimum) {
  return fontSizes(selector).some((size) => size >= minimum);
}

test("mobilkortene bruker større og mer lesbare illustrasjoner", () => {
  const visualSizes = Array.from(
    css.matchAll(/\.story-visual\s*\{[^}]*height:\s*clamp\((\d+)px,\s*[\d.]+svh,\s*(\d+)px\)/g),
    (match) => ({ minimum: Number(match[1]), maximum: Number(match[2]) })
  );

  assert.ok(visualSizes.some(({ minimum, maximum }) => minimum >= 292 && maximum >= 320));
  assert.ok(hasFontSizeAtLeast(".story-integration small", 10));
  assert.match(css, /\.story-analysis-signal span \{[^}]*overflow-wrap: anywhere/);
  assert.ok(hasFontSizeAtLeast(".story-analysis-clues strong", 13));
  assert.ok(hasFontSizeAtLeast(".story-analysis-insight > strong", 18));
  assert.ok(hasFontSizeAtLeast(".story-analysis-insight > small", 12));
  assert.ok(hasFontSizeAtLeast(".story-quality-stack article > strong", 13));
  assert.ok(hasFontSizeAtLeast(".story-advice-list article div strong", 10.5));
});

test("forklaringsteksten i mobilkortene har lesbar brødtekststørrelse", () => {
  assert.match(css, /\.story-card p:last-child \{ max-width: 34ch; font-size: clamp\(16px, 4\.4vw, 18px\)/);
  assert.match(html, /<section class="story"[^>]*data-sticky-blocker/);
});
