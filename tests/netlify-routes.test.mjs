import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const redirects = await readFile(new URL("../_redirects", import.meta.url), "utf8");

test("Netlify serverer de samme korte landingsadressene som devserveren", () => {
  const routes = [
    ["clean", "landing-3.html"],
    ["leken", "landing.html"],
    ["enkel", "landing-enkel.html"],
    ["vakt", "landing-vakt.html"],
    ["brutal", "landing-brutal.html"],
    ["kombi", "landing-kombi.html"],
  ];

  routes.forEach(([route, file]) => {
    const escapedFile = file.replace(".", "\\.");
    assert.match(redirects, new RegExp(`^/${route}\\s+/${escapedFile}\\s+200!$`, "m"));
    assert.match(redirects, new RegExp(`^/${route}/\\s+/${escapedFile}\\s+200!$`, "m"));
  });
});
