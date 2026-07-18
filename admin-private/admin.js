const routes = [
  { id: "overview", label: "Oversikt", icon: "⌂" },
  { id: "customers", label: "Kunder", icon: "◉" },
  { id: "onboarding", label: "Onboarding", icon: "➔", badge: () => app.data?.onboardings?.filter((item) => item.status === "Feilet").length || 0 },
  { id: "inquiries", label: "Henvendelser", icon: "✉", badge: () => app.data?.inquiries.filter((item) => item.status === "Ny").length || 0 },
  { id: "analytics", label: "Analyse", icon: "⌁" },
  { id: "product", label: "Produktbruk", icon: "◫" },
  { id: "integrations", label: "Integrasjoner", icon: "⛓" },
  { id: "status", label: "Systemstatus", icon: "◌" },
  { id: "activity", label: "Aktivitetslogg", icon: "≡" },
];

const app = {
  data: null,
  user: null,
  csrfToken: "",
  route: "overview",
  search: "",
  filters: { customers: {}, inquiries: {} },
  panel: null,
  sort: { customers: ["createdAt", "desc"], inquiries: ["createdAt", "desc"] },
};

const content = document.querySelector("#page-content");
const nav = document.querySelector("#main-nav");
const panel = document.querySelector("#side-panel");
const panelContent = document.querySelector("#panel-content");
const panelScrim = document.querySelector("#panel-scrim");
const dialog = document.querySelector("#app-dialog");
const dialogContent = document.querySelector("#dialog-content");
const globalSearch = document.querySelector("#global-search");
const globalResults = document.querySelector("#global-search-results");

