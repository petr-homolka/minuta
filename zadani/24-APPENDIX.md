
# 24 — APPENDIX (Draft v0.1)

Status: Draft

## Slovník pojmů

ADR
: Architecture Decision Record

E2EE
: End-to-End Encryption

PFS
: Perfect Forward Secrecy

TTL
: Time To Live

## Rejstřík kategorií obsahu a SLA

Jednotný referenční přehled pro Trust & Safety. Zdroj pravdy a detaily:
[29-MODERATION.md](29-MODERATION.md) §2. Zde pouze rychlá tabulka k odkazování.

| Kód | Kategorie | Priorita | SLA reakce | SLA rozhodnutí |
|---|---|---|---|---|
| C1 | Ohrožení života / CSAM / terorismus | kritická | do 1 h (24/7) | do 24 h |
| C2 | Vážná újma (výhrůžky, vydírání, doxxing, stalking) | vysoká | do 4 h | do 48 h |
| C3 | Nenávist a obtěžování | střední | do 24 h | do 7 dní |
| C4 | Podvod a spam | střední | do 24 h | do 7 dní |
| C5 | Nezákonný obsah (ostatní) | dle typu | do 72 h | do 14 dní |
| C6 | Porušení podmínek (lehké) | nízká | do 72 h | do 14 dní |

- SLA běží od zařazení do fronty; „reakce" = první rozhodnutí, ne konečné.
- C1 spouští okamžitou eskalaci na L3 a povinné čtvero očí (29 §1.3, §1.4).
- Preventivní omezení účtu lze uložit okamžitě při důvodném podezření.

## Doporučené standardy

- OWASP ASVS
- OWASP MASVS
- OWASP Mobile Top 10
- NIST Cybersecurity Framework
- GDPR
- Digital Services Act

## Doporučené knihovny

- Signal Protocol
- Firebase SDK
- Google Cloud SDK

## ADR index

| ADR | Rozhodnutí | Kde |
|---|---|---|
| ADR-001 | Firebase / Google Cloud jako platforma | 05, 19 |
| ADR-002 | Kryptografie MVP: libsodium konstrukce, verzovaná obálka | 33 |
| ADR-003 | PWA jako první klient (přiznaná rizika) | 05, 26 §limit 4 |
| ADR-004 | Metadata odděleně od obsahu | 05, 35 |
| ADR-005 | Žádná historie — obsah jen v RAM | 25 N2 |
| ADR-006 | Vše je Space (1:1 = duo Space) | 11 |
| ADR-007 | Dvě databáze; `ephemeral` bez PITR/backupů | 35 §1 |
| ADR-008 | Autorita času výhradně serverová | 34 |
| ADR-009 | EU datová rezidence: **europe-west3 (Frankfurt)** pro Firestore, Storage i Functions | 05 §10, 35 |
| ADR-010 | Upřesnění ADR-002: wrap MK = přímo `crypto_box_seal` na SPK/OPK (efemérní klíč uvnitř každého wrapu; obálka v1 nemá samostatné `ephPub`) — nejauditovatelnější varianta „seal-ekvivalentu" z 33 §2 | 33 §2, kód `app/src/lib/crypto/` |

## Budoucí přílohy

- ER diagramy · Sekvenční diagramy · Datové toky
- OpenAPI (18) · Security Checklist (31 §9)
- Deployment Checklist · Incident Playbooks (20)
