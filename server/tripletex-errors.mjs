// Oversetter tekniske Tripletex-feil til korte, konkrete meldinger for kunden.
// Rå API-feilmeldinger vises aldri i grensesnittet – de logges kun sikkert på serveren.

const ERRORS = {
  NOT_CONFIGURED: {
    message: "Tripletex-tilkoblingen er ikke ferdig satt opp hos Scope ennå.",
    help: ["Dette er ikke noe du kan fikse selv.", "Kontakt oss, så gjør vi klart oppsettet for dere."],
  },
  TOKEN_INVALID: {
    message: "Tokenet er ikke gyldig.",
    help: [
      "Åpne Tripletex og gå til Selskap → API-token.",
      "Opprett et nytt token for Scope.",
      "Kopier hele tokenet og lim det inn her. Tokenet vises bare én gang i Tripletex.",
    ],
  },
  ACCESS_MISSING: {
    message: "Scope mangler tilgang til regnskapsdata.",
    help: [
      "Tokenet finnes, men har ikke rettighetene Scope trenger.",
      "Be en administrator i Tripletex gi API-brukeren lesetilgang til regnskap.",
      "Opprett gjerne et nytt token etterpå og prøv igjen.",
    ],
  },
  MODULE_MISSING: {
    message: "Integrasjonsmodulen må aktiveres i Tripletex.",
    help: [
      "Åpne Tripletex og gå til Selskap → Vår kundeside.",
      "Aktiver modulen «API-tilgang» eller be regnskapsføreren din gjøre det.",
      "Prøv igjen når modulen er aktivert.",
    ],
  },
  COMPANY_UNREADABLE: {
    message: "Valgt selskap kunne ikke leses.",
    help: [
      "Kontroller at brukeren bak tokenet har tilgang til selskapet.",
      "Velg eventuelt et annet selskap i forrige steg.",
    ],
  },
  NO_RESPONSE: {
    message: "Tripletex svarte ikke. Prøv igjen.",
    help: ["Dette skyldes som regel en midlertidig feil hos Tripletex.", "Vent et lite minutt og trykk «Prøv igjen»."],
  },
  RATE_LIMITED: {
    message: "Tripletex er opptatt akkurat nå. Vent litt og prøv igjen.",
    help: ["Vi har sendt mange forespørsler på kort tid.", "Vent et par minutter før du prøver igjen."],
  },
  UNEXPECTED: {
    message: "Noe gikk galt i tilkoblingen mot Tripletex. Prøv igjen.",
    help: ["Prøv igjen om et par minutter.", "Kontakt oss hvis feilen fortsetter, så hjelper vi dere."],
  },
};

export function tripletexErrorByCode(code) {
  const entry = ERRORS[code] || ERRORS.UNEXPECTED;
  return { code: ERRORS[code] ? code : "UNEXPECTED", message: entry.message, help: entry.help };
}

export function translateTripletexError(error) {
  const kind = error?.kind || "";
  const status = Number(error?.status) || 0;
  const apiMessage = String(error?.apiMessage || "").toLowerCase();
  const context = String(error?.context || "");

  let code = "UNEXPECTED";
  if (kind === "not-configured") code = "NOT_CONFIGURED";
  else if (kind === "network" || kind === "timeout") code = "NO_RESPONSE";
  else if (status === 429) code = "RATE_LIMITED";
  else if (status === 401) code = "TOKEN_INVALID";
  else if (status === 403) code = context === "company" ? "COMPANY_UNREADABLE" : "ACCESS_MISSING";
  else if (status === 404 && context === "company") code = "COMPANY_UNREADABLE";
  else if ((status === 409 || status === 422) && (apiMessage.includes("modul") || apiMessage.includes("module") || apiMessage.includes("api"))) code = "MODULE_MISSING";
  else if (status === 400 && context === "create-session") code = "TOKEN_INVALID";

  return {
    ...tripletexErrorByCode(code),
    // Teknisk beskrivelse til sikker serverlogg og hendelseslogg – aldri til kunden, og aldri med tokens.
    technical: [context, kind, status ? `HTTP ${status}` : "", error?.apiMessage || ""].filter(Boolean).join(" · ").slice(0, 300),
  };
}
