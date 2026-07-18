// Kundens Oversikt: ekte tilstand fra serveren.
// Tom tilstand før Tripletex er koblet til, delvis utfylt etter første synkronisering.
(() => {
  const main = document.querySelector("[data-overview]");
  const liveRegion = document.querySelector("[data-live]");
  const moneyFormat = new Intl.NumberFormat("nb-NO", { style: "currency", currency: "NOK", maximumFractionDigits: 0 });
  const timeFormat = new Intl.DateTimeFormat("nb-NO", { dateStyle: "medium", timeStyle: "short" });
  let pollTimer = null;

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatTime(value) {
    return value ? timeFormat.format(new Date(value)) : "–";
  }

  function formatOrgNumber(value) {
    const digits = String(value || "").replace(/\D/g, "");
    return digits.length === 9 ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}` : digits || "–";
  }

  function renderSignedOut() {
    main.innerHTML = `<section class="ov-card" style="max-width:560px;margin:24px auto">
      <h1 style="margin:0 0 8px;font-size:1.4rem">Du er ikke logget inn</h1>
      <p>Oversikten er knyttet til oppsettet ditt. Åpne onboardinglenken du har fått på e-post, eller start oppsettet på nytt.</p>
      <div class="ob-actions" style="margin-top:16px">
        <a class="ob-button primary" href="/onboarding">Gå til oppsettet</a>
      </div>
    </section>`;
  }

  function metricCard(label, value, note = "") {
    return `<article class="ov-metric"><small>${esc(label)}</small><strong>${esc(value)}</strong>${note ? `<span>${esc(note)}</span>` : ""}</article>`;
  }

  function renderOverview(data) {
    const { company, connection, checklist, job, onboarding } = data;
    const report = connection?.firstReport || null;
    const syncing = job?.status === "Kjører";
    const connected = connection && connection.status === "Tilkoblet" && connection.lastSyncAt;
    const doneCount = checklist.items.filter((item) => item.done).length;

    const taskCard = !connected && !syncing
      ? `<section class="ov-card" aria-labelledby="task-title">
          <div class="ov-task">
            <div class="ov-task-copy">
              <h2 id="task-title">Koble til Tripletex for å komme i gang</h2>
              <p style="margin:0;color:var(--ob-muted)">Scope henter regnskapstallene automatisk når Tripletex er koblet til. Det tar bare noen minutter.</p>
            </div>
            <a class="ob-button primary" href="/onboarding">Fortsett oppsettet</a>
          </div>
        </section>`
      : "";

    const syncCard = syncing
      ? `<section class="ov-card"><h2>Synkroniserer med Tripletex …</h2><p>De første tallene er på vei inn. Denne siden oppdaterer seg selv.</p></section>`
      : "";

    const metrics = report
      ? `<section class="ov-metrics" aria-label="Nøkkeltall">
          ${metricCard("Omsetning", moneyFormat.format(report.revenue), `Siste 90 dager`)}
          ${metricCard("Varekost", moneyFormat.format(report.cogs), report.revenue ? `${Math.round((report.cogs / report.revenue) * 100)} % av omsetning` : "")}
          ${metricCard("Lønn", moneyFormat.format(report.payroll), report.revenue ? `${Math.round((report.payroll / report.revenue) * 100)} % av omsetning` : "")}
          ${metricCard("Resultat", moneyFormat.format(report.result), "Før avskrivninger og finans")}
        </section>`
      : "";

    const connectionCard = connection
      ? `<section class="ov-card">
          <h2>Tripletex</h2>
          <p>${connected ? "Tilkoblet og oppdatert." : syncing ? "Tilkoblet – synkronisering pågår." : connection.status === "Feil" ? "Tilkoblingen trenger tilsyn. Prøv testen på nytt i oppsettet." : "Oppsettet er ikke fullført ennå."}</p>
          <div class="ob-summary">
            <div><span>Selskap</span><strong>${esc(connection.companyName || "–")}</strong></div>
            <div><span>Org.nr.</span><strong>${esc(formatOrgNumber(connection.organizationNumber))}</strong></div>
            <div><span>Status</span><strong>${esc(connection.status)}</strong></div>
            <div><span>Sist synkronisert</span><strong>${esc(formatTime(connection.lastSyncAt))}</strong></div>
            ${connection.credentialHint ? `<div><span>Token</span><strong>Slutter på ${esc(connection.credentialHint)}</strong></div>` : ""}
          </div>
        </section>`
      : "";

    main.innerHTML = `
      <div class="ov-head">
        <h1>${esc(company.name)}</h1>
        <p>Hei ${esc((company.contact || "").split(" ")[0] || "")}! ${connected ? "Her er den første oversikten din." : "Her er status for oppsettet."}</p>
      </div>
      <div class="ov-grid">
        ${taskCard}
        ${syncCard}
        ${metrics}
        ${connectionCard}
        <section class="ov-card" id="neste" aria-labelledby="checklist-title">
          <h2 id="checklist-title">Kom helt i mål</h2>
          <p>${doneCount} av ${checklist.items.length} steg fullført</p>
          <ul class="ov-checklist">
            ${checklist.items.map((item) => `<li class="${item.done ? "is-done" : ""}">
                <span class="ov-check-mark" aria-hidden="true">✓</span>
                <span>${esc(item.label)}${!item.done && item.hint ? `<small>${esc(item.hint)}</small>` : ""}<span class="ob-sr-only">${item.done ? " – fullført" : " – gjenstår"}</span></span>
              </li>`).join("")}
          </ul>
        </section>
        ${!connected && !syncing && onboarding.status !== "Fullført" ? "" : `<section class="ov-card ov-locked">
          <h2>Mer innsikt venter</h2>
          <p>Koble til kassesystemet for å få omsetning gjennom dagen, og bemanningssystemet for råd om vakter og personalkostnad. Vi hjelper deg når du er klar.</p>
        </section>`}
      </div>`;

    if (syncing) {
      clearTimeout(pollTimer);
      pollTimer = setTimeout(load, 2000);
      liveRegion.textContent = "Synkronisering pågår.";
    } else if (connected) {
      liveRegion.textContent = "Oversikten er klar.";
    }
  }

  async function load() {
    let response;
    try {
      response = await fetch("/api/onboarding/overview");
    } catch {
      main.innerHTML = `<section class="ov-card"><h1 style="font-size:1.3rem">Fikk ikke kontakt med Scope</h1><p>Sjekk nettforbindelsen og last siden på nytt.</p></section>`;
      return;
    }
    if (response.status === 401) {
      renderSignedOut();
      return;
    }
    const data = await response.json().catch(() => null);
    if (!data?.ok) {
      renderSignedOut();
      return;
    }
    renderOverview(data);
  }

  load();
})();
