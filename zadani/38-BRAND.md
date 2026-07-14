# 38 — BRAND (Draft v0.1)

Status: Draft — kreativní brief pro finální vizuální identitu.
Vazby: 28-UX (tón), 12 (logo v QR).

## 1. Jméno a příběh

**Minuta.** České slovo, mezinárodně čitelné (minute/Minute/minuta).
Slib je ve jméně: *tady věci žijí minutu*. Značka nikdy neslibuje víc,
než umí technika (26 §marketing).

## 2. Koncept loga

Doporučený směr: **kruhový odpočet** — kružnice s výsečí, která „dohořívá"
(zároveň minutová ručička ciferníku). Jeden tvar funguje jako:

- ikona aplikace a favicon,
- střed QR pozvánky (12 — jednoduchý, kontrastní, čitelný i v 20 % plochy),
- UI prvek: tentýž prstenec je odpočet u zprávy (28) — logo = produkt.

Alternativní směry k prozkoumání designérem: přesýpací hodiny z teček
(rozpad na částice); písmeno M s výsečí. Zamítnuté směry: plamen (dramatizace),
duch/inkognito klišé, štít (bezpečnostní kýč), cokoli „špionážního" (28 tón).

## 3. Barvy a typografie (výchozí, ověřit s designérem)

- Základ: téměř černá `#111` / bílá `#FAFAFA` (dark/light mode, 14).
- Akcent „žhavá" barva odpočtu: oranžovočervená (např. `#FF4D2E`) — jen
  pro odpočet a kritické akce; nikdy pro dekoraci.
- Typografie: čitelný humanistický sans (systémové fonty v MVP — nulové
  náklady, výkon PWA; brandový font až V2+).
- Kontrast dle WCAG AA minimálně (28 §Přístupnost).

## 4. Tón značky

Klidný, věcný, lidský (28). Mluvíme o čase, ne o strachu: „žije ještě 0:32",
„tady se nearchivuje". Nikdy: strašení sledováním, spy-estetika, hype.

## 5. Co dodat před V1 (checklist pro designéra)

- [ ] Logo (SVG, monochrom + akcent; test v QR dle 12 §vizuální specifikace)
- [ ] Ikony aplikace (PWA maskable, Android adaptive, iOS)
- [ ] Základní design tokens (barvy, typografie, spacing) pro 28
- [ ] OG obrázek a mikroweb (17)
- [ ] Šablona QR pozvánky (obrazovka / export / tisk)
