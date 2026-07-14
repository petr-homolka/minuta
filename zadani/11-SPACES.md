# 11 — SPACES (Draft v0.2, nahrazuje 11-GROUPS)

Status: Draft

## Koncept

**Space** (místnost) je trvale otevřený kanál pro dva a více účastníků.
Klíčová rovnice produktu:

> **Kanál je stálý, obsah prchavý.** Space může žít hodiny i navždy,
> ale každá zpráva v něm žije 60 sekund od otevření (N1) — bez výjimky,
> v jakémkoli tarifu.

### Sjednocení: vše je Space

Návrh: 1:1 konverzace je jen Space se dvěma členy. Jeden datový model,
jeden mechanismus pozvánek (magic link / QR, viz 12), jedna šifrovací
logika. Zjednodušuje kód (31), datový model (06) i UX (28).
Zapsat jako ADR-006.

## Životnost Space

| Tarif | Životnost | Poznámka |
|---|---|---|
| Zdarma | **24 hodin** od vytvoření | jednorázová místnost: schůzka, párty, událost |
| Placený (N10) | prodloužení až **neomezeno** | trvalý kanál — tým, rodina, komunita |

- Životnost volí zakladatel při vytvoření (v rámci svého tarifu) a může ji
  zkrátit kdykoli; prodloužit jen v rámci tarifu.
- Po vypršení Space **vyhoří**: členství a metadata jsou smazána (retence
  dle 06), členům se zobrazí „Space vyhořel". Živé zprávy dohoří standardně.
- Owner může Space **spálit předčasně** (jedno z gest „spálit vše", N7).
- Default 24 h je konzistentní s TTL nepřečtených zpráv (N3) — nic ve
  free tarifu nepřežívá déle než den. **(Rozhodnuto: 24 h zdarma,
  neomezená životnost v placeném tarifu.)**

## Vstup do Space

- **Výhradně pozvánkou**: magic link nebo jeho QR podoba (12).
  Žádné vyhledávání, žádný adresář, žádné „doporučené místnosti" —
  záměrně (soukromí + ochrana nezletilých, 29 §5).
- Parametry pozvánky (dle 12): platnost, max. počet použití, volitelné
  heslo, jednorázovost.
- Příjemce bez účtu vstoupí anonymně (N4, omezení dle 27).
- Členství trvá po dobu života Space (nebo do odchodu/odebrání).

## Role

- **Owner** — zakladatel; spravuje životnost, pozvánky, adminy; může Space spálit.
- **Admin** — odebírá členy, ruší pozvánky.
- **Member** — píše a čte.

## Kryptografie (vazba na 04, N5)

- Skupinový klíč distribuovaný člensky (sender-keys model v MVP éře
  libsodium; MLS jako cílový stav pro velké Spaces — ADR-002).
- **Přidání i odebrání člena = rotace skupinového klíče.**
- Odebraný člen nedešifruje budoucí zprávy (rotace).
- Nový člen nevidí historii — v Minutě triviálně splněno: **historie
  neexistuje** (N2). Požadavek z původního 11-GROUPS tím odpadá.

## Limity (náklady 32 + anti-abuse 27)

| Parametr | Zdarma | Placený |
|---|---|---|
| Max. členů | 16 | vyšší (dle tarifu, strop dle výkonu rotace klíčů) |
| Aktivních Spaces na účet | 3 | vyšší |
| Pozvánek za den | dle rate limitů 27 | vyšší |

Nákladová poznámka (32): zpráva ve Space = 1 zápis, ale **N čtení**
(každý člen). Listener guardraily z 32 §4 jsou tu kritické; velikost
Space je přirozený nákladový i výkonový strop.

## Metadata (06)

- spaceId, createdAt, expiresAt, ownerId, memberCount, tarifní příznak.
- Žádný trvalý graf členství po vyhoření Space (BM-3).

## Trust & Safety (27, 29)

- Nahlásit/zablokovat funguje uvnitř Space stejně (2 kroky od zprávy).
- Owner/Admin mají navíc „odebrat a zablokovat pro Space".
- Revokace pozvánky okamžitě zneplatní link i QR.

## Budoucí kapitoly

- Výkon rotace klíčů pro velké Spaces (MLS)
- Pozvánky s rolí (pozvat rovnou jako admin)
- Komunitní Spaces (moderované, V4+)
- Migrace 1:1 konverzace → Space (přizvání třetího)
