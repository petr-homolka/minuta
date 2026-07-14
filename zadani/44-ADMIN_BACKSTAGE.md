# 44 — ADMIN_BACKSTAGE (Draft v0.1)

Status: Draft. Interní správní konzole („Backstage") — bílé místo, které
neměl ani původní seznam. Vazby: 29 (moderace), 20 (provoz), 36 §4, 30.

> Zásada č. 1: **Backstage nikdy nezobrazuje obsah komunikace** — nemá jak
> (E2EE, 33). Jediná výjimka: důkazy vědomě nahlášené příjemcem (29 §1.1).
> Zásada č. 2: Backstage je servisní chodba, ne jeviště — **žádné 3D**,
> střízlivé tabulkové UI (vědomý kontrast k 43).

## 1. Architektura a přístup

- Samostatná interní webová aplikace na odděleném doménovém jméně;
  **vlastní Firebase/GCP projekt** pro moderační data (29 §1.2, 35 §4) —
  produkční projekt zpřístupněn jen přes vyhrazené Admin API (Cloud
  Functions s IAM), nikdy přímým DB přístupem z konzole.
- Přihlášení: SSO + **povinné passkeys/2FA**; IP allowlist/VPN; krátké relace.
- Přímý přístup do produkční DB (gcloud/konzole GCP) = **break-glass**:
  technicky omezen na SuperAdminy, každé použití automaticky zakládá
  SEV2 incident se zdůvodněním (20).

## 2. Role (least privilege, mapování na 29 §1.3)

| Role | Smí | Nesmí |
|---|---|---|
| Moderator L1 | fronta: triáž, uzavřít neškodné, návrh akce | sankce, důkazy C1 bez L2+ |
| Moderator L2 | sankce (varování/blok/ban) — **návrh**, čeká na druhé oči | konfigurace, billing |
| T&S Lead (L3) | schvalování sankcí, C1 agenda, předání orgánům (návrh) | infra config |
| SupportOps | lookup účtu (metadata), DSR export/smazání (návrh) | moderace, config |
| InfraOps | force update, feature flags, rate limity — návrh | uživatelské akce |
| Finance | entitlementy, refundace (přes MoR, 41) | vše ostatní |
| Auditor | jen čtení všeho + audit log | jakákoli akce |
| SuperAdmin | schvalování druhých očí napříč, break-glass | jednat sám (viz §3) |

## 3. Čtyři oči technicky (29 §1.4)

Každá **závažná akce** (ban, výdej dat, force update, změna rate limitů,
publikace canary, break-glass) existuje v konzoli jen jako pár
`návrh → schválení`: navrhovatel ≠ schvalovatel (vynuceno systémem),
obojí s povinným zdůvodněním, obojí v audit logu. Nesouhlas = eskalace.

## 4. Moduly konzole

### 4.1 Dashboard
SLO panely (20): dostupnost, latence doručení, **přesnost expirace** (34 §6);
náklady vs. free tier / budget (32 §3); agregované metriky (39 — žádný
per-user pohled); stav front (moderace, DSR); stáří warrant canary.

### 4.2 Moderace (29)
Fronta s prioritami C1–C6 a SLA odpočtem (24 rejstřík); detail nahlášení:
důkaz **defaultně rozostřený** (29 §3.1), odkrytí = klik + log; paleta
sankcí s odůvodněním; dvojí schválení; odvolání (DSA tok). Ochranné prvky
moderátora: šedotón, ztlumení, panic pauza, stropy expozice (29 §3).

### 4.3 Účty a podpora
Lookup **jen podle uid/e-mailu** (žádné vyhledávání obsahem — neexistuje);
zobrazí: metadata účtu, zařízení, tarif, sankce, počty (ne obsah, ne graf
kontaktů). Akce: revokace zařízení, reset relací, ban (návrh), DSR export /
smazání účtu (02 — návrh + schválení), obnova po omylném banu.

### 4.4 Konfigurace (runtime)
`minSupportedVersion` (force update / kill switch — 20 §Release, dvojí
schválení, staged); feature flags; rate limity (27); parametry pozvánek;
texty právních dokumentů (verzované, s platností od).

### 4.5 Billing (41)
Stav entitlementů, ruční oprava po výpadku webhooku (návrh+schválení),
refundace odkazem do MoR; **žádná platební data v konzoli**.

### 4.6 Transparentnost a orgány
Registr žádostí orgánů (29 §4.1) se stavem a lhůtami; generátor
transparenční zprávy z agregátů; workflow publikace warrant canary
(20 — podpis, dvojí schválení, alarm při blížící se expiraci).

### 4.7 Audit log
Nezměnitelný (append-only, export mimo projekt): každá akce, každé
odkrytí důkazu, každý lookup účtu — kdo, kdy, co, proč. Auditor role
+ měsíční namátková revize. Manipulace s logem = SEV1.

## 5. Anti-BLACKMINUTE pojistky konzole (30)

- Konzole nemá a nikdy nedostane: čtečku zpráv, dešifrovací nástroj,
  „super-přístup" k účtu, přidání zařízení uživateli (37 §3), per-user
  analytiku (39 §3). Požadavek na takovou funkci = incident, ne ticket.
- Vyhledávání v moderačních důkazech jen v rámci případu (žádný fulltext
  napříč důkazy — prevence funkce „hledej v obsahu").

## 6. Provozní workflow (příklady)

**Force update při zranitelnosti:** InfraOps návrh (verze, zdůvodnění,
rollout %) → SuperAdmin schválení → staged → dashboard sleduje adopci →
postmortem (20). **DSR výmaz:** SupportOps ověří identitu žadatele →
návrh kaskády (35) → schválení → potvrzení žadateli (lhůta 02). **C1
nahlášení:** auto-eskalace L3 + zákonné kroky (29 §2.3) — konzole vede
krok za krokem checklistem, žádná improvizace.

## 7. Budoucí kapitoly

- Detailní wireframy konzole · Onboarding/offboarding adminů (HR proces)
- SIEM napojení audit logu · Automatické anomálie (agregáty, 39 guardrail)
