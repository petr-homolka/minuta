# 43 — UI_DESIGN (Draft v0.1)

Status: Draft. Vizuální jazyk, obrazovky, vazby a workflow.
28-UX definuje *chování* (stavy, mikrotexty, přístupnost), tento dokument
*podobu a tok*. Brand vstupy: 38. Výkonnostní limity: 14.

---

## 1. Vizuální jazyk: „Sklo a čas"

Estetika: tmavé, klidné prostředí, ve kterém obsah **plave v prostoru**
a viditelně **podléhá času**. 3D není dekorace — vypráví produkt: co je
blíž, to žije; co dohořívá, ustupuje do hloubky a rozpadá se.

### Systém hloubky (4 vrstvy)

| Vrstva | Z-hloubka | Obsah | Efekt |
|---|---|---|---|
| L0 Ambient | pozadí | jemný tmavý gradient, pomalu dýchající světlo | paralaxa gyro/myš ≤ 6 px |
| L1 Obsah | základ | karty zpráv, seznamy | sklo: blur podkladu, 1px světelná hrana |
| L2 Fokus | +vysunutí | otevřená zpráva s odpočtem | scale 1.02, měkký stín, náklon ≤ 4° za kurzorem/gyrem |
| L3 Systém | nejvýš | dialogy, bannery (key change 37) | plné sklo, ostrá hrana |

### Podpisové 3D efekty (všechny s významem)

1. **Otevření obálky** — karta se 3D překlopí (`rotateX`), rub je obsah;
   zlomek „prasknutí pečeti" v haptice (15/16).
2. **TimeRing** — prstenec odpočtu (38) jako plastický torus: conic-gradient
   + vnitřní stín = dojem vyfrézované drážky, která se vyprazdňuje;
   posledních 10 s hrana žhne akcentem `#FF4D2E`.
3. **Shoření** — karta ztratí sklo (blur→0), rozpadne se na ~40 částic,
   které stoupají a hasnou (canvas, 400 ms); zůstane plochý placeholder
   „⌛ shořelo" zapuštěný **pod** L1 (minulost je hlouběji).
4. **QR karta pozvánky** — „holografická vizitka": náklon za prstem/myší,
   odlesk přejíždí přes kód; logo ve středu (12 §vizuální specifikace).
5. **Spálit vše (panic)** — celoplošná vlna: všechny karty se rozpadnou
   současně od středu k okrajům (< 700 ms, bez ohňové dramatizace — 38 tón).
6. **Živé sklo bublin** — bubliny v chatu se chovají jako QR karta:
   jemný náklon za kurzorem/prstem (≤ 6°) a pomalé dýchání (float ±2 px,
   ~7 s, rozfázované). Sklo, které žije; flat mode vše vypíná.
7. **Odeslání** — moje bublina vyjede od kompozéru vzhůru s lehkým
   překmitem (450 ms); příchozí obálka připluje shora. Odeslání je tak
   fyzický akt, ne jen přibytí řádku.
8. **Reakce** — dlouhé podržení bubliny vyvolá lištu 6 emoji nad ní
   (zvětšení na hover); zvolená reakce se usadí jako chip na hraně
   bubliny a **dohoří spolu se zprávou** (09).

### Technika a rozpočty (závazné)

- **Jen CSS 3D transforms + canvas částice.** Žádný WebGL/Three.js v MVP
  (výkon, baterie, velikost bundle — 14). Ambient = CSS gradient animace.
- 60 fps na středním zařízení; animace jen `transform`/`opacity`
  (kompozitor); blur má strop (2 vrstvy současně).
- **Flat mode** (automatický fallback): low-end zařízení, šetřič baterie,
  `prefers-reduced-motion` → bez paralaxy, náklonů a částic; shoření =
  fade 200 ms. Vše funguje i úplně bez animací (přístupnost 28).
- Dark mode je primární (sklo a žhavý akcent); light mode plnohodnotný.

---

## 2. Mapa obrazovek a vazby

```
[A Onboarding] ──login──► [B Domů: Spaces]
                              │ tap Space          │ FAB „+"
                              ▼                    ▼
                        [C Space/chat] ◄──join── [D Nová konverzace]
                          │    │    │              ├─ D1 Známí (40)
                          │    │    └─ C3 Info     ├─ D2 Vytvořit + pozvánka
                          │    └─ C2 Ověření (37)  │      └─ [E QR karta]
                          │                        └─ D3 Skenovat QR
                          ▼                    [F Join preview] ─► C
                        [C1 Zpráva otevřená]
[G Profil & zařízení] ◄─ menu ─ [B]           [H Nastavení]
```

