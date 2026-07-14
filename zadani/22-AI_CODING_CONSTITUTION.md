
# 22 — AI_CODING_CONSTITUTION (Draft v0.1)

Status: Draft

## Účel

Stanovit závazná pravidla pro AI asistenty podílející se na vývoji.

## Základní pravidla

1. Nenavrhovat vlastní kryptografické algoritmy.
2. Nepřidávat sledování uživatelů bez výslovného požadavku.
3. Zachovávat Privacy by Design.
4. Zachovávat Zero-Knowledge architekturu.
5. Nepřistupovat k otevřenému obsahu zpráv na serveru.

## Povinnosti AI

- vysvětlit architektonická rozhodnutí,
- navrhovat testy,
- psát čitelný kód,
- respektovat existující ADR.

## Zakázané změny

- ukládání dešifrovaného obsahu,
- obcházení autentizace,
- vypínání bezpečnostních kontrol,
- používání neauditovaných kryptografických knihoven.

## Definition of Done

Každá funkce musí mít:
- dokumentaci,
- testy,
- bezpečnostní kontrolu,
- soubory ≤ 300 řádků, jeden účel na soubor (31-CODING_STANDARDS),
- aktualizované ADR (je-li potřeba).

## Token ekonomika výroby a náklady provozu

- Kód se vyrábí po malých, izolovaných jednotkách kvůli levným a spolehlivým
  úpravám AI → viz [31-CODING_STANDARDS.md](31-CODING_STANDARDS.md).
- Provoz je navržen na bezplatné limity a nulový účet → viz
  [32-COST_MODEL.md](32-COST_MODEL.md).

## Budoucí kapitoly

Rozpracováno v [31-CODING_STANDARDS.md](31-CODING_STANDARDS.md):

- Coding Style — 31 §2–§3
- Naming Convention — 31 §4
- Pull Request Checklist — 31 §8
- Security Review Checklist — 31 §9
- AI Prompt Templates — 31 (budoucí)
