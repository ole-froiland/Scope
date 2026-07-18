import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createScopeServer } from "../server.mjs";

async function fixture(options = {}) {
  const dataDir = await mkdtemp(path.join(tmpdir(), "scope-admin-test-"));
  const scope = await createScopeServer({
    dataDir,
    bootstrapEmail: "admin@test.no",
    bootstrapPassword: "et-sterkt-testpassord-2026",
    silent: true,
    ...options,
  });
  await new Promise((resolve) => scope.server.listen(0, "127.0.0.1", resolve));
  const address = scope.server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    ...scope,
    baseUrl,
    async cleanup() {
      await scope.close();
      await rm(dataDir, { recursive: true, force: true });
    },
  };
}

async function login(baseUrl) {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@test.no", password: "et-sterkt-testpassord-2026" }),
  });
  const cookie = response.headers.get("set-cookie").split(";")[0];
  return { response, cookie };
}

async function adminSession(baseUrl) {
  const { cookie } = await login(baseUrl);
  const response = await fetch(`${baseUrl}/api/auth/session`, { headers: { Cookie: cookie } });
  const session = await response.json();
  return { cookie, csrfToken: session.csrfToken };
}

async function submitInquiry(baseUrl, values) {
  return fetch(`${baseUrl}/api/inquiries`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ formStartedAt: Date.now() - 2_000, website: "", ...values }),
  });
}

test("hovedlenken lar besøkende velge mellom de tre landingssidene", async () => {
  const scope = await fixture();
  try {
    const response = await fetch(`${scope.baseUrl}/`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /Velg en landingsside/);
    assert.match(html, /href="\/clean">[\s\S]*?Clean/);
    assert.match(html, /href="\/leken">[\s\S]*?Leken/);
    assert.match(html, /href="\/enkel">[\s\S]*?Enkel/);

    const simplePage = await fetch(`${scope.baseUrl}/landing-enkel.html`);
    assert.equal(simplePage.status, 200);
    assert.match(await simplePage.text(), /Du kan/);
  } finally {
    await scope.cleanup();
  }
});

test("designvariantene har korte URL-er, faneikoner og felles tittel", async () => {
  const scope = await fixture();
  try {
    const variants = [
      { path: "/clean", icon: /fill='%230d48a5'%3ES/ },
      { path: "/leken", icon: /%3Ccircle cx='32' cy='20'/ },
      { path: "/enkel", icon: /%3Ccircle cx='32' cy='20'/ },
    ];

    for (const variant of variants) {
      const response = await fetch(`${scope.baseUrl}${variant.path}`);
      assert.equal(response.status, 200, variant.path);
      const html = await response.text();
      assert.match(html, /<title>Scope - AI-rådgivning<\/title>/, variant.path);
      assert.match(html, variant.icon, variant.path);

      const slashResponse = await fetch(`${scope.baseUrl}${variant.path}/`, { redirect: "manual" });
      assert.equal(slashResponse.status, 303, `${variant.path}/`);
      assert.equal(slashResponse.headers.get("location"), variant.path, `${variant.path}/`);
    }
  } finally {
    await scope.cleanup();
  }
});

