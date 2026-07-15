# Landingsside-opplevelse: «Scope forteller»

**Dato:** 2026-07-15
**Status:** Godkjent retning — Ole delegerte konseptvalget («gå for din egen greie») etter to visuelle runder i brainstorm-companion.
**Side:** `landing.html` (nås via «Landingsside»-knappen i hovednavigasjonen; testmiljø med frie tøyler).

## Mål

En totalt redesignet landingsside med samme innholdsseksjoner som originalen (hero, slik virker Scope, demo, priser, kontakt/footer), bygget som en prisvinnende, interaktiv scroll-fortelling. Siden skal *lære* besøkeren hva Scope er, og føles som at noen snakker direkte til deg.

## Konsept

En lys, editorial scroll-fortelling med tre bærende elementer:

1. **Fortelleren** — en tekststemme som skriver seg ut og snakker direkte til deg («Hei. Du driver et spisested …»). Norsk, varm, direkte. Grunnleggerne (Ole, Sigurd, Simon) dukker opp med ekte foto og snakkebobler som den menneskelige stemmen på nøkkelpunkter.
2. **Partikkelfeltet (Three.js)** — sidens «sjel»: noen tusen datapunkter på et fast lerret bak innholdet. De morfer mellom former synkront med scroll: kaos → datastrøm → linjegraf → ryddig rutenett → tre fargeklynger (logo-prikkene). Metaforen ER produktet: Scope rydder kaoset ditt til innsikt.
3. **GSAP-regien** — ScrollTrigger driver pinnede scener, tellende tall, maskerte tekstavsløringer og mikrointeraksjoner (magnetiske knapper, egendefinert markørprikk, hover-effekter).

## Visuelt språk

- Lys papirbakgrunn (#fdfdfc), blekk (#16161a), Inter (400–900), stramt sporet display-typografi i store størrelser.
- Merkefargene brukes i små doser: blå #064dff, rød #ff3c38, grønn #00bd7b (fra logo-prikkene).
- Ingen «AI-look»: ingen gradient-hero, ingen glassmorfisme, ingen mørk neon.

## Struktur (speiler originalens seksjoner)

1. **Intro/hero** — kort logo-øyeblikk (prikkene finner plassen sin), fortelleren hilser, «Du kan mat. / Vi kan tall.» i enorm typografi. CTA: «Bli med» (scroller) + «Book demo» (→ index.html).
2. **Slik virker Scope** — pinnet scene med de fire originale stegene (01 Hent data, 02 Analyser, 03 Kvalitetssikre, 04 Få råd). Partikkelfeltet morfer per steg; integrasjonslogoene (assets/logos) ruller som marquee under steg 01.
3. **Demo** — «En helt vanlig torsdag hos Varm Burger AS»: forenklede dashbordkort som bygger seg selv (tall teller opp, søyler vokser, et råd skriver seg ut). Founder-kameo forklarer. CTA: «Utforsk hele demoen» → index.html#demo.
4. **Priser** — originalens tre pakker (Testkunde 0,-, Basic 999,-, Pro 2 499,-) med samme funksjonslister, presentert med scroll-avsløring og hover-mikrointeraksjoner. Månedlig/årlig-toggle beholdes.
5. **Kontakt/footer** — «Vi ser etter testkunder!» med de tre grunnleggerne (foto, vink), Pro-gratis-tilbudet, e-post og lenke tilbake til hovedsiden. Samme metainfo som originalen (SCOPE ANALYTICS AS · 936 372 295 · post@scopeanalytics.no).

Fast mikroheader: logo-prikker + «scope» (→ index.html) og en diskret seksjonsindikator (prikk-rail).

## Teknisk

- **Filer:** `landing.html`, `landing.css`, `landing.js` — helt frittstående; rører ikke `styles.css`/`script.js` eller andre sider.
- **Avhengigheter (CDN, pinnet versjon):** GSAP 3.12 + ScrollTrigger (klassiske script-tags), Three.js 0.160 (ES-modul via importmap). Begrunnelse: eksplisitt bestilt av Ole; ingen build-step.
- **Partikkelfelt:** BufferGeometry med ~4500 punkter (~1800 på mobil), former generert prosedyralt, morf via per-punkt easing mot målposisjoner, DPR-tak 1,75, pauses når fanen er skjult.
- **Fallbacks:** `prefers-reduced-motion` → alt innhold synlig uten animasjon/partikler; uten JS er alt innhold i HTML og lesbart. Pinning kun ≥ 900 px bredde.

## Utenfor scope

- Ingen endringer i eksisterende sider utover det som alt finnes (nav-lenken til landing.html eksisterer).
- Ikke full rebuild av det interaktive dashbordet — demoseksjonen er en fortellende forenkling som lenker til originaldemoen.
- Ingen backend/skjemainnsending; kontakt går via e-post/hovedsiden.

## Verifisering

- `node --input-type=module --check` på `landing.js`; lokal HTTP-server og manuell gjennomgang i nettleser.
- Sjekk: ingen konsollfeil, alle lenker treffer, reduced-motion-modus lesbar, mobilbredde OK.
