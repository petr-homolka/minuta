
# 20 — OPERATIONS (Draft v0.1)

Status: Draft

## Cíl

Definovat provozní standardy služby Minuta.

## Monitoring

- Cloud Monitoring
- Cloud Logging
- Error Reporting
- Crashlytics

## Logování

Logovat pouze technické události.

Nikdy:

- obsah zpráv,
- dešifrované přílohy,
- kryptografické klíče.

## CI/CD

- GitHub
- GitHub Actions
- Automatické testy
- Automatické nasazení
- Rollback

## Incident Management

- Detekce
- Eskalace
- Analýza
- Náprava
- Postmortem

## Zálohování

- Metadata dle retenční politiky
- Pravidelné testy obnovy
- Šifrované zálohy
- Zálohuje se pouze minimální metadata, nikdy obsah zpráv (viz N2 v 25, 26)

## Transparentnost

Veřejné pojistky, které uživatelům umožňují nezávisle sledovat, že se
bezpečnostní model produktu tiše nemění (vazba na 29-MODERATION §4.5 a
30-BLACKMINUTE).

### Transparency report

- Vydáván v pravidelné periodicitě (návrh: pololetně).
- Obsahuje: počet žádostí orgánů veřejné moci, kolika bylo vyhověno, kolik
  napadeno, členění dle typu a jurisdikce — vždy bez identifikace osob.
- Součástí je i přehled moderačních akcí dle DSA (agregovaně).
- Vlastník: právní tým + T&S; schválení L4 (29 §1.3).

### Warrant canary

- Pravidelně obnovované, podepsané veřejné prohlášení, že provozovatel
  **nebyl nucen** tajně zavést zadní vrátka, key escrow, skenování obsahu
  ani tichého příjemce (BM-1/BM-2 v 30-BLACKMINUTE).
- Publikováno s pevnou kadencí (návrh: měsíčně) na ověřitelném místě.
- **Absence obnovy je signál** — mizení canary je pro uživatele varování,
  aniž by provozovatel musel porušit případný gag order.
- Proces obnovy a podpisu je dokumentovaný a nezávislý na jednotlivci
  (jinak se stává nevěrohodným); změna či zrušení canary je bezpečnostní
  incident, ne rutinní úprava.

## SLO (závazné cíle)

| SLO | Cíl MVP | Měření |
|---|---|---|
| Dostupnost služby | 99,5 % (Fáze 2: 99,9 %) | Cloud Monitoring |
| Latence doručení obálky | p95 < 2 s | 08 §7, agregovaně (39) |
| Latence otevření zprávy | p95 < 1 s (4G) | dtto |
| Přesnost expirace | 100 % nečitelné ≤ readAt+90 s | 34 §6 |
| Doručení pushe | p95 < 30 s | agregát |

Error budget: 0,5 %/měs; vyčerpání = feature freeze do nápravy.
SLA (smluvní) až s tarify Team (41).

## Incident Management

| Severita | Definice | Reakce | Příklady |
|---|---|---|---|
| SEV1 | bezpečnost/soukromí ohroženo, nebo služba nefunguje | ihned, 24/7 | podezření na únik, obsah čitelný po expiraci, výpadek auth |
| SEV2 | degradace hlavní funkce | < 4 h | latence nad SLO, pushe nechodí |
| SEV3 | dílčí problém | další pracovní den | kosmetika, jeden klient |

Proces: detekce → eskalace → mitigace → analýza → postmortem (blameless,
do 5 dnů, veřejný souhrn u SEV1 dotýkajícího se soukromí). Každé porušení
slibu expirace je automaticky SEV1 + vstup do transparenční zprávy.
On-call: v MVP „best effort" zakladatelů; od Fáze 2 formální rotace.

## Release Management

- Kanály: dev → beta (interní) → produkce; staged rollout (10 % → 100 %).
- Rollback: hosting verze + Functions revize; `ephemeral` data neblokují
  rollback (žijí minuty — výhoda architektury).
- **Force update:** `GET /v1/config` (18) vrací `minSupportedVersion`.
  Starší klient: grace okno s výzvou → poté hard block s vysvětlením
  (bezpečnostní důvod). Kompromitovaná verze: okamžitý hard block
  (kill switch) — změna `minSupportedVersion` podléhá čtyřem očím (29 §1.4).
  PWA se aktualizuje samo (Service Worker); force update řeší hlavně
  nativní klienty a zastaralé instalace PWA.

## Status page

- Veřejná stránka `status.minuta.app` — dostupnost, probíhající incidenty,
  historie; **hostovaná mimo hlavní infrastrukturu** (statický hosting +
  nezávislý externí monitor), aby žila i při výpadku GCP.
- Aktualizace stavu je součást incident procesu (SEV1/SEV2 = povinný zápis).
- Zobrazuje i výsledek expiry canary (níže) jako „Slib expirace: ✓".

## Expiry canary (průběžný důkaz slibu)

Slib „zpráva nežije déle, než říkáme" (34 §6) se nejen měří, ale **průběžně
dokazuje** syntetickým testem v produkci:

1. Kanárčí pár účtů si každých 10 minut pošle a otevře testovací zprávu.
2. V `readAt + 95 s` se ověří, že ciphertext je nečitelný (Rules odmítnou).
3. Po TTL okně se ověří fyzické smazání dokumentu.
4. Výsledky = agregovaný čítač (39) → dashboard Backstage (44 §4.1)
   a status page.

**Selhání = automaticky SEV1** (porušení jádra slibu) + zápis do
transparenční zprávy. Canary účty jsou označené interní, nefigurují
v metrikách používání.

## Bezpečnostní testování provozu

- Penetrační test: před spuštěním V1 (exit kritérium 23) a dále ročně
  + po každé změně kryptografie (33) či Rules (36).
- Audit kryptografie: externí, před V1 (33 podmínka).
- **VDP (responsible disclosure)** od prvního dne: security.txt, kontakt,
  bezpečný přístav pro výzkumníky; placený bug bounty od Fáze 2 (03).

## Budoucí kapitoly

- Capacity Planning · Chaos testy (21) · Multi-region runbooky (05 §10)
