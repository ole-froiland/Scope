import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const redirects = await readFile(new URL("../_redirects", import.meta.url), "utf8");

test("Netlify serverer de samme korte landingsadressene som devserveren", () => {
  const routes = [
    ["clean", "landing-3.html"],
    ["leken", "landing.html"],
    ["enkel", "landing-enkel.html"],
  ];

  routes.forEach(([route, file]) => {
    assert.match(redirects, new RegExp(`^/${route}/\\s+/${route}\\s+301!$`, "m"));
    assert.match(redirects, new RegExp(`^/${route}\\s+/${file.replace(".", "\\.")}\\s+200$`, "m"));
  });
});
