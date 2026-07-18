import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createScopeServer } from "../server.mjs";
import { aggregatePostings } from "../server/sync-service.mjs";
import { encryptSecret, decryptSecret, secretHint } from "../server/secret-vault.mjs";
import { randomBytes } from "node:crypto";

const CONSUMER_TOKEN = "ct-test-consumer-token";
const EMPLOYEE_TOKEN = "emp-token-gyldig-abcdef123456";

// En lokal testdobbel for Tripletex sitt API. Testene går gjennom ekte HTTP-kall
// mot denne, slik at ingen suksess i flyten er simulert i selve Scope-koden.
async function createFakeTripletex() {
  const state = { failAccounts: false, sessions: new Set(), postings: [
    { account: { number: 3000 }, amount: -100000 },
    { account: { number: 3010 }, amount: -50000 },
    { account: { number: 4000 }, amount: 30000 },
    { account: { number: 5000 }, amount: 40000 },
    { account: { number: 6300 }, amount: 20000 },
  ] };
  const companies = [
    { id: 10, name: "Warm Burger AS", organizationNumber: "936372295" },
    { id: 11, name: "Kald Kaffe AS", organizationNumber: "987654325" },
  ];

  function authorized(request) {
    const header = request.headers.authorization || "";
    if (!header.startsWith("Basic ")) return false;
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const session = decoded.slice(decoded.indexOf(":") + 1);
    return state.sessions.has(session);
  }

  const server = createServer((request, response) => {
    const url = new URL(request.url, "http://fake.tripletex.local");
    const pathname = decodeURIComponent(url.pathname);
    const send = (status, body) => {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(body));
    };

    if (request.method === "PUT" && pathname === "/v2/token/session/:create") {
      if (url.searchParams.get("consumerToken") !== CONSUMER_TOKEN || url.searchParams.get("employeeToken") !== EMPLOYEE_TOKEN) {
        return send(401, { message: "Ugyldig token" });
      }
      const token = `sess-${randomBytes(8).toString("hex")}`;
      state.sessions.add(token);
      return send(200, { value: { token, expirationDate: url.searchParams.get("expirationDate") } });
    }
    if (!authorized(request)) return send(401, { message: "Ikke autentisert" });

    if (request.method === "GET" && pathname === "/v2/token/session/>whoAmI") {
      return send(200, { value: { employee: { id: 1, firstName: "Test" }, company: companies[0] } });
    }
    if (request.method === "GET" && pathname === "/v2/company/>withLoginAccess") {
      return send(200, { values: companies });
    }
    const companyMatch = pathname.match(/^\/v2\/company\/(\d+)$/);
    if (request.method === "GET" && companyMatch) {
      const company = companies.find((item) => item.id === Number(companyMatch[1]));
      return company ? send(200, { value: company }) : send(404, { message: "Company not found" });
    }
    if (request.method === "GET" && pathname === "/v2/ledger/account") {
      if (state.failAccounts) return send(403, { message: "Missing accounting permission" });
      return send(200, { values: [
        { id: 1, number: 3000, name: "Salgsinntekt" },
        { id: 2, number: 4000, name: "Varekjøp" },
        { id: 3, number: 5000, name: "Lønn" },
        { id: 4, number: 6300, name: "Leie lokale" },
      ] });
    }
    if (request.method === "GET" && pathname === "/v2/department") {
      return send(200, { values: [{ id: 1, name: "Oslo sentrum" }] });
    }
    if (request.method === "GET" && pathname === "/v2/ledger/posting") {
      const from = Number(url.searchParams.get("from")) || 0;
      const count = Number(url.searchParams.get("count")) || 1000;
      return send(200, { values: state.postings.slice(from, from + count), fullResultSize: state.postings.length });
    }
    if (request.method === "DELETE" && pathname === "/v2/token/session") {
      return send(200, {});
    }
    return send(404, { message: "Unknown endpoint" });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    state,
    apiBase: `http://127.0.0.1:${server.address().port}/v2`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

async function fixture(options = {}) {
  const fake = await createFakeTripletex();
  const dataDir = await mkdtemp(path.join(tmpdir(), "scope-onboarding-test-"));
  const scope = await createScopeServer({
    dataDir,
    bootstrapEmail: "admin@test.no",
    bootstrapPassword: "et-sterkt-testpassord-2026",
    silent: true,
    tripletex: {
      defaultEnvironment: "test",
      environments: { test: { apiBase: fake.apiBase, consumerToken: CONSUMER_TOKEN, ...(options.activationUrl ? { activationUrl: options.activationUrl } : {}) } },
    },
    ...options.serverOptions,
  });
  await new Promise((resolve) => scope.server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${scope.server.address().port}`;
  return {
    ...scope,
    fake,
    baseUrl,
    dataDir,
    async cleanup() {
      await scope.close();
      await fake.close();
      await rm(dataDir, { recursive: true, force: true });
    },
  };
}

async function adminSession(baseUrl) {
  const login = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@test.no", password: "et-sterkt-testpassord-2026" }),
  });
  const cookie = login.headers.get("set-cookie").split(";")[0];
  const session = await (await fetch(`${baseUrl}/api/auth/session`, { headers: { Cookie: cookie } })).json();
  return { cookie, csrfToken: session.csrfToken };
}

async function adminInvite(scope, values = {}) {
  const admin = await adminSession(scope.baseUrl);
  const response = await fetch(`${scope.baseUrl}/api/admin/onboarding/invite`, {
    method: "POST",
    headers: { Cookie: admin.cookie, "Content-Type": "application/json", "X-CSRF-Token": admin.csrfToken },
    body: JSON.stringify({ company: "Warm Burger AS", contact: "Kari Eier", email: "kari@warmburger.no", orgNumber: "936372295", ...values }),
  });
  assert.equal(response.status, 201);
  const result = await response.json();
  return { ...result, admin };
}

function inviteTokenFrom(inviteUrl) {
  return new URL(inviteUrl).searchParams.get("invite");
}

async function claim(scope, inviteUrl, email = "kari@warmburger.no") {
  const response = await fetch(`${scope.baseUrl}/api/onboarding/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: inviteTokenFrom(inviteUrl), email }),
  });
  const body = await response.json();
  const cookie = response.headers.get("set-cookie")?.split(";")[0] || "";
  return { response, body, cookie, csrfToken: body.csrfToken };
}

