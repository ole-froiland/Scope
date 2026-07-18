import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const ROOT = new URL("..", import.meta.url);

test("mobilutviklingsserveren er tilgjengelig som egen LAN-kommando", async () => {
  const packageJson = JSON.parse(await readFile(new URL("package.json", ROOT), "utf8"));
  const readme = await readFile(new URL("README.md", ROOT), "utf8");

  assert.equal(packageJson.scripts["dev:mobile"], "HOST=0.0.0.0 node server.mjs");
  assert.match(readme, /npm run dev:mobile/);
  assert.match(readme, /http:\/\/<lokal-ip>:4173/);
});