test("den tredje testlandingssiden er tilgjengelig på egen URL", async () => {
  const scope = await fixture();
  try {
    const response = await fetch(`${scope.baseUrl}/landing-3`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.match(html, /landing-3\.css/);
    assert.match(html, /<script src="landing-3\.js\?v=20260717-nav-chat-v1" defer><\/script>/);
    assert.match(html, /family=Archivo\+Black/);
    assert.match(html, /<img class="brand-logo" src="assets\/scope-logo-blue-transparent\.png" alt="Scope">/);
    assert.match(html, /<source media="\(max-width: 800px\)" srcset="assets\/landing-3-chefs-aprons-mobile\.png">/);
    assert.match(html, /<img src="assets\/landing-3-chefs-aprons\.png" alt="To kokker som smiler på kjøkkenet" fetchpriority="high">/);
    assert.match(html, /<h1 class="hero-title">/);
    assert.match(html, /Vi<\/span> gir rådene som hjelper <span class="scope-blue">deg<\/span> å tjene mer\./);
    assert.equal((html.match(/class="scope-blue"/g) || []).length, 2);
    assert.match(html, /<nav class="desktop-nav"/);
    assert.match(html, /href="\/landing-3-logg-inn\.html">\s*Logg inn/);
    assert.match(html, /class="mobile-menu-toggle"[^>]*aria-controls="mobile-menu"/);
    assert.match(html, /id="mobile-menu"[^>]*role="dialog"[^>]*aria-modal="true"/);
    assert.match(html, /class="mobile-menu-action mobile-menu-login" href="\/landing-3-logg-inn\.html">Logg inn/);
    assert.match(html, /class="mobile-menu-action mobile-menu-trial" href="\/landing-3-test-gratis\.html">Test gratis/);
    assert.match(html, /href="\/landing-3-test-gratis\.html">Test gratis<\/a>/);
    assert.match(html, /href="\/landing-3-book-et-mote\.html">Book et møte<\/a>/);
    assert.match(html, /id="slik-virker-scope"/);
    assert.match(html, /<h2>Slik virker Scope<\/h2>/);
    assert.equal((html.match(/data-carousel-card/g) || []).length, 5);
    assert.equal((html.match(/class="scope-card-copy"/g) || []).length, 5);
    assert.equal((html.match(/data-deck-position=/g) || []).length, 5);
    assert.match(html, /Koble til systemene dine/);
    assert.match(html, /Etterpå henter Scope automatisk/);
    assert.match(html, /AI-agentene våre analyserer/);
    assert.match(html, /Folk som kjenner bransjen/);
    assert.match(html, /Du logger inn og får ferske/);
    assert.doesNotMatch(html, /Fra tall til råd du faktisk kan bruke\./);
    assert.match(html, /id="demo"/);
    assert.doesNotMatch(html, /02 · Se en demo|Se hva Scope fanger opp|Dette er en enkel eksempelvisning/);
    assert.doesNotMatch(html, /class="section-cta demo-cta"/);
    assert.equal((html.match(/class="phone-mockup"/g) || []).length, 3);
    assert.match(html, /aria-label="Scope Råd"/);
    assert.match(html, /aria-label="Scope Nåtid"/);
    assert.match(html, /aria-label="Scope Bruker"/);
    assert.match(html, /UTFØR VALGTE/);
    assert.match(html, /Omsetning i dag/);
    assert.match(html, /Gjester akkurat nå/);
    assert.match(html, /Ansatte på jobb/);
    assert.match(html, /AI-sammendrag:/);
    assert.match(html, /Bookingen er jevn, men vær obs på kveldstoppen/);
    assert.match(html, /Netto besparelse/);
    assert.match(html, /<span>Yr<\/span><b>✓<\/b>/);
    assert.equal((html.match(/class="phone-tab is-active"/g) || []).length, 3);
    assert.match(html, /id="testkunder"/);
    assert.match(html, /Vi søker testkunder/);
    assert.match(html, /Prøv Scope gratis med dine egne tall/);
    assert.match(html, /Ingen forpliktelse eller binding/);
    assert.match(html, /BLI TESTKUNDE/);
    assert.match(html, /class="contact-widget"/);
    assert.match(html, /class="contact-panel" id="contact-panel"/);
    assert.match(html, /class="contact-bubble"[^>]*aria-controls="contact-panel"/);
    assert.equal((html.match(/data-contact-form=/g) || []).length, 2);
    assert.doesNotMatch(html, /Book en prat/);
    assert.doesNotMatch(html, /↗/);
    assert.doesNotMatch(html, /href="(?:customers|integrations|about|faq)\.html"|mailto:/);

    const stylesheetResponse = await fetch(`${scope.baseUrl}/landing-3.css`);
    assert.equal(stylesheetResponse.status, 200);
    const stylesheet = await stylesheetResponse.text();
    assert.match(stylesheet, /font-family: "Archivo Black"/);
    assert.match(stylesheet, /text-align: center/);
    assert.match(stylesheet, /font-size: clamp\(3\.4rem, 7vw, 7\.8rem\)/);
    assert.match(stylesheet, /transform: translate\(-50%, -50%\)/);
    assert.match(stylesheet, /scope-card-olive/);
    assert.match(stylesheet, /scope-card-terracotta/);
    assert.match(stylesheet, /scope-card-cream/);
    assert.match(stylesheet, /border-radius: 48px/);
    assert.match(stylesheet, /data-deck-position="4"/);
    assert.match(stylesheet, /@keyframes scope-card-out-forward/);
    assert.match(stylesheet, /@keyframes scope-card-out-backward/);
    assert.match(stylesheet, /translate3d\(-5%, -28px, 0\)/);
    assert.doesNotMatch(stylesheet, /rotateY|scope-flip/);
    assert.match(stylesheet, /#f5f0e1/);
    assert.match(stylesheet, /#1a5276/);
    assert.match(stylesheet, /#d4a843/);
    assert.match(stylesheet, /#3f7f4c/);
    assert.match(stylesheet, /aspect-ratio: 6 \/ 13/);
    assert.match(stylesheet, /scroll-snap-type: x mandatory/);
    assert.match(stylesheet, /flex: 0 0 min\(84vw, 320px\)/);
    assert.match(stylesheet, /\.contact-widget \{[^}]*position: fixed/);
    assert.match(stylesheet, /@media \(max-width: 800px\)[\s\S]*?\.mobile-menu \{[^}]*position: fixed;[^}]*inset: 0;/);
    assert.match(stylesheet, /@media \(max-width: 800px\)[\s\S]*?\.brand-logo \{ width: 116px;/);

    const carouselScriptResponse = await fetch(`${scope.baseUrl}/landing-3.js`);
    assert.equal(carouselScriptResponse.status, 200);
    const carouselScript = await carouselScriptResponse.text();
    assert.match(carouselScript, /IntersectionObserver/);
    assert.match(carouselScript, /ArrowLeft/);
    assert.match(carouselScript, /ArrowRight/);
    assert.match(carouselScript, /dataset\.deckPosition/);
    assert.match(carouselScript, /pointerdown/);
    assert.match(carouselScript, /pointerup/);
    assert.match(carouselScript, /animateToCard/);
    assert.match(carouselScript, /is-card-out-/);
    assert.doesNotMatch(carouselScript, /is-flip-/);
    assert.match(carouselScript, /prefers-reduced-motion/);
    assert.match(carouselScript, /initMobileMenu/);
    assert.match(carouselScript, /initContactWidget/);
    assert.match(carouselScript, /fetch\("\/api\/inquiries"/);

    const testPages = [
      "/landing-3-kunder.html",
      "/landing-3-integrasjoner.html",
      "/landing-3-om-oss.html",
      "/landing-3-faq.html",
      "/landing-3-book-en-prat.html",
      "/landing-3-logg-inn.html",
      "/landing-3-test-gratis.html",
      "/landing-3-book-et-mote.html",
    ];
    for (const page of testPages) {
      const pageResponse = await fetch(`${scope.baseUrl}${page}`);
      assert.equal(pageResponse.status, 200);
      const pageHtml = await pageResponse.text();
      assert.match(pageHtml, /<body><\/body>/);
      assert.doesNotMatch(pageHtml, /site-header|landing-3\.css/);
    }

    const styles = await fetch(`${scope.baseUrl}/landing-3.css`);
    assert.equal(styles.status, 200);
    const css = await styles.text();
    assert.match(css, /\.site-header[\s\S]*?background: transparent;/);
    assert.doesNotMatch(css, /backdrop-filter/);
    assert.match(css, /\.desktop-nav a \{[^}]*color: #fff;/);
    assert.doesNotMatch(css, /\.desktop-nav a \{[^}]*border-radius:/);
    assert.match(css, /\.desktop-nav a::after/);
    assert.match(css, /\.hero-image \{[^}]*height: 100vh;[^}]*height: 100dvh;/);
    assert.match(css, /\.hero-image img \{[^}]*height: 100%;[^}]*object-fit: cover;/);
    assert.doesNotMatch(css, /\.hero-image img \{[^}]*height: 100svh;/);
    assert.match(css, /@media \(max-width: 800px\)[\s\S]*?\.hero-image img \{[^}]*transform: scale\(1\.45\);/);
    assert.match(css, /\.hero-image::after \{[^}]*linear-gradient/);
  } finally {
    await scope.cleanup();
  }
});

test("adminruten sender en anonym bruker til separat innlogging", async () => {
  const scope = await fixture();
  try {
    const response = await fetch(`${scope.baseUrl}/admin`, { redirect: "manual" });
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), "/admin/login");

    const loginPage = await fetch(`${scope.baseUrl}/admin/login`);
    assert.equal(loginPage.status, 200);
    assert.match(await loginPage.text(), /Logg inn med administratorkontoen din/);

    const loginScript = await fetch(`${scope.baseUrl}/admin/assets/login.js`);
    assert.equal(loginScript.status, 200);
  } finally {
    await scope.cleanup();
  }
});

test("innlogging bruker sikker serverøkt og håndhever CSRF", async () => {
  const scope = await fixture();
  try {
    const rejected = await fetch(`${scope.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@test.no", password: "feil-passord" }),
    });
    assert.equal(rejected.status, 401);

    const { response, cookie } = await login(scope.baseUrl);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("set-cookie"), /HttpOnly/);
    assert.match(response.headers.get("set-cookie"), /SameSite=Strict/);

    const page = await fetch(`${scope.baseUrl}/admin`, { headers: { Cookie: cookie } });
    assert.equal(page.status, 200);
    assert.match(await page.text(), /Scope admin/);

    const sessionResponse = await fetch(`${scope.baseUrl}/api/auth/session`, { headers: { Cookie: cookie } });
    const session = await sessionResponse.json();
    assert.equal(session.user.role, "admin");
    assert.ok(session.csrfToken);

    const noCsrf = await fetch(`${scope.baseUrl}/api/admin/customers`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ company: "Test", contact: "Test", email: "test@example.no" }),
    });
    assert.equal(noCsrf.status, 403);

    const created = await fetch(`${scope.baseUrl}/api/admin/customers`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json", "X-CSRF-Token": session.csrfToken },
      body: JSON.stringify({ company: "Test Bistro", contact: "Test Person", email: "test@example.no", type: "Restaurant", locations: 2 }),
    });
    assert.equal(created.status, 201);
    assert.equal((await created.json()).company, "Test Bistro");
    assert.equal(scope.store.state.customers[0].company, "Test Bistro");

    const auditedExport = await fetch(`${scope.baseUrl}/api/admin/audit-events`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json", "X-CSRF-Token": session.csrfToken },
      body: JSON.stringify({ type: "customers" }),
    });
    assert.equal(auditedExport.status, 201);
    assert.equal((await auditedExport.json()).action, "Eksporterte kundeliste");
  } finally {
    await scope.cleanup();
  }
});

test("serveren avviser bruker uten adminrolle og skjuler private filer", async () => {
  const scope = await fixture();
  try {
    const { cookie } = await login(scope.baseUrl);
    scope.store.users[0].role = "viewer";

    const page = await fetch(`${scope.baseUrl}/admin`, { headers: { Cookie: cookie } });
    assert.equal(page.status, 403);
    assert.match(await page.text(), /Ingen tilgang/);

    const logoutScript = await fetch(`${scope.baseUrl}/admin/assets/access-denied.js`, { headers: { Cookie: cookie } });
    assert.equal(logoutScript.status, 200);

    const apiResponse = await fetch(`${scope.baseUrl}/api/admin/state`, { headers: { Cookie: cookie } });
    assert.equal(apiResponse.status, 403);
    assert.deepEqual(await apiResponse.json(), { error: "Ingen tilgang" });

    const privateFile = await fetch(`${scope.baseUrl}/admin-private/index.html`);
    assert.equal(privateFile.status, 404);
  } finally {
    await scope.cleanup();
  }
});

test("generert bootstrap-passord lagres restriktivt og slettes etter innlogging", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "scope-admin-bootstrap-test-"));
  const scope = await createScopeServer({ dataDir, bootstrapEmail: "admin@test.no", silent: true });
  await new Promise((resolve) => scope.server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${scope.server.address().port}`;
  const credentialsPath = path.join(dataDir, "bootstrap-credentials.txt");
  try {
    const credentialsStat = await stat(credentialsPath);
    assert.equal(credentialsStat.mode & 0o777, 0o600);

    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@test.no", password: scope.bootstrapPassword }),
    });
    assert.equal(response.status, 200);
    await assert.rejects(stat(credentialsPath), { code: "ENOENT" });
  } finally {
    await scope.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("offentlig kundespørsmål valideres, får referanse og kan ikke leses offentlig", async () => {
  const scope = await fixture();
  try {
    assert.equal(scope.store.state.customers.length, 0);
    assert.equal(scope.store.state.inquiries.length, 0);

    const invalid = await submitInquiry(scope.baseUrl, {
      inquiryType: "customer", name: "Kari Nordmann", company: "Kari Kafé", email: "ikke-en-epost",
      subject: "Innlogging", category: "Innlogging", message: "Jeg kommer ikke inn.",
    });
    assert.equal(invalid.status, 400);

    const created = await submitInquiry(scope.baseUrl, {
      inquiryType: "customer", name: "Kari Nordmann", company: "Kari Kafé", email: "kari@example.no",
      phone: "+47 900 00 000", subject: "Får ikke logget inn", category: "Innlogging", message: "Jeg får beskjed om feil passord.",
    });
    assert.equal(created.status, 201);
    const result = await created.json();
    assert.match(result.referenceNumber, /^SC-[A-F0-9]{4}$/);
    assert.equal(scope.store.state.inquiries[0].referenceNumber, result.referenceNumber);
    assert.equal(scope.store.state.inquiries[0].history[0].action, "Henvendelse mottatt");
    assert.equal(scope.store.state.customers.length, 0);

    const publicRead = await fetch(`${scope.baseUrl}/api/inquiries`);
    assert.equal(publicRead.status, 404);
    const adminRead = await fetch(`${scope.baseUrl}/api/admin/state`);
    assert.equal(adminRead.status, 401);
  } finally {
    await scope.cleanup();
  }
});

test("leadskjema oppretter kunde og henvendelse i samme persistente datatilstand", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "scope-admin-persistence-test-"));
  let scope = await createScopeServer({ dataDir, bootstrapEmail: "admin@test.no", bootstrapPassword: "et-sterkt-testpassord-2026", silent: true });
  await new Promise((resolve) => scope.server.listen(0, "127.0.0.1", resolve));
  try {
    const baseUrl = `http://127.0.0.1:${scope.server.address().port}`;
    const created = await submitInquiry(baseUrl, {
      inquiryType: "prospect", name: "Per Hansen", company: "Brygga Bar", email: "per@brygga.no", phone: "",
      businessType: "Bar", locations: 3, systems: ["Lightspeed", "Tamigo"], message: "Vi vil samle rapporteringen.",
    });
    assert.equal(created.status, 201);
    const result = await created.json();
    assert.equal(scope.store.state.customers.length, 1);
    assert.equal(scope.store.state.inquiries.length, 1);
    assert.equal(scope.store.state.customers[0].status, "Ny");
    assert.deepEqual(scope.store.state.customers[0].systems, ["Lightspeed", "Tamigo"]);
    assert.equal(scope.store.state.inquiries[0].customerId, result.customerId);
    assert.equal(scope.store.state.inquiries[0].status, "Ny");

    await scope.close();
    scope = await createScopeServer({ dataDir, bootstrapEmail: "admin@test.no", bootstrapPassword: "et-sterkt-testpassord-2026", silent: true });
    assert.equal(scope.store.state.customers[0].company, "Brygga Bar");
    assert.equal(scope.store.state.inquiries[0].referenceNumber, result.referenceNumber);
  } finally {
    if (scope.server.listening) await scope.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("spamvern bruker honeypot, tidskontroll og rate limiting", async () => {
  const scope = await fixture();
  try {
    const tooFast = await fetch(`${scope.baseUrl}/api/inquiries`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formStartedAt: Date.now(), inquiryType: "customer" }),
    });
    assert.equal(tooFast.status, 400);

    const bot = await fetch(`${scope.baseUrl}/api/inquiries`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ formStartedAt: Date.now() - 2_000, website: "https://spam.invalid" }),
    });
    assert.equal(bot.status, 202);
    assert.equal(scope.store.state.inquiries.length, 0);

    for (let index = 0; index < 5; index += 1) {
      const response = await submitInquiry(scope.baseUrl, {
        inquiryType: "customer", name: `Person ${index}`, company: "Test", email: `person${index}@example.no`,
        subject: "Spørsmål", category: "Annet", message: "Dette er en gyldig testmelding.",
      });
      assert.equal(response.status, 201);
    }
    const limited = await submitInquiry(scope.baseUrl, {
      inquiryType: "customer", name: "En til", company: "Test", email: "til@example.no",
      subject: "Spørsmål", category: "Annet", message: "Dette skal bli avvist av rate limit.",
    });
    assert.equal(limited.status, 429);
  } finally {
    await scope.cleanup();
  }
});