function e(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function normalize(value) {
  return String(value ?? "").toLocaleLowerCase("nb-NO");
}

function formatDate(value) {
  if (!value) return "–";
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return String(value);
  return new Intl.DateTimeFormat("nb-NO", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function initials(value) {
  return String(value || "Scope").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function statusClass(status) {
  return ({
    "Aktiv kunde": "status-active", Ny: "status-new", Pilot: "status-pilot", Kontaktet: "status-contacted",
    "Demo booket": "status-booked", Pauset: "status-paused", Avsluttet: "status-ended", Besvart: "status-closed",
    Lukket: "status-closed", "Under behandling": "status-booked", "Venter på kunde": "status-waiting",
    Høy: "status-error", Normal: "status-new", Lav: "status-paused", Vellykket: "status-working", Avvist: "status-error",
    "Ikke startet": "status-paused", Pågår: "status-booked", Synkroniserer: "status-booked", Fullført: "status-active",
    Feilet: "status-error", Tilkoblet: "status-active", Feil: "status-error", Frakoblet: "status-ended",
    "Venter på oppsett": "status-waiting", Kjører: "status-booked",
  })[status] || "status-paused";
}

const ONBOARDING_STEP_LABELS = { welcome: "Velkommen", business: "Om virksomheten", connect: "Koble til Tripletex", company: "Velg selskap", data: "Velg data", test: "Test forbindelsen", sync: "Første synkronisering", done: "Ferdig" };
const DATA_SCOPE_LABELS = { accounting: "Regnskap og resultat", revenue: "Inntekter og salgskontoer", costs: "Kostnader", payroll: "Lønn og personalkostnad", suppliers: "Leverandørkostnader", departments: "Avdelinger og lokasjoner" };

function statusBadge(status) {
  return `<span class="status-badge ${statusClass(status)}">${e(status)}</span>`;
}

function priorityBadge(priority) {
  return `<span class="priority-badge priority-${normalize(priority)}">${e(priority)}</span>`;
}

function pageHead(kicker, title, description, actions = "") {
  return `<header class="page-head"><div class="page-head-copy"><p class="page-kicker">${e(kicker)}</p><h1>${e(title)}</h1><p>${e(description)}</p></div>${actions ? `<div class="page-actions">${actions}</div>` : ""}</header>`;
}

function emptyState(title, text, action = "") {
  return `<div class="empty-state"><div><span aria-hidden="true">◎</span><strong>${e(title)}</strong><p>${e(text)}</p>${action}</div></div>`;
}

function toast(title, text, isError = false) {
  const item = document.createElement("div");
  item.className = `toast${isError ? " is-error" : ""}`;
  item.innerHTML = `<i>${isError ? "!" : "✓"}</i><div><strong>${e(title)}</strong><p>${e(text)}</p></div>`;
  document.querySelector("#toast-region").append(item);
  window.setTimeout(() => item.remove(), 4200);
}

async function api(path, options = {}) {
  const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...(options.headers || {}) };
  if (options.method && !["GET", "HEAD"].includes(options.method)) headers["X-CSRF-Token"] = app.csrfToken;
  const response = await fetch(path, { ...options, headers });
  if (response.status === 401) {
    window.location.assign("/admin/login");
    throw new Error("Økten er utløpt.");
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "Forespørselen mislyktes.");
  return result;
}

function renderNav() {
  nav.innerHTML = routes.map((route) => {
    const badge = route.badge?.();
    return `<button class="nav-item${app.route === route.id ? " is-active" : ""}" type="button" data-route="${route.id}"><span class="nav-icon" aria-hidden="true">${route.icon}</span><span>${route.label}</span>${badge ? `<span class="nav-badge">${badge}</span>` : ""}</button>`;
  }).join("");
}

function navigate(route, updateHash = true) {
  if (!routes.some((item) => item.id === route)) route = "overview";
  app.route = route;
  if (updateHash) history.replaceState(null, "", `#${route}`);
  renderNav();
  renderPage();
  closeMobileNav();
  content.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openPanel(type, id) {
  app.panel = { type, id };
  renderPanel();
  panel.classList.add("is-open");
  panelScrim.classList.add("is-open");
  panel.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  panel.querySelector(".close-button")?.focus();
}

function closePanel() {
  panel.classList.remove("is-open");
  panelScrim.classList.remove("is-open");
  panel.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  app.panel = null;
}

function loading() {
  content.innerHTML = `${pageHead("Scope admin", "Laster kontrollrommet", "Henter data fra Scope-databasen.")}<div class="loading-grid"><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div></div>`;
}

function ownerOptions(selected) {
  return ["Ikke tildelt", ...(app.data.admins || []).map((admin) => admin.name)].map((owner) => `<option${selected === owner ? " selected" : ""}>${e(owner)}</option>`).join("");
}

function filterSelect(scope, key, label, options) {
  const selected = app.filters[scope]?.[key] || "";
  return `<select class="filter-select" data-filter-scope="${scope}" data-filter-key="${key}" aria-label="${e(label)}"><option value="">${e(label)}</option>${options.map((option) => { const value = Array.isArray(option) ? option[0] : option; const text = Array.isArray(option) ? option[1] : option; return `<option value="${e(value)}"${selected === value ? " selected" : ""}>${e(text)}</option>`; }).join("")}</select>`;
}

function sortRows(rows, scope) {
  const [key, direction] = app.sort[scope];
  return rows.sort((a, b) => String(a[key] ?? "").localeCompare(String(b[key] ?? ""), "nb", { numeric: true }) * (direction === "asc" ? 1 : -1));
}

function overviewPage() {
  const customers = app.data.customers.filter((item) => !item.archived);
  const inquiries = app.data.inquiries;
  const cards = [
    ["Nye henvendelser", inquiries.filter((item) => item.status === "Ny").length, "inquiries", "status", "Ny", "is-red"],
    ["Åpne henvendelser", inquiries.filter((item) => !["Besvart", "Lukket"].includes(item.status)).length, "inquiries", "open", "1", "is-blue"],
    ["Potensielle kunder", customers.filter((item) => ["Ny", "Kontaktet", "Demo booket"].includes(item.status)).length, "customers", "lead", "1", ""],
    ["Aktive kunder", customers.filter((item) => item.status === "Aktiv kunde").length, "customers", "status", "Aktiv kunde", "is-green"],
    ["Pilotkunder", customers.filter((item) => item.status === "Pilot").length, "customers", "status", "Pilot", "is-purple"],
    ["Ubesvarte kundehenvendelser", inquiries.filter((item) => item.inquiryType === "customer" && !["Besvart", "Lukket"].includes(item.status)).length, "inquiries", "unansweredCustomer", "1", "is-yellow"],
  ];
  const latestInquiries = [...inquiries].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 5);
  const latestCustomers = [...customers].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, 5);
  return `${pageHead("Kontrollrom", "Scope admin", "Ekte kunder og henvendelser fra nettsiden, samlet på ett sted.", '<button class="primary-button" type="button" data-action="add-customer">+ Legg til kunde</button>')}
    <section class="kpi-grid" aria-label="Nøkkeltall">${cards.map(([label, value, route, key, filter, tone]) => `<button class="kpi-card ${tone}" type="button" data-overview-route="${route}" data-overview-key="${key}" data-overview-filter="${filter}"><small>${label}</small><strong>${value}</strong><span>Åpne filtrert visning</span></button>`).join("")}</section>
    <section class="dashboard-grid">
      <article class="card"><header class="card-head"><div><h2>Siste henvendelser</h2><p>Nyeste meldinger fra nettsiden</p></div><button class="card-link" data-route="inquiries">Åpne innboks</button></header><div class="card-body compact-list">${latestInquiries.length ? latestInquiries.map((item) => `<button class="compact-item quiet-row" type="button" data-inquiry="${item.id}"><span class="activity-icon">${e(initials(item.name))}</span><span><strong>${e(item.subject)}</strong><p>#${e(item.referenceNumber)} · ${e(item.company)}</p></span>${statusBadge(item.status)}</button>`).join("") : emptyState("Ingen henvendelser ennå", "Nye spørsmål fra chatvinduet vises her.")}</div></article>
      <article class="card"><header class="card-head"><div><h2>Nyeste kunder</h2><p>Sist registrert i databasen</p></div><button class="card-link" data-route="customers">Se kunder</button></header><div class="card-body compact-list">${latestCustomers.length ? latestCustomers.map((item) => `<button class="compact-item quiet-row" type="button" data-customer="${item.id}"><span class="activity-icon">${e(initials(item.company))}</span><span><strong>${e(item.company)}</strong><p>${e(item.contact)} · ${item.locations} lokasjon${item.locations === 1 ? "" : "er"}</p></span>${statusBadge(item.status)}</button>`).join("") : emptyState("Ingen kunder registrert ennå", "Leads fra «Vil bli kunde» opprettes automatisk her.")}</div></article>
      <article class="card span-two"><header class="card-head"><div><h2>Analyse</h2><p>Ingen trafikktall vises uten en ekte datakilde</p></div></header><div class="card-body">${emptyState("Ingen analysedata er koblet til ennå", "Koble til Plausible, PostHog eller Google Analytics for å vise nettstedstrafikk.", '<button class="secondary-button" type="button" disabled>Konfigurer analyse · kommer snart</button>')}</div></article>
    </section>`;
}

function filteredCustomers() {
  const q = normalize(app.search);
  const f = app.filters.customers;
  const rows = app.data.customers.filter((item) => !item.archived).filter((item) => {
    const matches = !q || [item.company, item.contact, item.email, item.phone, item.type, item.status, item.owner, ...(item.systems || [])].some((value) => normalize(value).includes(q));
    const lead = !f.lead || ["Ny", "Kontaktet", "Demo booket"].includes(item.status);
    return matches && lead && (!f.status || item.status === f.status) && (!f.owner || item.owner === f.owner);
  });
  return sortRows(rows, "customers");
}

function customersPage() {
  const rows = filteredCustomers();
  const activeCount = app.data.customers.filter((item) => !item.archived).length;
  const empty = activeCount === 0 ? "Ingen kunder registrert ennå." : "Ingen kunder matcher filtrene.";
  return `${pageHead("Kunder", "Kundeoversikt", "Potensielle kunder, piloter og aktive kunder fra Scope-databasen.", '<button class="primary-button" type="button" data-action="add-customer">+ Legg til kunde</button>')}
    <div class="toolbar"><label class="table-search"><span>⌕</span><input type="search" data-page-search placeholder="Søk etter bedrift, kontakt, e-post eller system" value="${e(app.search)}"></label>${filterSelect("customers", "status", "Alle statuser", ["Ny", "Kontaktet", "Demo booket", "Pilot", "Aktiv kunde", "Pauset", "Avsluttet"])}${filterSelect("customers", "owner", "Alle ansvarlige", ["Ikke tildelt", ...(app.data.admins || []).map((admin) => admin.name)])}<span class="result-count">${rows.length} av ${activeCount} kunder</span></div>
    <div class="table-card"><div class="table-scroll"><table class="data-table"><thead><tr><th>Bedriftsnavn</th><th>Kontaktperson</th><th>E-post</th><th>Type</th><th>Lokasjoner</th><th>Status</th><th>Ansvarlig</th><th>Systemer</th><th>Opprettet</th><th>Siste aktivitet</th></tr></thead><tbody>${rows.length ? rows.map((item) => `<tr data-customer="${item.id}"><td><strong>${e(item.company)}</strong></td><td>${e(item.contact)}</td><td>${e(item.email)}</td><td>${e(item.type)}</td><td>${item.locations}</td><td>${statusBadge(item.status)}</td><td>${e(item.owner)}</td><td>${e((item.systems || []).join(", ") || "–")}</td><td>${e(formatDate(item.createdAt))}</td><td>${e(formatDate(item.lastActivity || item.updatedAt || item.createdAt))}</td></tr>`).join("") : `<tr><td colspan="10" class="table-empty">${empty}</td></tr>`}</tbody></table></div></div>`;
}

function filteredInquiries() {
  const q = normalize(app.search);
  const f = app.filters.inquiries;
  const rows = app.data.inquiries.filter((item) => {
    const matches = !q || [item.name, item.company, item.email, item.referenceNumber, item.message, item.subject, item.category].some((value) => normalize(value).includes(q));
    const open = !f.open || !["Besvart", "Lukket"].includes(item.status);
    const unanswered = !f.unansweredCustomer || (item.inquiryType === "customer" && !["Besvart", "Lukket"].includes(item.status));
    return matches && open && unanswered && (!f.status || item.status === f.status) && (!f.type || item.inquiryType === f.type) && (!f.category || item.category === f.category) && (!f.owner || item.owner === f.owner);
  });
  return sortRows(rows, "inquiries");
}

function inquiriesPage() {
  const rows = filteredInquiries();
  const categories = [...new Set(app.data.inquiries.map((item) => item.category).filter(Boolean))].sort();
  return `${pageHead("Innboks", "Henvendelser", "Spørsmål og leads som faktisk er sendt inn fra nettsiden.")}
    <div class="metric-row"><article class="metric-card"><small>Nye</small><strong>${app.data.inquiries.filter((item) => item.status === "Ny").length}</strong><span>Krever første svar</span></article><article class="metric-card"><small>Under behandling</small><strong>${app.data.inquiries.filter((item) => item.status === "Under behandling").length}</strong><span>Aktive saker</span></article><article class="metric-card"><small>Åpne</small><strong>${app.data.inquiries.filter((item) => !["Besvart", "Lukket"].includes(item.status)).length}</strong><span>Ikke ferdigbehandlet</span></article></div>
    <div class="toolbar"><label class="table-search"><span>⌕</span><input type="search" data-page-search placeholder="Søk på navn, bedrift, e-post, referanse eller melding" value="${e(app.search)}"></label>${filterSelect("inquiries", "status", "Alle statuser", ["Ny", "Under behandling", "Venter på kunde", "Besvart", "Lukket"])}${filterSelect("inquiries", "type", "Alle typer", [["customer", "Er kunde"], ["prospect", "Vil bli kunde"]])}${filterSelect("inquiries", "category", "Alle kategorier", categories)}${filterSelect("inquiries", "owner", "Alle ansvarlige", ["Ikke tildelt", ...(app.data.admins || []).map((admin) => admin.name)])}<span class="result-count">${rows.length} henvendelser</span></div>
    <div class="table-card"><div class="table-scroll"><table class="data-table"><thead><tr><th>Referanse</th><th>Type</th><th>Navn</th><th>Bedrift</th><th>Emne / kategori</th><th>Kilde</th><th>Status</th><th>Prioritet</th><th>Ansvarlig</th><th>Opprettet</th></tr></thead><tbody>${rows.length ? rows.map((item) => `<tr data-inquiry="${item.id}"><td><strong>#${e(item.referenceNumber || item.id)}</strong></td><td>${item.inquiryType === "prospect" ? "Vil bli kunde" : "Er kunde"}</td><td>${e(item.name)}</td><td>${e(item.company)}</td><td><strong>${e(item.subject)}</strong><small>${e(item.category)}</small></td><td>${e(item.source)}</td><td>${statusBadge(item.status)}</td><td>${priorityBadge(item.priority)}</td><td>${e(item.owner)}</td><td>${e(formatDate(item.createdAt))}</td></tr>`).join("") : `<tr><td colspan="10" class="table-empty">${app.data.inquiries.length ? "Ingen henvendelser matcher filtrene." : "Ingen henvendelser ennå."}</td></tr>`}</tbody></table></div></div>`;
}

function placeholderPage(kicker, title, heading, text) {
  return `${pageHead(kicker, title, text)}${emptyState(heading, text, `<button class="secondary-button" type="button" disabled>Kommer snart</button>`)}`;
}

function onboardingCustomer(item) {
  return app.data.customers.find((customer) => customer.id === item.customerId) || null;
}

function onboardingConnection(item) {
  return (app.data.connections || []).find((connection) => connection.id === item.connectionId) || null;
}

function firstSyncFor(connection) {
  if (!connection) return null;
  const jobs = (app.data.syncJobs || []).filter((job) => job.connectionId === connection.id && job.jobType === "initial" && job.status === "Fullført");
  return jobs.at(-1) || null;
}

function onboardingBlocker(item, connection) {
  if (item.status === "Feilet") return item.errorMessage || "Ukjent feil";
  if (item.invite && !item.invite.usedAt && item.invite.expired) return "Onboardinglenken er utløpt";
  if (item.status === "Venter på kunde") return "Venter på at kunden starter";
  if (connection?.status === "Feil") return "Tilkoblingen feiler";
  return "";
}

function onboardingPage() {
  const rows = (app.data.onboardings || []).filter((item) => {
    const q = normalize(app.search);
    if (!q) return true;
    const customer = onboardingCustomer(item);
    return [customer?.company, customer?.contact, customer?.email, item.status, item.invitedBy].some((value) => normalize(value).includes(q));
  });
  const counts = (status) => (app.data.onboardings || []).filter((item) => item.status === status).length;
  const tripletexMeta = app.data.meta.tripletex || {};
  const envLabel = tripletexMeta.defaultEnvironment === "test" ? "Tripletex testmiljø" : "Tripletex produksjon";
  return `${pageHead("Kunder", "Onboarding", `Status for kundeoppsett og Tripletex-tilkoblinger. Standardmiljø: ${envLabel}.`, '<button class="primary-button" type="button" data-action="onboarding-invite">+ Inviter kunde</button>')}
    <div class="metric-row"><article class="metric-card"><small>Venter på kunde</small><strong>${counts("Venter på kunde")}</strong><span>Invitert, ikke startet</span></article><article class="metric-card"><small>Pågår</small><strong>${counts("Pågår") + counts("Synkroniserer")}</strong><span>Aktive oppsett</span></article><article class="metric-card"><small>Fullført</small><strong>${counts("Fullført")}</strong><span>Klare kontoer</span></article><article class="metric-card"><small>Feilet</small><strong>${counts("Feilet")}</strong><span>${counts("Feilet") ? "Krever oppfølging" : "Ingen feil"}</span></article></div>
    <div class="toolbar"><label class="table-search"><span>⌕</span><input type="search" data-page-search placeholder="Søk etter kunde, kontakt eller status" value="${e(app.search)}"></label><span class="result-count">${rows.length} onboardinger</span></div>
    <div class="table-card"><div class="table-scroll"><table class="data-table"><thead><tr><th>Kunde</th><th>Onboardingstatus</th><th>Tripletex-status</th><th>Første synkronisering</th><th>Siste aktivitet</th><th>Blokkering</th><th>Ansvarlig</th></tr></thead><tbody>${rows.length ? rows.map((item) => {
      const customer = onboardingCustomer(item);
      const connection = onboardingConnection(item);
      const firstSync = firstSyncFor(connection);
      const blocker = onboardingBlocker(item, connection);
      return `<tr data-onboarding="${item.id}"><td><strong>${e(customer?.company || "Ukjent kunde")}</strong><small>${e(customer?.contact || "")}</small></td><td>${statusBadge(item.status)}</td><td>${connection ? `${statusBadge(connection.status)}${connection.environment === "test" ? ' <span class="priority-badge priority-normal">Test</span>' : ""}` : "Ikke koblet til"}</td><td>${e(formatDate(firstSync?.completedAt || connection?.lastSyncAt))}</td><td>${e(formatDate(item.lastActivityAt))}</td><td>${blocker ? `<span class="priority-badge priority-høy">${e(blocker)}</span>` : "–"}</td><td>${e(item.invitedBy || "–")}</td></tr>`;
    }).join("") : `<tr><td colspan="7" class="table-empty">${(app.data.onboardings || []).length ? "Ingen onboardinger matcher søket." : "Ingen onboardinger ennå. Inviter en kunde for å komme i gang."}</td></tr>`}</tbody></table></div></div>`;
}

function renderOnboardingPanel(id) {
  const item = (app.data.onboardings || []).find((onboarding) => onboarding.id === id);
  if (!item) return closePanel();
  const customer = onboardingCustomer(item);
  const connection = onboardingConnection(item);
  const job = (app.data.syncJobs || []).find((candidate) => candidate.connectionId === connection?.id) || null;
  const events = (app.data.integrationEvents || []).filter((event) => event.connectionId === connection?.id).slice(0, 12);
  const stepIds = Object.keys(ONBOARDING_STEP_LABELS);
  const lastCompleted = [...item.completedSteps].pop();
  panelContent.innerHTML = `<header class="panel-header"><div>${statusBadge(item.status)}<h2>${e(customer?.company || "Ukjent kunde")}</h2><p>Invitert av ${e(item.invitedBy || "–")} · ${e(formatDate(item.createdAt))}</p></div><button class="close-button" type="button" data-action="close-panel" aria-label="Lukk">×</button></header>
    <div class="panel-actions">
      <button class="primary-button" type="button" data-action="onboarding-resend" data-id="${item.id}">Send lenke på nytt</button>
      ${connection?.externalCompanyId ? `<button class="secondary-button" type="button" data-action="onboarding-retest" data-id="${item.id}">Kjør test på nytt</button>` : ""}
      ${item.status === "Feilet" ? `<button class="secondary-button" type="button" data-action="onboarding-reset" data-id="${item.id}">Nullstill feilet onboarding</button>` : ""}
      ${connection && connection.status !== "Frakoblet" ? `<button class="quiet-button" type="button" data-action="connection-disconnect" data-id="${connection.id}">Koble fra Tripletex</button>` : ""}
    </div>
    <div class="panel-body">
      <section class="detail-card"><h3>Fremdrift</h3><div class="detail-grid"><div class="detail-field"><small>Nåværende steg</small><strong>${e(ONBOARDING_STEP_LABELS[item.currentStep] || item.currentStep)}</strong></div><div class="detail-field"><small>Sist fullførte steg</small><strong>${e(lastCompleted ? ONBOARDING_STEP_LABELS[lastCompleted] : "Ingen")}</strong></div><div class="detail-field"><small>Antall forsøk</small><strong>${item.attempts || 0}</strong></div><div class="detail-field"><small>Fullført</small><strong>${e(formatDate(item.completedAt))}</strong></div></div><div class="timeline" style="margin-top:12px">${stepIds.map((step) => `<div class="timeline-item"><i></i><span>${item.completedSteps.includes(step) ? "✓ " : item.currentStep === step ? "→ " : ""}${e(ONBOARDING_STEP_LABELS[step])}</span></div>`).join("")}</div></section>
      ${item.errorCode ? `<section class="detail-card"><h3>Feil</h3><div class="system-alert is-error"><i></i><div><strong>${e(item.errorMessage || "Ukjent feil")}</strong><p>Feilkode: ${e(item.errorCode)}</p></div></div></section>` : ""}
      <section class="detail-card"><h3>Tripletex-tilkobling</h3>${connection ? `<div class="detail-grid"><div class="detail-field"><small>Status</small>${statusBadge(connection.status)}</div><div class="detail-field"><small>Miljø</small><strong>${connection.environment === "test" ? "Testmiljø" : "Produksjon"}</strong></div><div class="detail-field"><small>Valgt selskap</small><strong>${e(connection.externalCompanyName || "Ikke valgt")}</strong></div><div class="detail-field"><small>Org.nr.</small><strong>${e(connection.organizationNumber || "–")}</strong></div><div class="detail-field"><small>Token</small><strong>${connection.credentialHint ? `Slutter på ${e(connection.credentialHint)}` : "Ikke lagret"}</strong></div><div class="detail-field"><small>Tilkoblet</small><strong>${e(formatDate(connection.connectedAt))}</strong></div><div class="detail-field"><small>Sist synkronisert</small><strong>${e(formatDate(connection.lastSyncAt))}</strong></div><div class="detail-field"><small>Sist testet</small><strong>${e(formatDate(connection.lastCheckAt))}</strong></div></div><div class="detail-field" style="margin-top:10px"><small>Datakategorier</small><strong>${e((connection.permissions || []).map((scope) => DATA_SCOPE_LABELS[scope] || scope).join(", ") || "Ikke valgt")}</strong></div>` : '<p class="muted-copy">Kunden har ikke koblet til Tripletex ennå.</p>'}</section>
      ${job ? `<section class="detail-card"><h3>Synkronisering</h3><div class="detail-grid"><div class="detail-field"><small>Status</small>${statusBadge(job.status)}</div><div class="detail-field"><small>Startet</small><strong>${e(formatDate(job.startedAt))}</strong></div><div class="detail-field"><small>Fullført</small><strong>${e(formatDate(job.completedAt))}</strong></div></div>${job.errorMessage ? `<p class="muted-copy" style="margin-top:8px">${e(job.errorMessage)}</p>` : ""}<div class="timeline" style="margin-top:12px">${(job.stages || []).map((stage) => `<div class="timeline-item"><i></i><span>${stage.status === "Fullført" ? "✓ " : stage.status === "Feilet" ? "✕ " : stage.status === "Kjører" ? "→ " : ""}${e(stage.label)}${stage.note ? ` · ${e(stage.note)}` : ""}</span></div>`).join("")}</div></section>` : ""}
      <section class="detail-card"><h3>Invitasjon</h3>${item.invite ? `<div class="detail-grid"><div class="detail-field"><small>Opprettet</small><strong>${e(formatDate(item.invite.createdAt))}</strong></div><div class="detail-field"><small>Utløper</small><strong>${e(formatDate(item.invite.expiresAt))}${item.invite.expired ? " (utløpt)" : ""}</strong></div><div class="detail-field"><small>Sist brukt</small><strong>${e(formatDate(item.invite.usedAt))}</strong></div></div>` : '<p class="muted-copy">Selvregistrert – ingen invitasjonslenke.</p>'}</section>
      <section class="detail-card"><h3>Hendelser</h3>${events.length ? `<div class="timeline">${events.map((event) => `<div class="timeline-item"><i></i><span><strong>${e(event.eventType)}</strong> · ${e(event.status)}${event.metadata?.code ? ` · ${e(event.metadata.code)}` : ""}<small>${e(formatDate(event.createdAt))}${event.metadata?.technical ? ` · ${e(event.metadata.technical)}` : ""}</small></span></div>`).join("")}</div>` : '<p class="muted-copy">Ingen integrasjonshendelser ennå. Tokens logges aldri.</p>'}</section>
    </div>`;
}

function showInviteDialog() {
  const tripletexMeta = app.data.meta.tripletex || {};
  const environments = tripletexMeta.environments || [];
  dialogContent.innerHTML = `<header class="dialog-head"><div><h2>Inviter kunde til onboarding</h2><p>Kunden får en personlig, tidsbegrenset lenke for å koble til Tripletex.</p></div><button class="close-button" type="button" data-action="close-dialog">×</button></header>
    <form class="dialog-form" id="invite-onboarding-form">
      <label>Bedriftsnavn<input name="company" required maxlength="120"></label>
      <label>Kontaktperson<input name="contact" required maxlength="100"></label>
      <label>E-post<input name="email" type="email" required maxlength="160"></label>
      <label>Organisasjonsnummer (valgfritt)<input name="orgNumber" inputmode="numeric" maxlength="11" placeholder="9 siffer"></label>
      <label>Utviklermodus: Tripletex-miljø<select name="environment">${environments.map((env) => `<option value="${e(env.id)}"${env.id === tripletexMeta.defaultEnvironment ? " selected" : ""}${env.configured ? "" : " disabled"}>${e(env.label)}${env.configured ? "" : " · ikke konfigurert"}</option>`).join("")}</select></label>
      <div class="dialog-actions"><button class="quiet-button" type="button" data-action="close-dialog">Avbryt</button><button class="primary-button" type="submit">Opprett invitasjon</button></div>
    </form>`;
  dialog.showModal();
}

function showInviteResult(result) {
  dialogContent.innerHTML = `<header class="dialog-head"><div><h2>Invitasjonen er klar</h2><p>${result.emailSent ? "Lenken er sendt til kunden på e-post." : result.emailConfigured ? "E-posten kunne ikke sendes – del lenken manuelt." : "E-post er ikke konfigurert. Kopier lenken og send den til kunden."}</p></div><button class="close-button" type="button" data-action="close-dialog">×</button></header>
    <div class="dialog-form">
      <label>Onboardinglenke<input readonly value="${e(result.inviteUrl)}" onfocus="this.select()"></label>
      <p class="muted-copy">Lenken er gyldig i 7 dager og krever at kunden bekrefter e-postadressen sin.</p>
      <div class="dialog-actions"><button class="quiet-button" type="button" data-action="close-dialog">Lukk</button><button class="primary-button" type="button" data-action="copy-invite-link" data-link="${e(result.inviteUrl)}">Kopier lenke</button></div>
    </div>`;
  if (!dialog.open) dialog.showModal();
}

function integrationsPage() {
  if (!app.data.integrations.length) return placeholderPage("Datakilder", "Integrasjoner", "Ingen kundeintegrasjoner registrert", "Koble en ekte integrasjonskilde til Scope før synkroniseringsstatus kan vises.");
  return `${pageHead("Datakilder", "Integrasjoner", "Registrerte integrasjoner fra Scope-databasen.")}<div class="table-card"><div class="table-scroll"><table class="data-table"><thead><tr><th>Integrasjon</th><th>Kunde</th><th>Status</th><th>Sist oppdatert</th></tr></thead><tbody>${app.data.integrations.map((item) => `<tr><td><strong>${e(item.name)}</strong></td><td>${e(item.customer || "–")}</td><td>${statusBadge(item.status || "Ukjent")}</td><td>${e(formatDate(item.updatedAt))}</td></tr>`).join("")}</tbody></table></div></div>`;
}

function activityPage() {
  const rows = app.data.activity || [];
  return `${pageHead("Sikkerhet", "Aktivitetslogg", "Ekte administrative handlinger og tilgangshendelser.")}${rows.length ? `<div class="table-card"><div class="table-scroll"><table class="data-table"><thead><tr><th>Administrator</th><th>Handling</th><th>Objekt</th><th>Tidspunkt</th><th>Resultat</th><th>Detaljer</th></tr></thead><tbody>${rows.map((item) => `<tr><td><strong>${e(item.administrator)}</strong></td><td>${e(item.action)}</td><td>${e(item.object)}</td><td>${e(item.timestamp)}</td><td>${statusBadge(item.result)}</td><td>${e(item.details || "–")}</td></tr>`).join("")}</tbody></table></div></div>` : emptyState("Ingen administrative handlinger ennå", "Loggen fylles når administratorer gjør endringer.")}`;
}

function renderPage() {
  if (!app.data) return loading();
  const pages = {
    overview: overviewPage,
    customers: customersPage,
    onboarding: onboardingPage,
    inquiries: inquiriesPage,
    analytics: () => placeholderPage("Nettside", "Analyse", "Analyse er ikke koblet til ennå", "Koble til en analysetjeneste for å se besøk, demoåpninger og konverteringer."),
    product: () => placeholderPage("Kundeapp", "Produktbruk", "Produktbruk er ikke koblet til ennå", "Koble til ekte brukshendelser før produktaktivitet kan vises."),
    integrations: integrationsPage,
    status: () => placeholderPage("Plattform", "Systemstatus", "Systemstatus er ikke koblet til overvåkning ennå", "Koble til en overvåkningstjeneste før driftsstatus kan vises."),
    activity: activityPage,
  };
  content.innerHTML = pages[app.route]();
  document.title = `${routes.find((item) => item.id === app.route)?.label || "Admin"} · Scope admin`;
}

function renderPanel() {
  if (!app.panel) return;
  if (app.panel.type === "customer") renderCustomerPanel(app.panel.id);
  if (app.panel.type === "inquiry") renderInquiryPanel(app.panel.id);
  if (app.panel.type === "onboarding") renderOnboardingPanel(app.panel.id);
}

function renderCustomerPanel(id) {
  const item = app.data.customers.find((customer) => customer.id === id);
  if (!item) return closePanel();
  const related = app.data.inquiries.filter((inquiry) => inquiry.customerId === item.id);
  panelContent.innerHTML = `<header class="panel-header"><div>${statusBadge(item.status)}<h2>${e(item.company)}</h2><p>Opprettet ${e(formatDate(item.createdAt))}</p></div><button class="close-button" type="button" data-action="close-panel" aria-label="Lukk">×</button></header>
    <div class="panel-actions"><button class="primary-button" type="button" data-action="customer-note" data-id="${item.id}">+ Notat</button><button class="quiet-button" type="button" data-action="customer-archive" data-id="${item.id}">Arkiver kunde</button></div>
    <div class="panel-body">
      <section class="detail-card"><h3>Status og ansvar</h3><div class="detail-grid"><label class="detail-field"><small>Kundestatus</small><select class="filter-select" data-customer-status="${item.id}">${["Ny", "Kontaktet", "Demo booket", "Pilot", "Aktiv kunde", "Pauset", "Avsluttet"].map((value) => `<option${item.status === value ? " selected" : ""}>${value}</option>`).join("")}</select></label><label class="detail-field"><small>Ansvarlig</small><select class="filter-select" data-customer-owner="${item.id}">${ownerOptions(item.owner)}</select></label></div></section>
      <section class="detail-card"><h3>Kontakt og virksomhet</h3><div class="detail-grid"><div class="detail-field"><small>Kontaktperson</small><strong>${e(item.contact)}</strong></div><div class="detail-field"><small>Virksomhetstype</small><strong>${e(item.type)}</strong></div><div class="detail-field"><small>E-post</small><a href="mailto:${e(item.email)}">${e(item.email)}</a></div><div class="detail-field"><small>Telefon</small><strong>${e(item.phone || "Ikke oppgitt")}</strong></div><div class="detail-field"><small>Lokasjoner</small><strong>${item.locations}</strong></div><div class="detail-field"><small>Systemer</small><strong>${e((item.systems || []).join(", ") || "Ingen registrert")}</strong></div></div></section>
      <section class="detail-card"><h3>Interne notater</h3><form class="inline-form" data-customer-note="${item.id}"><textarea name="text" maxlength="800" required placeholder="Skriv et internt notat"></textarea><button type="submit">Lagre</button></form>${item.notes?.length ? `<div class="note-list">${item.notes.map((note) => `<div class="note-item"><p>${e(note.text)}</p><small>${e(note.author)} · ${e(formatDate(note.createdAt))}</small></div>`).join("")}</div>` : ""}</section>
      <section class="detail-card"><h3>Tilknyttede henvendelser</h3>${related.length ? related.map((inquiry) => `<button class="compact-item quiet-row" type="button" data-inquiry="${inquiry.id}"><span class="activity-icon">✉</span><span><strong>${e(inquiry.subject)}</strong><p>#${e(inquiry.referenceNumber)} · ${e(inquiry.status)}</p></span>${priorityBadge(inquiry.priority)}</button>`).join("") : '<p class="muted-copy">Ingen henvendelser knyttet til kunden.</p>'}</section>
      <section class="detail-card"><h3>Statushistorikk</h3>${item.statusHistory?.length ? `<div class="timeline">${item.statusHistory.map((entry) => `<div class="timeline-item"><i></i><span><strong>${e(entry.status)}</strong><small>${e(entry.by)} · ${e(formatDate(entry.at))}</small></span></div>`).join("")}</div>` : '<p class="muted-copy">Ingen statusendringer registrert.</p>'}</section>
    </div>`;
}

function renderInquiryPanel(id) {
  const item = app.data.inquiries.find((inquiry) => inquiry.id === id);
  if (!item) return closePanel();
  const customers = app.data.customers.filter((customer) => !customer.archived);
  const linked = customers.find((customer) => customer.id === item.customerId);
  const emailConfigured = app.data.meta.emailConfigured;
  panelContent.innerHTML = `<header class="panel-header"><div>${statusBadge(item.status)}<h2>${e(item.subject)}</h2><p>#${e(item.referenceNumber || item.id)} · ${e(formatDate(item.createdAt))}</p></div><button class="close-button" type="button" data-action="close-panel" aria-label="Lukk">×</button></header>
    <div class="panel-actions"><button class="primary-button" type="button" data-action="inquiry-answered" data-id="${item.id}">Marker som besvart</button><button class="secondary-button" type="button" data-action="inquiry-close" data-id="${item.id}">Lukk saken</button>${!item.customerId ? `<button class="secondary-button" type="button" data-action="inquiry-create-customer" data-id="${item.id}">Opprett kunde</button>` : ""}<button class="quiet-button" type="button" data-action="copy-email" data-email="${e(item.email)}">Kopier e-post</button><a class="quiet-button" href="mailto:${e(item.email)}?subject=${encodeURIComponent(`Svar fra Scope · #${item.referenceNumber || item.id}`)}">Åpne e-postklient</a></div>
    <div class="panel-body">
      <section class="detail-card"><h3>Kontaktinformasjon</h3><div class="detail-grid"><div class="detail-field"><small>Type</small><strong>${item.inquiryType === "prospect" ? "Vil bli kunde" : "Er kunde"}</strong></div><div class="detail-field"><small>Navn</small><strong>${e(item.name)}</strong></div><div class="detail-field"><small>Bedrift</small><strong>${e(item.company)}</strong></div><div class="detail-field"><small>E-post</small><a href="mailto:${e(item.email)}">${e(item.email)}</a></div><div class="detail-field"><small>Telefon</small><strong>${e(item.phone || "Ikke oppgitt")}</strong></div><div class="detail-field"><small>Kilde</small><strong>${e(item.source)}</strong></div><div class="detail-field"><small>Kategori</small><strong>${e(item.category)}</strong></div><div class="detail-field"><small>Tilknyttet kunde</small><strong>${e(linked?.company || "Ingen")}</strong></div></div></section>
      <section class="detail-card"><h3>Full melding</h3><p class="message-copy">${e(item.message || "Ingen melding oppgitt.")}</p></section>
      <section class="detail-card"><h3>Behandling</h3><div class="detail-grid"><label class="detail-field"><small>Status</small><select class="filter-select" data-inquiry-status="${item.id}">${["Ny", "Under behandling", "Venter på kunde", "Besvart", "Lukket"].map((value) => `<option${item.status === value ? " selected" : ""}>${value}</option>`).join("")}</select></label><label class="detail-field"><small>Prioritet</small><select class="filter-select" data-inquiry-priority="${item.id}">${["Høy", "Normal", "Lav"].map((value) => `<option${item.priority === value ? " selected" : ""}>${value}</option>`).join("")}</select></label><label class="detail-field"><small>Ansvarlig</small><select class="filter-select" data-inquiry-owner="${item.id}">${ownerOptions(item.owner)}</select></label><label class="detail-field"><small>Knyttet kunde</small><select class="filter-select" data-inquiry-customer="${item.id}"><option value="">Ingen kunde</option>${customers.map((customer) => `<option value="${customer.id}"${item.customerId === customer.id ? " selected" : ""}>${e(customer.company)}</option>`).join("")}</select></label></div></section>
      <section class="detail-card"><h3>Internt notat</h3><form class="inline-form" data-inquiry-note="${item.id}"><textarea name="note" maxlength="1200" required placeholder="Bare administratorer ser dette"></textarea><button type="submit">Lagre</button></form>${item.notes?.length ? `<div class="note-list">${item.notes.map((note) => `<div class="note-item"><p>${e(note.text)}</p><small>${e(note.author)} · ${e(formatDate(note.at))}</small></div>`).join("")}</div>` : ""}</section>
      <section class="detail-card"><h3>Skriv svar</h3><div class="system-alert${emailConfigured ? "" : " is-warning"}"><i></i><div><strong>${emailConfigured ? "E-posttjenesten er konfigurert" : "E-posttjenesten er ikke konfigurert"}</strong><p>${emailConfigured ? "Svar kan sendes direkte og lagres i historikken." : "Lagre som utkast eller kopier svaret. Ingen e-post blir sendt."}</p></div><span>${emailConfigured ? "Klar" : "Utkast"}</span></div><form class="reply-form" data-inquiry-reply="${item.id}"><textarea name="message" maxlength="6000" required placeholder="Skriv svar"></textarea><div class="reply-preview"><small>Forhåndsvisning</small><p data-reply-preview>Svaret vises her.</p></div><div class="reply-actions"><button class="primary-button" type="submit" name="action" value="send"${emailConfigured ? "" : " disabled title=\"E-post er ikke konfigurert\""}>Send svar</button><button class="secondary-button" type="submit" name="action" value="draft">Lagre utkast</button><button class="quiet-button" type="button" data-action="copy-reply">Kopier svar</button></div></form>${item.replies?.length ? `<div class="note-list">${item.replies.map((reply) => `<div class="note-item"><p>${e(reply.message)}</p><small>${e(reply.status)} · ${e(reply.author)} · ${e(formatDate(reply.sentAt || reply.createdAt))}</small></div>`).join("")}</div>` : ""}</section>
      <section class="detail-card"><h3>Historikk</h3>${item.history?.length ? `<div class="timeline">${item.history.map((entry) => `<div class="timeline-item"><i></i><span><strong>${e(entry.action)}</strong>${entry.details ? `<p>${e(entry.details)}</p>` : ""}<small>${e(entry.administrator)} · ${e(formatDate(entry.createdAt))}</small></span></div>`).join("")}</div>` : '<p class="muted-copy">Ingen historikk registrert.</p>'}</section>
    </div>`;
}

function updateLastUpdated() {
  document.querySelector("#last-updated").textContent = app.data?.meta.lastUpdated ? formatDate(app.data.meta.lastUpdated) : "ingen dataendringer ennå";
}

function renderNotifications() {
  const items = app.data.inquiries.filter((item) => item.status === "Ny");
  const count = document.querySelector("#notification-count");
  count.textContent = items.length;
  count.hidden = items.length === 0;
  const notifications = document.querySelector("#notification-panel");
  notifications.innerHTML = `<h2>Varslinger</h2>${items.length ? items.slice(0, 8).map((item) => `<button class="notification-item" type="button" data-inquiry="${item.id}"><strong>Ny henvendelse · #${e(item.referenceNumber)}</strong><p>${e(item.company)} · ${e(item.subject)}</p><span>${e(formatDate(item.createdAt))}</span></button>`).join("") : '<p class="muted-copy">Ingen nye henvendelser.</p>'}`;
}

function renderGlobalSearch() {
  const q = normalize(globalSearch.value.trim());
  if (!q) {
    globalResults.hidden = true;
    globalSearch.setAttribute("aria-expanded", "false");
    return;
  }
  const customers = app.data.customers.filter((item) => !item.archived && [item.company, item.contact, item.email, ...(item.systems || [])].some((value) => normalize(value).includes(q))).slice(0, 5);
  const inquiries = app.data.inquiries.filter((item) => [item.name, item.company, item.email, item.referenceNumber, item.message].some((value) => normalize(value).includes(q))).slice(0, 5);
  const integrations = app.data.integrations.filter((item) => [item.name, item.customer].some((value) => normalize(value).includes(q))).slice(0, 5);
  const group = (title, values, type) => values.length ? `<div class="search-group"><h3>${title}</h3>${values.map((item) => `<button type="button" data-search-type="${type}" data-search-id="${item.id}"><strong>${e(type === "customer" ? item.company : type === "inquiry" ? `#${item.referenceNumber} · ${item.subject}` : item.name)}</strong><small>${e(type === "customer" ? item.email : type === "inquiry" ? `${item.name} · ${item.company}` : item.customer || "Integrasjon")}</small></button>`).join("")}</div>` : "";
  globalResults.innerHTML = group("Kunder", customers, "customer") + group("Henvendelser", inquiries, "inquiry") + group("Integrasjoner", integrations, "integration") || '<p class="muted-copy">Ingen treff.</p>';
  globalResults.hidden = false;
  globalSearch.setAttribute("aria-expanded", "true");
}

async function patchCustomer(id, changes, message) {
  try {
    const updated = await api(`/api/admin/customers/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
    app.data.customers[app.data.customers.findIndex((item) => item.id === id)] = updated;
    app.data.meta.lastUpdated = updated.updatedAt;
    renderNav(); renderPage(); updateLastUpdated(); if (app.panel) renderCustomerPanel(id);
    toast("Kunde oppdatert", message);
  } catch (error) { toast("Kunne ikke oppdatere kunden", error.message, true); }
}

async function patchInquiry(id, changes, message = "Henvendelsen er oppdatert.") {
  try {
    const updated = await api(`/api/admin/inquiries/${id}`, { method: "PATCH", body: JSON.stringify(changes) });
    app.data.inquiries[app.data.inquiries.findIndex((item) => item.id === id)] = updated;
    app.data.meta.lastUpdated = updated.updatedAt;
    renderNav(); renderPage(); renderNotifications(); updateLastUpdated(); if (app.panel) renderInquiryPanel(id);
    toast("Henvendelse oppdatert", message);
  } catch (error) { toast("Kunne ikke oppdatere henvendelsen", error.message, true); }
}

function showAddCustomerDialog() {
  dialogContent.innerHTML = `<header class="dialog-head"><div><h2>Legg til kunde</h2><p>Registrer en ekte potensiell kunde.</p></div><button class="close-button" type="button" data-action="close-dialog">×</button></header><form class="dialog-form" id="add-customer-form"><label>Bedriftsnavn<input name="company" required maxlength="120"></label><label>Type<select name="type"><option>Restaurant</option><option>Bar</option><option>Kafé</option><option>Nattklubb</option><option>Kjede</option><option>Annet</option></select></label><label>Kontaktperson<input name="contact" required maxlength="100"></label><label>E-post<input name="email" type="email" required maxlength="160"></label><label>Telefon<input name="phone" type="tel" maxlength="30"></label><label>Lokasjoner<input name="locations" type="number" min="1" max="999" value="1" required></label><div class="dialog-actions"><button class="quiet-button" type="button" data-action="close-dialog">Avbryt</button><button class="primary-button" type="submit">Opprett kunde</button></div></form>`;
  dialog.showModal();
}

function closeMobileNav() {
  document.querySelector("#sidebar").classList.remove("is-open");
  document.querySelector("#sidebar-scrim").classList.remove("is-open");
  document.querySelector("#mobile-nav-button").setAttribute("aria-expanded", "false");
}

document.addEventListener("click", async (event) => {
  const routeTarget = event.target.closest("[data-route]");
  if (routeTarget) return navigate(routeTarget.dataset.route);
  const overviewTarget = event.target.closest("[data-overview-route]");
  if (overviewTarget) {
    const { overviewRoute, overviewKey, overviewFilter } = overviewTarget.dataset;
    app.filters[overviewRoute] = {};
    app.filters[overviewRoute][overviewKey] = overviewFilter;
    return navigate(overviewRoute);
  }
  const customerTarget = event.target.closest("[data-customer]");
  if (customerTarget) return openPanel("customer", customerTarget.dataset.customer);
  const onboardingTarget = event.target.closest("[data-onboarding]");
  if (onboardingTarget) return openPanel("onboarding", onboardingTarget.dataset.onboarding);
  const inquiryTarget = event.target.closest("[data-inquiry]");
  if (inquiryTarget) {
    document.querySelector("#notification-panel").classList.remove("is-open");
    return openPanel("inquiry", inquiryTarget.dataset.inquiry);
  }
  const searchTarget = event.target.closest("[data-search-type]");
  if (searchTarget) {
    globalResults.hidden = true;
    if (searchTarget.dataset.searchType === "customer") { navigate("customers"); openPanel("customer", searchTarget.dataset.searchId); }
    if (searchTarget.dataset.searchType === "inquiry") { navigate("inquiries"); openPanel("inquiry", searchTarget.dataset.searchId); }
    if (searchTarget.dataset.searchType === "integration") navigate("integrations");
    return;
  }
  const actionTarget = event.target.closest("[data-action]");
  if (!actionTarget) return;
  const { action, id } = actionTarget.dataset;
  if (action === "close-panel") closePanel();
  if (action === "close-dialog") { dialog.close(); dialogContent.innerHTML = ""; }
  if (action === "add-customer") showAddCustomerDialog();
  if (action === "onboarding-invite") showInviteDialog();
  if (action === "copy-invite-link") {
    try { await navigator.clipboard.writeText(actionTarget.dataset.link); toast("Lenke kopiert", "Onboardinglenken er kopiert til utklippstavlen."); }
    catch { toast("Kunne ikke kopiere", "Marker lenken manuelt.", true); }
  }
  if (action === "onboarding-resend") {
    actionTarget.disabled = true;
    try {
      const result = await api(`/api/admin/onboarding/${id}/resend`, { method: "POST", body: "{}" });
      await refreshData();
      showInviteResult(result);
    } catch (error) { toast("Kunne ikke lage ny lenke", error.message, true); }
    finally { actionTarget.disabled = false; }
  }
  if (action === "onboarding-reset" && window.confirm("Nullstille den feilede onboardingen? Kunden beholder fremdriften sin, men feilstatusen fjernes.")) {
    try {
      await api(`/api/admin/onboarding/${id}/reset`, { method: "POST", body: "{}" });
      await refreshData();
      toast("Onboarding nullstilt", "Kunden kan fortsette oppsettet.");
    } catch (error) { toast("Kunne ikke nullstille", error.message, true); }
  }
  if (action === "onboarding-retest") {
    actionTarget.disabled = true;
    actionTarget.textContent = "Tester …";
    try {
      const result = await api(`/api/admin/onboarding/${id}/retest`, { method: "POST", body: "{}" });
      await refreshData();
      toast(result.ok ? "Testen var vellykket" : "Testen feilet", result.ok ? "Tripletex svarer og tilgangene er riktige." : result.error?.message || "Se detaljer i panelet.", !result.ok);
    } catch (error) { toast("Kunne ikke kjøre testen", error.message, true); }
  }
  if (action === "connection-disconnect" && window.confirm("Koble fra Tripletex for denne kunden? Tilgangen slettes sikkert og synkronisering stopper.")) {
    try {
      await api(`/api/admin/connections/${id}/disconnect`, { method: "POST", body: "{}" });
      await refreshData();
      toast("Tripletex koblet fra", "Tilgangen er slettet sikkert.");
    } catch (error) { toast("Kunne ikke koble fra", error.message, true); }
  }
  if (action === "customer-note") panel.querySelector("[data-customer-note] textarea")?.focus();
  if (action === "customer-archive" && window.confirm("Arkivere denne kunden?")) { await patchCustomer(id, { archived: true }, "Kunden er arkivert."); closePanel(); }
  if (action === "inquiry-answered") await patchInquiry(id, { status: "Besvart" }, "Henvendelsen er markert som besvart.");
  if (action === "inquiry-close") await patchInquiry(id, { status: "Lukket" }, "Henvendelsen er lukket.");
  if (action === "inquiry-create-customer") {
    try {
      const result = await api(`/api/admin/inquiries/${id}/customer`, { method: "POST", body: "{}" });
      app.data.customers.unshift(result.customer);
      app.data.inquiries[app.data.inquiries.findIndex((item) => item.id === id)] = result.inquiry;
      renderPage(); renderInquiryPanel(id); toast("Kunde opprettet", `${result.customer.company} er lagt til.`);
    } catch (error) { toast("Kunne ikke opprette kunden", error.message, true); }
  }
  if (action === "copy-email") {
    try { await navigator.clipboard.writeText(actionTarget.dataset.email); toast("E-post kopiert", actionTarget.dataset.email); }
    catch { toast("Kunne ikke kopiere", "Marker adressen manuelt.", true); }
  }
  if (action === "copy-reply") {
    const text = actionTarget.closest("form").querySelector("textarea").value;
    try { await navigator.clipboard.writeText(text); toast("Svar kopiert", "Svaret er kopiert til utklippstavlen."); }
    catch { toast("Kunne ikke kopiere", "Marker svaret manuelt.", true); }
  }
});

document.addEventListener("change", (event) => {
  const filter = event.target.closest("[data-filter-scope]");
  if (filter) { app.filters[filter.dataset.filterScope][filter.dataset.filterKey] = filter.value; renderPage(); return; }
  if (event.target.matches("[data-customer-status]")) patchCustomer(event.target.dataset.customerStatus, { status: event.target.value }, `Status er endret til ${event.target.value}.`);
  if (event.target.matches("[data-customer-owner]")) patchCustomer(event.target.dataset.customerOwner, { owner: event.target.value }, `${event.target.value} er nå ansvarlig.`);
  if (event.target.matches("[data-inquiry-status]")) patchInquiry(event.target.dataset.inquiryStatus, { status: event.target.value });
  if (event.target.matches("[data-inquiry-priority]")) patchInquiry(event.target.dataset.inquiryPriority, { priority: event.target.value });
  if (event.target.matches("[data-inquiry-owner]")) patchInquiry(event.target.dataset.inquiryOwner, { owner: event.target.value });
  if (event.target.matches("[data-inquiry-customer]")) patchInquiry(event.target.dataset.inquiryCustomer, { customerId: event.target.value }, "Kundetilknytningen er oppdatert.");
});

document.addEventListener("input", (event) => {
  if (event.target.matches("[data-page-search]")) {
    app.search = event.target.value;
    window.clearTimeout(app.searchTimer);
    app.searchTimer = window.setTimeout(renderPage, 150);
  }
  if (event.target.matches("[data-inquiry-reply] textarea")) {
    event.target.closest("form").querySelector("[data-reply-preview]").textContent = event.target.value || "Svaret vises her.";
  }
});

async function refreshData() {
  app.data = await api("/api/admin/state");
  renderNav(); renderPage(); renderNotifications(); updateLastUpdated();
  if (app.panel) renderPanel();
}

document.addEventListener("submit", async (event) => {
  if (event.target.id === "invite-onboarding-form") {
    event.preventDefault();
    const button = event.target.querySelector("[type=submit]"); button.disabled = true;
    try {
      const result = await api("/api/admin/onboarding/invite", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.target))) });
      await refreshData();
      showInviteResult(result);
      toast("Invitasjon opprettet", result.emailSent ? "Onboardinglenken er sendt på e-post." : "Kopier lenken og del den med kunden.");
    } catch (error) { button.disabled = false; toast("Kunne ikke invitere kunden", error.message, true); }
    return;
  }
  if (event.target.id === "add-customer-form") {
    event.preventDefault();
    const button = event.target.querySelector("[type=submit]"); button.disabled = true;
    try {
      const customer = await api("/api/admin/customers", { method: "POST", body: JSON.stringify(Object.fromEntries(new FormData(event.target))) });
      app.data.customers.unshift(customer); dialog.close(); renderPage(); toast("Kunde opprettet", `${customer.company} er lagt til.`); openPanel("customer", customer.id);
    } catch (error) { button.disabled = false; toast("Kunne ikke opprette kunden", error.message, true); }
    return;
  }
  if (event.target.matches("[data-customer-note]")) {
    event.preventDefault();
    const id = event.target.dataset.customerNote;
    try {
      const updated = await api(`/api/admin/customers/${id}/notes`, { method: "POST", body: JSON.stringify({ text: new FormData(event.target).get("text") }) });
      app.data.customers[app.data.customers.findIndex((item) => item.id === id)] = updated; app.data.meta.lastUpdated = updated.updatedAt; renderCustomerPanel(id); renderPage(); updateLastUpdated(); toast("Notat lagret", "Kunden er oppdatert.");
    } catch (error) { toast("Kunne ikke lagre notatet", error.message, true); }
    return;
  }
  if (event.target.matches("[data-inquiry-note]")) {
    event.preventDefault();
    await patchInquiry(event.target.dataset.inquiryNote, { note: new FormData(event.target).get("note") }, "Notatet er lagret.");
    return;
  }
  if (event.target.matches("[data-inquiry-reply]")) {
    event.preventDefault();
    const submitter = event.submitter;
    const action = submitter?.value || "draft";
    const id = event.target.dataset.inquiryReply;
    submitter.disabled = true;
    try {
      const result = await api(`/api/admin/inquiries/${id}/replies`, { method: "POST", body: JSON.stringify({ action, message: new FormData(event.target).get("message") }) });
      app.data.inquiries[app.data.inquiries.findIndex((item) => item.id === id)] = result.inquiry;
      app.data.meta.lastUpdated = result.inquiry.updatedAt;
      renderNav(); renderPage(); renderInquiryPanel(id); updateLastUpdated();
      toast(result.delivered ? "Svar sendt" : "Utkast lagret", result.configurationRequired ? "E-post er ikke konfigurert; svaret ble bare lagret som utkast." : result.delivered ? "E-posten er sendt og historikken er oppdatert." : "Svaret er lagret uten å bli sendt.");
    } catch (error) { submitter.disabled = false; toast("Svaret ble ikke sendt", error.message, true); }
  }
});

globalSearch.addEventListener("input", () => { window.clearTimeout(app.globalTimer); app.globalTimer = window.setTimeout(renderGlobalSearch, 120); });
globalSearch.addEventListener("keydown", (event) => { if (event.key === "Escape") globalResults.hidden = true; });
document.addEventListener("click", (event) => { if (!event.target.closest(".global-search-wrap")) globalResults.hidden = true; });

document.querySelector("#refresh-button").addEventListener("click", async (event) => {
  const button = event.currentTarget; button.disabled = true; button.classList.add("is-loading");
  try {
    app.data = await api("/api/admin/state");
    renderNav(); renderPage(); renderNotifications(); updateLastUpdated(); toast("Data oppdatert", "Nyeste data er hentet fra Scope-databasen.");
  } catch (error) { toast("Oppdatering mislyktes", error.message, true); }
  finally { button.disabled = false; button.classList.remove("is-loading"); }
});

document.querySelector("#notifications-button").addEventListener("click", () => {
  const notifications = document.querySelector("#notification-panel");
  const open = !notifications.classList.contains("is-open");
  renderNotifications(); notifications.classList.toggle("is-open", open); notifications.setAttribute("aria-hidden", String(!open));
});

document.querySelector("#logout-button").addEventListener("click", async () => {
  try { await api("/api/auth/logout", { method: "POST" }); } finally { window.location.assign("/admin/login"); }
});

document.querySelector("#mobile-nav-button").addEventListener("click", (event) => {
  const sidebar = document.querySelector("#sidebar"); const open = !sidebar.classList.contains("is-open");
  sidebar.classList.toggle("is-open", open); document.querySelector("#sidebar-scrim").classList.toggle("is-open", open); event.currentTarget.setAttribute("aria-expanded", String(open));
});
document.querySelector("#sidebar-scrim").addEventListener("click", closeMobileNav);
panelScrim.addEventListener("click", closePanel);
dialog.addEventListener("click", (event) => { if (event.target === dialog) { dialog.close(); dialogContent.innerHTML = ""; } });
window.addEventListener("hashchange", () => navigate(location.hash.slice(1) || "overview", false));
document.addEventListener("keydown", (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); globalSearch.focus(); }
  if (event.key === "Escape" && app.panel) closePanel();
});

if ("BroadcastChannel" in window) {
  const inquiryChannel = new BroadcastChannel("scope-inquiries");
  inquiryChannel.addEventListener("message", async () => {
    try {
      app.data = await api("/api/admin/state");
      renderNav(); renderPage(); renderNotifications(); updateLastUpdated();
      toast("Ny henvendelse", "Innboksen er oppdatert med en ny innsending fra nettsiden.");
    } catch (error) {
      toast("Kunne ikke hente ny henvendelse", error.message, true);
    }
  });
}

async function init() {
  loading();
  try {
    const [session, data] = await Promise.all([api("/api/auth/session"), api("/api/admin/state")]);
    app.user = session.user; app.csrfToken = session.csrfToken; app.data = data;
    app.route = routes.some((route) => route.id === location.hash.slice(1)) ? location.hash.slice(1) : "overview";
    document.querySelector("#user-name").textContent = app.user.name;
    document.querySelector("#user-email").textContent = app.user.email;
    document.querySelector("#user-role").textContent = "Administrator";
    document.querySelector("#user-avatar").textContent = initials(app.user.name);
    updateLastUpdated(); renderNav(); renderPage(); renderNotifications();
  } catch (error) {
    content.innerHTML = `${pageHead("Feil", "Kontrollrommet kunne ikke åpnes", error.message)}${emptyState("Tilkoblingen mislyktes", "Last siden på nytt eller logg inn igjen.")}`;
  }
}

init();
