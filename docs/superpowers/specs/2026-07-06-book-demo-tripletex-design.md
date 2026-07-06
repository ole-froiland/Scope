# Design: «Book demo»-skjema med Tripletex-integrasjon

**Dato:** 2026-07-06
**Status:** Godkjent av Ole

## Mål

Når en besøkende trykker «Book Demo» på scope-landingssiden skal det åpnes en
enkel boks (modal) der de legger igjen kontaktinfo med færrest mulig trykk.
Ved innsending skal:

1. Ole få e-postvarsel (via Netlify Forms)
2. Personen opprettes automatisk som kunde i Tripletex (testmiljø nå,
   produksjon senere ved kun å bytte miljøvariabler)

## Kontekst

- Statisk side (index.html + styles.css + script.js, ingen byggverktøy)
- Hostet på Netlify, koblet til GitHub-repoet `ole-froiland/Scope`
- «Book Demo»-knappene (header, hero, mobilmeny) og «Ta kontakt» (footer)
  peker i dag til `#`
- Ole har testnøkler til Tripletex (api-test.tripletex.tech), ikke
  produksjonsnøkler ennå

## Arkitektur

```
Besøkende → Modal (frontend) → POST til Netlify Forms («book-demo»)
                                    ├── E-postvarsel til Ole (Netlify-panelet)
                                    ├── Innsending lagres i Netlify-panelet
                                    └── Trigger netlify/functions/submission-created.js
                                            └── Oppretter kunde i Tripletex API
```

Valgt fremfor én egenskrevet «gjør alt»-funksjon fordi Netlify Forms gir
e-post og lagring uten ekstra tjenester, og fordi en feil i
Tripletex-funksjonen aldri kan miste en booking (den ligger alltid i
Netlify-panelet).

## Komponenter

### 1. Booking-modal (index.html + styles.css + script.js)

- Åpnes av alle «Book Demo»-knapper og «Ta kontakt» i footer
- Felter (alt på én skjerm, ingen steg):
  - **Navn** – påkrevd
  - **Restaurant/bedrift** – påkrevd
  - **Telefon** – påkrevd (type `tel`)
  - **E-post** – valgfri (type `email`)
  - Skjult honeypot-felt `bot-field` (anti-spam)
- Én knapp: «Book demo». Under knappen: «Vi tar kontakt i løpet av kort tid.»
- Innsending via `fetch` (AJAX) til `/` med `application/x-www-form-urlencoded`
  inkl. `form-name=book-demo` – siden lastes ikke på nytt
- Suksess: innholdet i boksen byttes til «Takk, {navn}! Vi tar kontakt i
  løpet av kort tid.» + lukkeknapp
- Feil (nettverk/serverfeil): feilmelding i boksen, skjemadata beholdes så
  man kan prøve igjen
- Lukking: kryss-knapp, Esc, klikk på bakgrunnen
- Stil: gjenbruker sidens designspråk (Inter, sort/hvitt, `.button.primary`)
- Tilgjengelighet: `role="dialog"`, `aria-modal`, fokus flyttes inn i boksen
  ved åpning og tilbake ved lukking
- Et skjult statisk `<form name="book-demo" netlify netlify-honeypot="bot-field" hidden>`
  med identiske felter ligger i index.html slik at Netlify oppdager skjemaet
  ved deploy (krav fra Netlify Forms)

### 2. Netlify Forms

- Skjemanavn: `book-demo`
- Innsendinger lagres under «Forms» i Netlify-panelet
- E-postvarsling settes opp manuelt av Ole i Netlify-panelet
  (Forms → Form notifications → Email notification) – steg-for-steg-oppskrift
  leveres som del av prosjektet
- Gratis-nivå: 100 innsendinger/mnd – tilstrekkelig

### 3. Tripletex-funksjon (netlify/functions/submission-created.js)

Kjøres automatisk av Netlify ved hver skjemainnsending. Ingen npm-avhengigheter
(bruker innebygd `fetch` i Node 18+).

Flyt:

1. Les innsendingen fra `event.body` → `payload.data`
   (navn, bedrift, telefon, epost)
2. Opprett sesjonsnøkkel:
   `PUT {BASE}/v2/token/session/:create?consumerToken=…&employeeToken=…&expirationDate={i morgen}`
3. Opprett kunde: `POST {BASE}/v2/customer` med Basic auth (`0:{sesjonsnøkkel}`)
   og body:
   - `name`: restaurant/bedrift
   - `email`: e-post (utelates hvis tom)
   - `phoneNumberMobile`: telefon
   - `description`: «Demo-booking fra nettsiden {dato} – kontaktperson: {navn}»
   - `isCustomer`: true
4. Ved feil: logg detaljert feilmelding (synlig i Netlify function log) og
   avslutt uten å kaste videre – bookingen ligger uansett trygt i
   Netlify-panelet og e-posten er sendt

Miljøvariabler (settes i Netlify-panelet, aldri i koden):

| Variabel | Nå (test) | Senere (produksjon) |
|---|---|---|
| `TRIPLETEX_API_BASE` | `https://api-test.tripletex.tech` | `https://tripletex.no` |
| `TRIPLETEX_CONSUMER_TOKEN` | testnøkkel | produksjonsnøkkel |
| `TRIPLETEX_EMPLOYEE_TOKEN` | testnøkkel | produksjonsnøkkel |

Duplikathåndtering: bevisst utelatt (YAGNI) – to bookinger fra samme person
gir to kunder i Tripletex, som er akseptabelt for demo-bookinger.

## Testing

- Modal testes lokalt i nettleser (Playwright): åpne/lukke, validering,
  suksess- og feilvisning (Netlify-endepunktet finnes ikke lokalt, så
  feilvisning testes naturlig)
- Tripletex-funksjonen testes med et lokalt skript som kaller handleren med
  en syntetisk Netlify-payload mot testmiljøet (med Oles testnøkler), og
  verifiserer at kunden dukker opp via `GET /v2/customer`
- Full ende-til-ende-verifisering etter deploy: ekte innsending på
  nettsiden → sjekk Netlify Forms, e-post og Tripletex

## Utrulling

1. Commit + push til GitHub → Netlify deployer automatisk
2. Ole legger inn de tre miljøvariablene i Netlify-panelet
   (Site settings → Environment variables) og redeployer
3. Ole skrur på e-postvarsling (Forms → Notifications)
4. Sjekkliste med skjermbilde-vennlige steg leveres i
   `docs/OPPSETT-NETLIFY.md`

## Utenfor scope

- Valg av dato/tidspunkt i skjemaet (Ole avtaler tidspunkt manuelt)
- Duplikatsjekk i Tripletex
- Egen e-posttjeneste/-mal (Netlifys standardvarsel er tilstrekkelig)