test("administratorendringer, notat og utkast lagres i henvendelseshistorikken", async () => {
  const scope = await fixture();
  try {
    await submitInquiry(scope.baseUrl, {
      inquiryType: "customer", name: "Kari Nordmann", company: "Kari Kafé", email: "kari@example.no",
      subject: "Rapport mangler", category: "Rapport", message: "Jeg finner ikke månedsrapporten.",
    });
    const inquiry = scope.store.state.inquiries[0];
    const { cookie, csrfToken } = await adminSession(scope.baseUrl);
    const headers = { Cookie: cookie, "Content-Type": "application/json", "X-CSRF-Token": csrfToken };

    const patched = await fetch(`${scope.baseUrl}/api/admin/inquiries/${inquiry.id}`, {
      method: "PATCH", headers,
      body: JSON.stringify({ status: "Under behandling", priority: "Høy", owner: "Scope-administrator", note: "Følger opp rapportkjøringen." }),
    });
    assert.equal(patched.status, 200);
    assert.equal(inquiry.status, "Under behandling");
    assert.ok(inquiry.history.some((item) => item.action === "Ansvarlig tildelt"));
    assert.ok(inquiry.history.some((item) => item.action === "Internt notat lagt til"));

    const draft = await fetch(`${scope.baseUrl}/api/admin/inquiries/${inquiry.id}/replies`, {
      method: "POST", headers, body: JSON.stringify({ action: "send", message: "Hei! Vi undersøker rapporten og følger opp snart." }),
    });
    assert.equal(draft.status, 200);
    const draftResult = await draft.json();
    assert.equal(draftResult.delivered, false);
    assert.equal(draftResult.configurationRequired, true);
    assert.equal(inquiry.replies[0].status, "Utkast");
    assert.equal(inquiry.status, "Under behandling");
  } finally {
    await scope.cleanup();
  }
});

