# 02 — LEGAL (Draft v0.2)

Status: Draft. **Není právní stanovisko — finální verze musí projít revizí
advokáta specializovaného na IT právo.** Tento draft strukturuje, co má
advokát dostat na stůl.

## 1. GDPR

### Právní tituly a mapa dat

| Data (35 §retence) | Titul zpracování | Poznámka |
|---|---|---|
| E-mail, uid | plnění smlouvy (čl. 6/1b) | přihlášení |
| Metadata zpráv/Spaces | plnění smlouvy | minuty–dny, TTL |
| Šifrovaný obsah | zvláštní postavení | provozovatel jej nemůže číst (33) |
| Anti-abuse čítače | oprávněný zájem (6/1f) | krátké TTL, balanční test doložit |
| Agregované metriky | mimo osobní údaje | 39 (k-anonymita) |
| Moderační důkazy | právní povinnost / oprávněný zájem | 29 §1.2 |

### Práva subjektů (DSR)

- **Přístup/přenositelnost:** export = profil + metadata účtu; obsah zpráv
  neexistuje (spálen) nebo je nečitelný provozovateli — odpověď to musí
  vysvětlit srozumitelně.
- **Výmaz:** smazání účtu = okamžitá revokace zařízení, smazání `meta`
  dokumentů, TTL dožene `ephemeral`; lhůty dle 35 §4.
- **Námitka/omezení:** proces přes kontaktní místo (29 §4.1).

### DPIA

E2EE messenger s mizejícími zprávami = systematické zpracování → **DPIA
před spuštěním povinná** (čl. 35). Vstupy: 26-THREAT_MODEL, 35 §4, 39.
Závěr DPIA je exit kritérium V1 (23).

### Privacy by Design doložitelně

Čl. 25 plněn architekturou: minimalizace (35), TTL (34), pseudonymizace
(uid), zákazy (30). DPIA na to odkáže — výhoda: compliance je vlastnost
kódu, ne přílepek.

## 2. Digital Services Act

- Klasifikace: **hostingová služba** (ukládá obsah uživatelů) — ne „online
  platforma" (obsah se nešíří veřejně); potvrdí advokát.
- Povinnosti: kontaktní místo (29 §4.1), notice & action s odůvodněním
  (29 §1), transparenční zpráva (20 §Transparentnost), postup proti
  zneužívajícím oznamovatelům.
- Žádné doporučovací systémy, žádná reklama → příslušné povinnosti odpadají.

## 3. ePrivacy / cookies

Web a PWA: žádné trackovací cookies ani third-party skripty (39 §1) →
**žádný cookie banner není potřeba** (jen technicky nezbytné úložiště).
Udržet jako závazek — banner by byl signál, že se něco pokazilo.

## 4. Podmínky použití (osnova pro advokáta)

Definice služby a 60s mechanismu (vč. limitů — 26 §negarantujeme, N6:
žádný slib „nikdo si to neuloží"); zakázané užití (27); věková hranice
16 let (29 §5); tarify a platby (41); omezení odpovědnosti; ukončení účtu;
rozhodné právo ČR/EU.

## 5. Zásady ochrany osobních údajů (osnova)

Kdo jsme; co ukládáme a na jak dlouho (tabulka z 35 §4 přeložená do
lidštiny); co nevidíme (E2EE); komu co předáme (29 §4.3 — „nemáme co");
práva a kontakt; změny dokumentu.

## 6. Zákonné žádosti

Playbook: 29 §4. Registr žádostí, transparenční zpráva a warrant canary: 20.

## 7. Otevřené právní otázky pro advokáta

1. Potvrzení DSA klasifikace (hosting vs. platforma).
2. Retence moderačních důkazů — kolize GDPR minimalizace × povinnosti (29).
3. Věková hranice a čl. 8 GDPR v cílových jurisdikcích.
4. Anonymní platby (41) × AML povinnosti.
5. Jurisdikce datových center (EU lokalita — 05 §10).
