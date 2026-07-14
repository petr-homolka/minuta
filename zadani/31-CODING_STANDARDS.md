# 31 — CODING_STANDARDS (Draft v0.1)

Status: Draft (rozpracování „Budoucích kapitol" z 22-AI_CODING_CONSTITUTION:
Coding Style, Naming Convention, PR/Security Checklist)

> Cíl této kapitoly je dvojí: (1) kód, který se **levně a spolehlivě vyrábí
> s pomocí AI** (úspora tokenů), a (2) kód, který je **bezpečný a čitelný**.
> Obojí vede ke stejným pravidlům — malé, ohraničené, samostatně
> pochopitelné jednotky.

---

## 1. Proč na velikosti souborů záleží (token ekonomika výroby)

AI asistent pracuje v okně kontextu. Náklad na každou úpravu roste s tím,
kolik musí přečíst, aby změnu udělal bezpečně.

- **Malý, zaměřený soubor** = asistent načte jen jej, ne půl repozitáře.
  Menší kontext → levnější a spolehlivější edit, méně regresí.
- **Velký soubor s mnoha odpovědnostmi** = asistent musí držet v hlavě víc,
  častěji se splete, a každá úprava je dražší (víc tokenů na čtení i zápis).
- **Stabilní rozhraní mezi moduly** = změna zůstane lokální; není nutné
  přečíst a přepsat vzdálené části.

Úspora tokenů při výrobě proto **není v psaní méně kódu**, ale ve struktuře,
kterou lze upravovat po malých, izolovaných kusech.

---

## 2. Tvrdá pravidla (hard rules)

- **Soubor ≤ 300 řádků.** Ideál < 200. Nad 300 = signál, že soubor dělá víc
  věcí → rozdělit. (Výjimky: generovaný kód, lock soubory, datové fixtury —
  ty se needitují ručně.)
- **Funkce ≤ ~40 řádků, jeden účel.** Delší → rozložit.
- **Jeden soubor = jedna odpovědnost.** Jde-li o souboru říct „a taky…",
  patří rozdělení.
- **Cyklomatická složitost funkce nízká** (hlídat lintrem).
- **Modul má jasné veřejné rozhraní** (co exportuje) a skryté vnitřnosti.
  Spotřebitel modulu nemá číst jeho vnitřek, aby ho použil.
- **TypeScript strict** zapnutý; žádné `any` bez odůvodnění.
- **Žádný mrtvý kód, zakomentovaný kód ani `TODO` bez tiketu.**

## 3. Struktura, která šetří kontext

- **Feature-based členění** (podle funkcí, ne podle vrstev): každá funkce
  má vlastní složku s komponentou, logikou, testy a krátkým `README`/mapou.
- **Index/mapa modulu:** krátký komentář nebo README nahoře, který řekne
  „co tu je a kde", aby asistent nemusel číst vše. Mapa < obsah.
- **Konvenční, předvídatelná jména** (viz §4) → asistent najde soubor bez
  hledání napříč repem.
- **Kolokace testů** vedle kódu (`x.ts` + `x.test.ts`).
- **Barely-there sdílený stav.** Komunikace přes rozhraní, ne přes globály.

## 4. Naming Convention

- Soubory: `kebab-case.ts`; React komponenty `PascalCase.tsx`.
- Proměnné/funkce: `camelCase`; typy/komponenty `PascalCase`;
  konstanty `UPPER_SNAKE`.
- Jména vyjadřují záměr, ne implementaci (`expiryTimer`, ne `t1`).
- Kryptografické funkce pojmenované jednoznačně a bez zkratek
  (`encryptMessageForDevice`, ne `enc`).
- Booleovské: `is/has/can/should` prefix.
- Žádné české diakritické identifikátory v kódu (jen v UI textech/lokalizaci).

## 5. Jazyk a knihovny

- Klient: TypeScript + React + Vite (14, 17).
- Kryptografie: pouze auditované knihovny dle ADR-002 (25 N5); **nikdy vlastní
  primitivy** (01, 22).
- Preferovat malé, ověřené závislosti; každá nová závislost je rozhodnutí
  (bezpečnost, velikost bundlu, náklad údržby).
- Žádná závislost, která by tahala telemetrii nebo skenování (vazba na
  30-BLACKMINUTE, varovné signály).

## 6. Testy jako součást výroby

- Test je **specifikace i levná verifikace** — asistent podle testu ověří
  změnu bez drahého ručního zkoušení.
- Kryptografické utility a validace vstupů: povinně jednotkové testy (21).
- Kritické toky (expirace, doručení, revokace): E2E testy (21).
- Test píšeme malý a čitelný — platí pro něj stejná pravidla velikosti.

## 7. Definition of Done (rozšiřuje 22)

Funkce je hotová, jen když má:

- [ ] soubory ≤ 300 řádků, jeden účel na soubor,
- [ ] dokumentaci / mapu modulu,
- [ ] testy (unit + kde je třeba E2E),
- [ ] bezpečnostní kontrolu (§9),
- [ ] aktualizovaný ADR, mění-li rozhodnutí,
- [ ] žádný obsah zpráv v logu, žádné klíče v kódu.

## 8. Pull Request Checklist

- [ ] Rozsah PR malý a jedno téma (snadné review i pro AI).
- [ ] Splněna Definition of Done.
- [ ] Lint + typecheck + testy zelené (CI, 20).
- [ ] Žádná nová závislost bez odůvodnění.
- [ ] Nedotýká se klíčů / seznamu zařízení / skenování / retence metadat —
      pokud ano, viz §9 (čtvero očí).

## 9. Security Review Checklist

Povinný u čehokoli, co se dotýká bezpečnostní hranice:

- [ ] Nezavádí ukládání dešifrovaného obsahu (22).
- [ ] Neobchází autentizaci; autorizace ověřena i na serveru (18).
- [ ] Nevypíná bezpečnostní kontroly.
- [ ] Nepřidává skenování obsahu, vrátka ani trvalá metadata
      (BM-1/2/3 v 30-BLACKMINUTE) → jinak **zamítnout**.
- [ ] Změny klíčů / seznamu zařízení / retence: **pravidlo čtyř očí** (29 §1.4).

## 10. Pravidla pro AI asistenta (provozní)

- Před úpravou přečti mapu modulu, ne celý repozitář.
- Když soubor přeroste 300 řádků, navrhni rozdělení, nepokračuj v růstu.
- Nepiš spekulativní kód „do zásoby" (YAGNI) — je to zbytečný token i údržba.
- Vysvětluj architektonická rozhodnutí a odkazuj na ADR (22).
- Nenavrhuj nic z 30-BLACKMINUTE.

## Budoucí kapitoly

- Konkrétní lint/formatter konfigurace (ESLint, Prettier, tsconfig)
- Prompt templates pro opakované úlohy (22)
- Příklady dobře/špatně strukturovaných modulů
