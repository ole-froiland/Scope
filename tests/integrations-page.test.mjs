import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [html, javascript] = await Promise.all([
  readFile(new URL("../integrations.html", import.meta.url), "utf8"),
  readFile(new URL("../script.js", import.meta.url), "utf8"),
]);

test("integrasjonssiden viser komplett katalog med kategorier og status", () => {
  assert.equal((html.match(/data-category=/g) || []).length, 4);
  assert.equal((html.match(/data-panel=/g) || []).length, 4);
  assert.equal((html.match(/class="accounting-card"/g) || []).length, 32);
  assert.equal((html.match(/class="integration-available"/g) || []).length, 4);
  assert.equal((html.match(/class="coming-soon"/g) || []).length, 28);
  assert.doesNotMatch(html, /Finn systemet ditt|Alle integrasjoner på ett sted|integration-legend-soon/);
  assert.match(javascript, /panel\.dataset\.panel === button\.dataset\.category/);
});