function customerApi(scope, session) {
  return async (pathname, options = {}) => {
    const response = await fetch(`${scope.baseUrl}${pathname}`, {
      ...options,
      headers: {
        Cookie: session.cookie,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.method && options.method !== "GET" ? { "X-CSRF-Token": session.csrfToken } : {}),
      },
    });
    return { response, body: await response.json().catch(() => ({})) };
  };
}

async function waitFor(check, timeoutMs = 8000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (check()) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return false;
}

async function completeToTestStep(scope, session) {
  const call = customerApi(scope, session);
  const profile = await call("/api/onboarding/profile", {
    method: "POST",
    body: JSON.stringify({ company: "Warm Burger AS", orgNumber: "936372295", businessType: "Restaurant", locations: 2, contact: "Kari Eier", email: "kari@warmburger.no", phone: "+47 900 00 000" }),
  });
  assert.equal(profile.response.status, 200);
  const connect = await call("/api/onboarding/tripletex/connect", { method: "POST", body: JSON.stringify({ apiToken: EMPLOYEE_TOKEN }) });
  assert.equal(connect.response.status, 200);
  const company = await call("/api/onboarding/company", { method: "POST", body: JSON.stringify({ companyId: 10 }) });
  assert.equal(company.response.status, 200);
  const scopes = await call("/api/onboarding/datascopes", { method: "POST", body: JSON.stringify({ scopes: ["payroll", "departments"] }) });
  assert.equal(scopes.response.status, 200);
  return { call, state: scopes.body.state };
}

