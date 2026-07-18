// Onboardingtilstand: steg, datakategorier, validering og trygg sanitisering.
// Hemmelige felt (token-hasher og krypterte tilganger) forlater aldri serveren.

import { createHash, randomBytes } from "node:crypto";

export const ONBOARDING_STEPS = [
  { id: "welcome", label: "Velkommen" },
  { id: "business", label: "Om virksomheten" },
  { id: "connect", label: "Koble til Tripletex" },
  { id: "company", label: "Velg selskap" },
  { id: "data", label: "Velg data" },
  { id: "test", label: "Test forbindelsen" },
  { id: "sync", label: "Første synkronisering" },
  { id: "done", label: "Ferdig" },
];

export const ONBOARDING_STATUSES = ["Ikke startet", "Pågår", "Venter på kunde", "Synkroniserer", "Fullført", "Feilet"];

export const BUSINESS_TYPES = ["Restaurant", "Bar", "Kafé", "Nattklubb", "Kjede", "Annet"];

export const DATA_SCOPES = [
  { id: "accounting", label: "Regnskap og resultat", why: "Brukes til å beregne margin og lønnsomhet.", required: true },
  { id: "revenue", label: "Inntekter og salgskontoer", why: "Brukes til å vise omsetningen deres over tid.", required: true },
  { id: "costs", label: "Kostnader", why: "Brukes til å finne kostnadene som spiser av resultatet.", required: true },
  { id: "payroll", label: "Lønn og personalkostnad", why: "Brukes til å sammenligne bemanning med omsetning.", required: false },
  { id: "suppliers", label: "Leverandørkostnader", why: "Brukes til å følge innkjøp og varekost per leverandør.", required: false },
  { id: "departments", label: "Avdelinger og lokasjoner", why: "Brukes til å dele tallene per avdeling eller lokasjon.", required: false },
];

export const REQUIRED_SCOPES = DATA_SCOPES.filter((scope) => scope.required).map((scope) => scope.id);

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function stepIndex(stepId) {
  return ONBOARDING_STEPS.findIndex((step) => step.id === stepId);
}

export function isStep(stepId) {
  return stepIndex(stepId) >= 0;
}

export function hashInviteToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

export function createInvite() {
  const token = randomBytes(24).toString("base64url");
  return {
    token,
    invite: {
      tokenHash: hashInviteToken(token),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
      usedAt: null,
    },
  };
}

export function createOnboardingRecord({ customerId, invitedBy, environment, status = "Venter på kunde" }) {
  const now = new Date().toISOString();
  return {
    id: `ob-${Date.now()}-${randomBytes(4).toString("hex")}`,
    customerId,
    status,
    currentStep: "welcome",
    completedSteps: [],
    profile: null,
    dataScopes: [],
    companies: [],
    selectedCompany: null,
    connectionId: null,
    environment,
    invite: null,
    tripletexState: null,
    deferred: false,
    attempts: 0,
    invitedBy: invitedBy || "Selvregistrering",
    startedAt: null,
    completedAt: null,
    lastActivityAt: now,
    createdAt: now,
    errorCode: null,
    errorMessage: null,
  };
}

export function createConnectionRecord({ customerId, environment }) {
  return {
    id: `conn-${Date.now()}-${randomBytes(4).toString("hex")}`,
    customerId,
    provider: "tripletex",
    environment,
    externalCompanyId: null,
    externalCompanyName: "",
    organizationNumber: "",
    status: "Venter på oppsett",
    encryptedCredentials: "",
    encryptedSession: "",
    sessionExpiresAt: null,
    credentialHint: "",
    permissions: [],
    syncStrategy: "initial-full",
    firstReport: null,
    connectedAt: null,
    lastSyncAt: null,
    lastCheckAt: null,
    disconnectedAt: null,
    createdAt: new Date().toISOString(),
  };
}

export function markStepDone(onboarding, stepId) {
  if (!isStep(stepId)) return;
  if (!onboarding.completedSteps.includes(stepId)) onboarding.completedSteps.push(stepId);
  onboarding.completedSteps.sort((a, b) => stepIndex(a) - stepIndex(b));
}