| Obrazovka | Funkce | Vazby na kapitoly |
|---|---|---|
| **A Onboarding** | magic link e-mail; nebo „mám pozvánku" → F | 07, N4 |
| **B Domů** | karty Spaces v prostoru (L1); stav: nová obálka / prázdný / zbývající život Space (mini-ring u 24h Spaces); bez náhledů obsahu | 11, 28 |
| **C Space** | proud živých zpráv (karty), obálky, odpočty; horní lišta: název, členové, mini-ring života Space | 08, 34 |
| **C1 Zpráva** | L2 fokus, TimeRing, po 60 s shoření; dlouhé podržení vlastní: Odvolat/Spálit | N7 |
| **C2 Ověření** | safety code: 12 číslic + sken QR protistrany; výsledek ✓ | 37 §4, 33 §6 |
| **C3 Info Space** | členové (identicon+jméno), role, pozvánky (revokace), život Space, opustit/spálit | 11 |
| **D Nová konverzace** | tři cesty: Známí / vytvořit / skenovat | 40, 12 |
| **E QR karta** | holografická karta, platnost, limity, sdílet/export | 12 |
| **F Join preview** | „Vstupuješ do ,Název' — 5 členů", potvrzení; anonymní vstup | 12 §bezpečnost, N4 |
| **G Profil & zařízení** | identicon, jméno; seznam zařízení, revokace; upgrade anonymního účtu | 37, 07 |
| **H Nastavení** | vzhled (flat mode ručně), quiet hours (13), jazyk, **Spálit vše**, tarif (41), smazat účet (02) | — |

---

## 3. Klíčová workflow (happy path + odbočky)

**W1 — Pozvání (Alice→Bob):** B → D2 (vytvoří Space, nastaví platnost
pozvánky) → E (QR/link, sdílí čímkoli) → Bob: odkaz → F preview → potvrdí →
anonymní účet na pozadí (N4) → C. *Odbočky:* vypršelá pozvánka → 410 obrazovka
s „požádej o novou"; heslo pozvánky → pole ve F.

**W2 — Život zprávy:** C: kompozice → odeslání (karta „letí" do proudu, stav
✓/✓✓) → u příjemce zavřená obálka → tap = 3D překlop (W2 start 34 §2) →
TimeRing 60→0 → shoření na částice → placeholder. Odesílatel vidí zrcadlově:
„čte se ⏱ 0:47" → „shořelo 14:32". *Odbočky:* unsend (jen neotevřená);
výpadek sítě → obálka zůstává zavřená (34 §5).

**W3 — Panic:** H (nebo dlouhé podržení loga na B) → potvrzovací dialog
(L3, výčet dopadu) → celoplošná vlna rozpadu → potvrzení „Vše spáleno".

**W4 — Key change:** C: banner L3 „Klíče Boba se změnily" → C2 ověření
(sken/porovnání) → ✓ ověřeno / ✗ neshoduje se → doporučení nekomunikovat
+ nahlásit. (37 §3)

**W5 — Nahlášení:** dlouhé podržení cizí zprávy → Nahlásit → kategorie
(C1–C6, 24) → souhlas s přiložením obsahu → odesláno (29); volitelně rovnou
blokovat (27). Vždy ≤ 2 kroky od zprávy.

**W6 — Konec Space (free):** 2 h před vyhořením mini-ring Space žhne;
banner „Space vyhoří za 2 h" → [Prodloužit = tarif 41] / [Nechat shořet].
Po vyhoření karta Space odejde stejnou částicovou animací.

---

## 4. Komponentní inventář (design system, vstup pro 28/38)

`SpaceCard` · `MessageCard` (varianty: obálka/otevřená/shořelá/moje) ·
`TimeRing` (velikosti S/M/L — zpráva/Space/ikona) · `IdenticonBadge`
(40, + tečka stavu ověření) · `VerifyBanner` (L3) · `QRCard` · `BurnButton`
(podržení 800 ms, ne tap — proti omylu) · `EmptyState` („Zprávy tu žijí
jen minutu") · `CountdownToast` (30 s/10 s pro AT, 28) · `SendButton` (níže).

### SendButton (odesílací tlačítko)

- Ikona: plná „letka" (paper plane) na ember podkladu — ne tenká šipka;
  musí unést roli hlavní akce obrazovky.
- **Klepnutí = odeslat.**
- **Podržení 6 s = spálení konceptu**: rozepsaný text se smaže, nikam
  neodejde. Během držení se kolem tlačítka plní TimeRing (týž vizuální
  jazyk jako expirace); puštění dřív = zrušeno, nic se nestane. Dokončení
  potvrdí částicový rozpad textu v poli a toast „Koncept spálen".
- Proč 6 s: záměrně dlouhé (vs. 800 ms u BurnButtonu) — maže se jediná
  existující kopie textu a gesto sdílí tlačítko s odesláním; dlouhé
  podržení vylučuje omyl. Přístupnost: totéž nabízí kontextová akce
  „Spálit koncept" (pro AT a motorická omezení, 28).

Vše tokenizované (barvy/hloubka/motion jako design tokens — 38 checklist);
každá komponenta má flat variantu.

## 5. Co 3D záměrně nedělá

Žádné 3D avatary, žádné prostorové „místnosti" (metaverse klišé), žádné
efekty na úkor čitelnosti textu, žádná animace delší než 700 ms, nic, co
nejde vypnout. Sklo a čas, víc ne.
