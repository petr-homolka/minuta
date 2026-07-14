# MINUTA — Aktuální stav projektu

Aktualizováno: 2026-07-14

## Fáze

**Řez 1 („Skelet + Auth", 42 §3) HOTOV.** Git repozitář založen,
spec commitnuta jako v1.

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
  `tier` z klienta nezapisovatelný. `ephemeral` rules = default deny.
- **Testy:** `npm test` — 7 unit (krypto vektory RFC 8032 + RFC 7748,
  bundle, idb); `npm run test:emu` — 9 integračních (Rules + registrace).
  Lint i typecheck zelené.

## Reálný Firebase projekt (dev)

- `minuta-dev-fb2e6` (alias `dev`), Firestore `(default)` v **europe-west3**,
  Auth: e-mail magic link + anonymní. Plán Spark, žádný billing.
- **Nasazeno na https://minuta-dev-fb2e6.web.app** (`npm run deploy:dev`) —
  ověřeno: anonymní přihlášení + registrace zařízení proti reálné DB.
- Cloud build: `app/.env.devcloud` (veřejné identifikátory, commitnuto);
  bez env vars běží build v DEV proti emulátorům jako dřív.
- Vlastní doména (dev.minuta.cz / minuta.cz) zatím odložena.

## Známé odchylky / TODO

- Firestore emulátor neumí dvě databáze → řez 1 běží jen s `meta` =
  `(default)`; `ephemeral` (ADR-007) se v emulátoru vyřeší v řezu 3 —
  varianty v `infra/README.md`. Produkce = vždy dvě pojmenované DB.
- Service Worker / instalovatelnost PWA: zatím jen manifest, SW až
  v pozdějším řezu (UX pass, řez 9).
- `design/` čeká na zkopírování HTML artefaktů (odkazy níže).
- Bundle ~1,3 MB (Firebase SDK + libsodium) — code-split až při UX passu.

## Interaktivní dema (artefakty ze specifikace)

- Klient „Sklo a čas": https://claude.ai/code/artifact/9fa96812-653b-4917-ae7c-ed45b5b44b9d
- Backstage konzole: https://claude.ai/code/artifact/c332b37b-3ed0-4595-a88f-1246520effb3
- Marketingový web (46): https://claude.ai/code/artifact/77c44b41-0f8a-4da6-85eb-9f2c7e631ca5

## Další krok

**Řez 2 (42 §3): Krypto jádro** — wrap/unwrap MK, obálka s verzí `v:1`,
podpisy, testy s vektory (33 §2, §8). Poté řez 3: data model + Rules
`ephemeral` + emulátorové testy.
