import { createServer } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createHash,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { loadCredentialsKey } from "./server/secret-vault.mjs";
import { resolveTripletexConfig, TRIPLETEX_ENVIRONMENTS } from "./server/tripletex-client.mjs";
import { tripletexErrorByCode, translateTripletexError } from "./server/tripletex-errors.mjs";
import { createTripletexService } from "./server/tripletex-service.mjs";
import {
  BUSINESS_TYPES,
  DATA_SCOPES,
  ONBOARDING_STEPS,
  createConnectionRecord,
  createInvite,
  createOnboardingRecord,
  hashInviteToken,
  isStep,
  isValidOrgNumber,
  markStepDone,
  maskConnection,
  maskJob,
  maskOnboardingForAdmin,
  normalizeOrgNumber,
  stepIndex,
  touchOnboarding,
  validateDataScopes,
  validateProfile,
} from "./server/onboarding-service.mjs";
import { createSyncJob, recoverInterruptedJobs, runFirstSync } from "./server/sync-service.mjs";

const scrypt = promisify(scryptCallback);
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PRIVATE_ROOT = path.join(ROOT, "admin-private");
const MAX_BODY_BYTES = 1024 * 1024;
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_ATTEMPT_LIMIT = 8;
const INQUIRY_WINDOW_MS = 60 * 60 * 1000;
const INQUIRY_ATTEMPT_LIMIT = 5;
const INQUIRY_MIN_FILL_MS = 900;
const ONBOARDING_SESSION_TTL_MS = 4 * 60 * 60 * 1000;
const ONBOARDING_WINDOW_MS = 15 * 60 * 1000;
const ONBOARDING_ATTEMPT_LIMIT = 12;
const CONNECT_ATTEMPT_LIMIT = 8;
const TRIPLETEX_STATE_TTL_MS = 15 * 60 * 1000;

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

const ALLOWED_PUBLIC_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".ico",
  ".jpg",
  ".jpeg",
  ".js",
  ".mp4",
  ".png",
  ".svg",
  ".webp",
]);

function createEmptyState() {
  return {
    meta: { schemaVersion: 3, lastUpdated: null },
    customers: [],
    inquiries: [],
    integrations: [],
    activity: [],
    onboardings: [],
    connections: [],
    syncJobs: [],
    integrationEvents: [],
  };
}

function migrateState(state) {
  if (!state) return { state: createEmptyState(), changed: true };
  if (state.meta?.demo === true) {
    const demoCustomerIds = new Set(["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"]);
    const demoInquiryIds = new Set(["i1", "i2", "i3", "i4", "i5"]);
    const demoIntegrationIds = new Set(["x1", "x2", "x3", "x4", "x5", "x6"]);
    return {
      state: {
        ...createEmptyState(),
        customers: (state.customers || []).filter((item) => !demoCustomerIds.has(item.id)),
        inquiries: (state.inquiries || []).filter((item) => !demoInquiryIds.has(item.id)),
        integrations: (state.integrations || []).filter((item) => !demoIntegrationIds.has(item.id)),
        activity: Array.isArray(state.activity) ? state.activity : [],
      },
      changed: true,
    };
  }
  const migrated = {
    ...createEmptyState(),
    ...state,
    meta: { ...createEmptyState().meta, ...(state.meta || {}), schemaVersion: 3 },
    customers: Array.isArray(state.customers) ? state.customers : [],
    inquiries: Array.isArray(state.inquiries) ? state.inquiries : [],
    integrations: Array.isArray(state.integrations) ? state.integrations : [],
    activity: Array.isArray(state.activity) ? state.activity : [],
    onboardings: Array.isArray(state.onboardings) ? state.onboardings : [],
    connections: Array.isArray(state.connections) ? state.connections : [],
    syncJobs: Array.isArray(state.syncJobs) ? state.syncJobs : [],
    integrationEvents: Array.isArray(state.integrationEvents) ? state.integrationEvents : [],
  };
  delete migrated.meta.demo;
  delete migrated.meta.period;
  return { state: migrated, changed: state.meta?.schemaVersion !== 3 || state.meta?.demo !== undefined || state.meta?.period !== undefined };
}

function safeJson(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${Buffer.from(derived).toString("hex")}`;
}

async function verifyPassword(password, encoded) {
  const [algorithm, salt, hash] = String(encoded).split(":");
  if (algorithm !== "scrypt" || !salt || !hash) return false;
  const derived = Buffer.from(await scrypt(password, salt, 64));
  const expected = Buffer.from(hash, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
    const index = part.indexOf("=");
    return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
  }));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
        reject(Object.assign(new Error("For stor forespørsel."), { status: 413 }));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(Object.assign(new Error("Ugyldig JSON."), { status: 400 }));
      }
    });
    request.on("error", reject);
  });
}

function text(response, status, body, type = "text/plain; charset=utf-8", extraHeaders = {}) {
  response.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store", ...extraHeaders });
  response.end(body);
}

function json(response, status, body, extraHeaders = {}) {
  text(response, status, safeJson(body), "application/json; charset=utf-8", extraHeaders);
}

function redirect(response, location) {
  response.writeHead(303, { Location: location, "Cache-Control": "no-store" });
  response.end();
}

function sanitizeText(value, maxLength = 500) {
  return String(value ?? "").replace(/[<>]/g, "").trim().slice(0, maxLength);
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeEmail(value) {
  return sanitizeText(value, 160).toLowerCase();
}

function makeReference(inquiries) {
  let referenceNumber;
  do referenceNumber = `SC-${randomBytes(3).toString("hex").toUpperCase().slice(0, 4)}`;
  while (inquiries.some((item) => item.referenceNumber === referenceNumber));
  return referenceNumber;
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${randomBytes(4).toString("hex")}`;
}

function nowIso() {
  return new Date().toISOString();
}

function historyItem(action, administrator, details = "") {
  return { id: makeId("h"), action, administrator, details, createdAt: nowIso() };
}

function createCustomerRecord(values, administrator = "Nettsiden") {
  const createdAt = nowIso();
  const systems = Array.isArray(values.systems) ? values.systems : [];
  return {
    id: makeId("c"),
    company: values.company,
    contact: values.name,
    email: values.email,
    phone: values.phone,
    type: values.businessType || "Annet",
    locations: values.locations,
    status: "Ny",
    owner: "Ikke tildelt",
    integrations: systems,
    systems,
    lastActivity: createdAt,
    createdAt,
    updatedAt: createdAt,
    notes: [],
    archived: false,
    statusHistory: [{ status: "Ny", at: createdAt, by: administrator }],
  };
}

function createInquiryRecord(values, customerId = null) {
  const createdAt = nowIso();
  return {
    id: makeId("i"),
    customerId,
    inquiryType: values.inquiryType,
    category: values.category || "Annet",
    subject: values.subject,
    message: values.message,
    source: "Chatvindu på nettsiden",
    status: "Ny",
    priority: "Normal",
    name: values.name,
    company: values.company,
    email: values.email,
    phone: values.phone,
    referenceNumber: values.referenceNumber,
    owner: "Ikke tildelt",
    createdAt,
    updatedAt: createdAt,
    notes: [],
    replies: [],
    history: [historyItem("Henvendelse mottatt", "Nettsiden")],
  };
}

function getClientAddress(request) {
  return request.socket.remoteAddress || "unknown";
}

