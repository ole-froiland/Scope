# Scope arbeidsflate (/test) – redesign

Dato: 2026-09-29 · Status: godkjent av Ole i samtale · Prototype: `.superpowers/brainstorm/proto/a.html` (ikke i git)

## Mål

Arbeidsflaten på `/test` fungerer, men ser «lappet» ut og viser ikke informasjonen pent og oversiktlig. Målet er en
ferdig, rolig og brukervennlig arbeidsflate som passer Scope: lys, Inter, få farger, ingen «AI-look», dashbord på én
skjerm uten scrolling.

Beslutninger fra Ole:

- Omfang: hele arbeidsflaten, i tre trinn som godkjennes hvert for seg.
- Lys modus er hovedmodus. Mørk modus skal være gjennomarbeidet og feilfri.
- Oversikt skal først og fremst svare på «Hvordan går det i dag?».
- Den ucommittede endringen fra 13. sep. brukes som idégrunnlag (tiltak begrunnet i tall, ulike beløp, I kveld / I
  morgen), men koden skrives på nytt.
- Oppsett A, «Dagen først», er valgt for Oversikt.

## Trinn

1. Felles designsystem + Oversikt.
2. Salg, Kostnader, Resultat (og undersidene Varekost, Bemanning, Andre kostnader) på samme system.
3. Koblinger, Innstillinger, «Spør Scope», kontomeny, stedsvelger, faner og språkvelger.

Hvert trinn er en egen plan, blir verifisert i nettleser og pushes til `main` + Netlify når det er ferdig. Trinn 2 og 3
får en visuell skisse som Ole godkjenner før bygging.

## Designsystem

Ligger øverst i `test.css` som tokens på `.app`, redefinert under `.app[data-theme=dark]`.

| Token | Lys | Bruk |
| --- | --- | --- |
| `--paper` | `#ffffff` | Innholdsflate, kort |
| `--rail` | `#f7f6f3` | Sidemeny, segmentbakgrunn |
| `--line` / `--line-strong` | `#ebe8e2` / `#dcd8d0` | Hårstreker, knappekant |
| `--ink` / `--muted` / `--faint` | `#171715` / `#6b675f` / `#9a958c` | Tekst |
| `--hover` / `--active` | `#f1efea` / `#e7e3db` | Tilstander |
| `--accent` / `--accent-soft` / `--accent-line` | `#1f4fe0` / `#eaf0fd` / `#b9c9f6` | «I dag» / valgt periode, prognose |
| `--pos` / `--pos-soft` | `#0f8a5f` / `#e5f4ec` | Kun «opp/bra» |
| `--neg` / `--neg-soft` | `#cf3a31` / `#fbeceb` | Kun «ned/dårlig» |

Regler:

- Font: Inter (uendret), `font-feature-settings: "tnum"` for tall. Skala: 12.5 / 14 / 15 / 22 / 26 / 44 px.
- Radius: 14 px kort, 9 px kontroller. Ingen skygger på kort; kun på flytende elementer (spør-boks, menyer, tooltip).
- Knapper: sekundær (hvit, kant) er standard. Maks én primær (blekk-fylt) per visning.
- Grafer: valgt periode = `--accent`, sammenligning = stiplet grå linje, prognose = `--accent-soft` med stiplet
  `--accent-line`-kant. Kategorier (f.eks. salgsmiks) bruker nyanser av én farge, ikke seks ulike.
- Grønt/rødt brukes bare for retning på endringer, aldri som dekor.
- Tri-fargene i logoen brukes bare i logo og små aksenter.

Felles komponenter (CSS-klasser med prefiks `ui-`, gjenbrukt i alle trinn): `ui-card`, `ui-panel-head`, `ui-btn`
(+ `ui-btn-primary`), `ui-seg` (segmentvelger), `ui-delta` (▲/▼ med farge), `ui-chip`, `ui-stat` (nøkkeltall),
`ui-row` (listerad), `ui-empty`, og en felles JS-hjelper for søylegraf med tooltip.

Opprydding: CSS-generasjonene som det nye designet erstatter (gamle oversiktsregler som `.kol-*`, `.day-overview`,
`.dash-*`) slettes når ingen markup lenger bruker dem. Dette fjerner også dagens feil i lys modus (svarte «Start»-knapper,
usynlig aktiv fane).

## Trinn 1 – Oversikt

