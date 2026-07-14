# 45 — PROVISIONING (Draft v0.1)

Status: Draft. Jak reálně zřídit a spravovat infrastrukturu.
Region všeho: **europe-west3** (ADR-009).

## 1. Prostředí a projekty

| Projekt (GCP/Firebase) | Účel | Data |
|---|---|---|
| `minuta-dev` | vývoj; většina práce ale běží na **emulátorech** | syntetická |
| `minuta-staging` | integrační a E2E testy, staged release | syntetická |
| `minuta-prod` | produkce | reálná |
| `minuta-moderation-prod` | moderační důkazy a fronta (29, 44) | oddělený svět, vlastní IAM |

- Žádný sdílený zdroj mezi prod a ne-prod. Staging je konfiguračně
  identický s prod (IaC, §2), jen s nižšími kvótami a budgetem.
- Lokální vývoj: **Firebase Emulator Suite** (Auth, Firestore ×2, Functions,
  Storage) — zdarma, offline, Rules testy (36 §5) běží proti emulátoru v CI.

## 2. Infrastructure as Code

- **Terraform** (provider `google` + `google-beta`): projekty, IAM, obě
  Firestore databáze (`meta`, `ephemeral`), TTL politiky, budget +
  alerty (32 §3), Storage bucket, Secret Manager, log retention (35 §4).
- **firebase.json + .firebaserc**: hosting, Rules soubory, Functions,
  emulátory. Rules jsou kód v repu (36).
- Zásada: **klikání v konzoli = drift = zakázáno** v prod; vše přes PR
  (review zachytí i pokus zapnout PITR na `ephemeral` — ADR-007).
- Stav Terraformu v GCS bucketu s verzováním; apply jen z CI.

## 3. IAM (nejmenší oprávnění)

| Identita | Role |
|---|---|
| CI deploy SA | jen deploy Functions/Hosting/Rules do daného projektu |
| Functions runtime SA | jen Firestore/Storage v rámci projektu; bez adminu |
| Moderační konzole SA | jen `minuta-moderation-prod` + vyhrazené Admin API |
| Lidé | žádný trvalý přístup do prod dat; break-glass dle 44 §1 |

## 4. Konfigurace kritických vlastností (checklist zřízení)

- [ ] Firestore `ephemeral`: **PITR OFF, backupy OFF** (ADR-007) — ověřit!
- [ ] Firestore `meta`: denní backup ON, test obnovy naplánován (20)
- [ ] TTL politiky na `expireAt` (messages, spaces, invites) — 34 §3
- [ ] Budget 5 €/měs + alerty 50/80/100 % + auto-reakce (32 §3)
- [ ] Auth: povolené metody (magic link, Google, Apple, anonymní) — 07
- [ ] Odesílací doména `auth.minuta.app`: SPF/DKIM/DMARC (07)
- [ ] App Check / reCAPTCHA Enterprise pro API (27)
- [ ] Cloud Armor / rate limity na Functions (03)
- [ ] Log retention 30 d, žádné IP kde lze (35 §4)
- [ ] Expiry canary účty + scheduler (20)
- [ ] Status page monitor mimo GCP (20)
- [ ] security.txt + VDP kontakt (20)

## 5. Deployment checklist (každý release)

- [ ] CI zelené: lint, typecheck, unit, Rules testy, E2E (21)
- [ ] Staging soak ≥ 24 h bez SEV
- [ ] Staged rollout 10 % → 100 % (20 §Release)
- [ ] `minSupportedVersion` beze změny, pokud release neopravuje
      bezpečnost (jinak proces force update, 20)
- [ ] Rollback plán potvrzen (Functions revize, Hosting verze)
- [ ] Změny Rules/klíčů/retence → security review + čtyři oči (31 §9)

## 6. Budoucí kapitoly

- Konkrétní Terraform moduly (repo `infra/`)
- Multi-region plán (Fáze 3, 05)
- Disaster recovery runbook (35 §7)
