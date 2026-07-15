# MINUTA — Aktuální stav projektu

Aktualizováno: 2026-07-14

## Fáze

**Řezy 1–4 (42 §3) HOTOVY:** Skelet + Auth · Krypto jádro · Data model
+ Rules `ephemeral` · **1:1 zpráva end-to-end**.
Repo: https://github.com/petr-homolka/minuta

## Co funguje (ověřeno testy i ručně v prohlížeči)

- **Monorepo:** `app/` (PWA React 18 + TS strict + Vite), `functions/`
  (skelet, europe-west3), `infra/` (Rules), `design/` (zatím TODO), `zadani/`.
- **Emulátory:** Auth + Firestore + Functions (`npm run emulators`,
  projekt `demo-minuta` — čistě offline). Vyžaduje Javu — pozor, JDK 21
  na tomto stroji padá, funguje Temurin 11 (viz README).
- **Přihlášení (07):** e-mail magic link (v emulátoru odkaz přes
  Emulator UI / REST `.../oobCodes`) i anonymní účet.
- **Registrace zařízení (37 §2, 33 §1):** po přihlášení libsodium
  vygeneruje IK/KX/SPK + 50 OPK; privátní klíče v IndexedDB, veřejný
  bundle v `meta` DB (`users/{uid}/devices/{deviceId}` + `prekeys/*`).
- **Rules `meta` (36 §3):** jen vlastní data; update publikovaných klíčů
  zakázán (BM-2); revokace jen `revoked:true`; prekeys create-only;
  `tier` z klienta nezapisovatelný.
- **Rules `ephemeral` (řez 3, 36 §2 + 34):** default deny; zprávu odešle
  jen člen svým jménem se serverovým časem; otevření = jediný povolený
  update (null→`request.time`, jen příjemcem, jednorázově); payload
  čitelný VÝHRADNĚ v okně `readAt+90 s` (počítáno v Rules — invariant
  42 §5.3); unsend jen odesílatel; spaces/members/invites jen přes CF.
  `expireAt` (TTL pojistka) přes koridor — ADR-011.
- **Krypto jádro (řez 2, 33 §2–3):** `app/src/lib/crypto/` — MK + obsah
  XChaCha20-Poly1305 (AD = kanonická hlavička), wrap MK `crypto_box_seal`
  na SPK (ADR-010), obálka v1 podepsaná IK, `sealMessage`/`openMessage`
  mezi zařízeními, wipe (memzero). OPK cílení až s CF výdejem (řez 4).
- **1:1 zpráva end-to-end (řez 4):** Cloud Functions `createSpace` (duo)
  a `getKeyBundles` (výdej bundlů jen členům Space, 36 §4); klient
  `features/chat/` — odeslání (obálka+payload batch), realtime listener,
  otevření (zámek `readAt`), TOFU známých IK (37 §3, změna = chyba),
  odpočet 60 s kotvený k potvrzení zápisu → wipe. Ověřeno v prohlížeči:
  zpráva doručena, otevřena, dohořela („shořelo").
- **Testy:** `npm test` — 23 unit (vektory RFC 8032, RFC 7748,
  draft-irtf-cfrg-xchacha A.3.1; fuzz obálek; roundtrip 2 zařízení;
  UUID v7); `npm run test:emu` — 20 integračních (Rules meta+ephemeral
  vč. časového gate a collection-group „moje Spaces", registrace,
  E2E duo přes skutečné CF v emulátoru). Lint i typecheck zelené.

## Reálný Firebase projekt (dev)

- `minuta-dev-fb2e6` (alias `dev`), Firestore `(default)` v **europe-west3**,
  Auth: e-mail magic link + anonymní. Plán Spark, žádný billing.
- **Nasazeno na https://minuta-dev-fb2e6.web.app** (`npm run deploy:dev`) —
  ověřeno: anonymní přihlášení + registrace zařízení proti reálné DB.
- Cloud build: `app/.env.devcloud` (veřejné identifikátory, commitnuto);
  bez env vars běží build v DEV proti emulátorům jako dřív.
- Vlastní doména (dev.minuta.cz / minuta.cz) zatím odložena.

## Známé odchylky / TODO

- Firestore emulátor neumí dvě databáze → jednodatabázová prostředí
  (emulátor, minuta-dev) používají **generované kombinované Rules**
  (`npm run rules:dev` → `infra/firestore.dev.rules`); zdroj pravdy jsou
  per-DB soubory. Produkce = vždy dvě pojmenované DB (ADR-007).
- **Cloud Functions nejsou nasazené na minuta-dev** (Spark neumožňuje
  deploy CF; potřeba Blaze) → chat na web.app zatím nefunguje, jen
  lokálně proti emulátorům. Auth + registrace zařízení na webu fungují.
- OPK cílení (jednorázový výdej s `consumed`) až v řezu 5 s CF; zatím SPK.
- Offline outbox (08 §2) zatím není; UI banner key change (37 §3) — teď
  tvrdá chyba; multi-device otevření „otevřeno jinde" jen hrubě.
- Service Worker / instalovatelnost PWA: až UX pass (řez 9).
- `design/` čeká na zkopírování HTML artefaktů (odkazy níže).
- Bundle ~1,4 MB (Firebase SDK + libsodium) — code-split až při UX passu.

## Interaktivní dema (artefakty ze specifikace)

- Klient „Sklo a čas": https://claude.ai/code/artifact/9fa96812-653b-4917-ae7c-ed45b5b44b9d
- Backstage konzole: https://claude.ai/code/artifact/c332b37b-3ed0-4595-a88f-1246520effb3
- Marketingový web (46): https://claude.ai/code/artifact/77c44b41-0f8a-4da6-85eb-9f2c7e631ca5

## Další krok

**Řez 5 (42 §3): Space + pozvánky + QR** — vícečlenný Space, sender keys
+ rotace (33 §4), join přes token/QR (11, 12), jednorázový výdej OPK.
Zvážit: Blaze na minuta-dev kvůli nasazení CF (chat na web.app).
