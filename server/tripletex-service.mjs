// Server-side integrasjonsservice for Tripletex.
// Holder token-håndtering samlet: ansatt-token og session token lagres kun kryptert,
// og dekrypterte verdier lever bare i minnet mens en operasjon pågår.

import { createTripletexClient, TripletexError } from "./tripletex-client.mjs";
import { translateTripletexError } from "./tripletex-errors.mjs";
import { decryptSecret, encryptSecret, secretHint } from "./secret-vault.mjs";

const SESSION_RENEWAL_MARGIN_MS = 10 * 60 * 1000;

function normalizeOrgNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

function toCompanySummary(company) {
  return {
    id: company?.id ?? null,
    name: String(company?.name || "Ukjent selskap").slice(0, 160),
    organizationNumber: normalizeOrgNumber(company?.organizationNumber),
  };
}

export function createTripletexService({ config, vaultKey, fetchImpl = fetch }) {
  const clients = new Map();

  function environmentConfig(environment) {
    return config.environments[environment] || config.environments[config.defaultEnvironment];
  }

  function clientFor(environment) {
    if (!clients.has(environment)) {
      const env = environmentConfig(environment);
      clients.set(environment, createTripletexClient({ apiBase: env.apiBase, consumerToken: env.consumerToken, fetchImpl }));
    }
    return clients.get(environment);
  }

  function isConfigured(environment) {
    return Boolean(environmentConfig(environment)?.consumerToken);
  }

  function activationUrl(environment) {
    return environmentConfig(environment)?.activationUrl || "";
  }

  async function ensureSession(connection) {
    const client = clientFor(connection.environment);
    if (connection.encryptedSession && connection.sessionExpiresAt && Date.parse(connection.sessionExpiresAt) - Date.now() > SESSION_RENEWAL_MARGIN_MS) {
      return decryptSecret(vaultKey, connection.encryptedSession);
    }
    if (!connection.encryptedCredentials) {
      throw new TripletexError("Tilkoblingen mangler lagrede tilganger.", { kind: "not-configured", context: "ensure-session" });
    }
    const employeeToken = decryptSecret(vaultKey, connection.encryptedCredentials);
    const session = await client.createSession(employeeToken);
    connection.encryptedSession = encryptSecret(vaultKey, session.token);
    connection.sessionExpiresAt = `${session.expirationDate}T23:59:59.000Z`;
    return session.token;
  }

  // Første tilkobling: validerer tokenet mot Tripletex og henter selskapene brukeren har tilgang til.
  async function connectWithEmployeeToken({ environment, employeeToken }) {
    const client = clientFor(environment);
    const session = await client.createSession(employeeToken);
    const identity = await client.whoAmI(session.token);
    let companies = [];
    try {
      companies = (await client.companiesWithLoginAccess(session.token)).map(toCompanySummary);
    } catch {
      companies = [];
    }
    if (!companies.length && identity?.company) companies = [toCompanySummary(identity.company)];
    if (!companies.length && identity?.companyId) {
      const company = await client.getCompany(session.token, identity.companyId);
      if (company) companies = [toCompanySummary(company)];
    }
    if (!companies.length) {
      throw new TripletexError("Fant ingen selskaper på tilgangen.", { kind: "http", status: 404, context: "company" });
    }
    return {
      companies,
      encryptedCredentials: encryptSecret(vaultKey, employeeToken),
      credentialHint: secretHint(employeeToken),
      encryptedSession: encryptSecret(vaultKey, session.token),
      sessionExpiresAt: `${session.expirationDate}T23:59:59.000Z`,
    };
  }

  async function fetchCompanies(connection) {
    const client = clientFor(connection.environment);
    const session = await ensureSession(connection);
    const companies = (await client.companiesWithLoginAccess(session)).map(toCompanySummary);
    return companies;
  }

  // Kjører en ekte test mot Tripletex. Hver sjekk er basert på faktiske API-kall –
  // det finnes ingen simulert suksess her.
  async function testConnection(connection, { scopes = [], expectedOrgNumber = "" } = {}) {
    const client = clientFor(connection.environment);
    const wantsDepartments = scopes.includes("departments");
    const checks = [
      { id: "reachable", label: "Tripletex svarer", ok: null, message: "" },
      { id: "company", label: "Selskapet er funnet", ok: null, message: "" },
      { id: "permissions", label: "Tilgangene er riktige", ok: null, message: "" },
      { id: "data", label: "Data kan hentes", ok: null, message: "" },
      ...(wantsDepartments ? [{ id: "departments", label: "Avdelinger kan hentes", ok: null, message: "" }] : []),
    ];
    const check = (id) => checks.find((item) => item.id === id);
    let session;
    try {
      session = await ensureSession(connection);
      await client.whoAmI(session);
      check("reachable").ok = true;

      const companyId = connection.externalCompanyId;
      const company = await client.getCompany(session, companyId);
      if (!company) throw new TripletexError("Selskapet finnes ikke.", { kind: "http", status: 404, context: "company" });
      check("company").ok = true;
      const foundOrg = normalizeOrgNumber(company.organizationNumber);
      const expected = normalizeOrgNumber(expectedOrgNumber);
      if (expected && foundOrg && expected !== foundOrg) {
        check("company").message = "Selskapet svarer, men organisasjonsnummeret er et annet enn oppgitt.";
      }

      const accounts = await client.getAccounts(session, companyId, { count: 5 });
      if (!accounts.length) throw new TripletexError("Ingen kontoer tilgjengelig.", { kind: "http", status: 403, context: "accounts" });
      check("permissions").ok = true;

      const today = new Date();
      const dateTo = today.toISOString().slice(0, 10);
      const dateFrom = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      await client.getPostings(session, companyId, { dateFrom, dateTo, count: 1 });
      check("data").ok = true;

      if (wantsDepartments) {
        await client.getDepartments(session, companyId, { count: 1 });
        check("departments").ok = true;
      }
      return { ok: true, checks, error: null };
    } catch (error) {
      const translated = translateTripletexError(error);
      const failing = checks.find((item) => item.ok === null);
      if (failing) {
        failing.ok = false;
        failing.message = translated.message;
      }
      return { ok: false, checks, error: translated };
    }
  }

  // Fjerner tilgangen sikkert: session slettes hos Tripletex (best effort),
  // og alle krypterte verdier nulles ut lokalt.
  async function disconnect(connection) {
    try {
      if (connection.encryptedSession) {
        const session = decryptSecret(vaultKey, connection.encryptedSession);
        await clientFor(connection.environment).deleteSession(session);
      }
    } catch {
      // Frakoblingen skal alltid fullføre lokalt.
    }
    connection.encryptedCredentials = "";
    connection.encryptedSession = "";
    connection.sessionExpiresAt = null;
    connection.status = "Frakoblet";
    connection.disconnectedAt = new Date().toISOString();
  }

  return { clientFor, isConfigured, activationUrl, ensureSession, connectWithEmployeeToken, fetchCompanies, testConnection, disconnect };
}

export { normalizeOrgNumber };
