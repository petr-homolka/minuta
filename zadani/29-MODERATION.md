# 29 — MODERATION (Draft v0.1)

Status: Draft (rozpracování „Budoucích kapitol" z 27-TRUST_SAFETY)

> Tento dokument rozvádí provozní stránku Trust & Safety. Vychází ze
> železného pravidla z 27: **moderace nikdy neprolamuje E2EE ani
> zero-knowledge architekturu.** Jediný obsah, který se kdy dostane
> k moderátorovi, je ten, který **příjemce vědomě nahlásil** (viz 27,
> sekce „Nahlášení zprávy"). Vše ostatní pracuje výhradně nad metadaty
> a nad rozhodnutími uživatelů.

---

## 1. Moderační proces a nástroje

### 1.1 Vstupy do moderace

Do fronty moderace se dostane pouze:

- **Nahlášení uživatelem** — s dešifrovaným obsahem přiloženým se souhlasem
  nahlašujícího (jediná legitimní cesta obsahu k provozovateli).
- **Signály nad metadaty** — např. účet, který za minutu založí 200 konverzací
  (viz rate limiting v 27). Tyto signály **neobsahují obsah**, jen chování.
- **Žádost orgánu veřejné moci** — řeší se odděleně (sekce 4).

Nikdy: plošné skenování, automatické čtení obsahu, ML klasifikace obsahu na
serveru. (Odmítnuté alternativy viz 30-BLACKMINUTE.)

### 1.2 Fronta (queue)

- Jednotná fronta nahlášení, řazená podle **priority × stáří**.
- Každá položka nese: typ nahlášení, kategorii (viz sekce 2), přiložený důkaz
  (šifrovaně), metadata (kdo nahlásil, čas), historii kroků.
- Přístup k důkazu je logován (kdo, kdy, proč) — audit přístupů je povinný.
- Důkaz je uložen v odděleném, šifrovaném úložišti moderace s vlastní krátkou
  retencí (návrh 90 dní, nebo dle zákonné povinnosti u konkrétní kategorie).
- Položka ve frontě má stavy: `Nová → V řešení → Rozhodnuto → Uzavřeno`
  (případně `Eskalováno`, `Předáno orgánům`).

### 1.3 Eskalační úrovně

| Úroveň | Kdo | Kompetence | Kdy |
|---|---|---|---|
| L1 — Triáž | junior moderátor | zařadit, uzavřít zjevně neškodné, doporučit akci | první kontakt |
| L2 — Rozhodnutí | senior moderátor | uložit sankci (varování, blok, ban) | běžné případy |
| L3 — Specialista | T&S lead / právník | citlivé kategorie, hraniční právní otázky | CSAM, terorismus, sebevražda, orgány |
| L4 — Krizový tým | vedení + právní + PR | hromadné incidenty, medializace, zákonné žádosti | výjimečné |

Eskalace nahoru je vždy možná; eskalace dolů (vrácení k přepracování) také.

### 1.4 Pravidlo čtyř očí

- **Žádné nevratné či závažné rozhodnutí nedělá jeden člověk sám.**
  Nevratné/závažné = trvalý ban účtu, předání orgánům, uvolnění dat na základě
  žádosti, zásah do více účtů najednou.
- Druhý moderátor (nezávislý na prvním) rozhodnutí potvrzuje. Nesouhlas →
  automatická eskalace o úroveň výš.
- U kategorie CSAM a bezprostředního ohrožení života je čtvero očí povinné
  vždy a spouští okamžitou eskalaci na L3.
- Systém technicky brání tomu, aby týž účet moderátora provedl návrh i schválení.

### 1.5 Nástroje moderátora

- Náhled nahlášeného důkazu s možností **rozostření** (obraz defaultně
  rozmazaný, odkrytí je vědomý klik — ochrana moderátora, sekce 3).
- Akční tlačítka s povinným odůvodněním a odkazem na porušené pravidlo.
- Sankční paleta: varování, dočasné omezení (rate limit), blok funkce,
  dočasný a trvalý ban, nahlášení orgánům.
- Odvolací tok: každé rozhodnutí lze přezkoumat (notice & action dle DSA, sekce 4).
- Vše auditované, nezměnitelný log rozhodnutí.

---

## 2. Kategorie závadného obsahu a SLA reakcí

### 2.1 Kategorie

| Kód | Kategorie | Příklady | Priorita |
|---|---|---|---|
| C1 | Ohrožení života / CSAM / terorismus | zneužívání dětí, bezprostřední násilí, nábor | kritická |
| C2 | Vážná újma | výhrůžky, vydírání, doxxing, stalking | vysoká |
| C3 | Nenávist a obtěžování | cílené obtěžování, nenávistný projev | střední |
| C4 | Podvod a spam | phishing, scam, hromadný spam | střední |
| C5 | Nezákonný obsah (ostatní) | prodej regulovaných věcí apod. | dle typu |
| C6 | Porušení podmínek (lehké) | drobné porušení, sporné případy | nízká |

### 2.2 SLA reakcí

SLA běží od zařazení do fronty. „Reakce" = první rozhodnutí, ne nutně konečné.

| Priorita | Reakce | Rozhodnutí | Poznámka |
|---|---|---|---|
| Kritická (C1) | do 1 hodiny | do 24 hodin | 24/7 pokrytí, okamžitá eskalace na L3 |
| Vysoká (C2) | do 4 hodin | do 48 hodin | |
| Střední (C3, C4) | do 24 hodin | do 7 dní | |
| Nízká (C5 lehčí, C6) | do 72 hodin | do 14 dní | |

- **Preventivní opatření** (dočasné omezení účtu) lze uložit okamžitě při
  důvodném podezření ještě před konečným rozhodnutím.
- Nedodržení SLA je provozní incident (viz 20-OPERATIONS) a měří se jako KPI.

### 2.3 Zvláštní režim C1

- CSAM: povinné nahlášení příslušným orgánům dle platného práva, uchování
  důkazu dle zákona, žádné mazání důkazu do vyřízení, minimální okruh osob.
- Bezprostřední ohrožení života: kontakt na složky IZS má přednost před
  procesními lhůtami.

---

## 3. Ochrana moderátorů

Moderátoři vidí to nejhorší, co platforma zachytí. Jejich ochrana je závazek,
ne benefit.

### 3.1 Technická ochrana

- **Defaultní rozostření** obrazu a videa; odkrytí je vědomý akt.
- Přehrávání médií bez zvuku ve výchozím stavu; ztlumené náhledy.
- Šedotónový režim náhledů (snižuje psychický dopad).
- Nástroje pro rozdělení expozice: nikdo neřeší tutéž tíživou kategorii
  nepřetržitě; automatická rotace kategorií.
- „Panic pauza": moderátor může kdykoli přerušit práci bez vysvětlování.

### 3.2 Organizační ochrana

- Stropy expozice: maximální denní čas na kategoriích C1/C2.
- Povinné přestávky po vystavení kritickému obsahu.
- Placený přístup k psychologické podpoře; pravidelné dobrovolné konzultace
  jako standard, ne stigma.
- Rotace mezi kategoriemi a mezi moderací a jinou prací.
- Nábor a onboarding s realistickým popisem práce a informovaným souhlasem.
- Vyšší ohodnocení a uznání práce na C1.

### 3.3 Zásady

- Moderátor nikdy nepracuje na C1 sám (souvisí se čtyřma očima, sekce 1.4).
- Nikdo není nucen setrvat u obsahu, který nezvládá.
- Metriky výkonu nesmí tlačit na rychlost na úkor zdraví (SLA jsou týmové, ne
  individuální bičování).

---

## 4. Spolupráce s orgány (playbook)

> Základ: provozovatel **nemá obsah** (26-THREAT_MODEL). Poskytnout lze pouze
> to, co reálně existuje — minimální metadata a obsah, který dobrovolně nahlásil
> příjemce. Nelze „dodatečně dešifrovat" ani „obnovit" spálené zprávy.

### 4.1 Příjem žádosti

1. Žádost přijímá jen určené kontaktní místo (legal@ / dedikovaný kanál).
2. Ověří se pravost a právní podklad žádosti (jurisdikce, forma, rozsah).
3. Žádost se zaeviduje do neveřejného registru žádostí (pro transparenční report).
4. Neformální dotazy („pošlete nám prosím…") bez právního podkladu se odmítají.

### 4.2 Posouzení

- **Rozsah:** poskytnout jen to, co žádost pokrývá, nikdy víc (data minimization).
- **Právní přezkum (L3/L4):** je žádost platná v naší jurisdikci? Vyžaduje
  soudní příkaz? Není nepřiměřená?
- **Napadnutelnost:** nepřiměřené nebo právně vadné žádosti napadáme.
- Rozhodnutí o vydání dat spadá pod pravidlo čtyř očí a schválení právníka.

### 4.3 Co lze a nelze poskytnout

| Požadavek | Odpověď |
|---|---|
| Obsah konkrétních zpráv | Nemáme — E2EE, na serveru jen šifrovaný blob, klíče nikdy |
| Obnovení spálené zprávy | Technicky nemožné (crypto-shredding + TTL) |
| Metadata (existence účtu, časy, případně IP dle retence) | Jen to, co reálně existuje a jen v rozsahu žádosti |
| Reálný obsah z nahlášení | Pouze pokud existuje v moderační frontě a v rozsahu žádosti |
| „Trvalý odposlech" účtu | Odmítáme — neexistuje mechanismus a odporuje architektuře |

### 4.4 Nouzové žádosti (ohrožení života)

- Zrychlený proces pro bezprostřední ohrožení; i tak se ověřuje pravost.
- I v nouzi platí: nelze vydat, co neexistuje.

### 4.5 Transparentnost

- **Transparency report** (např. pololetně): počty žádostí, kolika vyhověno,
  kolik napadeno, členění dle typu — bez identifikace osob.
- **Warrant canary:** pravidelné veřejné prohlášení, že jsme nebyli nuceni
  k tajnému zavedení zadních vrátek (souvisí s 30-BLACKMINUTE); jeho zmizení
  je signál.
- Uživatele o žádosti informujeme, pokud to zákon dovolí (jinak po vypršení
  případného gag orderu).

### 4.6 Zakázané postupy

- Poskytovat data bez právního podkladu z pohodlnosti.
- Vytvářet nová data ke sledování na žádost orgánu (viz 30-BLACKMINUTE).
- Mlčet o systémovém tlaku, který mění bezpečnostní model produktu.

---

## 5. Age gating / ochrana nezletilých

### 5.1 Princip a napětí

Ochrana dětí je legitimní a naléhavá. Zároveň nejběžnější „řešení" (skenování
obsahu, ověřování věku dokladem, sledování) jsou přímo v rozporu s vizí Minuty.
Cílem je maximum ochrany **bez** zavedení dohledu — přiznat, kde jsou meze.

### 5.2 Co děláme

- **Věková brána při vstupu:** minimální věk dle podmínek a jurisdikce
  (návrh 16 let, k právní revizi vůči GDPR čl. 8 / místním pravidlům).
- **Nízké sběry, bezpečné defaulty:** žádný veřejný adresář uživatelů, žádné
  vyhledávání lidí, kontakt jen přes vědomé sdílení magic linku (12) — dítě
  není „nalezitelné" cizími lidmi z principu produktu.
- **Omezení anonymních účtů** (27) snižují prostor pro anonymní oslovování.
- **Snadné nahlášení a blokace** (27) dostupné vždy na dva kroky.
- **Vzdělávací mikrotexty** o rizicích při prvním použití.
- **Priorita C1** pro jakékoli nahlášení týkající se nezletilých.

### 5.3 Ověřování věku — poctivě

- Silné ověření věku (doklad, biometrie) je **samo o sobě dohledový nástroj**
  a shromažďuje citlivá data → v rozporu s vizí. Nezavádíme je jako default.
- Zvažujeme pouze **privacy-preserving** postupy, pokud dozrají: ověření věku
  třetí stranou s vydáním pouze potvrzení „18+/16+" (attestace) bez předání
  identity Minutě (zero-knowledge věkový důkaz). Do té doby jasně komunikujeme
  meze samodeklarace.
- **Nikdy** neřešíme ochranu dětí plošným skenováním obsahu (30-BLACKMINUTE).

### 5.4 Přiznaná mez

Ephemeral messenger nemůže technicky zaručit, že dospělý nezneužije důvěru
nezletilého (analogová díra, sociální inženýrství). Můžeme snižovat prostor
a rychle reagovat na nahlášení; nemůžeme slibovat nemožné (26-THREAT_MODEL,
pravidlo pro marketing).

---

## 6. Metriky Trust & Safety (KPI)

- Dodržení SLA po prioritách.
- Doba do prvního rozhodnutí (medián, p95).
- Míra odvolání a jejich úspěšnost (kvalita rozhodování).
- Míra opětovného provinění po sankci.
- Expozice moderátorů na C1/C2 (strop a jeho dodržení).

## 7. Budoucí kapitoly

- Detailní katalog pravidel (community guidelines) po kategoriích
- Odvolací a přezkumný proces do detailu (soulad s DSA čl. 20)
- Postupy pro hromadné incidenty a koordinované zneužití
- Školicí program moderátorů
- Spolupráce s NGO a linkami pomoci
