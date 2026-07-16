# 27 — TRUST_SAFETY (Draft v0.1)

Status: Draft (nová kapitola dle návrhu N8 v 25-IMPROVEMENTS)

## Účel

Mizející zprávy jsou přitažlivé i pro zneužití: obtěžování, výhrůžky,
nelegální obsah — „důkaz za minutu zmizí". Bez promyšlené odpovědi je to
riziko pro uživatele (oběti), pro provozovatele (DSA, trestní odpovědnost)
i pro pověst produktu. Tento dokument definuje ochranné mechanismy, které
**nenarušují E2EE ani zero-knowledge architekturu**.

## Principy

1. E2EE se nikdy neprolamuje na serveru. Jediná cesta obsahu k provozovateli
   je vědomé rozhodnutí příjemce (nahlášení).
2. Ochrana oběti má přednost před pohodlím odesílatele.
3. Moderace pracuje s nahlášeními, nikoli s plošným skenováním.

## Nahlášení zprávy

- Příjemce může **běžící (živou) zprávu nahlásit** přímo z konverzace.
- Klient se souhlasem nahlašujícího přiloží **dešifrovaný obsah zprávy**
  a nezbytný kontext (odesílatel, čas) jako důkaz. Odesláním nahlášení se
  u nahlašujícího zpráva spálí standardně; kopie důkazu putuje do fronty moderace.
- Nahlášený důkaz je uložen šifrovaně pro tým moderace, s vlastní retencí
  (např. 90 dní nebo dle zákonné povinnosti) a auditem přístupů.
- Odesílatel se o nahlášení nedozví (ochrana oběti).

## Blokování

- Blokace uživatele: žádné další zprávy, žádné nové konverzace, žádná
  notifikace blokovanému.
- Blokace funguje i vůči anonymním účtům (blokuje se účet i zařízení).

## Omezení anonymních účtů (vazba na N4) — REVIDOVÁNO (ADR-013)

- **Anonymní účet smí zakládat konverzace i pozvánky stejně jako plný
  účet.** Původní omezení (anonym jen odpovídá) je zrušeno: e-mailová
  brána je slabá zábrana (throwaway e-mail obchází motivovaného útočníka)
  a přitom odrazuje privacy-first cílovku. Skutečné riziko — hromadné
  automatizované generování odkazů coby doručovací nástroj phishingu
  jinde — řeší **App Check + rate limity per zařízení/IP**, ne e-mail.
- E-mail je **volitelný** upgrade (obnova identity, nalezitelnost
  Známými, 40), nikdy podmínka pro použití.
- Přiznaná mez (26): bez trvalé identity je ban-evasion triviální;
  proti tomu stojí App Check, rate limity a report/block, ne víc.

## Rate limiting a anti-spam

- Limity: počet nových konverzací / magic linků za hodinu a den,
  počet zpráv za minutu, počet příjemců.
- Progresivní zpřísnění pro čerstvé účty.
- Detekce vzorců zneužití pouze nad metadaty (frekvence, graf kontaktů
  se nesestavuje — jen lokální čítače), nikdy nad obsahem.

## Soulad s DSA (vazba na 02-LEGAL)

- Jednotné kontaktní místo pro orgány i uživatele.
- Mechanismus oznámení a rozhodnutí (notice & action) s odůvodněním.
- Transparentní zpráva o moderaci v zákonné periodicitě.
- Postup pro zákonné žádosti: vydat lze pouze existující minimální metadata;
  obsah provozovatel nemá (viz 26-THREAT_MODEL).

## Co záměrně neděláme

Tři odmítnuté techniky. Podrobně rozpracované (jako anti-specifikace „temného
zrcadla" produktu) v [30-BLACKMINUTE.md](30-BLACKMINUTE.md):

- **BM-1** Plošné skenování obsahu (client-side scanning) — v rozporu s vizí produktu.
- **BM-2** Zadní vrátka do šifrování v jakékoli podobě.
- **BM-3** Trvalé uchovávání metadat „pro jistotu".

## Budoucí kapitoly

Rozpracovány v [29-MODERATION.md](29-MODERATION.md):

- Moderační proces a nástroje (fronta, eskalace, čtyři oči) — 29 §1
- Kategorie závadného obsahu a SLA reakcí — 29 §2
- Ochrana moderátorů — 29 §3
- Spolupráce s orgány (playbook) — 29 §4
- Age gating / ochrana nezletilých — 29 §5