test("hele onboardingflyten: invitasjon → Tripletex → test → synkronisering → ferdig", async () => {
  const scope = await fixture();
  try {
    const invited = await adminInvite(scope);
    assert.equal(invited.emailSent, false);
    assert.match(invited.inviteUrl, /\/onboarding\?invite=/);
    assert.equal(scope.store.state.onboardings[0].status, "Venter på kunde");

    // Feil e-post avvises – lenken er knyttet til den inviterte brukeren.
    const wrongEmail = await claim(scope, invited.inviteUrl, "feil@epost.no");
    assert.equal(wrongEmail.response.status, 403);

    const session = await claim(scope, invited.inviteUrl);
    assert.equal(session.response.status, 200);
    assert.match(session.cookie, /scope_onboarding_session=/);
    assert.equal(session.body.state.step, "welcome");
    assert.equal(session.body.state.profile.company, "Warm Burger AS");
    assert.equal(scope.store.state.onboardings[0].status, "Pågår");

    const { call, state } = await completeToTestStep(scope, session);
    assert.equal(state.step, "test");
    assert.deepEqual(state.selectedScopes, ["accounting", "revenue", "costs", "payroll", "departments"]);
    assert.equal(state.connection.status, "Tilkoblet");
    assert.match(state.connection.credentialHint, /^••••/);

    // Ugyldig token gir en vennlig, oversatt feil – ikke rå API-tekst.
    const badToken = await call("/api/onboarding/tripletex/connect", { method: "POST", body: JSON.stringify({ apiToken: "helt-feil-token-123456" }) });
    assert.equal(badToken.response.status, 502);
    assert.equal(badToken.body.error, "Tokenet er ikke gyldig.");
    assert.ok(Array.isArray(badToken.body.help));

    // Koble til på nytt med gyldig token før vi fortsetter.
    const reconnect = await call("/api/onboarding/tripletex/connect", { method: "POST", body: JSON.stringify({ apiToken: EMPLOYEE_TOKEN }) });
    assert.equal(reconnect.response.status, 200);
    const reselect = await call("/api/onboarding/company", { method: "POST", body: JSON.stringify({ companyId: 10 }) });
    assert.equal(reselect.response.status, 200);

    // Selskap med annet organisasjonsnummer krever eksplisitt bekreftelse.
    const mismatch = await call("/api/onboarding/company", { method: "POST", body: JSON.stringify({ companyId: 11 }) });
    assert.equal(mismatch.response.status, 409);
    assert.equal(mismatch.body.mismatch.companyName, "Kald Kaffe AS");
    const backToRight = await call("/api/onboarding/company", { method: "POST", body: JSON.stringify({ companyId: 10 }) });
    assert.equal(backToRight.response.status, 200);

    // Ekte forbindelsestest mot (den falske) Tripletex-serveren.
    const connectionTest = await call("/api/onboarding/test", { method: "POST", body: "{}" });
    assert.equal(connectionTest.response.status, 200);
    assert.equal(connectionTest.body.ok, true);
    assert.deepEqual(connectionTest.body.checks.map((check) => check.id), ["reachable", "company", "permissions", "data", "departments"]);
    assert.ok(connectionTest.body.checks.every((check) => check.ok === true));

    // Første synkronisering som bakgrunnsjobb.
    const sync = await call("/api/onboarding/sync", { method: "POST", body: "{}" });
    assert.equal(sync.response.status, 202);
    assert.equal(scope.store.state.onboardings[0].status, "Synkroniserer");
    assert.ok(await waitFor(() => scope.store.state.onboardings[0].status === "Fullført"), "synkroniseringen fullførte ikke i tide");

    const job = scope.store.state.syncJobs[0];
    assert.equal(job.status, "Fullført");
    assert.ok(job.stages.every((stage) => stage.status === "Fullført"));

    const connection = scope.store.state.connections[0];
    assert.equal(connection.firstReport.revenue, 150000);
    assert.equal(connection.firstReport.cogs, 30000);
    assert.equal(connection.firstReport.payroll, 40000);
    assert.equal(connection.firstReport.result, 60000);
    assert.equal(connection.syncStrategy, "webhooks-incremental");

    const finalState = await call("/api/onboarding/state");
    assert.equal(finalState.body.state.step, "done");
    assert.equal(finalState.body.state.status, "Fullført");

    // Oversikt-siden får ekte tall og sjekkliste.
    const overview = await call("/api/onboarding/overview");
    assert.equal(overview.response.status, 200);
    assert.equal(overview.body.connection.firstReport.revenue, 150000);
    const doneItems = overview.body.checklist.items.filter((item) => item.done).map((item) => item.id);
    assert.deepEqual(doneItems, ["account", "tripletex", "report"]);
  } finally {
    await scope.cleanup();
  }
});

