import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const sharedPages = [
  "landing-enkel.html",
  "cookies.html",
  "about.html",
  "customers.html",
  "faq.html",
  "integrations.html",
];

test("alle sider laster den kompakte mobilfooteren uten cachekollisjon", async () => {
  const [landing, landingCss, sharedCss, ...pages] = await Promise.all([
    readFile(new URL("../landing.html", import.meta.url), "utf8"),
    readFile(new URL("../landing.css", import.meta.url), "utf8"),
    readFile(new URL("../styles.css", import.meta.url), "utf8"),
    ...sharedPages.map((page) => readFile(new URL(`../${page}`, import.meta.url), "utf8")),
  ]);

  assert.match(landing, /landing\.css\?v=20260716-contact-data-v1/);
  for (const [index, page] of pages.entries()) {
    const version = sharedPages[index] === "landing-enkel.html"
      ? /styles\.css\?v=20260821-green-logo-v1/
      : /styles\.css\?v=20260729-enkel-panels-v2/;
    assert.match(page, version, sharedPages[index]);
  }

  for (const css of [landingCss, sharedCss]) {
    assert.match(css, /Compact shared footer on phones/);
    assert.match(css, /\.site-footer \.footer-arrow\s*{\s*display:\s*none/);
    assert.match(css, /\.site-footer \.footer-button[\s\S]*?min-height:\s*44px/);
  }
});