test("konfigurert e-postleverandør sender svar og markerer henvendelsen besvart", async () => {
  const deliveries = [];
  const scope = await fixture({ emailSender: async (message) => deliveries.push(message) });
  try {
    await submitInquiry(scope.baseUrl, {
      inquiryType: "customer", name: "Ola Nordmann", company: "Ola Restaurant", email: "ola@example.no",
      subject: "Faktura", category: "Faktura", message: "Kan jeg få fakturakopi?",
    });
    const inquiry = scope.store.state.inquiries[0];
    const { cookie, csrfToken } = await adminSession(scope.baseUrl);
    const response = await fetch(`${scope.baseUrl}/api/admin/inquiries/${inquiry.id}/replies`, {
      method: "POST",
      headers: { Cookie: cookie, "Content-Type": "application/json", "X-CSRF-Token": csrfToken },
      body: JSON.stringify({ action: "send", message: "Hei! Vi sender fakturakopien separat." }),
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).delivered, true);
    assert.equal(deliveries.length, 1);
    assert.equal(deliveries[0].to, "ola@example.no");
    assert.equal(inquiry.status, "Besvart");
    assert.equal(inquiry.replies[0].status, "Sendt");
    assert.ok(inquiry.history.some((item) => item.action === "Svar sendt"));
  } finally {
    await scope.cleanup();
  }
});
