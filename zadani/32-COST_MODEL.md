# 32 — COST_MODEL (Draft v0.1)

Status: Draft (nová kapitola — cíl: co nejlevnější ostrý provoz, ideálně
v rámci bezplatných limitů)

> Cíl: provozovat MVP **fakticky bez měsíčního účtu** a udržet náklad na
> uživatele téměř nulový i při růstu. Klíčová teze: **samotný design produktu
> je nejsilnější nástroj úspory** — ephemeral messenger bez historie je
> nejlevnější možný messenger.
>
> Pozn.: konkrétní číselné limity poskytovatelů se mění. Čísla níže ber jako
> orientační a **ověř aktuální kvóty** před spuštěním. Architektura a
> pojistky (§3–§5) platí bez ohledu na aktuální ceník.

---

## 1. Proč je Minuta z principu levná

Návrhová rozhodnutí z předchozích kapitol mají přímý nákladový dopad:

| Rozhodnutí | Kde | Nákladový efekt |
|---|---|---|
| Žádná historie (N2) | 25 | Databáze neroste; žádný trvalý archiv → skoro nulové úložiště |
| Zpráva žije ~60 s + grace (N1/N3) | 25 | Šifrovaný blob existuje minuty, ne roky → minimální storage |
| Nepřečtené smazáno do 24 h (N3) | 25 | Žádné hromadění „mrtvých" objektů |
| Obsah jen šifrovaný, žádné zálohy obsahu (N2) | 20 | Žádné náklady na backup/restore obsahu |
| Minimální metadata, krátká retence, TTL (BM-3 odmítnut) | 06/30 | Málo zápisů, malý index, žádný trvalý graf |
| Jen text v MVP | 23 | Nulová egress za velké přílohy; malé payloady |
| E2EE na klientovi | 04 | Server nepočítá kryptografii → žádný CPU za šifrování |

**Důsledek:** hlavní nákladové osy běžného messengeru (růst DB, úložiště médií,
egress, výpočet) jsou u Minuty z návrhu potlačené. Nešetříme dodatečně —
je to levné už v základu.

---

## 2. Free-tier strategie (orientačně, ověřit)

| Služba | Použití | Bezplatný rámec | Poznámka |
|---|---|---|---|
| Firebase Authentication | přihlášení, anonymní účty | zdarma pro běžné metody | Magic link, Google, Apple |
| Cloud Firestore | metadata, obálky zpráv | denní allowance čtení/zápisů/mazání + malé úložiště | hlídat počet operací (§4) |
| Cloud Storage | šifrované přílohy (až V2) | malý free objem + egress | v MVP text → skoro nevyužito |
| Cloud Functions / Run | autorizace, úklid, TTL | měsíční free allowance výpočtu | vyžaduje zapnuté billing (viz §3) |
| Firebase Cloud Messaging | push | zdarma | payload bez obsahu (13) |
| Hosting PWA | statická aplikace | free hosting (Firebase Hosting / Cloudflare Pages) | levné i mimo free |

Cílem MVP je **vejít se do měsíčních bezplatných allowance** při stovkách
uživatelů (rozsah V1 dle 23).

---

## 3. „Zdarma" s hvězdičkou — a jak to udržet

- Některé služby (typicky Cloud Functions) dnes vyžadují **zapnuté vyúčtování
  (pay-as-you-go)**, i když mají měsíční bezplatnou porci. „Nulový účet" pak
  znamená **zůstat pod bezplatnou porcí**, ne „bez platební karty".
- **Ověřeno (07/2026):** Firestore **TTL mazání nemá free tier** — vyžaduje
  zapnutý billing (na Blaze se pak účtuje jako běžné delete). Protože N3 na
  TTL stojí a Cloud Functions dnes také vyžadují Blaze plán, je realistický
  cíl MVP: **Blaze plán s útratou $0** (vejít se do bezplatných porcí),
  nikoli čistý Spark bez karty.
- Proto je nutná **tvrdá pojistka nákladů**:
  - **Rozpočtový strop + upozornění** (budget alerts) na malé částce.
  - **Automatická reakce na překročení** (např. funkce, která při dosažení
    limitu omezí drahé operace) — návrh k realizaci.
  - Sledování útraty jako provozní KPI (20).

---

## 4. Nákladové guardraily v kódu a datovém modelu

Firestore se účtuje hlavně za **operace** (čtení/zápis/mazání), ne za velikost.
Proto:

- **Minimalizovat čtení:** klient cachuje; žádné zbytečné re-fetch.
- **Žádní neomezení realtime listeneři:** poslouchat úzce (jen aktivní
  konverzace), odpojovat při odchodu z obrazovky.
- **Batch operace** místo mnoha malých zápisů.
- **Vyhýbat se „hot" dokumentům** (jeden dokument aktualizovaný všemi) —
  rozdělit, aby nevznikal drahý/omezovaný zápisový hotspot.
- **TTL dělá mazání za nás:** expiraci řešit primárně TTL politikou (levné),
  úklidovou funkci nechat jen jako druhou vrstvu (N3), ne jako hlavní smyčku,
  která zbytečně spaluje výpočet.
- **Rate limiting z 27 je i nákladová pojistka** — brání tomu, aby jeden
  účet vygeneroval drahý provoz.

## 5. Co spustí první reálný náklad (a jak mu předejít)

| Spouštěč | Riziko | Prevence |
|---|---|---|
| Přílohy (V2) | úložiště + egress | limity velikosti, krátká retence, komprese na klientu |
| Náhlý růst / viralita (N4) | překročení allowance | budget cap, rate limit, kvóty na účet |
| Zneužití / spam | drahé operace zdarma pro útočníka | anti-abuse (27), omezení anonymních účtů |
| Chybný realtime listener | tisíce čtení | code review guardrail (31 §9), test |
| Push ve velkém | obvykle stále zdarma | payload bez obsahu, dávkování |

