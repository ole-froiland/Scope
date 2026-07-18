import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const [css, javascript] = await Promise.all([
  readFile(new URL("../landing-3.css", import.meta.url), "utf8"),
  readFile(new URL("../landing-3.js", import.meta.url), "utf8"),
]);

const keyframes = (name) =>
  css.match(new RegExp(`@keyframes ${name} \\{([\\s\\S]*?)\\n\\}`))?.[1] || "";

test("kortanimasjonen følger samme horisontale retning som sveipen", () => {
  assert.match(javascript, /distance <= -45\) animateToCard\(activeIndex \+ 1\)/);
  assert.match(keyframes("scope-card-out-forward"), /translate3d\(-5%, -28px, 0\) rotate\(-2deg\)/);

  assert.match(javascript, /distance >= 45\) animateToCard\(activeIndex - 1\)/);
  assert.match(keyframes("scope-card-out-backward"), /translate3d\(5%, -28px, 0\) rotate\(2deg\)/);
});
