# 30 — BLACKMINUTE (Draft v0.1)

Status: Draft — **ANTI-SPECIFIKACE / TEMNÉ ZRCADLO**

> ## Co je tento dokument
>
> BLACKMINUTE je **zlé dvojče** Minuty — hypotetická verze produktu, která
> vypadá navenek stejně (stejné UI, stejný slib „zpráva žije minutu"), ale
> uvnitř dělá přesný opak: sleduje, uchovává a prolamuje. **Minuta ji nikdy
> nepostaví.**
>
> Proč to tedy popisujeme podrobně? Ze tří důvodů:
>
> 1. **Threat model.** Přesně tohle by udělal zlý provozovatel, kompromitovaný
>    zaměstnanec nebo my sami pod nátlakem. Kdo nezná útok, nepostaví obranu.
> 2. **Závazek (commitment device).** Když je odmítnutá cesta popsaná černé
>    na bílém — jak by fungovala, proč je lákavá a proč ji odmítáme — je těžší
>    do ní později „nevědomky" sklouznout pod tlakem termínů, zákonů nebo peněz.
> 3. **Detekce vlastního selhání.** Ke každé technice patří „varovné signály",
>    podle kterých tým i uživatelé poznají, že se BLACKMINUTE plíží dovnitř.
>
> **Pravidlo čtení:** žádná sekce tohoto dokumentu není zadání k implementaci.
> Je to popis toho, co je zakázáno, doplněný o obranu. Každá technika má čtyři
> části: *Jak by to fungovalo · Proč je to lákavé · Proč to odmítáme ·
> Obrana a varovné signály.*
>
> Vztah k dokumentaci: rozvádí sekci „Co záměrně neděláme" z 27-TRUST_SAFETY
> a doplňuje 26-THREAT_MODEL o pohled „zevnitř" (hrozba = my sami).

---

## BM-1 — Plošné skenování obsahu (client-side scanning)

### Jak by to fungovalo

Skenování na straně klienta obchází E2EE tím, že čte obsah **v okamžiku, kdy
je ještě otevřený** — na zařízení, před zašifrováním u odesílatele nebo po
dešifrování u příjemce. Server přitom stále vidí jen šifrovaný blob, takže se
dá tvrdit „jsme pořád E2EE".

Typické provedení:

- **Hash-matching:** z každého obrázku se spočítá percepční hash (styl
  PhotoDNA / NeuralHash) a porovná se s databází zakázaných hashů. Shoda →
  klient tiše odešle hlášení (hit) na server.
- **ML klasifikátor na zařízení:** model přímo v aplikaci hodnotí text/obraz
  (nahota, „extremismus", klíčová slova) a při překročení prahu reportuje.
- **Tichý kanál:** hit se posílá zvláštním, nenápadným requestem; UI nic neukáže.
- **Rozšiřitelná databáze:** seznam hashů/pravidel se stahuje ze serveru, takže
  jde kdykoli tiše rozšířit (dnes CSAM, zítra cokoli).

### Proč je to lákavé

- **CSAM a bezpečnost dětí** — nejsilnější morální argument, kterým se skenování
  obhajuje (a kterým se historicky protlačovaly návrhy jako Apple CSAM 2021 nebo
  EU „Chat Control").
- **Regulatorní tlak** — zákonodárci opakovaně chtějí „detekci v E2EE".
- **Zdánlivá bezbolestnost** — „vždyť běží jen na zařízení, my obsah nevidíme".

### Proč to odmítáme

- **Je to dohled bez ohledu na to, kde běží kód.** Když aplikace, kterou uživatel
  považuje za soukromou, hlásí obsah třetí straně, E2EE je fakticky prolomeno —
  jen se posunul bod odposlechu z drátu na zařízení.
- **Nevyhnutelný scope creep.** Jakmile infrastruktura existuje, databázi lze
  tiše rozšířit (politická hesla, disent, whistlebloweři). O rozsahu rozhoduje,
  kdo drží seznam — ne uživatel.
- **Falešná pozitiva ničí životy.** Percepční hashe i ML mají chybovost; hit
  spouští podezření z těch nejhorších činů.
- **Zabíjí produkt.** Minuta prodává „provozovatel nemá jak číst obsah".
  Skenování je pravý opak — byla by to lež v jádru značky.

### Obrana a varovné signály

- **Klient neobsahuje žádný skenovací ani hash-matching kód.** Bod.
- **Reprodukovatelné buildy + zveřejněný zdroj klienta** → nezávisle ověřitelné,
  že aplikace nedělá nic navíc. (Web/PWA: publikované buildy, SRI; nativní:
  reprodukovatelné sestavení, transparentní release.)
- **Žádný „tichý" odchozí kanál:** veškerá odchozí komunikace klienta je
  dokumentovaná a auditovatelná; síťové chování lze zkoumat.
- Varovné signály (BLACKMINUTE se plíží dovnitř): v klientu se objeví
  závislost na ML/hashovací knihovně; nový background upload „telemetrie" obrazu;
  požadavek stahovat „bezpečnostní databázi"; PR mluví o „on-device safety".

---

## BM-2 — Zadní vrátka do šifrování

### Jak by to fungovalo

Zadní vrátka = jakýkoli mechanismus, který dá třetí straně (provozovateli,
orgánu) přístup k obsahu, aniž by o tom účastníci věděli. Varianty:

- **Ghost user / tichý účastník:** server do konverzace nenápadně přidá další
  „zařízení" nebo skrytého příjemce, kterému se zprávy také zašifrují. Klienti
  ho v seznamu zařízení nezobrazí. (Toto je slavný „ghost proposal" GCHQ.)
- **Key escrow:** klient při generování odešle kopii (nebo „recovery" část)
  privátního klíče na server / do úschovy.
- **Oslabená generace klíčů:** záměrně snížená entropie nebo znovupoužité nonce,
  takže obsah lze později dopočítat — vypadá to jako „chyba".
- **Exfiltrace při události:** klient na povel tiše odešle klíče nebo plaintext
  konkrétního účtu (cílený „lawful intercept").

### Proč je to lákavé

- **„Zákonný přístup" (lawful access).** Opakovaný požadavek států: chceme
  E2EE prolomit „jen u zločinců, jen na příkaz".
- **Nátlak a utajení.** Žádost může přijít s gag orderem — zakážou o ní mluvit.
- **Racionalizace:** „bude to použité jen výjimečně a pod kontrolou".

### Proč to odmítáme

- **Vrátka pro jednoho jsou vrátka pro všechny.** Jakmile mechanismus existuje,
  stává se cílem útočníků, insiderů i dalších států. Nelze udělat „bezpečná
  zadní vrátka" — je to protimluv.
- **Ničí jediný slib produktu.** Celá hodnota Minuty stojí na tom, že
  provozovatel obsah nemá. Vrátka tento slib mění v lež.
- **Tiché přidání příjemce/zařízení je útok, ne funkce.** Systém musí být
  navržen tak, aby to nešlo udělat neviditelně.

### Obrana a varovné signály

- **Klíče vznikají a zůstávají jen na zařízeních** (04). Server je nikdy
  nedostane, ani „pro recovery". Žádný escrow.
- **Ověřitelný seznam zařízení / key transparency:** uživatel vidí a může
  ověřit, kolik zařízení a klíčů je v konverzaci; přidání zařízení je viditelná,
  podepsaná událost, ne tichý serverový akt. Změna = varování („do konverzace
  přibylo zařízení"), volitelné bezpečnostní kódy k porovnání (jako Signal
  safety numbers).
- **Otevřená, auditovaná kryptografie** (žádné vlastní primitivy, ADR-002) →
  oslabená generace klíčů je nezávisle odhalitelná.
- **Warrant canary** (viz 29, sekce 4.5): jeho zmizení signalizuje tlak na vrátka.
- Varovné signály: server získá schopnost přidávat zařízení; objeví se
  „recovery klíč" ukládaný mimo zařízení; commit „dočasně vypnout ověření
  seznamu zařízení"; požadavek na „debug" build pro jeden konkrétní účet.

---

## BM-3 — Trvalé uchovávání metadat „pro jistotu"

### Jak by to fungovalo

I bez obsahu jsou metadata mimořádně výmluvná. BLACKMINUTE by je sbíral a
držel navždy:

- **Sociální graf:** kdo s kým komunikuje, kdy, jak často, jak dlouho — trvale
  ukládaný a obohacovaný.
- **Časové vzorce:** přesné časy odeslání/otevření/spálení → denní režim,
  spánek, souběžnost dvou lidí online.
- **Síťová identita:** IP adresy, hrubá geolokace, otisk zařízení, verze,
  operátor.
- **Odvozené profily:** z frekvence a grafu se dá odvodit vztah, hierarchie,
  „kdo je zdroj novináře". (Připomeň si výrok „We kill people based on metadata.")
- **Bez expirace:** vše se drží „kdyby se to hodilo" — pro analytiku, růst,
  budoucí žádosti, monetizaci.

### Proč je to lákavé

- **Analytika a růst:** kohorty, retence, funnel — data-driven produkt.
- **„Bezpečnost":** čím víc historie, tím snazší dohledat zneužití zpětně.
- **Budoucí žádosti orgánů:** „mít to, kdyby přišel příkaz".
- **Monetizace:** metadata jsou zpeněžitelná i bez obsahu.

### Proč to odmítáme

- **Metadata prozrazují intimní pravdu i bez obsahu.** Kdo komu volá v noci,
  kdo mluví s krizovou linkou, kdo s advokátem — to vše je citlivé.
- **Uchovávané = odcizitelné.** Každý trvalý sklad je honeypot pro únik, insider
  útok i nucené vydání. Nejlépe chráněná data jsou ta, která neexistují.
- **Odporuje GDPR i vizi** (minimalizace, účel, retence — 01, 02, 05).

### Obrana a varovné signály

- **Data minimization by design** (05, 06): ukládá se jen to nezbytné pro
  doručení, s krátkou retencí a automatickým TTL mazáním.
- **Žádný trvalý sociální graf:** anti-abuse pracuje s lokálními/agregovanými
  čítači (27), ne s trvalou mapou vztahů.
- **Analytika jen agregovaná a bez identity:** metriky produktu nesmí vyžadovat
  per-user metadatový archiv.
- **Krátká retence IP / síťových dat** nebo jejich neukládání, kde to jde.
- **Zveřejněné retenční lhůty** a jejich audit; transparency report (29).
- Varovné signály: nová „event" kolekce bez TTL; log s `senderId + recipientId
  + timestamp` ukládaný natrvalo; požadavek „vypnout expiraci metadat kvůli
  analytice"; datový tým žádá „celý graf kontaktů"; retenční lhůta se tiše
  prodlužuje.

---

## Shrnutí — jak BLACKMINUTE poznat a zastavit

| Technika | Jednořádková podstata | Nejsilnější obrana |
|---|---|---|
| BM-1 Skenování | čtení obsahu na zařízení + tiché hlášení | reprodukovatelné buildy, žádný skenovací kód |
| BM-2 Vrátka | tichý přístup ke klíčům/obsahu | key transparency, klíče jen na zařízení, warrant canary |
| BM-3 Metadata | trvalý archiv „kdo s kým kdy" | minimalizace, TTL, agregovaná analytika |

**Společný jmenovatel:** každá technika se obhajuje bezpečností nebo zákonem a
každá tiše mění bezpečnostní model, aniž by to uživatel poznal. Proto je klíčová
**ověřitelnost** — Minuta musí být postavená tak, aby *nemožnost* těchto věcí
šla nezávisle doložit, ne jen slíbit.

### Provozní pojistky proti sklouznutí do BLACKMINUTE

1. Každá změna dotýkající se klíčů, seznamu zařízení, skenování nebo retence
   metadat je **bezpečnostně kritická** → povinný security review a čtvero očí
   (29, 22-AI_CODING_CONSTITUTION).
2. AI asistenti mají v 22 zakázáno tyto změny navrhovat; tento dokument je
   konkrétní katalog toho, co „obcházení bezpečnosti" znamená.
3. Warrant canary a transparency report jsou veřejné pojistky pro uživatele.
4. Zmizení kterékoli obrany z tohoto seznamu je incident, ne „úklid kódu".

---

*BLACKMINUTE existuje proto, aby nikdy nevznikla. Kdykoli někdo (zvenčí i zevnitř,
včetně budoucích nás) navrhne krok z tohoto dokumentu, odpověď zní: to je
BLACKMINUTE — a to neděláme.*