function securityHeaders(response) {
  response.setHeader("Content-Security-Policy", "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self' https://cdn.jsdelivr.net; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Referrer-Policy", "no-referrer");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
  response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

async function atomicWrite(filePath, data) {
  const tempPath = `${filePath}.${randomBytes(6).toString("hex")}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2), { mode: 0o600 });
  await fs.rename(tempPath, filePath);
}

export async function createScopeServer(options = {}) {
  const dataDir = options.dataDir || process.env.SCOPE_ADMIN_DATA_DIR || path.join(ROOT, ".scope-admin-data");
  const storePath = path.join(dataDir, "store.json");
  const secretPath = path.join(dataDir, "session-secret");
  const bootstrapCredentialsPath = path.join(dataDir, "bootstrap-credentials.txt");
  await fs.mkdir(dataDir, { recursive: true, mode: 0o700 });

  let sessionSecret;
  try {
    sessionSecret = await fs.readFile(secretPath, "utf8");
  } catch {
    sessionSecret = randomBytes(48).toString("hex");
    await fs.writeFile(secretPath, sessionSecret, { mode: 0o600 });
  }

  let store;
  let bootstrapPassword = options.bootstrapPassword || process.env.SCOPE_ADMIN_PASSWORD;
  let stateWasMigrated = false;
  try {
    store = JSON.parse(await fs.readFile(storePath, "utf8"));
    const migration = migrateState(store.state);
    store.state = migration.state;
    stateWasMigrated = migration.changed;
  } catch {
    const generatedPassword = !bootstrapPassword;
    bootstrapPassword ||= randomBytes(12).toString("base64url");
    if (bootstrapPassword.length < 12) throw new Error("SCOPE_ADMIN_PASSWORD må ha minst 12 tegn.");
    const email = (options.bootstrapEmail || process.env.SCOPE_ADMIN_EMAIL || "admin@scopeanalytics.no").toLowerCase();
    store = {
      users: [{
        id: "u-admin",
        name: process.env.SCOPE_ADMIN_NAME || "Scope-administrator",
        email,
        role: "admin",
        passwordHash: await hashPassword(bootstrapPassword),
        mfaReady: true,
      }],
      state: createEmptyState(),
    };
    await atomicWrite(storePath, store);
    if (generatedPassword) {
      await fs.writeFile(bootstrapCredentialsPath, `E-post: ${email}\nEngangspassord: ${bootstrapPassword}\n`, { mode: 0o600 });
    }
    if (!options.silent) {
      console.log("Scope admin er klargjort.");
      console.log(`E-post: ${email}`);
      console.log(generatedPassword ? `Engangspassordet ligger i ${bootstrapCredentialsPath}` : "Administratorpassordet ble lest fra miljøet.");
      console.log("Bootstrap-filen slettes etter første vellykkede innlogging.");
    }
  }

  const sessions = new Map();
  const loginAttempts = new Map();
  const inquiryAttempts = new Map();
  let saveQueue = Promise.resolve();
  const saveStore = () => {
    saveQueue = saveQueue.then(() => atomicWrite(storePath, store));
    return saveQueue;
  };
  if (stateWasMigrated) await saveStore();

  const emailWebhookUrl = options.emailWebhookUrl || process.env.SCOPE_EMAIL_WEBHOOK_URL || "";
  const emailWebhookToken = options.emailWebhookToken || process.env.SCOPE_EMAIL_WEBHOOK_TOKEN || "";
  const emailSender = options.emailSender || (emailWebhookUrl ? async (payload) => {
    const delivery = await fetch(emailWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(emailWebhookToken ? { Authorization: `Bearer ${emailWebhookToken}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!delivery.ok) throw new Error(`E-posttjenesten svarte med status ${delivery.status}.`);
  } : null);

  // Tripletex-oppsett: kryptonøkkel for tilganger + integrasjonsservice per miljø.
  const vaultKey = await loadCredentialsKey(dataDir, options.credentialsKey);
  const tripletexConfig = resolveTripletexConfig(options.tripletex || {});
  const tripletex = createTripletexService({ config: tripletexConfig, vaultKey, fetchImpl: options.tripletexFetch || fetch });
  if (recoverInterruptedJobs(store.state)) await saveStore();

  const onboardingSessions = new Map();
  const onboardingAttempts = new Map();
  const connectAttempts = new Map();

  function rateLimited(map, request, limit, windowMs = ONBOARDING_WINDOW_MS) {
    const address = getClientAddress(request);
    const attempt = map.get(address) || { count: 0, startedAt: Date.now() };
    if (Date.now() - attempt.startedAt > windowMs) {
      attempt.count = 0;
      attempt.startedAt = Date.now();
    }
    attempt.count += 1;
    map.set(address, attempt);
    return attempt.count > limit;
  }

  function addIntegrationEvent(connectionId, eventType, status, metadata = {}) {
    store.state.integrationEvents.unshift({
      id: makeId("ev"),
      connectionId,
      eventType: sanitizeText(eventType, 60),
      status: sanitizeText(status, 40),
      metadata,
      createdAt: nowIso(),
    });
    store.state.integrationEvents = store.state.integrationEvents.slice(0, 500);
  }

  function findOnboarding(id) {
    return store.state.onboardings.find((item) => item.id === id) || null;
  }

  function findConnection(id) {
    return store.state.connections.find((item) => item.id === id) || null;
  }

  function connectionFor(onboarding) {
    return onboarding?.connectionId ? findConnection(onboarding.connectionId) : null;
  }

  function currentSyncJob(connection) {
    if (!connection) return null;
    return store.state.syncJobs.find((job) => job.connectionId === connection.id) || null;
  }

  function getOnboardingAuth(request) {
    const token = parseCookies(request.headers.cookie).scope_onboarding_session;
    if (!token) return null;
    const session = onboardingSessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      if (session) onboardingSessions.delete(token);
      return null;
    }
    const onboarding = findOnboarding(session.onboardingId);
    if (!onboarding) return null;
    const customer = store.state.customers.find((item) => item.id === onboarding.customerId);
    return customer ? { token, session, onboarding, customer } : null;
  }

  function requireOnboarding(request, response) {
    const auth = getOnboardingAuth(request);
    if (!auth) {
      json(response, 401, { error: "Økten er utløpt. Åpne onboardinglenken din på nytt." });
      return null;
    }
    if (!["GET", "HEAD"].includes(request.method) && request.headers["x-csrf-token"] !== auth.session.csrfToken) {
      json(response, 403, { error: "Ugyldig sikkerhetstoken. Last siden på nytt." });
      return null;
    }
    return auth;
  }

  function startOnboardingSession(onboarding, request) {
    const token = randomBytes(32).toString("base64url");
    const csrfToken = randomBytes(24).toString("base64url");
    onboardingSessions.set(token, { onboardingId: onboarding.id, csrfToken, expiresAt: Date.now() + ONBOARDING_SESSION_TTL_MS });
    for (const [key, session] of onboardingSessions) if (session.expiresAt < Date.now()) onboardingSessions.delete(key);
    const secure = request.socket.encrypted || process.env.NODE_ENV === "production" ? "; Secure" : "";
    return {
      csrfToken,
      cookie: `scope_onboarding_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${ONBOARDING_SESSION_TTL_MS / 1000}${secure}`,
    };
  }

  // Tilstanden kundesiden får se. Inneholder aldri tokens eller krypterte felter.
  function customerOnboardingState(onboarding, customer) {
    const connection = connectionFor(onboarding);
    const job = currentSyncJob(connection);
    const profile = onboarding.profile || {
      company: customer.company,
      orgNumber: normalizeOrgNumber(customer.orgNumber || ""),
      businessType: BUSINESS_TYPES.includes(customer.type) ? customer.type : "",
      locations: customer.locations || 1,
      contact: customer.contact,
      email: customer.email,
      phone: customer.phone || "",
    };
    const environment = onboarding.environment || tripletexConfig.defaultEnvironment;
    return {
      status: onboarding.status,
      step: onboarding.currentStep,
      completedSteps: onboarding.completedSteps,
      steps: ONBOARDING_STEPS,
      deferred: onboarding.deferred,
      profile,
      businessTypes: BUSINESS_TYPES,
      dataScopes: DATA_SCOPES,
      selectedScopes: onboarding.dataScopes,
      companies: onboarding.companies,
      selectedCompany: onboarding.selectedCompany,
      connection: connection
        ? {
            status: connection.status,
            companyName: connection.externalCompanyName,
            organizationNumber: connection.organizationNumber,
            credentialHint: connection.credentialHint,
            lastSyncAt: connection.lastSyncAt,
            firstReport: connection.firstReport,
          }
        : null,
      job: maskJob(job),
      tripletex: {
        flow: tripletex.activationUrl(environment) ? "activation" : "manual",
        configured: tripletex.isConfigured(environment),
        environment,
      },
      error: onboarding.errorCode ? { ...tripletexErrorByCode(onboarding.errorCode), message: onboarding.errorMessage || tripletexErrorByCode(onboarding.errorCode).message } : null,
    };
  }

  function onboardingChecklist(onboarding, connection) {
    const tripletexDone = Boolean(connection && connection.status === "Tilkoblet" && connection.lastSyncAt);
    return {
      items: [
        { id: "account", label: "Opprettet Scope-konto", done: true },
        { id: "tripletex", label: "Koblet til Tripletex", done: tripletexDone },
        { id: "pos", label: "Koble til kassesystem", done: false, hint: "Koble til kassesystemet for å få omsetning gjennom dagen." },
        { id: "staffing", label: "Koble til bemanningssystem", done: false, hint: "Koble til bemanningssystemet for å få råd om vakter og personalkostnad." },
        { id: "report", label: "Se første rapport", done: Boolean(connection?.firstReport) },
      ],
    };
  }

  function publicOnboardingUrl(request, token) {
    const requestOrigin = `${request.socket.encrypted ? "https" : "http"}://${request.headers.host}`;
    const origin = (process.env.SCOPE_PUBLIC_ORIGIN || options.publicOrigin || requestOrigin).replace(/\/$/, "");
    return `${origin}/onboarding?invite=${encodeURIComponent(token)}`;
  }

  async function sendInviteEmail(customer, inviteUrl) {
    if (!emailSender) return false;
    try {
      await emailSender({
        to: customer.email,
        subject: `Koble ${customer.company} til Scope`,
        text: `Hei ${customer.contact}!\n\nVi har gjort oppsettet klart. Følg den korte veiviseren for å koble Tripletex til Scope.\n\nStart oppsett: ${inviteUrl}\n\nLenken er personlig og gyldig i 7 dager.\n\nHilsen Scope`,
        cta: { label: "Start oppsett", url: inviteUrl },
      });
      return true;
    } catch (error) {
      console.error("Kunne ikke sende onboardinglenke:", error.message);
      return false;
    }
  }

  function syncProfileToCustomer(customer, values) {
    customer.company = values.company;
    customer.contact = values.contact;
    customer.email = values.email;
    customer.phone = values.phone || customer.phone;
    customer.type = values.businessType;
    customer.locations = values.locations;
    customer.orgNumber = values.orgNumber;
    customer.updatedAt = nowIso();
    customer.lastActivity = customer.updatedAt;
  }

  function publicAdminState() {
    return {
      ...store.state,
      connections: store.state.connections.map(maskConnection),
      onboardings: store.state.onboardings.map(maskOnboardingForAdmin),
      syncJobs: store.state.syncJobs.map(maskJob),
      meta: {
        ...store.state.meta,
        emailConfigured: Boolean(emailSender),
        tripletex: {
          defaultEnvironment: tripletexConfig.defaultEnvironment,
          environments: TRIPLETEX_ENVIRONMENTS.map((id) => ({
            id,
            label: tripletexConfig.environments[id].label,
            configured: tripletex.isConfigured(id),
            activation: Boolean(tripletex.activationUrl(id)),
          })),
        },
      },
      admins: store.users
        .filter((user) => user.role === "admin")
        .map((user) => ({ id: user.id, name: user.name, email: user.email })),
    };
  }

  function touchState() {
    store.state.meta.lastUpdated = nowIso();
  }

  function makeIpLabel(request) {
    return `anonymisert-${createHash("sha256").update(`${sessionSecret}:${getClientAddress(request)}`).digest("hex").slice(0, 8)}`;
  }

  function addAudit(user, action, object, result, details, request) {
    const item = {
      id: `a-${Date.now()}-${randomBytes(3).toString("hex")}`,
      administrator: user?.name || "Ukjent",
      action: sanitizeText(action, 120),
      object: sanitizeText(object, 120),
      timestamp: new Intl.DateTimeFormat("nb-NO", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Oslo" }).format(new Date()),
      ip: makeIpLabel(request),
      result: sanitizeText(result, 40),
      details: sanitizeText(details, 300),
    };
    store.state.activity.unshift(item);
    store.state.activity = store.state.activity.slice(0, 250);
    saveStore().catch((error) => console.error("Kunne ikke lagre aktivitetslogg:", error.message));
    return item;
  }

  function getSession(request) {
    const token = parseCookies(request.headers.cookie).scope_admin_session;
    if (!token) return null;
    const session = sessions.get(token);
    if (!session || session.expiresAt < Date.now()) {
      if (session) sessions.delete(token);
      return null;
    }
    const user = store.users.find((candidate) => candidate.id === session.userId);
    return user ? { token, session, user } : null;
  }

  function requireAdmin(request, response) {
    const auth = getSession(request);
    if (!auth) {
      json(response, 401, { error: "Du må logge inn." });
      return null;
    }
    if (auth.user.role !== "admin") {
      addAudit(auth.user, "Avvist tilgang", "Admin", "Avvist", "Brukeren mangler admin-rolle.", request);
      json(response, 403, { error: "Ingen tilgang" });
      return null;
    }
    if (!["GET", "HEAD"].includes(request.method) && request.headers["x-csrf-token"] !== auth.session.csrfToken) {
      json(response, 403, { error: "Ugyldig sikkerhetstoken. Last siden på nytt." });
      return null;
    }
    return auth;
  }

  function clearExpiredSessions() {
    const now = Date.now();
    for (const [token, session] of sessions) if (session.expiresAt < now) sessions.delete(token);
  }

  async function sendPrivateFile(response, fileName, status = 200) {
    const filePath = path.join(PRIVATE_ROOT, fileName);
    try {
      const file = await fs.readFile(filePath);
      text(response, status, file, MIME_TYPES[path.extname(filePath)] || "application/octet-stream");
    } catch {
      text(response, 404, "Ikke funnet");
    }
  }

  async function sendPublicFile(response, pathname) {
    const cleanPath = pathname === "/" ? "/landing-velger.html" : pathname;
    const candidate = cleanPath.endsWith("/") ? `${cleanPath}index.html` : cleanPath;
    const extension = path.extname(candidate);
    if (!ALLOWED_PUBLIC_EXTENSIONS.has(extension) || candidate.includes("admin-private") || candidate.includes(".scope-admin-data")) {
      text(response, 404, "Ikke funnet");
      return;
    }
    const filePath = path.resolve(ROOT, `.${candidate}`);
    if (!filePath.startsWith(`${ROOT}${path.sep}`)) {
      text(response, 404, "Ikke funnet");
      return;
    }
    try {
      const file = await fs.readFile(filePath);
      response.writeHead(200, { "Content-Type": MIME_TYPES[extension] || "application/octet-stream", "Cache-Control": "public, max-age=300" });
      response.end(file);
    } catch {
      text(response, 404, "Ikke funnet");
    }
  }

  const server = createServer(async (request, response) => {
    securityHeaders(response);
    const origin = request.headers.origin;
    const requestOrigin = `${request.socket.encrypted ? "https" : "http"}://${request.headers.host}`;
    const expectedOrigin = (process.env.SCOPE_PUBLIC_ORIGIN || requestOrigin).replace(/\/$/, "");
    if (origin && origin !== expectedOrigin) {
      json(response, 403, { error: "Ugyldig opprinnelse." });
      return;
    }

    const url = new URL(request.url, requestOrigin);
    const pathname = decodeURIComponent(url.pathname).replace(/\/{2,}/g, "/");

    try {
      if (pathname === "/favicon.ico" && request.method === "GET") {
        response.writeHead(204, { "Cache-Control": "public, max-age=86400" });
        return response.end();
      }

      if ((pathname === "/intro" || pathname === "/intro/") && request.method === "GET") {
        return sendPublicFile(response, "/intro.html");
      }

      if (["/clean/", "/leken/", "/enkel/", "/vakt/", "/brutal/", "/kombi/"].includes(pathname) && request.method === "GET") {
        return redirect(response, pathname.slice(0, -1));
      }

      const landingPageAliases = {
        "/clean": "/landing-3.html",
        "/leken": "/landing.html",
        "/enkel": "/landing-enkel.html",
        "/vakt": "/landing-vakt.html",
        "/brutal": "/landing-brutal.html",
        "/kombi": "/landing-kombi.html",
      };
      if (landingPageAliases[pathname] && request.method === "GET") {
        return sendPublicFile(response, landingPageAliases[pathname]);
      }

      if ((pathname === "/landing-3" || pathname === "/landing-3/") && request.method === "GET") {
        return sendPublicFile(response, "/landing-3.html");
      }

      if ((pathname === "/onboarding" || pathname === "/onboarding/") && request.method === "GET") {
        return sendPublicFile(response, "/onboarding.html");
      }

      if ((pathname === "/oversikt" || pathname === "/oversikt/") && request.method === "GET") {
        return sendPublicFile(response, "/oversikt.html");
      }

      // Retur fra Tripletex sin aktiveringsflyt. Tokenet behandles kun her på serveren
      // og sendes aldri videre til nettleseren.
      if (pathname === "/onboarding/tripletex/callback" && request.method === "GET") {
        const stateToken = sanitizeText(url.searchParams.get("state"), 100);
        const employeeToken = String(url.searchParams.get("token") || url.searchParams.get("employeeToken") || "").trim();
        const onboarding = stateToken
          ? store.state.onboardings.find((item) => item.tripletexState?.hash === hashInviteToken(stateToken) && Date.parse(item.tripletexState.expiresAt) > Date.now())
          : null;
        if (!onboarding || !employeeToken) return redirect(response, "/onboarding?connect_error=STATE_INVALID");
        onboarding.tripletexState = null;
        const environment = onboarding.environment || tripletexConfig.defaultEnvironment;
        try {
          const result = await tripletex.connectWithEmployeeToken({ environment, employeeToken });
          let connection = connectionFor(onboarding);
          if (!connection) {
            connection = createConnectionRecord({ customerId: onboarding.customerId, environment });
            store.state.connections.unshift(connection);
            onboarding.connectionId = connection.id;
          }
          Object.assign(connection, {
            environment,
            encryptedCredentials: result.encryptedCredentials,
            encryptedSession: result.encryptedSession,
            sessionExpiresAt: result.sessionExpiresAt,
            credentialHint: result.credentialHint,
            status: "Tilkoblet",
            connectedAt: nowIso(),
            disconnectedAt: null,
          });
          onboarding.companies = result.companies;
          onboarding.errorCode = null;
          onboarding.errorMessage = null;
          markStepDone(onboarding, "connect");
          onboarding.currentStep = "company";
          touchOnboarding(onboarding);
          addIntegrationEvent(connection.id, "connection-authorized", "Vellykket", { environment, via: "activation" });
          touchState();
          await saveStore();
          return redirect(response, "/onboarding?connected=1");
        } catch (error) {
          const translated = translateTripletexError(error);
          onboarding.errorCode = translated.code;
          onboarding.errorMessage = translated.message;
          touchOnboarding(onboarding);
          if (onboarding.connectionId) addIntegrationEvent(onboarding.connectionId, "connection-failed", "Feilet", { code: translated.code, technical: translated.technical });
          console.error("Tripletex-aktivering feilet:", translated.technical);
          await saveStore();
          return redirect(response, `/onboarding?connect_error=${encodeURIComponent(translated.code)}`);
        }
      }

      // Selvregistrering: åpner onboardingen direkte etter at kunden har registrert seg.
      if (pathname === "/api/onboarding/register" && request.method === "POST") {
        if (rateLimited(onboardingAttempts, request, ONBOARDING_ATTEMPT_LIMIT)) {
          return json(response, 429, { error: "For mange forsøk. Vent litt og prøv igjen." });
        }
        const body = await readBody(request);
        const company = sanitizeText(body.company, 120);
        const contact = sanitizeText(body.contact, 100);
        const email = normalizeEmail(body.email);
        const orgNumber = normalizeOrgNumber(body.orgNumber);
        if (!company || !contact || !isEmail(email)) return json(response, 400, { error: "Virksomhet, kontaktperson og gyldig e-post er påkrevd." });
        if (orgNumber && !isValidOrgNumber(orgNumber)) return json(response, 400, { error: "Organisasjonsnummeret ser ikke gyldig ut. Kontroller de 9 sifrene." });
        const existing = store.state.onboardings.find((item) => {
          const customer = store.state.customers.find((candidate) => candidate.id === item.customerId);
          return customer && normalizeEmail(customer.email) === email && item.status !== "Fullført";
        });
        if (existing) {
          return json(response, 409, { error: "Det finnes allerede et påbegynt oppsett for denne e-postadressen. Bruk lenken du har fått tilsendt, eller kontakt oss så sender vi en ny." });
        }
        const customer = createCustomerRecord({
          name: contact,
          company,
          email,
          phone: sanitizeText(body.phone, 30),
          businessType: BUSINESS_TYPES.includes(sanitizeText(body.businessType, 40)) ? sanitizeText(body.businessType, 40) : "Annet",
          locations: Math.max(1, Math.min(999, Number(body.locations) || 1)),
          systems: ["Tripletex"],
        });
        customer.orgNumber = orgNumber;
        store.state.customers.unshift(customer);
        const onboarding = createOnboardingRecord({ customerId: customer.id, invitedBy: "Selvregistrering", environment: tripletexConfig.defaultEnvironment, status: "Pågår" });
        onboarding.startedAt = nowIso();
        store.state.onboardings.unshift(onboarding);
        touchState();
        await saveStore();
        const session = startOnboardingSession(onboarding, request);
        return json(response, 201, { ok: true, csrfToken: session.csrfToken, state: customerOnboardingState(onboarding, customer) }, { "Set-Cookie": session.cookie });
      }

      // Kunde åpner onboardinglenke: bekrefter e-post før økten opprettes.
      if (pathname === "/api/onboarding/claim" && request.method === "POST") {
        if (rateLimited(onboardingAttempts, request, ONBOARDING_ATTEMPT_LIMIT)) {
          return json(response, 429, { error: "For mange forsøk. Vent litt og prøv igjen." });
        }
        const body = await readBody(request);
        const token = sanitizeText(body.token, 120);
        const email = normalizeEmail(body.email);
        if (!token || !isEmail(email)) return json(response, 400, { error: "Lenke og e-postadresse er påkrevd." });
        const tokenHash = hashInviteToken(token);
        const onboarding = store.state.onboardings.find((item) => item.invite?.tokenHash === tokenHash);
        if (!onboarding || Date.parse(onboarding.invite.expiresAt) < Date.now() || onboarding.status === "Fullført") {
          return json(response, 410, { error: "Lenken er ugyldig eller utløpt. Kontakt oss, så sender vi en ny." });
        }
        const customer = store.state.customers.find((item) => item.id === onboarding.customerId);
        if (!customer || normalizeEmail(customer.email) !== email) {
          return json(response, 403, { error: "E-postadressen samsvarer ikke med invitasjonen. Bruk adressen invitasjonen ble sendt til." });
        }
        onboarding.invite.usedAt = nowIso();
        if (onboarding.status === "Venter på kunde" || onboarding.status === "Ikke startet") onboarding.status = "Pågår";
        if (!onboarding.startedAt) onboarding.startedAt = nowIso();
        touchOnboarding(onboarding);
        touchState();
        await saveStore();
        const session = startOnboardingSession(onboarding, request);
        return json(response, 200, { ok: true, csrfToken: session.csrfToken, state: customerOnboardingState(onboarding, customer) }, { "Set-Cookie": session.cookie });
      }

      if (pathname === "/api/onboarding/state" && request.method === "GET") {
        const auth = requireOnboarding(request, response);
        if (!auth) return;
        return json(response, 200, { ok: true, csrfToken: auth.session.csrfToken, state: customerOnboardingState(auth.onboarding, auth.customer) });
      }

      // Navigasjon mellom steg. Lagrer fremdrift – fjerner aldri allerede lagrede valg.
      if (pathname === "/api/onboarding/step" && request.method === "POST") {
        const auth = requireOnboarding(request, response);
        if (!auth) return;
        const body = await readBody(request);
        const step = sanitizeText(body.step, 20);
        if (!isStep(step)) return json(response, 400, { error: "Ukjent steg." });
        const completed = sanitizeText(body.completed, 20);
        if (completed && isStep(completed) && stepIndex(completed) <= stepIndex(step)) markStepDone(auth.onboarding, completed);
        auth.onboarding.currentStep = step;
        touchOnboarding(auth.onboarding);
        touchState();
        await saveStore();
        return json(response, 200, { ok: true, state: customerOnboardingState(auth.onboarding, auth.customer) });
      }

      // «Gjør dette senere»: Scope åpnes i begrenset tilstand, fremdriften beholdes.
      if (pathname === "/api/onboarding/defer" && request.method === "POST") {
        const auth = requireOnboarding(request, response);
        if (!auth) return;
        auth.onboarding.deferred = true;
        touchOnboarding(auth.onboarding);
        touchState();
        await saveStore();
        return json(response, 200, { ok: true });
      }

      if (pathname === "/api/onboarding/profile" && request.method === "POST") {
        const auth = requireOnboarding(request, response);
        if (!auth) return;
        const body = await readBody(request);
        const result = validateProfile(body, sanitizeText, isEmail);
        if (result.errors) return json(response, 400, { error: "Kontroller feltene under.", errors: result.errors });
        auth.onboarding.profile = result.values;
        syncProfileToCustomer(auth.customer, result.values);
        markStepDone(auth.onboarding, "welcome");
        markStepDone(auth.onboarding, "business");
        if (stepIndex(auth.onboarding.currentStep) < stepIndex("connect")) auth.onboarding.currentStep = "connect";
        touchOnboarding(auth.onboarding);
        touchState();
        await saveStore();
        return json(response, 200, { ok: true, state: customerOnboardingState(auth.onboarding, auth.customer) });
      }

      // Starter den offisielle aktiveringsflyten hos Tripletex (når den er konfigurert).
      if (pathname === "/api/onboarding/tripletex/start" && request.method === "GET") {
        const auth = getOnboardingAuth(request);
        if (!auth) return redirect(response, "/onboarding");
        const environment = auth.onboarding.environment || tripletexConfig.defaultEnvironment;
        const activation = tripletex.activationUrl(environment);
        if (!activation) return json(response, 404, { error: "Aktiveringsflyten er ikke konfigurert." });
        const stateToken = randomBytes(24).toString("base64url");
        auth.onboarding.tripletexState = { hash: hashInviteToken(stateToken), expiresAt: new Date(Date.now() + TRIPLETEX_STATE_TTL_MS).toISOString() };
        touchOnboarding(auth.onboarding);
        await saveStore();
        const redirectUri = `${(process.env.SCOPE_PUBLIC_ORIGIN || options.publicOrigin || requestOrigin).replace(/\/$/, "")}/onboarding/tripletex/callback`;
        const separator = activation.includes("?") ? "&" : "?";
        return redirect(response, `${activation}${separator}state=${encodeURIComponent(stateToken)}&redirectUri=${encodeURIComponent(redirectUri)}`);
      }

      // Manuell tokenflyt (fallback/testmodus). Tokenet videresendes kun til Tripletex
      // og lagres kryptert – det returneres aldri til klienten.
      if (pathname === "/api/onboarding/tripletex/connect" && request.method === "POST") {
        const auth = requireOnboarding(request, response);
        if (!auth) return;
        if (rateLimited(connectAttempts, request, CONNECT_ATTEMPT_LIMIT)) {
          return json(response, 429, { error: "For mange forsøk. Vent litt og prøv igjen." });
        }
        const body = await readBody(request);
        const employeeToken = String(body.apiToken || "").trim();
        if (!/^[\x21-\x7e]{16,200}$/.test(employeeToken)) {
          return json(response, 400, { error: "Dette ser ikke ut som et gyldig token. Kopier hele tokenet fra Tripletex og prøv igjen." });
        }
        const environment = auth.onboarding.environment || tripletexConfig.defaultEnvironment;
        if (!tripletex.isConfigured(environment)) {
          const translated = tripletexErrorByCode("NOT_CONFIGURED");
          return json(response, 503, { error: translated.message, code: translated.code, help: translated.help });
        }
        try {
          const result = await tripletex.connectWithEmployeeToken({ environment, employeeToken });
          let connection = connectionFor(auth.onboarding);
          if (!connection) {
            connection = createConnectionRecord({ customerId: auth.customer.id, environment });
            store.state.connections.unshift(connection);
            auth.onboarding.connectionId = connection.id;
          }
          Object.assign(connection, {
            environment,
            encryptedCredentials: result.encryptedCredentials,
            encryptedSession: result.encryptedSession,
            sessionExpiresAt: result.sessionExpiresAt,
            credentialHint: result.credentialHint,
            status: "Tilkoblet",
            connectedAt: nowIso(),
            disconnectedAt: null,
          });
          auth.onboarding.companies = result.companies;
          auth.onboarding.errorCode = null;
          auth.onboarding.errorMessage = null;
          markStepDone(auth.onboarding, "connect");
          auth.onboarding.currentStep = "company";
          touchOnboarding(auth.onboarding);
          addIntegrationEvent(connection.id, "connection-created", "Vellykket", { environment, via: "manual-token" });
          touchState();
          await saveStore();
          return json(response, 200, { ok: true, state: customerOnboardingState(auth.onboarding, auth.customer) });
        } catch (error) {
          const translated = translateTripletexError(error);
          auth.onboarding.errorCode = translated.code;
          auth.onboarding.errorMessage = translated.message;
          auth.onboarding.attempts += 1;
          touchOnboarding(auth.onboarding);
          console.error("Tripletex-tilkobling feilet:", translated.technical);
          await saveStore();
          return json(response, 502, { error: translated.message, code: translated.code, help: translated.help });
        }
      }

      if (pathname === "/api/onboarding/company" && request.method === "POST") {
        const auth = requireOnboarding(request, response);
        if (!auth) return;
        const connection = connectionFor(auth.onboarding);
        if (!connection || !auth.onboarding.companies.length) return json(response, 409, { error: "Koble til Tripletex først." });
        const body = await readBody(request);
        const company = auth.onboarding.companies.find((item) => String(item.id) === String(body.companyId));
        if (!company) return json(response, 400, { error: "Velg et av selskapene i listen." });
        const expected = normalizeOrgNumber(auth.onboarding.profile?.orgNumber);
        const found = normalizeOrgNumber(company.organizationNumber);
        if (expected && found && expected !== found && body.confirmMismatch !== true) {
          return json(response, 409, {
            error: "Dette ser ut til å være et annet selskap.",
            mismatch: { expectedOrgNumber: expected, companyOrgNumber: found, companyName: company.name },
          });
        }
        auth.onboarding.selectedCompany = company;
        connection.externalCompanyId = company.id;
        connection.externalCompanyName = company.name;
        connection.organizationNumber = company.organizationNumber;
        markStepDone(auth.onboarding, "company");
        if (stepIndex(auth.onboarding.currentStep) < stepIndex("data")) auth.onboarding.currentStep = "data";
        touchOnboarding(auth.onboarding);
        touchState();
        await saveStore();
        return json(response, 200, { ok: true, state: customerOnboardingState(auth.onboarding, auth.customer) });
      }

      if (pathname === "/api/onboarding/datascopes" && request.method === "POST") {
        const auth = requireOnboarding(request, response);
        if (!auth) return;
        const connection = connectionFor(auth.onboarding);
        if (!connection || !auth.onboarding.selectedCompany) return json(response, 409, { error: "Velg selskap først." });
        const body = await readBody(request);
        const scopes = validateDataScopes(body.scopes);
        auth.onboarding.dataScopes = scopes;
        connection.permissions = scopes;
        markStepDone(auth.onboarding, "data");
        if (stepIndex(auth.onboarding.currentStep) < stepIndex("test")) auth.onboarding.currentStep = "test";
        touchOnboarding(auth.onboarding);
        touchState();
        await saveStore();
        return json(response, 200, { ok: true, state: customerOnboardingState(auth.onboarding, auth.customer) });
      }

      // Ekte server-side test av forbindelsen. Ingen simulerte resultater.
      if (pathname === "/api/onboarding/test" && request.method === "POST") {
        const auth = requireOnboarding(request, response);
        if (!auth) return;
        const connection = connectionFor(auth.onboarding);
        if (!connection || !auth.onboarding.selectedCompany) return json(response, 409, { error: "Velg selskap og datakategorier først." });
        const result = await tripletex.testConnection(connection, {
          scopes: auth.onboarding.dataScopes,
          expectedOrgNumber: auth.onboarding.profile?.orgNumber || "",
        });
        connection.lastCheckAt = nowIso();
        if (result.ok) {
          connection.status = "Tilkoblet";
          auth.onboarding.errorCode = null;
          auth.onboarding.errorMessage = null;
          markStepDone(auth.onboarding, "test");
          if (stepIndex(auth.onboarding.currentStep) < stepIndex("sync")) auth.onboarding.currentStep = "sync";
          if (auth.onboarding.status === "Feilet") auth.onboarding.status = "Pågår";
          addIntegrationEvent(connection.id, "connection-test", "Vellykket", { checks: result.checks.length });
        } else {
          connection.status = "Feil";
          auth.onboarding.status = "Feilet";
          auth.onboarding.errorCode = result.error.code;
          auth.onboarding.errorMessage = result.error.message;
          auth.onboarding.attempts += 1;
          addIntegrationEvent(connection.id, "connection-test", "Feilet", { code: result.error.code, technical: result.error.technical });
          console.error("Tripletex-test feilet:", result.error.technical);
        }
        touchOnboarding(auth.onboarding);
        touchState();
        await saveStore();
        return json(response, 200, {
          ok: result.ok,
          checks: result.checks,
          error: result.error ? { code: result.error.code, message: result.error.message, help: result.error.help } : null,
          state: customerOnboardingState(auth.onboarding, auth.customer),
        });
      }

      // Første synkronisering som sporbar bakgrunnsjobb. Fortsetter selv om kunden lukker siden.
      if (pathname === "/api/onboarding/sync" && request.method === "POST") {
        const auth = requireOnboarding(request, response);
        if (!auth) return;
        const connection = connectionFor(auth.onboarding);
        if (!connection || !auth.onboarding.completedSteps.includes("test")) {
          return json(response, 409, { error: "Test forbindelsen før synkroniseringen starter." });
        }
        const running = store.state.syncJobs.find((item) => item.connectionId === connection.id && item.status === "Kjører");
        if (running) return json(response, 202, { ok: true, job: maskJob(running), state: customerOnboardingState(auth.onboarding, auth.customer) });
        const job = createSyncJob(connection.id, "initial");
        store.state.syncJobs.unshift(job);
        store.state.syncJobs = store.state.syncJobs.slice(0, 100);
        auth.onboarding.status = "Synkroniserer";
        touchOnboarding(auth.onboarding);
        addIntegrationEvent(connection.id, "sync-started", "Kjører", { jobType: job.jobType });
        touchState();
        await saveStore();
        const onboardingId = auth.onboarding.id;
        runFirstSync({
          job,
          connection,
          service: tripletex,
          scopes: auth.onboarding.dataScopes,
          save: () => saveStore(),
          addEvent: addIntegrationEvent,
        })
          .then(async (result) => {
            const onboarding = findOnboarding(onboardingId);
            if (!onboarding) return;
            if (result.ok) {
              markStepDone(onboarding, "sync");
              onboarding.currentStep = "done";
              onboarding.status = "Fullført";
              onboarding.completedAt = nowIso();
              onboarding.errorCode = null;
              onboarding.errorMessage = null;
            } else {
              onboarding.status = "Feilet";
              onboarding.errorCode = result.error.code;
              onboarding.errorMessage = result.error.message;
              console.error("Første synkronisering feilet:", result.error.technical);
            }
            touchOnboarding(onboarding);
            touchState();
            await saveStore();
          })
          .catch((error) => console.error("Synkroniseringsjobben stoppet uventet:", error.message));
        return json(response, 202, { ok: true, job: maskJob(job), state: customerOnboardingState(auth.onboarding, auth.customer) });
      }

      // Datagrunnlag for kundens Oversikt-side.
      if (pathname === "/api/onboarding/overview" && request.method === "GET") {
        const auth = requireOnboarding(request, response);
        if (!auth) return;
        const connection = connectionFor(auth.onboarding);
        return json(response, 200, {
          ok: true,
          company: {
            name: auth.onboarding.profile?.company || auth.customer.company,
            contact: auth.onboarding.profile?.contact || auth.customer.contact,
          },
          onboarding: { status: auth.onboarding.status, step: auth.onboarding.currentStep, deferred: auth.onboarding.deferred },
          connection: connection
            ? {
                status: connection.status,
                companyName: connection.externalCompanyName,
                organizationNumber: connection.organizationNumber,
                credentialHint: connection.credentialHint,
                lastSyncAt: connection.lastSyncAt,
                permissions: connection.permissions,
                firstReport: connection.firstReport,
              }
            : null,
          job: maskJob(currentSyncJob(connection)),
          checklist: onboardingChecklist(auth.onboarding, connection),
        });
      }

      if (pathname === "/api/inquiries" && request.method === "POST") {
        const body = await readBody(request);
        if (sanitizeText(body.website, 120)) return json(response, 202, { ok: true });

        const startedAt = Number(body.formStartedAt);
        if (!Number.isFinite(startedAt) || Date.now() - startedAt < INQUIRY_MIN_FILL_MS || Date.now() - startedAt > 24 * 60 * 60 * 1000) {
          return json(response, 400, { error: "Skjemaet kunne ikke verifiseres. Åpne det på nytt og prøv igjen." });
        }

        const address = getClientAddress(request);
        const attempt = inquiryAttempts.get(address) || { count: 0, startedAt: Date.now() };
        if (Date.now() - attempt.startedAt > INQUIRY_WINDOW_MS) {
          attempt.count = 0;
          attempt.startedAt = Date.now();
        }
        if (attempt.count >= INQUIRY_ATTEMPT_LIMIT) {
          return json(response, 429, { error: "For mange innsendinger. Vent litt før du prøver igjen." }, { "Retry-After": "3600" });
        }

        const inquiryType = sanitizeText(body.inquiryType, 30);
        const name = sanitizeText(body.name, 100);
        const company = sanitizeText(body.company, 120);
        const email = sanitizeText(body.email, 160).toLowerCase();
        const phone = sanitizeText(body.phone, 30);
        const message = sanitizeText(body.message, 3000);
        if (!name || !company || !isEmail(email)) return json(response, 400, { error: "Navn, bedrift og gyldig e-post er påkrevd." });
        if (!['customer', 'prospect'].includes(inquiryType)) return json(response, 400, { error: "Velg om du er kunde eller vil bli kunde." });

        const referenceNumber = makeReference(store.state.inquiries);
        let customerId = null;
        let customer = null;
        let subject;
        let category;

        if (inquiryType === "customer") {
          const categories = ["Innlogging", "Integrasjon", "Rapport", "Råd", "Faktura", "Teknisk problem", "Annet"];
          category = sanitizeText(body.category, 40);
          subject = sanitizeText(body.subject, 180);
          if (!subject || !categories.includes(category) || !message) return json(response, 400, { error: "Emne, kategori og problembeskrivelse er påkrevd." });
          const existing = store.state.customers.find((item) => normalizeEmail(item.email) === email);
          customerId = existing?.id || null;
        } else {
          const businessTypes = ["Restaurant", "Bar", "Kafé", "Nattklubb", "Kjede", "Annet"];
          const allowedSystems = ["Tripletex", "PowerOffice", "Lightspeed", "Tamigo", "Planday", "Wolt", "Foodora", "Deliverect", "Annet"];
          const businessType = sanitizeText(body.businessType, 40);
          const locations = Number(body.locations);
          const systems = [...new Set((Array.isArray(body.systems) ? body.systems : []).map((value) => sanitizeText(value, 40)).filter((value) => allowedSystems.includes(value)))];
          if (!businessTypes.includes(businessType) || !Number.isInteger(locations) || locations < 1 || locations > 999 || systems.length === 0) {
            return json(response, 400, { error: "Virksomhetstype, antall lokasjoner og minst ett system er påkrevd." });
          }
          customer = createCustomerRecord({ name, company, email, phone, businessType, locations, systems });
          store.state.customers.unshift(customer);
          customerId = customer.id;
          subject = "Forespørsel om Scope";
          category = "Salg";
        }

        const inquiry = createInquiryRecord({ inquiryType, name, company, email, phone, subject, category, message, referenceNumber }, customerId);
        store.state.inquiries.unshift(inquiry);
        attempt.count += 1;
        inquiryAttempts.set(address, attempt);
        touchState();
        await saveStore();
        return json(response, 201, { ok: true, referenceNumber, inquiryId: inquiry.id, customerId: customer?.id || null });
      }

      if (pathname === "/admin/" && request.method === "GET") return redirect(response, "/admin");

      if (pathname === "/admin/login" && request.method === "GET") {
        const auth = getSession(request);
        if (auth?.user.role === "admin") return redirect(response, "/admin");
        return sendPrivateFile(response, "login.html");
      }

      if (pathname === "/admin" && request.method === "GET") {
        const auth = getSession(request);
        if (!auth) return redirect(response, "/admin/login");
        if (auth.user.role !== "admin") return sendPrivateFile(response, "access-denied.html", 403);
        return sendPrivateFile(response, "index.html");
      }

      if (pathname.startsWith("/admin/assets/") && request.method === "GET") {
        const assetName = path.basename(pathname);
        if (assetName === "login.js") return sendPrivateFile(response, assetName);
        const auth = getSession(request);
        if (!auth) return redirect(response, "/admin/login");
        if (assetName === "access-denied.js") return sendPrivateFile(response, assetName);
        if (auth.user.role !== "admin") return text(response, 403, "Ingen tilgang");
        if (!["admin.css", "admin.js", "login.js", "access-denied.js"].includes(assetName)) return text(response, 404, "Ikke funnet");
        return sendPrivateFile(response, assetName);
      }

      if (pathname === "/api/auth/login" && request.method === "POST") {
        const address = getClientAddress(request);
        const attempt = loginAttempts.get(address) || { count: 0, startedAt: Date.now() };
        if (Date.now() - attempt.startedAt > LOGIN_WINDOW_MS) {
          attempt.count = 0;
          attempt.startedAt = Date.now();
        }
        if (attempt.count >= LOGIN_ATTEMPT_LIMIT) return json(response, 429, { error: "For mange innloggingsforsøk. Vent litt og prøv igjen." });
        const body = await readBody(request);
        const email = sanitizeText(body.email, 160).toLowerCase();
        const user = store.users.find((candidate) => candidate.email.toLowerCase() === email);
        const valid = user ? await verifyPassword(String(body.password || ""), user.passwordHash) : await verifyPassword(String(body.password || ""), await hashPassword(randomBytes(24).toString("hex")));
        if (!user || !valid) {
          attempt.count += 1;
          loginAttempts.set(address, attempt);
          if (user) addAudit(user, "Mislykket innlogging", "Admin", "Avvist", "Feil passord.", request);
          return json(response, 401, { error: "Feil e-post eller passord." });
        }
        loginAttempts.delete(address);
        const token = randomBytes(32).toString("base64url");
        sessions.set(token, { userId: user.id, csrfToken: randomBytes(24).toString("base64url"), expiresAt: Date.now() + SESSION_TTL_MS });
        try {
          await fs.rm(bootstrapCredentialsPath, { force: true });
        } catch (error) {
          console.error("Kunne ikke slette bootstrap-filen:", error.message);
        }
        addAudit(user, "Innlogging", "Admin", "Vellykket", user.mfaReady ? "Konto klargjort for MFA via identitetsleverandør." : "", request);
        clearExpiredSessions();
        const secure = request.socket.encrypted || process.env.NODE_ENV === "production" ? "; Secure" : "";
        return json(response, 200, { ok: true, redirect: user.role === "admin" ? "/admin" : "/admin" }, {
          "Set-Cookie": `scope_admin_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}${secure}`,
        });
      }

      if (pathname === "/api/auth/session" && request.method === "GET") {
        const auth = getSession(request);
        if (!auth) return json(response, 401, { error: "Du må logge inn." });
        return json(response, 200, {
          user: { id: auth.user.id, name: auth.user.name, email: auth.user.email, role: auth.user.role, mfaReady: auth.user.mfaReady },
          csrfToken: auth.session.csrfToken,
        });
      }

      if (pathname === "/api/auth/logout" && request.method === "POST") {
        const auth = getSession(request);
        if (auth && request.headers["x-csrf-token"] === auth.session.csrfToken) {
          addAudit(auth.user, "Utlogging", "Admin", "Vellykket", "", request);
          sessions.delete(auth.token);
        }
        return json(response, 200, { ok: true }, { "Set-Cookie": "scope_admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" });
      }

      if (pathname === "/api/admin/state" && request.method === "GET") {
        const auth = requireAdmin(request, response);
        if (!auth) return;
        return json(response, 200, publicAdminState());
      }

      if (pathname === "/api/admin/audit-events" && request.method === "POST") {
        const auth = requireAdmin(request, response);
        if (!auth) return;
        const body = await readBody(request);
        const allowedExports = new Map([
          ["summary", ["Eksporterte sammendrag", "Oversikt"]],
          ["customers", ["Eksporterte kundeliste", "Kunder"]],
          ["inquiries", ["Eksporterte henvendelser", "Henvendelser"]],
          ["analytics", ["Eksporterte analyserapport", "Analyse"]],
          ["product", ["Eksporterte produktbruk", "Produktbruk"]],
          ["integrations", ["Eksporterte integrasjonsliste", "Integrasjoner"]],
          ["activity", ["Eksporterte aktivitetslogg", "Aktivitetslogg"]],
        ]);
        const event = allowedExports.get(body.type);
        if (!event) return json(response, 400, { error: "Ugyldig audit-hendelse." });
        const item = addAudit(auth.user, event[0], event[1], "Vellykket", "Fil generert lokalt i nettleseren.", request);
        return json(response, 201, item);
      }

      const customerMatch = pathname.match(/^\/api\/admin\/customers\/([^/]+)$/);
      if (customerMatch && request.method === "PATCH") {
        const auth = requireAdmin(request, response);
        if (!auth) return;
        const customer = store.state.customers.find((item) => item.id === customerMatch[1]);
        if (!customer) return json(response, 404, { error: "Kunden finnes ikke." });
        const body = await readBody(request);
        const allowedStatuses = ["Ny", "Kontaktet", "Demo booket", "Pilot", "Aktiv kunde", "Pauset", "Avsluttet"];
        if (body.status && !allowedStatuses.includes(body.status)) return json(response, 400, { error: "Ugyldig kundestatus." });
        const changes = [];
        if (body.status && body.status !== customer.status) {
          changes.push(`status fra ${customer.status} til ${body.status}`);
          customer.status = body.status;
          customer.statusHistory ||= [];
          customer.statusHistory.unshift({ status: body.status, at: new Date().toISOString(), by: auth.user.name });
        }
        if (body.owner !== undefined) {
          const owner = sanitizeText(body.owner, 80) || "Ikke tildelt";
          const validOwners = ["Ikke tildelt", ...store.users.filter((user) => user.role === "admin").map((user) => user.name)];
          if (!validOwners.includes(owner)) return json(response, 400, { error: "Ugyldig ansvarlig." });
          customer.owner = owner;
          changes.push("intern ansvarlig");
        }
        if (body.archived === true) {
          customer.archived = true;
          changes.push("arkivstatus");
        }
        customer.updatedAt = nowIso();
        customer.lastActivity = customer.updatedAt;
        touchState();
        await saveStore();
        addAudit(auth.user, "Oppdaterte kunde", customer.company, "Vellykket", `Endret ${changes.join(" og ") || "kundedata"}.`, request);
        return json(response, 200, customer);
      }

      // Administrator inviterer en kunde til onboarding med en tidsbegrenset engangslenke.
      if (pathname === "/api/admin/onboarding/invite" && request.method === "POST") {
        const auth = requireAdmin(request, response);
        if (!auth) return;
        const body = await readBody(request);
        const company = sanitizeText(body.company, 120);
        const contact = sanitizeText(body.contact, 100);
        const email = normalizeEmail(body.email);
        const orgNumber = normalizeOrgNumber(body.orgNumber);
        if (!company || !contact || !isEmail(email)) return json(response, 400, { error: "Bedriftsnavn, kontaktperson og gyldig e-post er påkrevd." });
        if (orgNumber && !isValidOrgNumber(orgNumber)) return json(response, 400, { error: "Organisasjonsnummeret ser ikke gyldig ut." });
        let environment = sanitizeText(body.environment, 20) || tripletexConfig.defaultEnvironment;
        if (!TRIPLETEX_ENVIRONMENTS.includes(environment)) environment = tripletexConfig.defaultEnvironment;
        let customer = store.state.customers.find((item) => !item.archived && normalizeEmail(item.email) === email);
        if (!customer) {
          customer = createCustomerRecord({ name: contact, company, email, phone: sanitizeText(body.phone, 30), businessType: "Annet", locations: 1, systems: ["Tripletex"] }, auth.user.name);
          store.state.customers.unshift(customer);
        }
        customer.orgNumber = orgNumber || customer.orgNumber;
        const activeOnboarding = store.state.onboardings.find((item) => item.customerId === customer.id && item.status !== "Fullført");
        if (activeOnboarding) return json(response, 409, { error: "Kunden har allerede en aktiv onboarding. Bruk «Send lenke på nytt» i stedet." });
        const onboarding = createOnboardingRecord({ customerId: customer.id, invitedBy: auth.user.name, environment });
        const { token, invite } = createInvite();
        onboarding.invite = invite;
        store.state.onboardings.unshift(onboarding);
        const inviteUrl = publicOnboardingUrl(request, token);
        const emailSent = await sendInviteEmail(customer, inviteUrl);
        touchState();
        await saveStore();
        addAudit(auth.user, "Inviterte kunde til onboarding", customer.company, "Vellykket", emailSent ? "Onboardinglenke sendt på e-post." : "Onboardinglenke generert for manuell deling.", request);
        return json(response, 201, { ok: true, onboarding: maskOnboardingForAdmin(onboarding), customer, inviteUrl, emailSent, emailConfigured: Boolean(emailSender) });
      }

      const onboardingAdminMatch = pathname.match(/^\/api\/admin\/onboarding\/([^/]+)\/(resend|reset|retest)$/);
      if (onboardingAdminMatch && request.method === "POST") {
        const auth = requireAdmin(request, response);
        if (!auth) return;
        const onboarding = findOnboarding(onboardingAdminMatch[1]);
        if (!onboarding) return json(response, 404, { error: "Onboardingen finnes ikke." });
        const customer = store.state.customers.find((item) => item.id === onboarding.customerId);
        const action = onboardingAdminMatch[2];

        if (action === "resend") {
          const { token, invite } = createInvite();
          onboarding.invite = invite;
          if (onboarding.status === "Ikke startet") onboarding.status = "Venter på kunde";
          const inviteUrl = publicOnboardingUrl(request, token);
          const emailSent = customer ? await sendInviteEmail(customer, inviteUrl) : false;
          touchOnboarding(onboarding);
          touchState();
          await saveStore();
          addAudit(auth.user, "Sendte onboardinglenke på nytt", customer?.company || onboarding.customerId, "Vellykket", emailSent ? "Lenke sendt på e-post." : "Lenke generert for manuell deling.", request);
          return json(response, 200, { ok: true, inviteUrl, emailSent, emailConfigured: Boolean(emailSender), onboarding: maskOnboardingForAdmin(onboarding) });
        }

        if (action === "reset") {
          const connection = connectionFor(onboarding);
          onboarding.errorCode = null;
          onboarding.errorMessage = null;
          onboarding.attempts = 0;
          onboarding.completedSteps = onboarding.completedSteps.filter((step) => !["test", "sync"].includes(step));
          onboarding.currentStep = connection?.encryptedCredentials ? "test" : "connect";
          onboarding.status = onboarding.invite && !onboarding.invite.usedAt ? "Venter på kunde" : "Pågår";
          onboarding.completedAt = null;
          if (connection && connection.status === "Feil") connection.status = connection.encryptedCredentials ? "Tilkoblet" : "Venter på oppsett";
          touchOnboarding(onboarding);
          touchState();
          await saveStore();
          addAudit(auth.user, "Nullstilte onboarding", customer?.company || onboarding.customerId, "Vellykket", "Feilstatus fjernet, kunden kan fortsette.", request);
          return json(response, 200, { ok: true, onboarding: maskOnboardingForAdmin(onboarding) });
        }

        const connection = connectionFor(onboarding);
        if (!connection || !connection.externalCompanyId) return json(response, 409, { error: "Kunden har ikke koblet til Tripletex ennå." });
        const result = await tripletex.testConnection(connection, { scopes: onboarding.dataScopes, expectedOrgNumber: onboarding.profile?.orgNumber || "" });
        connection.lastCheckAt = nowIso();
        connection.status = result.ok ? "Tilkoblet" : "Feil";
        addIntegrationEvent(connection.id, "connection-test", result.ok ? "Vellykket" : "Feilet", result.ok ? { by: "admin" } : { by: "admin", code: result.error.code, technical: result.error.technical });
        touchState();
        await saveStore();
        addAudit(auth.user, "Testet Tripletex-tilkobling", customer?.company || onboarding.customerId, result.ok ? "Vellykket" : "Feilet", result.ok ? "" : result.error.message, request);
        return json(response, 200, { ok: result.ok, checks: result.checks, error: result.error ? { code: result.error.code, message: result.error.message } : null });
      }

      // Kobler fra Tripletex sikkert: hemmeligheter slettes, hendelsen logges uten tokenverdier.
      const disconnectMatch = pathname.match(/^\/api\/admin\/connections\/([^/]+)\/disconnect$/);
      if (disconnectMatch && request.method === "POST") {
        const auth = requireAdmin(request, response);
        if (!auth) return;
        const connection = findConnection(disconnectMatch[1]);
        if (!connection) return json(response, 404, { error: "Tilkoblingen finnes ikke." });
        await tripletex.disconnect(connection);
        const customer = store.state.customers.find((item) => item.id === connection.customerId);
        addIntegrationEvent(connection.id, "connection-disconnected", "Vellykket", { by: auth.user.name });
        touchState();
        await saveStore();
        addAudit(auth.user, "Koblet fra Tripletex", customer?.company || connection.customerId, "Vellykket", "Tilgangen ble slettet sikkert.", request);
        return json(response, 200, { ok: true, connection: maskConnection(connection) });
      }

      if (pathname === "/api/admin/customers" && request.method === "POST") {
        const auth = requireAdmin(request, response);
        if (!auth) return;
        const body = await readBody(request);
        const company = sanitizeText(body.company, 120);
        const contact = sanitizeText(body.contact, 100);
        const email = normalizeEmail(body.email);
        if (!company || !contact || !isEmail(email)) return json(response, 400, { error: "Virksomhet, kontakt og gyldig e-post er påkrevd." });
        const customer = createCustomerRecord({
          company,
          name: contact,
          email,
          phone: sanitizeText(body.phone, 30),
          businessType: sanitizeText(body.type, 40) || "Annet",
          locations: Math.max(1, Math.min(999, Number(body.locations) || 1)),
          systems: [],
        }, auth.user.name);
        store.state.customers.unshift(customer);
        touchState();
        await saveStore();
        addAudit(auth.user, "Opprettet kunde", customer.company, "Vellykket", "Ny potensiell kunde registrert.", request);
        return json(response, 201, customer);
      }

      const customerActionMatch = pathname.match(/^\/api\/admin\/customers\/([^/]+)\/(notes|tasks|locations|demo|anonymize)$/);
      if (customerActionMatch && request.method === "POST") {
        const auth = requireAdmin(request, response);
        if (!auth) return;
        const customer = store.state.customers.find((item) => item.id === customerActionMatch[1]);
        if (!customer) return json(response, 404, { error: "Kunden finnes ikke." });
        const body = await readBody(request);
        const action = customerActionMatch[2];
        if (action === "notes") {
          const note = sanitizeText(body.text, 800);
          if (!note) return json(response, 400, { error: "Notatet kan ikke være tomt." });
          customer.notes ||= [];
          customer.notes.unshift({ id: `n-${Date.now()}`, text: note, author: auth.user.name, createdAt: new Date().toISOString() });
        } else if (action === "tasks") {
          const title = sanitizeText(body.title, 160);
          if (!title) return json(response, 400, { error: "Oppgaven må ha en tittel." });
          customer.tasks ||= [];
          customer.tasks.unshift({ id: `t-${Date.now()}`, title, due: sanitizeText(body.due, 40) || "Ingen frist", done: false });
        } else if (action === "locations") {
          customer.locations += 1;
        } else if (action === "demo") {
          customer.meetings ||= [];
          customer.meetings.unshift(`Demo registrert ${new Intl.DateTimeFormat("nb-NO", { dateStyle: "medium" }).format(new Date())}`);
        } else if (action === "anonymize") {
          customer.contact = "Anonymisert kontakt";
          customer.email = `anonymisert-${customer.id}@example.invalid`;
          customer.phone = "Ikke lagret";
          customer.notes = [];
        }
        customer.updatedAt = nowIso();
        customer.lastActivity = customer.updatedAt;
        touchState();
        await saveStore();
        addAudit(auth.user, action === "anonymize" ? "Anonymiserte kundedata" : `Opprettet ${action}`, customer.company, "Vellykket", "", request);
        return json(response, 200, customer);
      }

      const exportMatch = pathname.match(/^\/api\/admin\/customers\/([^/]+)\/export$/);
      if (exportMatch && request.method === "GET") {
        const auth = requireAdmin(request, response);
        if (!auth) return;
        const customer = store.state.customers.find((item) => item.id === exportMatch[1]);
        if (!customer) return json(response, 404, { error: "Kunden finnes ikke." });
        addAudit(auth.user, "Eksporterte kundedata", customer.company, "Vellykket", "JSON-eksport.", request);
        return json(response, 200, { exportedAt: new Date().toISOString(), customer });
      }

      const inquiryMatch = pathname.match(/^\/api\/admin\/inquiries\/([^/]+)$/);
      if (inquiryMatch && request.method === "PATCH") {
        const auth = requireAdmin(request, response);
        if (!auth) return;
        const inquiry = store.state.inquiries.find((item) => item.id === inquiryMatch[1]);
        if (!inquiry) return json(response, 404, { error: "Henvendelsen finnes ikke." });
        const body = await readBody(request);
        const statuses = ["Ny", "Under behandling", "Venter på kunde", "Besvart", "Lukket"];
        const priorities = ["Høy", "Normal", "Lav"];
        if (body.status && !statuses.includes(body.status)) return json(response, 400, { error: "Ugyldig status." });
        if (body.priority && !priorities.includes(body.priority)) return json(response, 400, { error: "Ugyldig prioritet." });
        inquiry.history ||= [];
        inquiry.notes ||= [];
        if (body.status && body.status !== inquiry.status) {
          const previous = inquiry.status;
          inquiry.status = body.status;
          inquiry.history.unshift(historyItem(body.status === "Lukket" ? "Henvendelse lukket" : "Status endret", auth.user.name, `${previous} → ${body.status}`));
        }
        if (body.priority && body.priority !== inquiry.priority) {
          inquiry.history.unshift(historyItem("Prioritet endret", auth.user.name, `${inquiry.priority} → ${body.priority}`));
          inquiry.priority = body.priority;
        }
        if (body.owner !== undefined) {
          const owner = sanitizeText(body.owner, 80) || "Ikke tildelt";
          const validOwners = ["Ikke tildelt", ...store.users.filter((user) => user.role === "admin").map((user) => user.name)];
          if (!validOwners.includes(owner)) return json(response, 400, { error: "Ugyldig ansvarlig." });
          if (owner !== inquiry.owner) inquiry.history.unshift(historyItem("Ansvarlig tildelt", auth.user.name, owner));
          inquiry.owner = owner;
        }
        if (body.customerId !== undefined) {
          const customerId = sanitizeText(body.customerId, 100) || null;
          if (customerId && !store.state.customers.some((item) => item.id === customerId && !item.archived)) return json(response, 400, { error: "Kunden finnes ikke." });
          inquiry.customerId = customerId;
        }
        if (body.note !== undefined) {
          const note = sanitizeText(body.note, 1200);
          if (!note) return json(response, 400, { error: "Notatet kan ikke være tomt." });
          inquiry.notes.unshift({ id: makeId("n"), text: note, author: auth.user.name, at: nowIso() });
          inquiry.history.unshift(historyItem("Internt notat lagt til", auth.user.name));
        }
        inquiry.updatedAt = nowIso();
        touchState();
        await saveStore();
        addAudit(auth.user, "Behandlet henvendelse", inquiry.subject, "Vellykket", `Status: ${inquiry.status}.`, request);
        return json(response, 200, inquiry);
      }

      const inquiryCustomerMatch = pathname.match(/^\/api\/admin\/inquiries\/([^/]+)\/customer$/);
      if (inquiryCustomerMatch && request.method === "POST") {
        const auth = requireAdmin(request, response);
        if (!auth) return;
        const inquiry = store.state.inquiries.find((item) => item.id === inquiryCustomerMatch[1]);
        if (!inquiry) return json(response, 404, { error: "Henvendelsen finnes ikke." });
        if (inquiry.customerId) return json(response, 409, { error: "Henvendelsen er allerede knyttet til en kunde." });
        const customer = createCustomerRecord({
          name: inquiry.name,
          company: inquiry.company,
          email: inquiry.email,
          phone: inquiry.phone || "",
          businessType: "Annet",
          locations: 1,
          systems: [],
        }, auth.user.name);
        store.state.customers.unshift(customer);
        inquiry.customerId = customer.id;
        inquiry.updatedAt = nowIso();
        inquiry.history ||= [];
        inquiry.history.unshift(historyItem("Kunde opprettet fra henvendelse", auth.user.name, customer.company));
        touchState();
        await saveStore();
        addAudit(auth.user, "Opprettet kunde fra henvendelse", customer.company, "Vellykket", inquiry.referenceNumber || inquiry.id, request);
        return json(response, 201, { customer, inquiry });
      }

      const inquiryReplyMatch = pathname.match(/^\/api\/admin\/inquiries\/([^/]+)\/replies$/);
      if (inquiryReplyMatch && request.method === "POST") {
        const auth = requireAdmin(request, response);
        if (!auth) return;
        const inquiry = store.state.inquiries.find((item) => item.id === inquiryReplyMatch[1]);
        if (!inquiry) return json(response, 404, { error: "Henvendelsen finnes ikke." });
        const body = await readBody(request);
        const message = sanitizeText(body.message, 6000);
        const action = sanitizeText(body.action, 20);
        if (!message) return json(response, 400, { error: "Svaret kan ikke være tomt." });
        if (!["draft", "send"].includes(action)) return json(response, 400, { error: "Ugyldig svarhandling." });

        const reply = {
          id: makeId("r"),
          message,
          author: auth.user.name,
          createdAt: nowIso(),
          status: "Utkast",
        };
        let deliveryError = "";
        if (action === "send" && emailSender) {
          try {
            await emailSender({
              to: inquiry.email,
              subject: `Svar fra Scope · #${inquiry.referenceNumber || inquiry.id}`,
              text: message,
              referenceNumber: inquiry.referenceNumber || inquiry.id,
            });
            reply.status = "Sendt";
            reply.sentAt = nowIso();
          } catch (error) {
            deliveryError = sanitizeText(error.message, 300) || "E-postleveransen mislyktes.";
            reply.deliveryError = deliveryError;
          }
        }

        inquiry.replies ||= [];
        inquiry.history ||= [];
        inquiry.replies.unshift(reply);
        inquiry.history.unshift(historyItem(reply.status === "Sendt" ? "Svar sendt" : "Svar lagret", auth.user.name, reply.status));
        if (reply.status === "Sendt") inquiry.status = "Besvart";
        inquiry.updatedAt = nowIso();
        touchState();
        await saveStore();
        addAudit(auth.user, reply.status === "Sendt" ? "Sendte svar" : "Lagret svarutkast", inquiry.subject, reply.status === "Sendt" ? "Vellykket" : "Lagret", deliveryError, request);
        if (deliveryError) return json(response, 502, { error: `E-posten ble ikke sendt. Utkastet er lagret. ${deliveryError}`, draftSaved: true });
        return json(response, 200, {
          inquiry,
          delivered: reply.status === "Sendt",
          draftSaved: reply.status === "Utkast",
          configurationRequired: action === "send" && !emailSender,
        });
      }

      if (pathname.startsWith("/api/")) return json(response, 404, { error: "Endepunktet finnes ikke." });
      return sendPublicFile(response, pathname);
    } catch (error) {
      const status = Number(error.status) || 500;
      if (status === 500) console.error(error);
      if (!response.headersSent) json(response, status, { error: status === 500 ? "Noe gikk galt på serveren." : error.message });
    }
  });

  return {
    server,
    store,
    bootstrapPassword,
    close: async () => {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      await saveQueue;
    },
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { server } = await createScopeServer();
  const port = Number(process.env.PORT) || 4173;
  const host = process.env.HOST || "127.0.0.1";
  server.listen(port, host, () => console.log(`Scope kjører på http://${host}:${port}`));
}
