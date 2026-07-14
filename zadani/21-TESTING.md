
# 21 — TESTING (Draft v0.1)

Status: Draft

## Cíle

Ověřit správnost, bezpečnost, výkon a použitelnost aplikace Minuta.

## Typy testů

### Jednotkové testy
- kryptografické utility
- validace vstupů
- pomocné funkce

### Integrační testy
- Firebase Auth
- Firestore
- Cloud Storage
- Cloud Functions

### End-to-End testy
- registrace
- vytvoření konverzace
- odeslání zprávy
- expirace zprávy
- přidání zařízení

### Bezpečnostní testy
- OWASP MASVS
- penetrační testy
- fuzz testing
- API security

### Výkonnostní testy
- latence
- souběžní uživatelé
- náklady infrastruktury

## Automatizace

- GitHub Actions
- test při každém Pull Requestu
- release pouze po úspěšném testování

## Povinné testy podle kapitol (odkazy)

- Kryptografie: test vektory, property „žádný plaintext po readAt+60",
  fuzz obálek — [33-CRYPTO_PROTOCOL](33-CRYPTO_PROTOCOL.md) §8
- Firestore Rules: emulátorové scénáře — [36-FIRESTORE_RULES](36-FIRESTORE_RULES.md) §5
- Expirace/čas: E2E přesnost okna — [34-TIME_AND_EXPIRY](34-TIME_AND_EXPIRY.md) §6
- QR pozvánka: generuj→dekóduj→ověř URL — [12-MAGIC_LINKS](12-MAGIC_LINKS.md)
- Přístupnost: WCAG 2.2 AA mimo výjimku 2.2.1 — [28-UX](28-UX.md)
- E2E scénáře V1 a exit kritéria — [42-MVP_BLUEPRINT](42-MVP_BLUEPRINT.md) §4

## Budoucí kapitoly

- Chaos Testing · Load Testing · Disaster Recovery Testing
