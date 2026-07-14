# 26 — THREAT_MODEL (Draft v0.1)

Status: Draft (nová kapitola dle návrhu N6 v 25-IMPROVEMENTS)

## Účel

Pojmenovat, před čím Minuta chrání, před čím nechrání, a co z toho plyne
pro architekturu i komunikaci navenek. Rozpracovává sekci Threat Model
z 03-SECURITY.

## Aktéři hrozeb

| Aktér | Motivace | Schopnosti |
|---|---|---|
| Zvědavý provozovatel / insider | přístup k obsahu | plný přístup k serverům, databázi, logům |
| Útočník na infrastrukturu | data, vydírání | kompromitace cloudu, zálohy, snapshoty |
| Síťový útočník (MITM) | odposlech | ovládá síť mezi klientem a serverem |
| Protistrana konverzace | uchovat důkaz | plný přístup ke svému zařízení, druhý telefon |
| Útočník s cizím zařízením | čtení zpráv | ukradený/odemčený telefon, forenzní nástroje |
| Orgán veřejné moci | zákonná žádost | právní nástroje vůči provozovateli |
| Spammer / abuser | šíření obsahu | automatizace, jednorázové účty |

## Co Minuta garantuje (a jak)

| Garance | Mechanismus |
|---|---|
| Provozovatel nemůže běžně číst obsah | E2EE, klíče pouze na zařízeních (04) |
| Obsah je po minutě neobnovitelný na serveru | server TTL + mazání blobu (N3) |
| Obsah je po minutě neobnovitelný v aplikaci | crypto-shredding klíčů, obsah jen v RAM (N2, N3) |
| Únik databáze neodhalí obsah | uložen pouze šifrovaný payload |
| Zákonná žádost nemůže vydat obsah | provozovatel jej nemá (vydat lze jen minimální metadata) |
| MITM nečte ani nemění zprávy | TLS + E2EE + podpisy zpráv |

## Co Minuta negarantuje — přiznané limity

1. **Analogová díra.** Příjemce může obrazovku vyfotit druhým zařízením.
   Žádná technologie to neřeší. Minuta chrání soukromí přenosu a uložení,
   ne před zradou důvěry protistrany.
2. **Screenshoty.** Android: FLAG_SECURE blokuje. iOS: blokovat nelze,
   pouze detekovat (a ne vždy). Web/PWA: nelze blokovat ani detekovat.
   UI musí komunikovat úroveň ochrany dle platformy.
3. **Kompromitované zařízení příjemce.** Malware s přístupem k obrazovce
   nebo paměti čte vše, co čte uživatel. Mimo model ochrany.
4. **Důvěra v doručovaný webový kód (PWA).** Provozovatel (nebo útočník
   s kontrolou nad hostingem) může teoreticky doručit škodlivý JavaScript.
   Mitigace: CSP, subresource integrity kde lze, reprodukovatelné buildy,
   nativní aplikace jako vyšší bezpečnostní tier. Zbytkové riziko přiznat.
5. **Metadata.** Kdo, s kým, kdy a jak často — server z principu vidí
   (minimalizovaně, s krátkou retencí). Minuta není anonymizační síť (Tor).
6. **Dostupnost.** DDoS a výpadky cloudu řeší 03/20, nejsou předmětem E2EE.

## STRIDE přehled (zkráceně)

- **S**poofing: Firebase Auth, podpisy zpráv Ed25519, ověření zařízení.
- **T**ampering: AEAD šifry (integrita), Firestore Rules, validace na serveru.
- **R**epudiation: minimální — popiratelnost je u ephemeral messengeru žádoucí vlastnost.
- **I**nformation disclosure: hlavní osa návrhu, viz garance výše.
- **D**enial of service: rate limiting, Cloud Armor, kvóty.
- **E**levation of privilege: Least Privilege, oddělené služby, audit adminů.

## Pravidlo pro marketing a podmínky použití

Veřejná komunikace smí slibovat pouze to, co je v tabulce garancí.
Limity 1–5 musí být srozumitelně uvedeny v podmínkách použití (02-LEGAL).

## Budoucí kapitoly

- Kompletní STRIDE analýza po komponentách
- Attack trees pro klíčové scénáře
- Hodnocení rizik (likelihood × impact)
- Vazba na penetrační testy (21)
