# infra/ — infrastruktura a Rules

## Co tu je

- `firestore.meta.rules` — Rules pro databázi `meta` (users, devices, prekeys, contacts).
- `firestore.ephemeral.rules` — Rules pro databázi `ephemeral` (řez 1: default deny).

## Emulátor vs. produkce (důležité mapování)

Vývoj běží **výhradně proti Firebase Emulator Suite** (45 §1), projekt
`demo-minuta` (prefix `demo-` = firebase-tools nikdy nesáhne na reálný projekt).

| Logická DB (ADR-007) | Emulátor (řez 1) | Produkce (TODO) |
|---|---|---|
| `meta` | `(default)` | pojmenovaná DB `meta` |
| `ephemeral` | zatím neexistuje | pojmenovaná DB `ephemeral` |

Firestore emulátor (firebase-tools 14.27) **nepodporuje více databází** —
řez 1 potřebuje jen `meta`, mapovanou na `(default)`. Klient bere instance
z jednoho místa (`app/src/lib/firebase.ts`).

**Řešení pro testy (řez 3):** každý soubor emulátorových testů si nahraje
svoje Rules přes `initializeTestEnvironment` (per-DB soubory zůstávají
oddělené, kolekce obou DB nekolidují) — testy proto běží sériově
(`fileParallelism: false`). Deploy do prod je vždy na dvě pojmenované DB.

**TODO(řez 4):** pro `vite dev` proti emulátoru bude potřeba kombinovaný
dev soubor Rules (sjednocení meta+ephemeral; kolekce nekolidují), nebo
do té doby multi-DB podpora emulátoru.

## TODO před zřízením reálných prostředí (45)

- [ ] Terraform: projekty `minuta-dev|staging|prod`, region **europe-west3** (ADR-009).
- [ ] Dvě Firestore DB `meta` + `ephemeral`; upravit mapování `meta` z `(default)`.
- [ ] `ephemeral`: **PITR OFF, backupy OFF** — ověřit! (ADR-007; zapnutí = incident, 30).
- [ ] `meta`: denní backup ON + test obnovy (20).
- [ ] TTL politiky na `expireAt` (messages, spaces, invites) — 34 §3.
- [ ] Budget 5 €/měs + alerty 50/80/100 % (32 §3).
- [ ] Auth metody: magic link, Google, Apple, anonymní (07); doména `auth.minuta.app` + SPF/DKIM/DMARC.
- [ ] App Check, Cloud Armor / rate limity, log retention 30 d bez IP (03, 35 §4).
