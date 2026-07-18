import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const javascript = await readFile(new URL("../landing.js", import.meta.url), "utf8");

test("heroanimasjonen starter også i kompakt mobilvisning", () => {
  const animationSetup = javascript.match(
    /if \(hasMotion && hasGsap\) \{([\s\S]*?)initStoryCards\(\);/
  )?.[1] || "";

  assert.match(animationSetup, /if \(!compactViewport\.matches\) \{\s*initSceneMotion\(\);\s*\}/);
  assert.match(animationSetup, /\}\s*initHeroWorld\(\);/);
});

test("mobilbanen holder kortene innenfor animasjonsflaten", () => {
  assert.match(javascript, /const widestSource = Math\.max\(\.\.\.sourceRects/);
  assert.match(
    javascript,
    /const radiusX = compactOrbit\s*\? Math\.max\(0, \(worldRect\.width - widestSource\) \/ 2 - 8\) \* Math\.SQRT2/
  );
});

test("mobilkortene roterer mellom hjørnene i en firkant", () => {
  assert.match(javascript, /const orbitStartAngle = compactOrbit \? -135 : -90/);
  assert.match(javascript, /pointAt\(orbitStartAngle \+ slotIndex \* 90/);
  assert.match(javascript, /const startAngle = orbitStartAngle \+ fromSlot \* 90/);
});
