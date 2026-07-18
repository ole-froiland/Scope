// Tynn HTTP-klient mot Tripletex sitt REST-API.
// Testmiljø og produksjonsmiljø holdes strengt adskilt via egne konfigurasjoner.

const DEFAULT_API_BASES = {
  test: "https://api-test.tripletex.tech/v2",
  production: "https://tripletex.no/v2",
};

export const TRIPLETEX_ENVIRONMENTS = ["test", "production"];

export class TripletexError extends Error {
  constructor(message, { kind = "http", status = 0, apiMessage = "", context = "" } = {}) {
    super(message);
    this.name = "TripletexError";
    this.kind = kind;
    this.status = status;
    this.apiMessage = apiMessage;
    this.context = context;
  }
}

export function resolveTripletexConfig(overrides = {}, env = process.env) {
  const environments = {
    test: {
      id: "test",
      label: "Tripletex testmiljø",
      apiBase: overrides.environments?.test?.apiBase || env.TRIPLETEX_TEST_API_BASE || DEFAULT_API_BASES.test,
      consumerToken: overrides.environments?.test?.consumerToken ?? env.TRIPLETEX_TEST_CONSUMER_TOKEN ?? "",
      activationUrl: overrides.environments?.test?.activationUrl ?? env.TRIPLETEX_TEST_ACTIVATION_URL ?? "",
    },
    production: {
      id: "production",
      label: "Tripletex produksjon",
      apiBase: overrides.environments?.production?.apiBase || env.TRIPLETEX_API_BASE || DEFAULT_API_BASES.production,
      consumerToken: overrides.environments?.production?.consumerToken ?? env.TRIPLETEX_CONSUMER_TOKEN ?? "",
      activationUrl: overrides.environments?.production?.activationUrl ?? env.TRIPLETEX_ACTIVATION_URL ?? "",
    },
  };
  let defaultEnvironment = overrides.defaultEnvironment || env.TRIPLETEX_ENV || "test";
  if (!TRIPLETEX_ENVIRONMENTS.includes(defaultEnvironment)) defaultEnvironment = "test";
  return { environments, defaultEnvironment };
}

function basicAuth(companyId, sessionToken) {
  return `Basic ${Buffer.from(`${companyId ?? 0}:${sessionToken}`).toString("base64")}`;
}

export function createTripletexClient({ apiBase, consumerToken, fetchImpl = fetch, timeoutMs = 15_000 }) {
  if (!apiBase) throw new Error("Tripletex-klienten mangler apiBase.");
  const base = apiBase.replace(/\/$/, "");

  // Viktig: feil fra dette laget skal aldri inneholde tokens eller URL-er med tokens.
  async function request(method, pathname, { query = {}, session = null, companyId = 0, context = "" } = {}) {
    const url = new URL(`${base}${pathname}`);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetchImpl(url, {
        method,
        headers: {
          Accept: "application/json",
          ...(session ? { Authorization: basicAuth(companyId, session) } : {}),
        },
        signal: controller.signal,
      });
    } catch (error) {
      throw new TripletexError("Fikk ikke kontakt med Tripletex.", {
        kind: error.name === "AbortError" ? "timeout" : "network",
        context,
      });
    } finally {
      clearTimeout(timer);
    }
    let body = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    if (!response.ok) {
      const apiMessage = [body?.message, ...(body?.validationMessages || []).map((item) => item?.message)]
        .filter(Boolean)
        .join(" · ")
        .slice(0, 300);
      throw new TripletexError(`Tripletex svarte med status ${response.status}.`, {
        kind: "http",
        status: response.status,
        apiMessage,
        context,
      });
    }
    return body;
  }

  return {
    apiBase: base,
    hasConsumerToken: Boolean(consumerToken),

    // Bytter et kundespesifikt ansatt-token mot et kortlivet session token.
    async createSession(employeeToken, { expirationDate } = {}) {
      if (!consumerToken) {
        throw new TripletexError("Tripletex-integrasjonen er ikke konfigurert på serveren.", { kind: "not-configured", context: "create-session" });
      }
      const expiry = expirationDate || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const body = await request("PUT", "/token/session/:create", {
        query: { consumerToken, employeeToken, expirationDate: expiry },
        context: "create-session",
      });
      const token = body?.value?.token;
      if (!token) throw new TripletexError("Tripletex returnerte ikke noe session token.", { kind: "protocol", context: "create-session" });
      return { token, expirationDate: body.value.expirationDate || expiry };
    },

    async whoAmI(session) {
      const body = await request("GET", "/token/session/>whoAmI", { session, context: "who-am-i" });
      return body?.value || null;
    },

    async companiesWithLoginAccess(session) {
      const body = await request("GET", "/company/>withLoginAccess", { session, context: "companies" });
      return body?.values || [];
    },

    async getCompany(session, companyId) {
      const body = await request("GET", `/company/${encodeURIComponent(companyId)}`, { session, companyId, context: "company" });
      return body?.value || null;
    },

    async getAccounts(session, companyId, { count = 500 } = {}) {
      const body = await request("GET", "/ledger/account", { session, companyId, query: { count }, context: "accounts" });
      return body?.values || [];
    },

    async getDepartments(session, companyId, { count = 200 } = {}) {
      const body = await request("GET", "/department", { session, companyId, query: { count }, context: "departments" });
      return body?.values || [];
    },

    async getPostings(session, companyId, { dateFrom, dateTo, from = 0, count = 1000 } = {}) {
      const body = await request("GET", "/ledger/posting", {
        session,
        companyId,
        query: { dateFrom, dateTo, from, count },
        context: "postings",
      });
      return { values: body?.values || [], fullResultSize: body?.fullResultSize ?? (body?.values || []).length };
    },

    // Best-effort: brukes ved frakobling. Feil her skal aldri stoppe frakoblingen.
    async deleteSession(session) {
      try {
        await request("DELETE", "/token/session", { query: { token: session }, session, context: "delete-session" });
        return true;
      } catch {
        return false;
      }
    },
  };
}
