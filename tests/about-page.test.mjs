import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const html = await readFile(new URL("../about.html", import.meta.url), "utf8");

test("Om oss bruker én kort intro og korte founder-biografier", () => {
  assert.doesNotMatch(html, /Bak Scope|Fra tilgjengelige tall til bedre beslutninger|compact-about-story/);
  assert.match(html, /compact-founder-grid compact-founder-grid-direct/);

  const biographies = [...html.matchAll(/<div class="compact-founder-copy">[\s\S]*?<p>(.*?)<\/p><\/div>/g)]
    .map((match) => match[1].replace(/<[^>]+>/g, "").trim());

  assert.equal(biographies.length, 3);
  biographies.forEach((biography) => assert.ok(biography.length < 100));
});
