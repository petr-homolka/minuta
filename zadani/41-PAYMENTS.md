# 41 — PAYMENTS (Draft v0.1)

Status: Draft (V4 dle 23; specifikováno předem, protože ovlivňuje datový
model a identitu). Vazby: N10 (25), 11 (trvalé Spaces), 02 §7.

## 1. Tarify (návrh)

| | Free | Plus | Team (V4+) |
|---|---|---|---|
| Život zprávy | 60 s | 60 s + volitelně 5 min / 1 h | dtto |
| Spaces | 3 aktivní, 24 h, 16 členů | více, **trvalé**, více členů | správa členů, více adminů |
| Zařízení | 5 | více | více |
| Přílohy (V2+) | malé obrázky | větší + dokumenty | dtto + vyšší limity |
| Cena | 0 | ~2 €/měs (ověřit trhem) | per seat |

Zásada z N10 nadřazená všemu: **platí se stálost kanálu a kapacita,
nikdy soukromí** — E2EE, 60 s default a všechny ochrany jsou pro všechny.

## 2. Architektura entitlementů

- Zdroj pravdy: **Firebase custom claims** (`tier`, `expiresAt`) — čte je
  backend i Rules; klient je nemůže zapsat (36 §3).
- Platební brána → podepsaný webhook (`/v1/billing/webhook`, 18) →
  nastavení claims + záznam v `meta`. Zánik předplatného → downgrade
  s grace 7 dní; trvalé Spaces nad limit se po grace zmrazí (read-only
  metadata, nové zprávy ne) a po 30 dnech expirují — nikdy tichý výmaz
  bez varování.

## 3. Oddělení platební identity od používání

Platba nesmí deanonymizovat používání:

- Zpracovatel plateb: **Merchant of Record** (Paddle / Lemon Squeezy) —
  řeší DPH/OSS a drží fakturační údaje **u sebe**; Minuta ukládá jen
  `customerId ↔ uid` a tier. Žádná čísla karet (prohibited i architektonicky).
- **Anonymní varianta (ADR k rozhodnutí):** předplacené poukazy à la
  Mullvad — kód koupený mimo účet, uplatněný v aplikaci; vazba platba↔uid
  neexistuje ani u nás, ani u brány. Právní ověření: 02 §7 (AML).
- App Store / Play Billing: povinné pro nativní klienty (V2+), mapování
  na tytéž claims; cena může být vyšší o provizi platformy.

## 4. Zákaznická logika

- Upgrade nabízet v momentě užitku (Space končí za hodinu → „prodluž na
  neomezeno"), nikdy dark patterns; zrušení stejně snadné jako nákup.
- Refundace dle podmínek MoR; downgrade viz §2.

## 5. Referral program „pozvánky za Plus"

Registrovaný uživatel může získat Plus **prací pro růst sítě** — pozvánkami:

- Každý plný účet má pozvánkový rozpočet (default **60**, konfigurovatelné
  v Backstage 44 §4.4 — stejně jako všechny prahy níže).
- **Splněná pozvánka** = pozvaný se registroval a zůstal aktivní
  (návrh: aspoň 3 aktivní dny v prvním týdnu) — brání farmění účtů.
- Úrovně (návrh, ladí se v Backstage):

| Splněných pozvánek | Odměna |
|---:|---|
| 5 | Plus na 1 týden |
| 20 | Plus na 1 měsíc |
| 60 | Plus na 3 měsíce |

- Jen první úroveň vztahu (žádné MLM kaskády); počítání přes agregované
  čítače (39), fraud signály řeší anti-abuse (27). Odměna se připisuje
  jako entitlement (§2) — žádná finanční hodnota, nejde vyplatit.

## 6. Free vs. Plus (uživatelská tabulka)

Zdroj pravdy pro ceník na webu (46) i v aplikaci. Zásada: **platí se
stálost kanálu a kapacita — soukromí a bezpečnost jsou stejné pro všechny.**

| | **Free** | **Plus (~2 €/měs)** |
|---|---|---|
| Zpráva žije 60 s | ✓ | ✓ (+ volitelně 5 min / 1 h) |
| E2EE, zero-knowledge, vše z 26/30 | ✓ | ✓ (identické) |
| Spaces | 3 aktivní · 24 h · 16 členů | více · **trvalé ∞** · více členů |
| Zařízení | 5 | více |
| Reakce emotikony | ✓ | ✓ |
| Přílohy (V2) | malé obrázky | větší + dokumenty + video |
| Podpora | komunitní | přednostní |

## 7. Slevy a akce (bez dark patterns)

- **Promo kódy** (Backstage 44 §4.4): kampaně, partneři, omluvy za incident.
- **Roční předplatné −20 %**; dárkové poukazy (i anonymní, §3).
- **Referral** (§5) jako hlavní „sleva" — Plus si lze vysloužit.
- Sezónní akce max. 2× ročně; žádné falešné odpočty, žádné „jen dnes",
  cena po slevě = skutečná cena. Zrušení vždy na dvě klepnutí.

## 8. Budoucí kapitoly

- Ceny podle trhů/měn · Firemní fakturace (Team) · Metriky konverze
  (jen agregované, 39)