export function touchOnboarding(onboarding) {
  onboarding.lastActivityAt = new Date().toISOString();
  if (!onboarding.startedAt && onboarding.status !== "Venter på kunde" && onboarding.status !== "Ikke startet") {
    onboarding.startedAt = onboarding.lastActivityAt;
  }
}

// Norsk organisasjonsnummer: 9 siffer med mod11-kontroll.
export function isValidOrgNumber(value) {
  const digits = String(value || "").replace(/\s/g, "");
  if (!/^\d{9}$/.test(digits)) return false;
  const weights = [3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((total, weight, index) => total + weight * Number(digits[index]), 0);
  const remainder = sum % 11;
  const control = remainder === 0 ? 0 : 11 - remainder;
  return control !== 10 && control === Number(digits[8]);
}

export function normalizeOrgNumber(value) {
  return String(value || "").replace(/\D/g, "");
}

export function validateProfile(body, sanitizeText, isEmail) {
  const errors = {};
  const company = sanitizeText(body.company, 120);
  const orgNumber = normalizeOrgNumber(body.orgNumber);
  const businessType = sanitizeText(body.businessType, 40);
  const locations = Number(body.locations);
  const contact = sanitizeText(body.contact, 100);
  const email = sanitizeText(body.email, 160).toLowerCase();
  const phone = sanitizeText(body.phone, 30);

  if (!company) errors.company = "Skriv inn navnet på virksomheten.";
  if (!orgNumber) errors.orgNumber = "Skriv inn organisasjonsnummeret (9 siffer).";
  else if (!isValidOrgNumber(orgNumber)) errors.orgNumber = "Dette ser ikke ut som et gyldig organisasjonsnummer.";
  if (!BUSINESS_TYPES.includes(businessType)) errors.businessType = "Velg hvilken type virksomhet dere er.";
  if (!Number.isInteger(locations) || locations < 1 || locations > 999) errors.locations = "Antall lokasjoner må være mellom 1 og 999.";
  if (!contact) errors.contact = "Skriv inn navnet på kontaktpersonen.";
  if (!email) errors.email = "Skriv inn e-postadressen.";
  else if (!isEmail(email)) errors.email = "Dette ser ikke ut som en gyldig e-postadresse.";

  if (Object.keys(errors).length) return { errors };
  return { values: { company, orgNumber, businessType, locations, contact, email, phone } };
}

export function validateDataScopes(selected) {
  const known = new Set(DATA_SCOPES.map((scope) => scope.id));
  const chosen = [...new Set((Array.isArray(selected) ? selected : []).filter((id) => known.has(id)))];
  // Påkrevde kategorier kan ikke velges bort – de legges alltid til.
  for (const required of REQUIRED_SCOPES) if (!chosen.includes(required)) chosen.push(required);
  return chosen.sort((a, b) => DATA_SCOPES.findIndex((s) => s.id === a) - DATA_SCOPES.findIndex((s) => s.id === b));
}

export function maskConnection(connection) {
  if (!connection) return null;
  return {
    id: connection.id,
    customerId: connection.customerId,
    provider: connection.provider,
    environment: connection.environment,
    externalCompanyId: connection.externalCompanyId,
    externalCompanyName: connection.externalCompanyName,
    organizationNumber: connection.organizationNumber,
    status: connection.status,
    credentialHint: connection.credentialHint,
    permissions: connection.permissions,
    syncStrategy: connection.syncStrategy,
    firstReport: connection.firstReport,
    connectedAt: connection.connectedAt,
    lastSyncAt: connection.lastSyncAt,
    lastCheckAt: connection.lastCheckAt,
    disconnectedAt: connection.disconnectedAt,
    createdAt: connection.createdAt,
  };
}

export function maskOnboardingForAdmin(onboarding) {
  const { invite, tripletexState, ...rest } = onboarding;
  return {
    ...rest,
    invite: invite
      ? { createdAt: invite.createdAt, expiresAt: invite.expiresAt, usedAt: invite.usedAt, expired: Date.parse(invite.expiresAt) < Date.now() }
      : null,
  };
}

export function maskJob(job) {
  if (!job) return null;
  return {
    id: job.id,
    connectionId: job.connectionId,
    jobType: job.jobType,
    status: job.status,
    progressStage: job.progressStage,
    stages: job.stages,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    errorCode: job.errorCode,
    errorMessage: job.errorMessage,
  };
}
