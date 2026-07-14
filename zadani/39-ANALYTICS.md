# 39 — ANALYTICS (Draft v0.1)

Status: Draft. Řeší vnitřní konflikt: KPI z 23 (DAU, retence, latence)
vs. zákaz trvalých metadat a profilování (BM-3, 30).

## 1. Principy

1. **Žádné per-user eventy.** Neexistuje tabulka „uživatel X udělal Y v čase Z".
2. **Jen agregované čítače** (`aggregates` v `meta`, 35 §2), sharded counters.
3. **Žádné third-party analytické SDK** (Google Analytics, Mixpanel…) —
   klient nevolá nikoho třetího (31 §5, CSP ve 14).
4. **k-anonymita:** žádný agregát se nereportuje pod prahem k = 20
   (malé skupiny by identifikovaly jednotlivce).
5. Crash reporting: opt-in, s vyčištěním (žádný obsah, klíče, identifikátory
   konverzací — 33 §7); Crashlytics jen pro nativní klienty a jen opt-in.

## 2. Jak měříme KPI z 23 bez sledování

| KPI | Mechanismus (privacy-safe) |
|---|---|
| DAU/MAU | klient 1× denně inkrementuje denní čítač (lokální flag „dnes už hlášeno"); bez uid. Mírná nepřesnost přijatelná. |
| Retence | hrubé kohorty: při denním hlášení klient přidá věkové pásmo účtu (D1/D7/D30/…), nic víc. |
| Latence doručení | klient měří lokálně, hlásí jen zaokrouhlené pásmo (percentilové bucket čítače). |
| Dostupnost | serverová metrika (Cloud Monitoring, 20) — bez uživatelů. |
| Náklad/uživatel | billing export / MAU čítač (32). |
| SLO expirace (34 §6) | agregovaný čítač porušení z úklidové funkce. |

## 3. Co záměrně neměříme

Funnel jednotlivce, grafy kontaktů, četnost zpráv per účet (mimo anti-abuse
čítače s krátkým TTL, 27), čas čtení, polohu, fingerprinting zařízení.
A/B testy jen s agregovanými čítači variant (přiřazení varianty lokálně).

## 4. Guardrail

Každá nová metrika projde testem: „Jde z ní zrekonstruovat chování
jednotlivce?" Ano → nezavádí se (nebo agregovat/zhrubit, k ≥ 20).
Zavedení per-user eventů = varovný signál BM-3 (30).