### Oppsett (én skjerm, 1280×720 og 1440×900 uten scrolling)

1. Sidehode: «I dag» + ukedag og dato, til høyre «Live fra kassen · oppdatert HH:MM».
2. **I dag-kortet** (full bredde, vokser for å fylle høyden):
   - Stor: «Omsetning så langt» + endringsmerke mot «en vanlig <ukedag>» + «Prognose i dag».
   - Tre nøkkeltall: Gjester (endring), Snitt per gjest (endring), På vakt nå (gjester per ansatt).
   - Graf «Omsetning per time», kl. 11–23: blå søyler for fullførte timer, timen som pågår delvis fylt med prognose over,
     skraverte prognosesøyler for resten, stiplet linje for vanlig ukedag, tynn «nå»-strek. Tooltip per time:
     i dag/prognose, vanlig ukedag, forskjell.
3. Nederste rad (1.45fr / 1fr):
   - **Gjør dette nå**: inntil tre åpne tiltak. Rad = avhukingssirkel, tittel, begrunnelse fra tallene, verdi (kr eller
     antall) og én knapp som åpner riktig side. «Alle tiltak →» åpner eksisterende tiltaksside.
   - **Siste 7 dager**: sum + endring mot forrige periode, én søyle per dag med i dag (så langt + prognose) ytterst,
     linje med beste dag. Segment Dag/Uke/Måned bytter til 7 dager / 8 uker / 6 måneder. Klikk på søyle åpner den
     eksisterende guidede rapporten for perioden.
4. «Spør Scope» nederst som i dag.

### Data

Alt er demodata fra eksisterende modell i `test.js` (`STED_PROFIL`, `DAGVEKT`, `TIMEVEKT`, `ENDRING`, `NÅ`).
Nye rene funksjoner i `scope-insights.js` (testbare med `node --test`):

- `normalDay(profile, weekdayFactor, hourWeights)` → forventet omsetning og gjester per time for en vanlig ukedag.
- `todaySoFar(normal, seed, now)` → dagens tall per time til og med nå, med et fast avvik avledet av sted + dato
  (samme tall ved hver innlasting), timen som pågår som andel.
- `forecastDay(soFar, normal)` → prognose: faktisk hittil + resterende normal × (hittil/normal hittil), dempet.

Tilstander: før kl. 11 («Vi åpner kl. 11», gårsdagen + prognose), under åpningstid (som over), etter stengetid
(«Dagen er ferdig», ingen prognose). Flere steder valgt: tall summeres, tittel viser antall steder.

Tiltak: `buildOperationalAdvice` (fra den lokale endringen) med begrunnelser og ulike verdier; status lagres som i dag
(`scope-actions-v1`). Periodesøyler: `buildReport` / `reportRange`.

### Samspill

- Klikk på nøkkeltall → Salg for i dag. Knapp i tiltak → Varekost / Bemanning / Resultat som i dag.
- Stedsvelger, faner, språk, tema og «Spør Scope» virker som før; Oversikt re-rendres ved endring.
- Visningsnivåene Rask / Vanlig / Avansert påvirker fortsatt bare menyen.
- Tastatur: alle søyler og rader er knapper med synlig fokus; tooltip vises også ved fokus. `prefers-reduced-motion`
  respekteres.

### Mobil

Under ca. 900 px stables kortene; scrolling er da greit. Grafen beholder alle timer, med færre akseetiketter.

## Trinn 2 og 3 (retning, detaljeres i egne runder)

- Salg, Kostnader, Resultat: samme komponenter og graf; alle funksjoner beholdes (perioder, sammenligning, produkter,
  oppsummering, fakturaer, simulering). Kostnader får et nyttig innhold i dagens tomrom.
- Koblinger, Innstillinger, spør-boks, menyer: samme komponenter og ryddigere oppsett, uendret oppførsel.

## Verifisering

- `npm test` grønn, med nye tester for `normalDay`, `todaySoFar`, `forecastDay`.
- Nettleser: 1440×900 og 1280×720 uten scroll i innholdet (`scrollHeight <= clientHeight`), mobil 375×812, lys og mørk,
  ingen konsollfeil, alle knapper klikket gjennom.
- Cache: bump `?v=` på `test.css`/`test.js` i `test.html` ved hver endring.
- Ferdig trinn → commit til `main`, push, `netlify deploy --prod --build`, sjekk live `/test`.
