# Design QA — Scope gevinstkort

- Source visual truth: brukerens to referanseskjermbilder i samtalen (stablede fargekort med forrige/neste-kontroller).
- Implementation: `http://127.0.0.1:4180/landing.html#gevinster`
- Intended viewports: 1440 × 900 desktop og 390 × 844 mobil.
- Intended state: første kort aktivt, deretter neste/forrige-flipp.
- Browser-rendered implementation screenshot: ikke tilgjengelig.
- Primary interactions intended for test: neste, forrige, loop, swipe og piltaster.
- Console errors checked: blokkert fordi ingen innebygd nettleser er tilgjengelig.

**Findings**

- [P1] Visuell sammenligning kan ikke fullføres
  - Location: gevinstseksjonen `#gevinster`.
  - Evidence: kildereferansen er tilgjengelig i samtalen, men den innebygde nettleseren rapporterer at ingen nettleseroverflate er tilgjengelig, så en implementasjonsskjermdump i samme viewport kan ikke tas.
  - Impact: typografi, kortforskyvning, clipping og flip-bevegelsen kan ikke godkjennes visuelt ennå.
  - Fix: åpne lokal forhåndsvisning i en tilgjengelig testnettleser, ta desktop- og mobilskjermbilder, sammenlign med referansen og rett eventuelle P1/P2-avvik.

**Open Questions**

- Kan lokal Playwright-forhåndsvisning brukes som reserve for den utilgjengelige innebygde nettleseren?

**Implementation Checklist**

- Ta skjermbilde av første kort på desktop og mobil.
- Test neste, forrige, loop, swipe og piltaster.
- Kontroller at alle tre bakre kortkanter er synlige uten viewport-overflow.
- Kontroller reduced motion og nettleserkonsoll.
- Oppdater denne rapporten med sammenligning og endelig resultat.

**Follow-up Polish**

- Ingen P3-vurderinger før den visuelle sammenligningen er gjennomført.

final result: blocked

---

# Design QA — Clean: rikere AI-dashboard

- Source visual truth: brukerens tre referanseskjermbilder i samtalen.
- Implementation: `http://127.0.0.1:4173/clean`
- Intended viewport: desktop med tre telefoner, samt mobil med horisontal sveip.
- Intended state: kortere telefonrammer; beige testkundeområde og blå footer; oppdatert Råd, Nåtid og Bruker.
- Automated checks: 42 tester passerer; `/clean`, værikonet og de tre integrasjonslogoene svarer med HTTP 200.
- Browser-rendered implementation screenshot: ikke tilgjengelig fordi den innebygde nettleseroverflaten ikke er tilgjengelig.

**Findings**

- [P1] Visuell sammenligning og overflow-kontroll gjenstår
  - Location: `#demo`, særlig `.now-phone-content` og `.user-phone-content`.
  - Evidence: referansebildene er tilgjengelige i samtalen, men etterbildet kan ikke tas uten en godkjent lokal testnettleser.
  - Impact: tekstklipping, vertikal tetthet og logostørrelser kan ikke godkjennes visuelt før publisering.
  - Fix: ta desktop- og mobilskjermbilder med lokal Playwright, sammenlign med referansene og rett eventuelle P1/P2-avvik.

**Implementation Checklist**

- Kontroller at alle fire Nåtid-kortene, værkortet og AI-sammendraget er synlige.
- Kontroller at Bruker viser begge handlingene, total sparing, netto økonomisk gevinst, tre logoer, integrasjonsknapp og oppsigelseslenke.
- Kontroller at telefonene oppleves kortere uten at bunnnavigasjonen dekker innhold.
- Kontroller beige testkundeområde og blå footer på desktop og mobil.
- Kontroller konsollen for feil.

final result: blocked

---

# Design QA — Clean: råd, ikoner og fargebytte

- Source visual truth: brukerens to referanseskjermbilder i samtalen.
- Implementation: `http://127.0.0.1:4173/clean`
- Intended viewports: desktop og mobil, med særlig kontroll av rådstelefonen og overgangen til footer.
- Intended state: testkundeområdet blått, footeren beige, råd uten estimat og tre tydelige bunnikoner.
- Automated checks: 42 tester passerer; alle tre ikonfiler og `/clean` svarer med HTTP 200.
- Browser-rendered implementation screenshot: ikke tilgjengelig fordi den innebygde nettleseroverflaten ikke er tilgjengelig.

**Findings**

- [P1] Visuell sammenligning gjenstår
  - Location: `#demo`, `#testkunder` og `.clean-footer`.
  - Evidence: kildebildene er tilgjengelige i samtalen, men ingen innebygd nettleseroverflate er tilgjengelig for å ta etterbildet.
  - Impact: tekstflyt, ikonplassering og fargeovergangen kan ikke godkjennes visuelt i samme viewport ennå.
  - Fix: ta desktop- og mobilskjermbilder med godkjent lokal testnettleser og sammenlign dem mot referansene.

**Implementation Checklist**

- Kontroller at alle tre rådskortene har god luft og ingen beløp til høyre.
- Kontroller at Heroicons-symbolene er sentrert og tydelige i alle tre telefonvisningene.
- Kontroller at testkundeområdet er blått og footeren under er beige på desktop og mobil.
- Kontroller nettleserkonsollen for feil.

final result: blocked