test("hemmeligheter finnes aldri i klartekst: lagring, admin-API og kundetilstand", async () => {
  const scope = await fixture();
  try {
    const invited = await adminInvite(scope);
    const session = await claim(scope, invited.inviteUrl);
    await completeToTestStep(scope, session);

    // Lagringen på disk inneholder aldri rå token eller rå invitasjonslenke.
    const storeContent = await readFile(path.join(scope.dataDir, "store.json"), "utf8");
    assert.ok(!storeContent.includes(EMPLOYEE_TOKEN), "ansatt-token lå i klartekst i store.json");
    assert.ok(!storeContent.includes(inviteTokenFrom(invited.inviteUrl)), "invitasjonstoken lå i klartekst i store.json");
    assert.ok(scope.store.state.connections[0].encryptedCredentials.startsWith("v1:"));

    // Admin ser status og maskert hint, men aldri tokenverdier.
    const admin = await adminSession(scope.baseUrl);
    const adminState = await (await fetch(`${scope.baseUrl}/api/admin/state`, { headers: { Cookie: admin.cookie } })).json();
    const serialized = JSON.stringify(adminState);
    assert.ok(!serialized.includes(EMPLOYEE_TOKEN));
    assert.ok(!serialized.includes("encryptedCredentials"));
    assert.ok(!serialized.includes("tokenHash"));
    assert.equal(adminState.connections[0].credentialHint, `••••${EMPLOYEE_TOKEN.slice(-3)}`);
    assert.equal(adminState.onboardings[0].invite.usedAt !== undefined, true);

    // Kundens egen tilstand er også fri for hemmeligheter.
    const call = customerApi(scope, session);
    const state = await call("/api/onboarding/state");
    assert.ok(!JSON.stringify(state.body).includes(EMPLOYEE_TOKEN));
  } finally {
    await scope.cleanup();
  }
});

test("onboardinglenken er tidsbegrenset og kan sendes på nytt", async () => {
  const scope = await fixture();
  try {
    const invited = await adminInvite(scope);

    const unknownToken = await claim(scope, `${scope.baseUrl}/onboarding?invite=finnes-ikke`);
    assert.equal(unknownToken.response.status, 410);

    scope.store.state.onboardings[0].invite.expiresAt = new Date(Date.now() - 1000).toISOString();
    const expired = await claim(scope, invited.inviteUrl);
    assert.equal(expired.response.status, 410);

    // Administrator genererer en ny lenke – den gamle slutter å virke.
    const resend = await fetch(`${scope.baseUrl}/api/admin/onboarding/${scope.store.state.onboardings[0].id}/resend`, {
      method: "POST",
      headers: { Cookie: invited.admin.cookie, "Content-Type": "application/json", "X-CSRF-Token": invited.admin.csrfToken },
      body: "{}",
    });
    assert.equal(resend.status, 200);
    const newInvite = await resend.json();
    const oldLink = await claim(scope, invited.inviteUrl);
    assert.equal(oldLink.response.status, 410);
    const newLink = await claim(scope, newInvite.inviteUrl);
    assert.equal(newLink.response.status, 200);
  } finally {
    await scope.cleanup();
  }
});

test("avbrutt onboarding kan fortsettes med lagret fremdrift", async () => {
  const scope = await fixture();
  try {
    const invited = await adminInvite(scope);
    const session = await claim(scope, invited.inviteUrl);
    const call = customerApi(scope, session);
    await call("/api/onboarding/profile", {
      method: "POST",
      body: JSON.stringify({ company: "Warm Burger AS", orgNumber: "936372295", businessType: "Restaurant", locations: 2, contact: "Kari Eier", email: "kari@warmburger.no" }),
    });
    await call("/api/onboarding/defer", { method: "POST", body: "{}" });

    // Kunden kommer tilbake senere via samme lenke og bekrefter e-post på nytt.
    const resumed = await claim(scope, invited.inviteUrl);
    assert.equal(resumed.response.status, 200);
    assert.equal(resumed.body.state.step, "connect");
    assert.deepEqual(resumed.body.state.completedSteps, ["welcome", "business"]);
    assert.equal(resumed.body.state.profile.businessType, "Restaurant");
    assert.equal(resumed.body.state.deferred, true);
  } finally {
    await scope.cleanup();
  }
});