## 6. Náklad vs. škálování (vazba na 05 a 23)

- Architektura se mezi V1→V3 zásadně nemění (05 §6), takže **rostou jen
  reálné náklady na skutečné použití**, ne přepisy.
- Placené tarify (N10, V4) mají krýt právě ty osy, které stojí peníze
  (delší okno = delší úložiště; větší přílohy = egress). **Soukromí se nikdy
  neplatí** — je stejné pro všechny.
- Cílový ukazatel: **náklad na aktivního uživatele → k nule** v MVP,
  a předvídatelně nízký při škálování.

## 7. Zásady (shrnutí)

1. Nejlevnější data jsou ta, která neexistují (ephemeralita, žádná historie).
2. Zůstat v bezplatných allowance je designový cíl, ne náhoda.
3. Vždy tvrdý rozpočtový strop + alerty (bez nich „zdarma" neplatí).
4. Šetřit operace, ne jen bajty (Firestore se účtuje za operace).
5. Anti-abuse a nákladová obrana jsou totéž.

## 8. Propočet nákladů podle počtu uživatelů

Stav ceníků: **červenec 2026** (ověřeno; při změně ceníku přepočítat).
Free tier Firestore: 50 000 čtení / 20 000 zápisů / 20 000 mazání **denně**,
1 GiB úložiště, 10 GiB egress měsíčně. Cloud Functions: 2 M vyvolání měsíčně
zdarma. Placené sazby (multi-region, orientačně): čtení $0,06 / zápisy $0,18 /
mazání $0,02 za 100 000 operací; úložiště $0,18/GiB/měsíc.

### 8.1 Předpoklady modelu

- „Průměrný uživatel" = registrovaný; **denně aktivních 40 %** z nich.
- Aktivní uživatel odešle **15 zpráv/den** (a přijme ~15 od ostatních —
  přijaté se nepočítají dvakrát, zprávy počítáme jednou globálně).
- Nákladový profil **jedné zprávy** (text, efektivní návrh dle §4):
  **3 zápisy** (vytvoření, deliveryState, readAt) + **3 čtení** (příjemce
  1×, listener odesílatele 2× při změně stavu) + **1 mazání** (TTL).
- Režie na aktivního uživatele: **~20 čtení/den** (načtení seznamu
  konverzací, přihlášení).
- Notifikace: 1 vyvolání funkce na zprávu; FCM zdarma.
- Úložiště: díky ephemeralitě (N2, N3) žijí zprávy minuty — trvale jen
  metadata účtů (~1 KB/uživatel) → i při 1M uživatelů ~1 GiB, tj. haléře.

### 8.2 Tabulka (operace za den, náklad za měsíc)

| Uživatelé | Aktivní/den | Zpráv/den | Zápisy/den | Čtení/den | Mazání/den | Funkce/měs | **Náklad/měsíc** |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 10 | 4 | 60 | 180 | 260 | 60 | 2 k | **$0** |
| 100 | 40 | 600 | 1,8 k | 2,6 k | 600 | 18 k | **$0** |
| 1 000 | 400 | 6 k | 18 k | 26 k | 6 k | 180 k | **$0** ⚠ hrana free tieru |
| 10 000 | 4 000 | 60 k | 180 k | 260 k | 60 k | 1,8 M | **≈ $13–20** |
| 100 000 | 40 000 | 600 k | 1,8 M | 2,6 M | 600 k | 18 M | **≈ $150–220** |
| 1 000 000 | 400 000 | 6 M | 18 M | 26 M | 6 M | 180 M | **≈ $1 500–2 200** |

Rozpad na 1M uživatelů (dominanty): zápisy ≈ $960/měs, čtení ≈ $460,
funkce ≈ $70–150, mazání ≈ $35, egress ≈ $20–50, úložiště < $1.

### 8.3 Klíčové závěry

1. **Do ~1 000 registrovaných uživatelů je provoz zdarma** (v rámci
   bezplatných porcí na Blaze). Hrana free tieru jsou **zápisy** (18 k z 20 k
   denního limitu) — první metrika k hlídání.
2. **Náklad na uživatele klesá k ~$0,002/měsíc** (desetina haléře) a je
   plochý od 10 k výš — architektura škáluje lineárně, žádné skoky.
3. **Zápisy jsou 60 % nákladů.** Každý ušetřený zápis na zprávu (např.
   sloučení deliveryState+readAt do jednoho update) sníží účet o ~20 %.
   Naopak každá „drobnost" navíc (potvrzení, reakce emoji) náklad zvedá.
4. **Typing indikátor a online presence jsou zakázané v MVP** — zápis na
   každý stisk klávesy by nákladový model zničil (řádově víc operací než
   zprávy samotné). Případné budoucí řešení mimo Firestore (Realtime DB
   presence / WebSocket na Cloud Run), samostatné ADR.
5. Model je citlivý na profil zprávy (±2× při upovídanějších uživatelích);
   guardraily z §4 a rate limity z 27 drží horní mez.
6. Vůči výnosům (N10, V4): už 1 % platících á $2/měs pokrývá provoz
   při 1M uživatelů více než 10×.

## Budoucí kapitoly

- Nastavení budget alertů a automatické reakce na strop
- Srovnání Cloud Functions vs. Cloud Run z hlediska ceny (ADR)
- Alternativy mimo Google Cloud pro snížení vendor lock-inu
- Přepočet po přidání příloh (V2) — egress se stane dominantou
