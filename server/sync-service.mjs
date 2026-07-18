// Førstegangssynkronisering som sporbar bakgrunnsjobb.
// Fremdriften er ekte jobstatus fra serveren – ingen falske prosenttall.

import { randomBytes } from "node:crypto";
import { translateTripletexError } from "./tripletex-errors.mjs";

export const SYNC_STAGES = [
  { id: "company", label: "Henter selskapsinformasjon" },
  { id: "structure", label: "Henter kontoplan og avdelinger" },
  { id: "ledger", label: "Henter regnskapstall" },
  { id: "report", label: "Beregner første oversikt" },
  { id: "finalize", label: "Gjør Scope klart" },
];

const REPORT_WINDOW_DAYS = 90;
const POSTINGS_PAGE_SIZE = 1000;
const POSTINGS_MAX_PAGES = 20;

export function createSyncJob(connectionId, jobType = "initial") {
  return {
    id: `job-${Date.now()}-${randomBytes(4).toString("hex")}`,
    connectionId,
    jobType,
    status: "Kjører",
    progressStage: SYNC_STAGES[0].id,
    stages: SYNC_STAGES.map((stage) => ({ ...stage, status: "Venter" })),
    startedAt: new Date().toISOString(),
    completedAt: null,
    errorCode: null,
    errorMessage: null,
  };
}

// Aggregerer hovedbokposteringer til en første, enkel oversikt.
// Inntekter føres som kredit (negative beløp) i hovedboken – derfor snus fortegnet.
export function aggregatePostings(postings) {
  const totals = { revenue: 0, cogs: 0, payroll: 0, otherCosts: 0 };
  let counted = 0;
  for (const posting of postings) {
    const number = Number(posting?.account?.number ?? posting?.accountNumber);
    const amount = Number(posting?.amount);
    if (!Number.isFinite(number) || !Number.isFinite(amount)) continue;
    if (number >= 3000 && number <= 3999) totals.revenue += -amount;
    else if (number >= 4000 && number <= 4999) totals.cogs += amount;
    else if (number >= 5000 && number <= 5999) totals.payroll += amount;
    else if (number >= 6000 && number <= 7999) totals.otherCosts += amount;
    else continue;
    counted += 1;
  }
  const round = (value) => Math.round(value * 100) / 100;
  const revenue = round(totals.revenue);
  const cogs = round(totals.cogs);
  const payroll = round(totals.payroll);
  const otherCosts = round(totals.otherCosts);
  const result = round(revenue - cogs - payroll - otherCosts);
  return { revenue, cogs, payroll, otherCosts, result, postingsCount: counted };
}

// Kjører hele førstegangssynkroniseringen. Jobben lever på serveren og fortsetter
// selv om kunden lukker nettleseren. `save` persisterer tilstanden etter hvert steg.
export async function runFirstSync({ job, connection, service, scopes, save, addEvent }) {
  const stage = (id) => job.stages.find((item) => item.id === id);
  const startStage = async (id) => {
    job.progressStage = id;
    stage(id).status = "Kjører";
    await save();
  };
  const finishStage = async (id, note = "") => {
    stage(id).status = "Fullført";
    if (note) stage(id).note = note;
    await save();
  };

  try {
    const client = service.clientFor(connection.environment);
    const session = await service.ensureSession(connection);
    const companyId = connection.externalCompanyId;

    await startStage("company");
    const company = await client.getCompany(session, companyId);
    if (company?.name) connection.externalCompanyName = String(company.name).slice(0, 160);
    await finishStage("company");

    await startStage("structure");
    const accounts = await client.getAccounts(session, companyId, { count: 500 });
    let departments = [];
    if (scopes.includes("departments")) {
      departments = await client.getDepartments(session, companyId, { count: 200 });
    }
    await finishStage("structure", `${accounts.length} kontoer${scopes.includes("departments") ? ` · ${departments.length} avdelinger` : ""}`);

    await startStage("ledger");
    const dateTo = new Date().toISOString().slice(0, 10);
    const dateFrom = new Date(Date.now() - REPORT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const postings = [];
    for (let page = 0; page < POSTINGS_MAX_PAGES; page += 1) {
      const batch = await client.getPostings(session, companyId, {
        dateFrom,
        dateTo,
        from: page * POSTINGS_PAGE_SIZE,
        count: POSTINGS_PAGE_SIZE,
      });
      postings.push(...batch.values);
      if (postings.length >= batch.fullResultSize || batch.values.length < POSTINGS_PAGE_SIZE) break;
    }
    await finishStage("ledger", `${postings.length} posteringer`);

    await startStage("report");
    const report = aggregatePostings(postings);
    connection.firstReport = {
      ...report,
      periodFrom: dateFrom,
      periodTo: dateTo,
      accounts: accounts.length,
      departments: departments.length,
      computedAt: new Date().toISOString(),
    };
    await finishStage("report");

    await startStage("finalize");
    connection.lastSyncAt = new Date().toISOString();
    connection.status = "Tilkoblet";
    // Full synkronisering kjøres bare første gang. Videre oppdateringer skal bruke
    // webhooks der Tripletex støtter det, ellers inkrementell henting – ikke polling.
    connection.syncStrategy = "webhooks-incremental";
    await finishStage("finalize");

    job.status = "Fullført";
    job.completedAt = new Date().toISOString();
    await save();
    addEvent(connection.id, "sync-completed", "Vellykket", { postings: report.postingsCount, accounts: accounts.length });
    return { ok: true };
  } catch (error) {
    const translated = translateTripletexError(error);
    const running = job.stages.find((item) => item.status === "Kjører");
    if (running) running.status = "Feilet";
    job.status = "Feilet";
    job.completedAt = new Date().toISOString();
    job.errorCode = translated.code;
    job.errorMessage = translated.message;
    connection.status = "Feil";
    await save();
    addEvent(connection.id, "sync-failed", "Feilet", { code: translated.code, technical: translated.technical });
    return { ok: false, error: translated };
  }
}

// Jobber som ble avbrutt av en serveromstart skal ikke se ut som de fortsatt kjører.
export function recoverInterruptedJobs(state) {
  let changed = false;
  for (const job of state.syncJobs || []) {
    if (job.status === "Kjører") {
      job.status = "Feilet";
      job.errorCode = "INTERRUPTED";
      job.errorMessage = "Synkroniseringen ble avbrutt av en omstart. Start den på nytt.";
      job.completedAt = new Date().toISOString();
      for (const stage of job.stages || []) if (stage.status === "Kjører") stage.status = "Feilet";
      changed = true;
    }
  }
  return changed;
}