test("feilet forbindelsestest gir vennlig feil, og admin kan nullstille og teste på nytt", async () => {
  const scope = await fixture();
  try {
    const invited = await adminInvite(scope);
    const session = await claim(scope, invited.inviteUrl);
    const { call } = await completeToTestStep(scope, session);

    scope.fake.state.failAccounts = true;
    const failed = await call("/api/onboarding/test", { method: "POST", body: "{}" });
    assert.equal(failed.body.ok, false);
    assert.equal(failed.body.error.message, "Scope mangler tilgang til regnskapsdata.");
    const failedCheck = failed.body.checks.find((check) => check.id === "permissions");
    assert.equal(failedCheck.ok, false);
    assert.equal(scope.store.state.onboardings[0].status, "Feilet");
    assert.equal(scope.store.state.connections[0].status, "Feil");

    // Nullstill fra admin, rett feilen «hos Tripletex», og kjør admin-test.
    const onboardingId = scope.store.state.onboardings[0].id;
    const reset = await fetch(`${scope.baseUrl}/api/admin/onboarding/${onboardingId}/reset`, {
      method: "POST",
      headers: { Cookie: invited.admin.cookie, "Content-Type": "application/json", "X-CSRF-Token": invited.admin.csrfToken },
      body: "{}",
    });
    assert.equal(reset.status, 200);
    assert.equal(scope.store.state.onboardings[0].status, "Pågår");
    assert.equal(scope.store.state.onboardings[0].errorCode, null);

    scope.fake.state.failAccounts = false;
    const retest = await fetch(`${scope.baseUrl}/api/admin/onboarding/${onboardingId}/retest`, {
      method: "POST",
      headers: { Cookie: invited.admin.cookie, "Content-Type": "application/json", "X-CSRF-Token": invited.admin.csrfToken },
      body: "{}",
    });
    assert.equal(retest.status, 200);
    assert.equal((await retest.json()).ok, true);
    assert.equal(scope.store.state.connections[0].status, "Tilkoblet");
  } finally {
    await scope.cleanup();
  }
});

test("selvregistrering starter onboarding direkte og avviser duplikater", async () => {
  const scope = await fixture();
  try {
    const response = await fetch(`${scope.baseUrl}/api/onboarding/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "Ny Kafé AS", contact: "Ola Eier", email: "ola@nykafe.no", orgNumber: "936372295" }),
    });
    assert.equal(response.status, 201);
    assert.match(response.headers.get("set-cookie"), /scope_onboarding_session=/);
    const body = await response.json();
    assert.equal(body.state.step, "welcome");
    assert.equal(scope.store.state.customers[0].company, "Ny Kafé AS");
    assert.equal(scope.store.state.onboardings[0].invitedBy, "Selvregistrering");

    const duplicate = await fetch(`${scope.baseUrl}/api/onboarding/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company: "Ny Kafé AS", contact: "Ola Eier", email: "ola@nykafe.no" }),
    });
    assert.equal(duplicate.status, 409);
  } finally {
    await scope.cleanup();
  }
});

test("frakobling sletter hemmelighetene og logges uten tokenverdier", async () => {
  const scope = await fixture();
  try {
    const invited = await adminInvite(scope);
    const session = await claim(scope, invited.inviteUrl);
    await completeToTestStep(scope, session);
    const connection = scope.store.state.connections[0];
    assert.ok(connection.encryptedCredentials);

    const disconnect = await fetch(`${scope.baseUrl}/api/admin/connections/${connection.id}/disconnect`, {
      method: "POST",
      headers: { Cookie: invited.admin.cookie, "Content-Type": "application/json", "X-CSRF-Token": invited.admin.csrfToken },
      body: "{}",
    });
    assert.equal(disconnect.status, 200);
    assert.equal(connection.status, "Frakoblet");
    assert.equal(connection.encryptedCredentials, "");
    assert.equal(connection.encryptedSession, "");
    const event = scope.store.state.integrationEvents.find((item) => item.eventType === "connection-disconnected");
    assert.ok(event);
    assert.ok(!JSON.stringify(event).includes(EMPLOYEE_TOKEN));
  } finally {
    await scope.cleanup();
  }
});

