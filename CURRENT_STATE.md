# MINUTA — Aktuální stav projektu

Aktualizováno: 2026-07-14

## Fáze

**Specifikace hotová, implementace nezačala.** Žádný kód zatím neexistuje.

## Co existuje

- **Zadávací dokumentace:** `zadani/00-INDEX.md` → 45 kapitol (00–44),
  od vize po správní konzoli. Vstupní bod pro vývoj: `zadani/42-MVP_BLUEPRINT.md`.
- **Interaktivní dema (artefakty):**
  - Klient „Sklo a čas" (9 obrazovek, reakce, SendButton): https://claude.ai/code/artifact/9fa96812-653b-4917-ae7c-ed45b5b44b9d
  - Backstage konzole: https://claude.ai/code/artifact/c332b37b-3ed0-4595-a88f-1246520effb3
  - Marketingový web (46): https://claude.ai/code/artifact/77c44b41-0f8a-4da6-85eb-9f2c7e631ca5
  - Zdrojové HTML žije jen ve scratchpadu session — při další práci
    případně zkopírovat do repa (`design/`).

## Klíčová rozhodnutí (ADR index v zadani/24-APPENDIX.md)

Firebase/GCP · libsodium protokol s verzovanou obálkou (ADR-002) ·
PWA první · žádná historie, obsah jen v RAM (ADR-005) · vše je Space,
1:1 = duo (ADR-006) · dvě Firestore databáze, `ephemeral` bez záloh
(ADR-007) · čas výhradně serverový (ADR-008) · free Space 24 h,
placený neomezeně · zpráva 60 s vždy a všude.

## Další kroky

1. ~~Bílá místa~~ — vyřešeno (kapitoly 45–48, ADR-009 europe-west3,
   kompatibilitní matice ve 14, status page + expiry canary ve 20,
   referral a ceník ve 41, reakce a odkazy v 09).
2. Implementační plán řezu 1 (skelet + Auth) dle 42 §3.
3. Založit git repozitář (zadani/ + budoucí kód + design/ z artefaktů).

## Konvence

Deprecated soubory (07-AUTH, 11-GROUPS, INDEX) jsou jen odkazy — lze smazat.
