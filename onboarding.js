// Scope onboarding: 8 steg, ett om gangen. All tilstand lagres på serveren
// etter hvert steg, så kunden kan avbryte og fortsette senere.
(() => {
  const stage = document.querySelector("[data-stage]");
  const progressBox = document.querySelector("[data-progress]");
  const progressText = document.querySelector("[data-progress-text]");
  const progressFill = document.querySelector("[data-progress-fill]");
  const saveExitButton = document.querySelector("[data-save-exit]");
  const footnote = document.querySelector("[data-footnote]");
  const liveRegion = document.querySelector("[data-live]");

  const STEP_ACCENTS = { welcome: "green", business: "blue", connect: "green", company: "blue", data: "yellow", test: "green", sync: "blue", done: "green" };
  const CONTACT_EMAIL = "post@scopeanalytics.no";

  const app = {
    csrfToken: "",
    state: null,
    inviteToken: new URLSearchParams(window.location.search).get("invite") || "",
    syncTimer: null,
  };

  const moneyFormat = new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 });
  const timeFormat = new Intl.DateTimeFormat("nb-NO", { dateStyle: "medium", timeStyle: "short" });

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatOrgNumber(value) {
    const digits = String(value || "").replace(/\D/g, "");
    return digits.length === 9 ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}` : digits || "–";
  }

  function formatTime(value) {
    return value ? timeFormat.format(new Date(value)) : "–";
  }

  async function api(path, options = {}) {
    const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}) };
    if (options.method && options.method !== "GET") headers["X-CSRF-Token"] = app.csrfToken;
    let response;
    try {
      response = await fetch(path, { ...options, headers });
    } catch {
      throw Object.assign(new Error("Fikk ikke kontakt med Scope. Sjekk nettforbindelsen og prøv igjen."), { network: true });
    }
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw Object.assign(new Error(result.error || "Noe gikk galt. Prøv igjen."), {
        status: response.status,
        code: result.code || "",
        help: result.help || null,
        fieldErrors: result.errors || null,
        mismatch: result.mismatch || null,
      });
    }
    return result;
  }

  function adoptState(result) {
    if (result?.csrfToken) app.csrfToken = result.csrfToken;
    if (result?.state) app.state = result.state;
    return app.state;
  }

  function stepList() {
    return app.state?.steps || [];
  }

  function stepIndex(stepId) {
    return stepList().findIndex((step) => step.id === stepId);
  }

  function announce(message) {
    liveRegion.textContent = message;
  }

  function render(html, { step = null, accent = "green", showSaveExit = true, footnoteText = "" } = {}) {
    if (app.syncTimer) {
      clearTimeout(app.syncTimer);
      app.syncTimer = null;
    }
    document.body.dataset.accent = accent;
    if (step) {
      const index = stepIndex(step);
      const total = stepList().length;
      progressBox.hidden = false;
      progressText.textContent = `Steg ${index + 1} av ${total}`;
      progressFill.style.width = `${((index + 1) / total) * 100}%`;
      const label = stepList()[index]?.label || "";
      announce(`Steg ${index + 1} av ${total}: ${label}`);
    } else {
      progressBox.hidden = true;
    }
    saveExitButton.hidden = !showSaveExit || !app.csrfToken;
    footnote.hidden = !footnoteText;
    footnote.textContent = footnoteText;
    stage.innerHTML = html;
    const heading = stage.querySelector("h1");
    if (heading) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: false });
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function errorBanner(message, help = null) {
    return `<div class="ob-banner is-error" role="alert"><span class="ob-banner-icon" aria-hidden="true">!</span><div><strong>${esc(message)}</strong>${
      help?.length ? `<details class="ob-details" style="margin:10px 0 0"><summary>Se hvordan du fikser dette</summary><div class="ob-details-body"><ol class="ob-helplist">${help.map((item) => `<li>${esc(item)}</li>`).join("")}</ol></div></details>` : ""
    }<p style="margin:8px 0 0;font-size:.85rem"><a href="mailto:${CONTACT_EMAIL}?subject=Hjelp%20med%20Tripletex-oppsett">Kontakt oss</a> hvis du står fast – vi hjelper gjerne.</p></div></div>`;
  }

  function actionRow({ backStep = null, primaryLabel = "Fortsett", primaryAttrs = 'data-action="next"', secondary = "" } = {}) {
    return `<div class="ob-actions">${backStep ? `<button class="ob-button secondary" type="button" data-back="${backStep}">Tilbake</button>` : ""}${secondary}<button class="ob-button primary push" type="submit" ${primaryAttrs}>${esc(primaryLabel)}</button></div>`;
  }

  // ---------- Inngangsskjermer (før økten er etablert) ----------

  function renderStart(message = "") {
    render(
      `<section class="ob-card">
        <p class="ob-eyebrow">Kom i gang</p>
        <h1>La oss gjøre Scope klart</h1>
        <p class="ob-intro">Fortell oss kort hvem dere er, så starter vi oppsettet. Har du fått en e-post med onboardinglenke? Bruk den i stedet – da er alt forhåndsutfylt.</p>
        ${message ? errorBanner(message) : ""}
        <form data-form="register" novalidate>
          <div class="ob-fields">
            <label class="ob-field"><span>Virksomhetsnavn</span><input name="company" type="text" autocomplete="organization" required></label>
            <label class="ob-field"><span>Kontaktperson</span><input name="contact" type="text" autocomplete="name" required></label>
            <label class="ob-field"><span>E-post</span><input name="email" type="email" autocomplete="email" inputmode="email" required></label>
          </div>
          ${actionRow({ primaryLabel: "Start oppsettet" })}
        </form>
      </section>`,
      { showSaveExit: false, footnoteText: "Scope ber kun om lesetilgang til systemene dere velger å koble til." }
    );
  }

  function renderClaim(message = "") {
    render(
      `<section class="ob-card">
        <p class="ob-eyebrow">Sikkerhet</p>
        <h1>Bekreft e-postadressen din</h1>
        <p class="ob-intro">Skriv inn e-postadressen invitasjonen ble sendt til, så vet vi at det er deg. Deretter fortsetter du der du slapp.</p>
        ${message ? errorBanner(message) : ""}
        <form data-form="claim" novalidate>
          <div class="ob-fields">
            <label class="ob-field"><span>E-post</span><input name="email" type="email" autocomplete="email" inputmode="email" required autofocus></label>
          </div>
          ${actionRow({ primaryLabel: "Fortsett" })}
        </form>
      </section>`,
      { showSaveExit: false }
    );
  }

  function renderFatal(title, message) {
    render(
      `<section class="ob-card">
        <h1>${esc(title)}</h1>
        <p class="ob-intro">${esc(message)}</p>
        <div class="ob-actions"><a class="ob-button primary" href="mailto:${CONTACT_EMAIL}?subject=Onboarding">Kontakt oss</a></div>
      </section>`,
      { showSaveExit: false }
    );
  }

  // ---------- Steg 1: Velkommen ----------

  function renderWelcome() {
    render(
      `<section class="ob-card">
        <p class="ob-eyebrow">Velkommen</p>
        <h1>La oss gjøre Scope klart</h1>
        <p class="ob-intro">Vi kobler først til Tripletex, slik at Scope kan hente regnskapstallene som allerede finnes hos dere.</p>
        <ul class="ob-benefits">
          <li><span class="ob-check-icon" aria-hidden="true">✓</span>Ingen manuell eksport</li>
          <li><span class="ob-check-icon" aria-hidden="true">✓</span>Automatisk oppdatering</li>
          <li><span class="ob-check-icon" aria-hidden="true">✓</span>Bedre rapporter og råd</li>
        </ul>
        <div class="ob-actions">
          <button class="ob-button secondary" type="button" data-action="defer">Gjør dette senere</button>
          <button class="ob-button primary push" type="button" data-action="start">Kom i gang</button>
        </div>
      </section>`,
      { step: "welcome", accent: STEP_ACCENTS.welcome, footnoteText: "Dette tar vanligvis under ti minutter." }
    );
  }

  // ---------- Steg 2: Om virksomheten ----------

  function renderBusiness(fieldErrors = null, message = "") {
    const profile = app.state.profile || {};
    const types = app.state.businessTypes || [];
    const field = (name, label, input, hint = "") => {
      const error = fieldErrors?.[name];
      return `<div class="ob-field${error ? " has-error" : ""}${["company", "contact", "email"].includes(name) ? " full" : ""}">
        <label for="field-${name}"><span>${label}${hint ? ` <small>${hint}</small>` : ""}</span></label>
        ${input.replace("<input ", `<input id="field-${name}" ${error ? `aria-invalid="true" aria-describedby="error-${name}"` : ""} `).replace("<select ", `<select id="field-${name}" ${error ? `aria-invalid="true" aria-describedby="error-${name}"` : ""} `)}
        ${error ? `<p class="ob-field-error" id="error-${name}">${esc(error)}</p>` : ""}
      </div>`;
    };
    render(
      `<section class="ob-card">
        <p class="ob-eyebrow">Om virksomheten</p>
        <h1>Stemmer dette?</h1>
        <p class="ob-intro">Vi har fylt ut det vi vet fra før. Se over og rett det som ikke stemmer.</p>
        ${message ? errorBanner(message) : ""}
        <form data-form="profile" novalidate>
          <div class="ob-fields two-columns">
            ${field("company", "Virksomhetsnavn", `<input name="company" type="text" autocomplete="organization" value="${esc(profile.company || "")}" required>`)}
            ${field("orgNumber", "Organisasjonsnummer", `<input name="orgNumber" type="text" inputmode="numeric" autocomplete="off" placeholder="9 siffer" value="${esc(profile.orgNumber || "")}" required>`)}
            ${field("businessType", "Type virksomhet", `<select name="businessType" required><option value="">Velg …</option>${types.map((type) => `<option value="${esc(type)}"${profile.businessType === type ? " selected" : ""}>${esc(type)}</option>`).join("")}</select>`)}
            ${field("locations", "Antall lokasjoner", `<input name="locations" type="number" inputmode="numeric" min="1" max="999" value="${esc(profile.locations || 1)}" required>`)}
            ${field("contact", "Kontaktperson", `<input name="contact" type="text" autocomplete="name" value="${esc(profile.contact || "")}" required>`)}
            ${field("email", "E-post", `<input name="email" type="email" autocomplete="email" inputmode="email" value="${esc(profile.email || "")}" required>`)}
            ${field("phone", "Telefon", `<input name="phone" type="tel" autocomplete="tel" value="${esc(profile.phone || "")}">`, "valgfritt")}
          </div>
          ${actionRow({ backStep: "welcome", primaryLabel: "Fortsett til Tripletex" })}
        </form>
      </section>`,
      { step: "business", accent: STEP_ACCENTS.business }
    );
    const firstInvalid = fieldErrors ? stage.querySelector("[aria-invalid='true']") : null;
    if (firstInvalid) firstInvalid.focus();
  }

  // ---------- Steg 3: Koble til Tripletex ----------

  function renderConnect(message = "", help = null) {
    const tripletex = app.state.tripletex || {};
    const alreadyConnected = Boolean(app.state.connection && app.state.connection.status === "Tilkoblet");
    const storedError = !message && app.state.error && !alreadyConnected ? app.state.error : null;
    const banner = message ? errorBanner(message, help) : storedError ? errorBanner(storedError.message, storedError.help) : "";
    const tripletexUrl = tripletex.environment === "test" ? "https://test.tripletex.no" : "https://tripletex.no";

    let flowHtml;
    if (alreadyConnected) {
      flowHtml = `<div class="ob-banner is-success"><span class="ob-banner-icon" aria-hidden="true">✓</span><div><strong>Tripletex er allerede koblet til</strong>Token slutter på ${esc(app.state.connection.credentialHint || "••••")}. Du kan fortsette, eller lime inn et nytt token for å bytte tilgang.</div></div>
        ${manualForm("Bytt token")}
        <div class="ob-actions"><button class="ob-button secondary" type="button" data-back="business">Tilbake</button><button class="ob-button primary push" type="button" data-action="goto-company">Fortsett</button></div>`;
    } else if (tripletex.flow === "activation") {
      flowHtml = `<div class="ob-actions">
          <button class="ob-button secondary" type="button" data-back="business">Tilbake</button>
          <a class="ob-button primary push" href="/api/onboarding/tripletex/start">Fortsett med Tripletex</a>
        </div>
        <p class="ob-help">Du sendes til Tripletex for å logge inn og godkjenne Scope. Etterpå kommer du automatisk tilbake hit.</p>`;
    } else if (!tripletex.configured) {
      flowHtml = `<div class="ob-banner is-info"><span class="ob-banner-icon" aria-hidden="true">i</span><div><strong>Tilkoblingen er ikke helt klar hos oss ennå</strong>Vi setter opp Tripletex-integrasjonen for dere manuelt. Kontakt oss, så ordner vi resten – du trenger ikke gjøre noe teknisk.</div></div>
        <div class="ob-actions">
          <button class="ob-button secondary" type="button" data-back="business">Tilbake</button>
          <a class="ob-button primary push" href="mailto:${CONTACT_EMAIL}?subject=Tripletex-oppsett">Kontakt oss</a>
        </div>`;
    } else {
      flowHtml = `<p class="ob-env-note">${tripletex.environment === "test" ? "Testmodus · Tripletex testmiljø" : "Manuell tilkobling"}</p>
        <p class="ob-intro" style="margin-bottom:10px">Slik henter du et API-token:</p>
        <ol class="ob-howto">
          <li>Åpne Tripletex</li>
          <li>Gå til <strong>Selskap → API-token</strong></li>
          <li>Opprett et nytt token for Scope</li>
          <li>Kopier tokenet</li>
          <li>Lim det inn her</li>
        </ol>
        <p style="margin:0 0 18px"><a class="ob-button secondary" style="width:auto" href="${tripletexUrl}" target="_blank" rel="noopener">Åpne Tripletex ↗</a></p>
        ${manualForm("Koble til Tripletex")}
        <div class="ob-actions" style="margin-top:14px"><button class="ob-button secondary" type="button" data-back="business">Tilbake</button></div>`;
    }

    function manualForm(submitLabel) {
      return `<form data-form="connect" novalidate>
        <div class="ob-fields">
          <label class="ob-field"><span>Tripletex API-token</span>
            <input name="apiToken" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" required>
          </label>
        </div>
        <p class="ob-help" style="margin:0 0 14px">Tokenet vises bare én gang i Tripletex. Kopier det før du lukker vinduet.</p>
        <div class="ob-actions"><button class="ob-button primary push" type="submit">${esc(submitLabel)}</button></div>
      </form>`;
    }

    render(
      `<section class="ob-card">
        <p class="ob-eyebrow">Trygg tilkobling</p>
        <h1>Koble til Tripletex</h1>
        <p class="ob-intro">Scope trenger lesetilgang til utvalgte regnskapsdata. Vi kan ikke endre eller bokføre noe i Tripletex.</p>
        <ul class="ob-safety">
          <li>Scope henter bare data du godkjenner</li>
          <li>Tilgangen kan fjernes når som helst</li>
          <li>Tilkoblingen lagres sikkert</li>
          <li>Passordet ditt deles aldri med Scope</li>
        </ul>
        ${banner}
        ${flowHtml}
      </section>`,
      { step: "connect", accent: STEP_ACCENTS.connect }
    );
  }

  function renderConnecting() {
    render(
      `<section class="ob-card" aria-busy="true">
        <div class="ob-loading" role="status">
          <span class="ob-spinner" aria-hidden="true"></span>
          <div><h1 style="font-size:1.2rem;margin:0 0 4px">Tripletex kobles til …</h1>
          <p style="margin:0">Dette tar vanligvis bare noen sekunder.</p></div>
        </div>
      </section>`,
      { step: "connect", accent: STEP_ACCENTS.connect, showSaveExit: false }
    );
  }

  // ---------- Steg 4: Velg selskap ----------

  function renderCompany(options = {}) {
    const companies = app.state.companies || [];
    const selectedId = options.selectedId ?? app.state.selectedCompany?.id ?? (companies.length === 1 ? companies[0].id : null);
    const showSearch = companies.length > 6;
    const query = (options.query || "").toLocaleLowerCase("nb-NO");
    const visible = query
      ? companies.filter((company) => `${company.name} ${company.organizationNumber}`.toLocaleLowerCase("nb-NO").includes(query))
      : companies;

    render(
      `<section class="ob-card">
        <p class="ob-eyebrow">Velg selskap</p>
        <h1>Hvilket selskap skal kobles til Scope?</h1>
        <p class="ob-intro">${companies.length === 1 ? "Vi fant ett selskap på tilgangen din. Kontroller at det stemmer." : "Velg selskapet som skal kobles til. Scope henter kun data fra selskapet du velger."}</p>
        ${options.message ? errorBanner(options.message) : ""}
        ${options.mismatch ? `<div class="ob-banner is-error" role="alert"><span class="ob-banner-icon" aria-hidden="true">!</span><div><strong>Dette ser ut til å være et annet selskap</strong>Du oppga organisasjonsnummer ${esc(formatOrgNumber(options.mismatch.expectedOrgNumber))}, men ${esc(options.mismatch.companyName)} har ${esc(formatOrgNumber(options.mismatch.companyOrgNumber))}.<div class="ob-actions" style="margin-top:12px"><button class="ob-button secondary" type="button" data-action="dismiss-mismatch">Velg et annet selskap</button><button class="ob-button primary" type="button" data-action="confirm-mismatch" data-company="${esc(options.mismatch.companyId)}">Ja, dette er riktig</button></div></div></div>` : ""}
        <form data-form="company" novalidate>
          ${showSearch ? `<div class="ob-search"><label class="ob-sr-only" for="company-search">Søk etter selskap</label><input id="company-search" type="search" data-company-search placeholder="Søk på navn eller organisasjonsnummer" value="${esc(options.query || "")}"></div>` : ""}
          <div class="ob-choices" role="radiogroup" aria-label="Selskaper">
            ${visible.map((company) => `<label class="ob-choice${String(selectedId) === String(company.id) ? " is-selected" : ""}">
                <input type="radio" name="companyId" value="${esc(company.id)}"${String(selectedId) === String(company.id) ? " checked" : ""}>
                <span class="ob-choice-body"><strong>${esc(company.name)}</strong><span>Org.nr. ${esc(formatOrgNumber(company.organizationNumber))}</span></span>
              </label>`).join("") || '<p class="ob-help">Ingen selskaper matcher søket.</p>'}
          </div>
          ${actionRow({ backStep: "connect", primaryLabel: "Bruk dette selskapet" })}
        </form>
      </section>`,
      { step: "company", accent: STEP_ACCENTS.company }
    );
  }

  // ---------- Steg 5: Velg data ----------

  function renderData(message = "") {
    const scopes = app.state.dataScopes || [];
    const selected = new Set(app.state.selectedScopes?.length ? app.state.selectedScopes : scopes.filter((scope) => scope.required).map((scope) => scope.id));
    render(
      `<section class="ob-card">
        <p class="ob-eyebrow">Velg data</p>
        <h1>Hva skal Scope hente?</h1>
        <p class="ob-intro">Scope ber kun om lesetilgang. De påkrevde kategoriene trengs for at rapportene skal bli riktige – resten velger du selv.</p>
        ${message ? errorBanner(message) : ""}
        <form data-form="datascopes" novalidate>
          <div class="ob-choices">
            ${scopes.map((scope) => `<label class="ob-choice${scope.required ? " is-locked is-selected" : selected.has(scope.id) ? " is-selected" : ""}">
                <input type="checkbox" name="scopes" value="${esc(scope.id)}"${scope.required ? " checked disabled" : selected.has(scope.id) ? " checked" : ""}>
                <span class="ob-choice-body"><strong>${esc(scope.label)}</strong><span>${esc(scope.why)}</span></span>
                <span class="ob-chip${scope.required ? " required" : ""}">${scope.required ? "Påkrevd" : "Valgfritt"}</span>
              </label>`).join("")}
          </div>
          ${actionRow({ backStep: "company", primaryLabel: "Godkjenn og test" })}
        </form>
      </section>`,
      { step: "data", accent: STEP_ACCENTS.data }
    );
  }

  // ---------- Steg 6: Test forbindelsen ----------

  function renderTest({ checks = null, running = false, error = null, done = false } = {}) {
    const baseChecks = checks || [
      { id: "reachable", label: "Tripletex svarer", ok: null },
      { id: "company", label: "Selskapet er funnet", ok: null },
      { id: "permissions", label: "Tilgangene er riktige", ok: null },
      { id: "data", label: "Data kan hentes", ok: null },
      ...((app.state.selectedScopes || []).includes("departments") ? [{ id: "departments", label: "Avdelinger kan hentes", ok: null }] : []),
    ];
    render(
      `<section class="ob-card">
        <p class="ob-eyebrow">Test forbindelsen</p>
        <h1>Vi tester tilkoblingen</h1>
        <p class="ob-intro">Scope gjør ekte oppslag mot Tripletex for å bekrefte at alt er riktig satt opp.</p>
        ${done ? `<div class="ob-banner is-success" role="status"><span class="ob-banner-icon" aria-hidden="true">✓</span><div><strong>Tripletex er koblet til</strong>Alt ser riktig ut. Du kan starte den første synkroniseringen.</div></div>` : ""}
        ${error ? errorBanner(error.message, error.help) : ""}
        <ul class="ob-checks">
          ${baseChecks.map((check) => `<li class="${check.ok === true ? "is-ok" : check.ok === false ? "is-failed" : running ? "is-running" : ""}" data-check="${esc(check.id)}">
              <span class="ob-check-state" aria-hidden="true">${check.ok === true ? "✓" : check.ok === false ? "✕" : ""}</span>
              <span>${esc(check.label)}${check.message ? `<small>${esc(check.message)}</small>` : ""}</span>
              <span class="ob-sr-only">${check.ok === true ? "Vellykket" : check.ok === false ? "Feilet" : running ? "Pågår" : "Venter"}</span>
            </li>`).join("")}
        </ul>
        <div class="ob-actions">
          ${!running && !done ? `<button class="ob-button secondary" type="button" data-back="data">Tilbake</button>` : ""}
          ${error ? `<button class="ob-button primary push" type="button" data-action="run-test">Prøv igjen</button>` : ""}
          ${done ? `<button class="ob-button primary push" type="button" data-action="start-sync">Start første synkronisering</button>` : ""}
          ${!running && !error && !done ? `<button class="ob-button primary push" type="button" data-action="run-test">Test forbindelsen</button>` : ""}
        </div>
      </section>`,
      { step: "test", accent: STEP_ACCENTS.test }
    );
  }

  async function runTest() {
    renderTest({ running: true });
    let result;
    try {
      result = await api("/api/onboarding/test", { method: "POST", body: "{}" });
    } catch (error) {
      renderTest({ error: { message: error.message, help: error.help } });
      return;
    }
    adoptState(result);
    // Resultatene er ekte – de vises bare sekvensielt for lesbarhet.
    const rows = stage.querySelectorAll("[data-check]");
    for (const [index, check] of result.checks.entries()) {
      await new Promise((resolve) => setTimeout(resolve, 260));
      const row = rows[index];
      if (!row) continue;
      row.classList.remove("is-running");
      row.classList.add(check.ok ? "is-ok" : "is-failed");
      const icon = row.querySelector(".ob-check-state");
      if (icon) icon.textContent = check.ok ? "✓" : check.ok === false ? "✕" : "";
    }
    await new Promise((resolve) => setTimeout(resolve, 350));
    if (result.ok) {
      announce("Tripletex er koblet til.");
      renderTest({ checks: result.checks, done: true });
    } else {
      announce(`Testen feilet: ${result.error?.message || ""}`);
      renderTest({ checks: result.checks, error: result.error });
    }
  }

  // ---------- Steg 7: Første synkronisering ----------

  function renderSync(job, errorMessage = "") {
    const stages = job?.stages || [];
    const failed = job?.status === "Feilet";
    render(
      `<section class="ob-card">
        <p class="ob-eyebrow">Første synkronisering</p>
        <h1>Vi setter opp første rapport</h1>
        <p class="ob-intro">Dette trenger du bare å gjøre én gang. Du kan trygt lukke siden – synkroniseringen fortsetter på serveren, og du kan komme tilbake senere.</p>
        ${failed ? errorBanner(job.errorMessage || "Synkroniseringen stoppet. Prøv igjen.", null) : ""}
        ${errorMessage ? errorBanner(errorMessage) : ""}
        <ul class="ob-checks">
          ${stages.map((item) => `<li class="${item.status === "Fullført" ? "is-ok" : item.status === "Feilet" ? "is-failed" : item.status === "Kjører" ? "is-running" : ""}">
              <span class="ob-check-state" aria-hidden="true">${item.status === "Fullført" ? "✓" : item.status === "Feilet" ? "✕" : ""}</span>
              <span>${esc(item.label)}${item.note ? `<small>${esc(item.note)}</small>` : ""}</span>
              <span class="ob-sr-only">${esc(item.status)}</span>
            </li>`).join("")}
        </ul>
        ${failed ? `<div class="ob-actions"><button class="ob-button primary push" type="button" data-action="start-sync">Prøv igjen</button></div>` : ""}
      </section>`,
      { step: "sync", accent: STEP_ACCENTS.sync, footnoteText: failed ? "" : "Henter ekte status fra serveren …" }
    );
  }

  async function startSync() {
    let result;
    try {
      result = await api("/api/onboarding/sync", { method: "POST", body: "{}" });
    } catch (error) {
      renderSync(app.state?.job, error.message);
      return;
    }
    adoptState(result);
    renderSync(result.job);
    pollSync();
  }

  function pollSync() {
    app.syncTimer = setTimeout(async () => {
      let result;
      try {
        result = await api("/api/onboarding/state");
      } catch {
        pollSync();
        return;
      }
      adoptState(result);
      const job = app.state.job;
      if (job?.status === "Kjører") {
        updateSyncStages(job);
        pollSync();
      } else if (job?.status === "Fullført" && app.state.step === "done") {
        announce("Synkroniseringen er ferdig. Scope er klart.");
        renderDone();
      } else {
        renderSync(job);
      }
    }, 1500);
  }

  function updateSyncStages(job) {
    const rows = stage.querySelectorAll(".ob-checks li");
    (job.stages || []).forEach((item, index) => {
      const row = rows[index];
      if (!row) return;
      row.className = item.status === "Fullført" ? "is-ok" : item.status === "Feilet" ? "is-failed" : item.status === "Kjører" ? "is-running" : "";
      const icon = row.querySelector(".ob-check-state");
      if (icon) icon.textContent = item.status === "Fullført" ? "✓" : item.status === "Feilet" ? "✕" : "";
      const sr = row.querySelector(".ob-sr-only");
      if (sr) sr.textContent = item.status;
    });
  }

  // ---------- Steg 8: Ferdig ----------

  function renderDone() {
    const connection = app.state.connection || {};
    const scopeLabels = (app.state.dataScopes || []).filter((scope) => (app.state.selectedScopes || []).includes(scope.id)).map((scope) => scope.label);
    render(
      `<section class="ob-card">
        <div class="ob-done-mark" aria-hidden="true">✓</div>
        <h1>Scope er klart</h1>
        <p class="ob-intro">Tripletex er koblet til, og de første tallene er hentet inn.</p>
        <div class="ob-summary">
          <div><span>Tilkoblet selskap</span><strong>${esc(connection.companyName || "–")}</strong></div>
          <div><span>Organisasjonsnummer</span><strong>${esc(formatOrgNumber(connection.organizationNumber))}</strong></div>
          <div><span>Sist synkronisert</span><strong>${esc(formatTime(connection.lastSyncAt))}</strong></div>
          <div><span>Datakategorier</span><strong>${esc(scopeLabels.join(", ") || "–")}</strong></div>
          <div><span>Status</span><strong>${esc(connection.status || "Tilkoblet")}</strong></div>
        </div>
        <p style="margin:0 0 10px;font-weight:700;font-size:.92rem">Neste anbefalte steg</p>
        <ol class="ob-next-steps">
          <li>Se første oversikt</li>
          <li>Koble til kassesystem</li>
          <li>Koble til bemanningssystem</li>
        </ol>
        <div class="ob-actions">
          <a class="ob-button secondary" href="/oversikt#neste">Koble til neste system</a>
          <a class="ob-button primary push" href="/oversikt">Gå til Oversikt</a>
        </div>
      </section>`,
      { step: "done", accent: STEP_ACCENTS.done, showSaveExit: false }
    );
  }

  // ---------- Navigasjon ----------

  const RENDERERS = {
    welcome: renderWelcome,
    business: () => renderBusiness(),
    connect: () => renderConnect(),
    company: () => renderCompany(),
    data: () => renderData(),
    test: () => renderTest(),
    sync: () => {
      const job = app.state.job;
      if (job?.status === "Kjører") {
        renderSync(job);
        pollSync();
      } else if (job?.status === "Feilet") {
        renderSync(job);
      } else {
        startSync();
      }
    },
    done: renderDone,
  };

  function go(stepId) {
    (RENDERERS[stepId] || renderWelcome)();
  }

  async function navigate(stepId, completedStep = null) {
    try {
      const result = await api("/api/onboarding/step", { method: "POST", body: JSON.stringify({ step: stepId, completed: completedStep }) });
      adoptState(result);
    } catch (error) {
      if (error.status === 401) {
        renderClaim("Økten er utløpt. Bekreft e-postadressen din for å fortsette.");
        return;
      }
    }
    go(stepId);
  }

  // ---------- Hendelser ----------

  document.addEventListener("click", async (event) => {
    const back = event.target.closest("[data-back]");
    if (back) {
      navigate(back.dataset.back);
      return;
    }
    const action = event.target.closest("[data-action]");
    if (!action) return;
    const type = action.dataset.action;
    if (type === "start") navigate("business", "welcome");
    if (type === "goto-company") navigate("company");
    if (type === "defer") {
      action.disabled = true;
      try {
        await api("/api/onboarding/defer", { method: "POST", body: "{}" });
      } catch {
        // Oversikten viser uansett riktig tilstand.
      }
      window.location.assign("/oversikt");
    }
    if (type === "run-test") runTest();
    if (type === "start-sync") {
      action.disabled = true;
      try {
        await api("/api/onboarding/step", { method: "POST", body: JSON.stringify({ step: "sync" }) });
      } catch {
        // Synkroniseringskallet under gir uansett riktig feilmelding.
      }
      startSync();
    }
    if (type === "dismiss-mismatch") renderCompany();
    if (type === "confirm-mismatch") {
      submitCompany(action.dataset.company, true);
    }
  });

  saveExitButton.addEventListener("click", async () => {
    saveExitButton.disabled = true;
    window.location.assign("/oversikt");
  });

  document.addEventListener("input", (event) => {
    const search = event.target.closest("[data-company-search]");
    if (search) {
      const query = search.value;
      const selected = stage.querySelector("input[name='companyId']:checked")?.value ?? null;
      renderCompany({ query, selectedId: selected });
      const input = stage.querySelector("[data-company-search]");
      input.focus();
      input.setSelectionRange(query.length, query.length);
    }
  });

  document.addEventListener("change", (event) => {
    const choice = event.target.closest(".ob-choice input");
    if (!choice) return;
    const group = choice.closest(".ob-choices");
    if (choice.type === "radio") {
      group.querySelectorAll(".ob-choice").forEach((label) => label.classList.remove("is-selected"));
    }
    choice.closest(".ob-choice").classList.toggle("is-selected", choice.checked);
  });

  async function submitCompany(companyId, confirmMismatch = false) {
    if (!companyId) {
      renderCompany({ message: "Velg et selskap for å fortsette." });
      return;
    }
    try {
      const result = await api("/api/onboarding/company", { method: "POST", body: JSON.stringify({ companyId, confirmMismatch }) });
      adoptState(result);
      go("data");
    } catch (error) {
      if (error.mismatch) {
        renderCompany({ mismatch: { ...error.mismatch, companyId }, selectedId: companyId });
      } else {
        renderCompany({ message: error.message, selectedId: companyId });
      }
    }
  }

  document.addEventListener("submit", async (event) => {
    const form = event.target.closest("[data-form]");
    if (!form) return;
    event.preventDefault();
    const type = form.dataset.form;
    const data = Object.fromEntries(new FormData(form).entries());
    const submitButton = form.querySelector("button[type='submit']");
    if (submitButton) submitButton.disabled = true;

    try {
      if (type === "register") {
        const result = await api("/api/onboarding/register", { method: "POST", body: JSON.stringify(data) });
        adoptState(result);
        go(app.state.step);
      }
      if (type === "claim") {
        const result = await api("/api/onboarding/claim", { method: "POST", body: JSON.stringify({ token: app.inviteToken, email: data.email }) });
        adoptState(result);
        go(app.state.step);
      }
      if (type === "profile") {
        const result = await api("/api/onboarding/profile", { method: "POST", body: JSON.stringify(data) });
        adoptState(result);
        go("connect");
      }
      if (type === "connect") {
        submitButton.textContent = "Kobler til …";
        const result = await api("/api/onboarding/tripletex/connect", { method: "POST", body: JSON.stringify({ apiToken: data.apiToken }) });
        adoptState(result);
        announce("Tripletex-tokenet ble godkjent.");
        go("company");
      }
      if (type === "company") {
        await submitCompany(data.companyId);
      }
      if (type === "datascopes") {
        const scopes = [...form.querySelectorAll("input[name='scopes']:checked")].map((input) => input.value);
        const result = await api("/api/onboarding/datascopes", { method: "POST", body: JSON.stringify({ scopes }) });
        adoptState(result);
        go("test");
      }
    } catch (error) {
      if (type === "register") renderStart(error.message);
      else if (type === "claim") renderClaim(error.message);
      else if (type === "profile") renderBusiness(error.fieldErrors, error.fieldErrors ? "" : error.message);
      else if (type === "connect") renderConnect(error.message, error.help);
      else if (type === "datascopes") renderData(error.message);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  // ---------- Oppstart ----------

  async function boot() {
    const params = new URLSearchParams(window.location.search);
    const returnedFromTripletex = params.get("connected") === "1";
    const connectError = params.get("connect_error") || "";
    if (returnedFromTripletex || connectError || app.inviteToken) {
      window.history.replaceState(null, "", window.location.pathname + (app.inviteToken ? `?invite=${encodeURIComponent(app.inviteToken)}` : ""));
    }
    if (returnedFromTripletex) renderConnecting();

    let result;
    try {
      result = await api("/api/onboarding/state");
    } catch (error) {
      if (error.status === 401) {
        if (app.inviteToken) renderClaim(connectError ? "Bekreft e-postadressen din, så fortsetter vi der du slapp." : "");
        else renderStart();
        return;
      }
      renderFatal("Vi fikk ikke lastet oppsettet", error.message);
      return;
    }
    adoptState(result);
    if (returnedFromTripletex) {
      await new Promise((resolve) => setTimeout(resolve, 900));
      announce("Tripletex er koblet til.");
      go(app.state.step);
      return;
    }
    if (connectError) {
      renderConnect();
      return;
    }
    go(app.state.step);
  }

  boot();
})();
