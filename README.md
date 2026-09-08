# Scope

Scope-nettsiden og det interne admin-kontrollrommet.

## Kjør lokalt

Prosjektet krever Node.js 20 eller nyere og har ingen tredjepartsavhengigheter.

```bash
npm start
```

Åpne deretter `http://127.0.0.1:4180/admin`. Ved første oppstart opprettes en administrator. Et tilfeldig engangspassord lagres med filrettighet `0600` i `.scope-admin-data/bootstrap-credentials.txt` og slettes etter første vellykkede innlogging.

### Test på mobil

For å åpne siden på en mobil på samme Wi-Fi-nettverk, start den LAN-tilgjengelige utviklingsserveren:

```bash
npm run dev:mobile
```

Finn Mac-ens lokale IP-adresse med `ipconfig getifaddr en0`, og åpne deretter `http://<lokal-ip>:4180` på mobilen, for eksempel `http://192.168.1.42:4180`. Bruk dette kun på et betrodd lokalt nettverk: kommandoen eksponerer også den lokale adminserveren for andre enheter på nettverket. Vanlig `npm start` er fortsatt kun tilgjengelig på denne maskinen.

Du kan også angi oppstartsbrukeren eksplisitt uten å legge hemmeligheter i repoet:

```bash
SCOPE_ADMIN_EMAIL='admin@example.no' \
SCOPE_ADMIN_PASSWORD='et-langt-unikt-passord' \
npm start
```

Kunder, henvendelser, historikk og lokale sikkerhetsfiler lagres i `.scope-admin-data/`, som er ignorert av Git. Nye installasjoner starter uten eksempeldata. En eldre lokal tilstand merket som demo blir tømt automatisk ved oppstart.

Chatvinduet på landingssiden lagrer henvendelser direkte gjennom det offentlige, skrivebegrensede endepunktet `POST /api/inquiries`. Kundelister og henvendelser kan bare leses og endres av en innlogget administrator.

Svar lagres som utkast når ingen e-posttjeneste er konfigurert. For å aktivere faktisk sending kan en server-side webhook konfigureres uten å eksponere nøkler i nettleseren:

```bash
SCOPE_EMAIL_WEBHOOK_URL='https://eposttjeneste.example/send' \
SCOPE_EMAIL_WEBHOOK_TOKEN='hemmelig-server-token' \
npm start
```

Webhooken mottar JSON med `to`, `subject`, `text` og `referenceNumber`. Tokenet sendes som Bearer-token fra serveren.

## Produksjon

- Kjør bak HTTPS og sett `NODE_ENV=production`, slik at sesjonscookien alltid får `Secure`.
- Sett `SCOPE_PUBLIC_ORIGIN` til den offentlige HTTPS-adressen for korrekt origin-kontroll bak reverse proxy.
- Sett `HOST` og `PORT` etter driftsmiljøets behov. Standard er kun `127.0.0.1:4180`.
- Koble brukerne til virksomhetens identitetsleverandør før produksjonsbruk for sentral rolleforvaltning og håndhevet tofaktorautentisering.
- Behold adminfilene bak Node-serveren. Ikke publiser repoet som en ren statisk mappe.

## Lokal AI i arbeidsflaten

«Spør Scope» på `/test` bruker en lokal Ollama-modell. Ingen OpenAI-nøkkel,
betalingstjeneste eller betalt reserveleverandør er koblet til. Modellkall går kun
til `127.0.0.1:11434`. Første modellnedlasting krever internett; selve samtalen
kjører lokalt og bruker maskinens minne og prosessor.

```bash
brew install ollama
brew services start ollama
ollama pull qwen3:4b
npm start
```

Åpne `/test` på nytt etter modellnedlastingen. Under spørreboksen vises «Lokal AI»
når modellen er tilgjengelig. Uten modellen virker en enklere regelmotor, tydelig
merket med «begrenset språkforståelse». En ren statisk publisering har bare denne
regelmotoren; modellkall og utlogging krever Node-serveren. For en offentlig
tjeneste må modellen kjøre på servermaskinen, og tilgang og kapasitetsgrenser må
tilpasses kundene. Lokal modellbruk har ingen API-avgift, men serverdrift kan koste.

Eksempler: «Hva var omsetningen i går?», «Sammenlign Hamar og Jessheim», «Åpne
salg», «Bytt til Gjøvik», «Vis siste 4 uker», «Slå på mørk modus», «Logg meg ut».
Modellens handlingsforslag vises med **Utfør** og **Avbryt**. Enkle, entydige
kommandoer utføres direkte uten å vente på språkmodellen. Modellen kan bare velge blant
navigasjon, sted, periode, tema og utlogging; den kan ikke kjøre kode, sende
meldinger, endre kontoer eller slette data. Handlingsforslag gjelder bare den
arbeidskonteksten de ble laget i, og gjenopprettes ikke fra samtalehistorikken.

**Datagrunnlag:** Arbeidsflaten har fortsatt demodata. Assistenten leser de samme
nøkkeltallsberegningene som kortene og teksten i den åpne økonomivisningen. Den
har ikke tilgang til adminregisteret, integrasjonstokens eller virkelige kunders
regnskap. En senere kobling til produksjonsdata må hente og autorisere data på
serveren per kunde; nettleserens demokontekst er ikke en slik autorisasjon.
Samtaler lagres lokalt i nettleseren, som før. De bør ikke inneholde hemmeligheter.

Ollama er en egen systemtjeneste fordi Node-prosjektets eksisterende stack ikke
inneholder en språkmodell. Ingen npm-avhengigheter er lagt til. Standardmodellen
er `qwen3:4b`; `SCOPE_AI_MODEL` kan velge `qwen3:0.6b`, `qwen3:1.7b` eller
`qwen3:8b` når den aktuelle lokale modellen er lastet ned. Skymodeller avvises.

API-formatet følger [Ollamas dokumentasjon](https://docs.ollama.com/api/chat).

## Verifisering

```bash
npm test
node --check server.mjs
node --check admin-private/admin.js
```
