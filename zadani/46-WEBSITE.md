# 46 — WEBSITE (Draft v0.1)

Status: Draft. Marketingový web (mikroweb) — samostatný od klienta (17).
Živý návrh: artefakt „minuta-web" (HTML, plně statický).

## 1. Cíl a zásady

- Jediný úkol webu: **návštěvník pochopí produkt do 10 sekund a klikne
  „Otevřít Minutu"**. Vše ostatní je podpora důvěry.
- Web ctí produkt: **žádné cookies, žádná analytika třetích stran,
  žádný consent banner** (02 §3) — a říká to nahlas, je to argument.
- Statické HTML/CSS/SVG (hosting zdarma — Cloudflare Pages / Firebase
  Hosting, 32), žádné externí fonty ani skripty. Rychlost = důvěra.
- Poctivost dle 26: web nikdy neslibuje, co technika neumí (analogová
  díra přiznaná přímo ve FAQ).

## 2. Struktura (IA)

1. **Hero:** „Řekni to. Za minutu je to pryč." + živá ukázka bubliny
   s odpočtem (CSS/JS smyčka) + CTA „Otevřít Minutu" / „Co nevidíme".
2. **Trust strip:** Žádná historie · Žádné sledování · Žádná reklama ·
   Servery v EU (Frankfurt).
3. **Jak funguje:** 3 kroky (Pošli odkaz → Pište si → Za minutu popel).
4. **Bezpečí:** 4 karty (E2EE; co server nevidí; dvojité spálení;
   ověřitelnost — canary, transparency report, whitepaper 48).
5. **Spaces:** kanál stálý, obsah prchavý; QR pozvánka; 24 h zdarma / ∞ Plus.
6. **Ceník:** tabulka Free/Plus (zdroj pravdy 41 §6) + „Soukromí se
   neplatí. Nikdy." + referral teaser (41 §5).
7. **FAQ:** 6 otázek vč. poctivé odpovědi na screenshoty.
8. **Footer:** whitepaper, status page, canary, VDP kontakt, jazyk.

## 3. SEO

- `<title>` „Minuta — zprávy, které žijí 60 sekund", meta description,
  OpenGraph/Twitter karty (obrázek generovaný z brandu, 38).
- JSON-LD: `SoftwareApplication` + `FAQPage`.
- Klíčová témata: mizející zprávy, šifrovaný messenger, soukromá
  komunikace, alternativa bez sledování. Jeden H1, sémantické sekce.
- hreflang cs/en (V1 obou jazyků, 28 §Lokalizace).

## 4. Tón textů

Klidný, sebevědomý, nulová dramatizace (38): mluvíme o čase a kontrole,
ne o strachu. Krátké věty. Čísla konkrétní (60 s, 24 h, 0 reklam).

## 5. Budoucí kapitoly

- EN verze textů · OG obrázky · Press kit · Blog (changelog + bezpečnostní
  poznámky) · A/B textace hero (jen agregovaně, 39)
