import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [html, css, javascript] = await Promise.all([
  readFile(new URL("../landing.html", import.meta.url), "utf8"),
  readFile(new URL("../landing.css", import.meta.url), "utf8"),
  readFile(new URL("../landing.js", import.meta.url), "utf8"),
]);

test("gevinstseksjonen bruker en firekorts-stokk med interaktive kontroller", () => {
  const section = html.match(/<section class="benefits"[\s\S]*?<\/section>/)?.[0] || "";

  assert.match(section, /data-carousel-mode="deck"/);
  assert.equal((section.match(/data-carousel-item/g) || []).length, 4);
  assert.match(section, /data-carousel-prev/);
  assert.match(section, /data-carousel-next/);
  assert.match(javascript, /function initCardDeck\(/);
  assert.match(javascript, /pointerdown/);
  assert.match(css, /benefit-deck-out-left/);
});
