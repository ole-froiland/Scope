# Design QA

## Kilder og visningsmål

- Døgnkart-kilde: `/Users/ole-froiland/.codex/generated_images/01a05d14-4533-7182-b5ec-1f481fb4f275/exec-6b9693c4-f466-4693-bf31-127205587be9.png`
- Signalrom-kilde: `/Users/ole-froiland/.codex/generated_images/01a05d14-4533-7182-b5ec-1f481fb4f275/exec-4aba59dd-1f35-42ed-8f67-0bdfd4531197.png`
- Servicejournal-kilde: `/Users/ole-froiland/.codex/generated_images/01a05d14-4533-7182-b5ec-1f481fb4f275/exec-30c87df7-c537-4fd3-8e68-c2261ddecd7b.png`
- Alle kilder: 1487 × 1058 px.
- Desktop-kontroll: 1487 × 1058 CSS-px ved DPR 1.
- Mobilkontroll: 390 × 844 CSS-px ved DPR 1.

## Sammenligningsbevis

- `output/design-qa/drift-comparison.png` — kilde og implementasjon side om side, 2974 × 1058 px.
- `output/design-qa/signal-comparison.png` — kilde og implementasjon side om side, 2974 × 1058 px.
- `output/design-qa/vertskap-comparison.png` — kilde og implementasjon side om side, 2974 × 1058 px.
- Desktop: `drift-implementation.png`, `signal-implementation.png`, `vertskap-implementation.png`.
- Mobil: `drift-mobile.png`, `signal-mobile.png`, `vertskap-mobile.png`.
- Fullskjermbildene er lesbare nok til å vurdere typografi, regioner, bildeutsnitt, farge og innhold; egne fokusbilder var derfor ikke nødvendig.

## Funn og rettelser

1. Døgnkartet hadde først for stor hero og for mye vertikal luft sammenlignet med kilden (P2). Overskrift, topprom, døgnkart og servicepunkter ble komprimert. Ny sammenligning viser døgnlinje, råd og restaurantbilde i samme synlige hovedkomposisjon som kilden.
2. Servicejournalens hero var først for høy (P2). Høyden ble redusert slik at journalpapiret igjen blir en tydelig del av første skjermbilde, samtidig som mobilutsnittet beholdes.
3. Signalrommet beholder kildens mørke kontrollrom, monospaced typografi, fire datakilder, dokumentarfoto og ett stort handlingsråd. Implementasjonen bruker kildekort som fungerende kontroller i stedet for dekorative signalstreker; informasjonsarkitektur og visuell retning er bevart.
4. Ingen P0-, P1- eller P2-avvik står igjen. Mobilskjermbildene har ingen horisontal scrolling eller tekstkollisjoner.

## Funksjonell kontroll

- Døgnkart: klikk på «Lunsj» oppdaterte rådet til «Åpne uteserveringen 30 minutter tidligere.»
- Signalrom: klikk på «Bemanning» oppdaterte rådet til «Reduser bemanningen med to timer mellom 15 og 17.»
- Servicejournal: «Bla i journalen» byttet historie og sidetall fra 01 til 02.
- Konsoll: ingen `error`-logger på `/drift`, `/signal` eller `/vertskap`.
- Automatiske tester: 111 av 111 bestått.
- Produksjonsbygg: `npm run build:site` bestått, 84 filer pluss assets og `_redirects`.
- JavaScript-syntaks og `git diff --check`: bestått.

final result: passed
