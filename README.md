# Scope

Scope-nettsiden og det interne admin-kontrollrommet.

## Kjør lokalt

Prosjektet krever Node.js 20 eller nyere og har ingen tredjepartsavhengigheter.

```bash
npm start
```

Åpne deretter `http://127.0.0.1:4173/admin`. Ved første oppstart opprettes en administrator. Et tilfeldig engangspassord lagres med filrettighet `0600` i `.scope-admin-data/bootstrap-credentials.txt` og slettes etter første vellykkede innlogging.

### Test på mobil

For å åpne siden på en mobil på samme Wi-Fi-nettverk, start den LAN-tilgjengelige utviklingsserveren:

```bash
npm run dev:mobile
```

Finn Mac-ens lokale IP-adresse med `ipconfig getifaddr en0`, og åpne deretter `http://<lokal-ip>:4173` på mobilen, for eksempel `http://192.168.1.42:4173`. Bruk dette kun på et betrodd lokalt nettverk: kommandoen eksponerer også den lokale adminserveren for andre enheter på nettverket. Vanlig `npm start` er fortsatt kun tilgjengelig på denne maskinen.

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
- Sett `HOST` og `PORT` etter driftsmiljøets behov. Standard er kun `127.0.0.1:4173`.
- Koble brukerne til virksomhetens identitetsleverandør før produksjonsbruk for sentral rolleforvaltning og håndhevet tofaktorautentisering.
- Behold adminfilene bak Node-serveren. Ikke publiser repoet som en ren statisk mappe.

## Verifisering

```bash
npm test
node --check server.mjs
node --check admin-private/admin.js
```