test("offisiell aktiveringsflyt: start-redirect og sikker callback uten token i klienten", async () => {
  const scope = await fixture({ activationUrl: "https://marketplace.tripletex.example/activate" });
  try {
    const invited = await adminInvite(scope);
    const session = await claim(scope, invited.inviteUrl);
    const call = customerApi(scope, session);
    await call("/api/onboarding/profile", {
      method: "POST",
      body: JSON.stringify({ company: "Warm Burger AS", orgNumber: "936372295", businessType: "Restaurant", locations: 2, contact: "Kari Eier", email: "kari@warmburger.no" }),
    });
    assert.equal((await call("/api/onboarding/state")).body.state.tripletex.flow, "activation");

    const start = await fetch(`${scope.baseUrl}/api/onboarding/tripletex/start`, { headers: { Cookie: session.cookie }, redirect: "manual" });
    assert.equal(start.status, 303);
    const location = new URL(start.headers.get("location"));
    assert.equal(location.origin + location.pathname, "https://marketplace.tripletex.example/activate");
    const stateToken = location.searchParams.get("state");
    assert.ok(stateToken);
    assert.match(decodeURIComponent(location.searchParams.get("redirectUri")), /\/onboarding\/tripletex\/callback$/);

    // Tripletex sender kunden tilbake med token – serveren bytter og lagrer det.
    const callback = await fetch(`${scope.baseUrl}/onboarding/tripletex/callback?state=${encodeURIComponent(stateToken)}&token=${encodeURIComponent(EMPLOYEE_TOKEN)}`, { redirect: "manual" });
    assert.equal(callback.status, 303);
    assert.equal(callback.headers.get("location"), "/onboarding?connected=1");
    const connection = scope.store.state.connections[0];
    assert.equal(connection.status, "Tilkoblet");
    assert.ok(connection.encryptedCredentials.startsWith("v1:"));
    assert.equal(scope.store.state.onboardings[0].currentStep, "company");

    // Ugyldig state avvises.
    const badCallback = await fetch(`${scope.baseUrl}/onboarding/tripletex/callback?state=tull&token=x`, { redirect: "manual" });
    assert.equal(badCallback.headers.get("location"), "/onboarding?connect_error=STATE_INVALID");
  } finally {
    await scope.cleanup();
  }
});

test("kryptohvelvet krypterer og maskerer riktig", async () => {
  const key = randomBytes(32);
  const encrypted = encryptSecret(key, EMPLOYEE_TOKEN);
  assert.ok(encrypted.startsWith("v1:"));
  assert.ok(!encrypted.includes(EMPLOYEE_TOKEN));
  assert.equal(decryptSecret(key, encrypted), EMPLOYEE_TOKEN);
  assert.equal(secretHint(EMPLOYEE_TOKEN), `••••${EMPLOYEE_TOKEN.slice(-3)}`);
  assert.equal(secretHint("kort"), "••••");
  assert.deepEqual(aggregatePostings([{ account: { number: 3000 }, amount: -1000 }, { account: { number: 5000 }, amount: 400 }]), {
    revenue: 1000, cogs: 0, payroll: 400, otherCosts: 0, result: 600, postingsCount: 2,
  });
});

test("onboarding-API-et krever gyldig økt og CSRF-token", async () => {
  const scope = await fixture();
  try {
    const noSession = await fetch(`${scope.baseUrl}/api/onboarding/state`);
    assert.equal(noSession.status, 401);

    const invited = await adminInvite(scope);
    const session = await claim(scope, invited.inviteUrl);
    const noCsrf = await fetch(`${scope.baseUrl}/api/onboarding/profile`, {
      method: "POST",
      headers: { Cookie: session.cookie, "Content-Type": "application/json" },
      body: JSON.stringify({ company: "X" }),
    });
    assert.equal(noCsrf.status, 403);

    // Valideringsfeil peker på konkrete felt.
    const call = customerApi(scope, session);
    const invalid = await call("/api/onboarding/profile", {
      method: "POST",
      body: JSON.stringify({ company: "Warm Burger AS", orgNumber: "123456789", businessType: "Restaurant", locations: 2, contact: "Kari", email: "ugyldig" }),
    });
    assert.equal(invalid.response.status, 400);
    assert.ok(invalid.body.errors.orgNumber);
    assert.ok(invalid.body.errors.email);
  } finally {
    await scope.cleanup();
  }
});
