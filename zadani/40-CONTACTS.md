# 40 — CONTACTS (Draft v0.1)

Status: Draft. Řeší bílé místo: jak si uložit protistranu bez adresáře
a jak vypadá identita uživatele. Vazby: 12, 33 §6, 37.

## 1. Zásada

Žádný globální adresář, žádné vyhledávání lidí, žádný upload telefonního
seznamu (03, 29 §5). Kontakt vzniká **jen z proběhlé konverzace** —
sociální graf se buduje výhradně vědomými akty obou stran.

## 2. „Známí" (roster)

- Po/při konverzaci může každá strana druhou **uložit mezi Známé**
  (jednostranně; druhá strana se to nedozví).
- Známému lze později napsat bez nového magic linku (založí se nový Space
  typu duo přímo).
- Odebrání Známého je lokální akt; blokace je silnější a řeší ji 27.

## 3. Uložení: šifrovaný roster (zero-knowledge)

- Roster se ukládá v `users/{uid}/contacts` jako **blob šifrovaný klíčem
  uživatele** (roster key, zabalený pro každé zařízení jako MK v 33 §2).
  Server vidí jen počet záznamů, ne kdo je v nich.
- Obsah záznamu: uid protistrany, zvolené jméno (moje pojmenování!),
  otisk IK, stav ověření (37 §4), poznámka.
- Multi-device: blob se stáhne a rozbalí na každém zařízení (37) —
  jediná „synchronizovaná" osobní data v celém produktu.
- Trade-off (přiznaný): párové vazby jsou serveru skryté, ale existence
  a velikost rosteru ne. Alternativa „jen lokálně" zavržena kvůli
  multi-device a ztrátě zařízení (ADR poznámka).
- **Ztráta všech zařízení = ztráta rosteru.** Roster key existuje jen
  zabalený pro zařízení (33) — bez jediného živého zařízení jej nelze
  rozbalit. Konzistentní s filozofií N2 (žádná obnova bez klíčů); Známé
  lze znovu získat novou konverzací. Uvést v UX i podmínkách (02).

## 4. Identita uživatele — zobrazení

- **displayName**: volitelné, ≤ 32 znaků, **nejedinečné** (žádný zábor
  jmen, žádný namespace k obsazování — anti-spam výhoda).
- **Identicon**: avatar generovaný deterministicky z otisku IK (33 §6) —
  nejde zvolit ani napodobit; dvě „Jany" mají různé identikony.
- Impersonace se řeší trojicí: identicon + bezpečnostní kód (37 §4)
  + moje vlastní pojmenování v rosteru (§3) — jméno od protistrany je
  jen nápověda, nikdy důkaz.
- Žádné profilové fotky v MVP (moderační zátěž 29, náklad 32); zvážit ve V3+.

## 5. UX (28)

- „Uložit mezi Známé" se nabídne nenápadně po první výměně zpráv.
- Seznam Známých = výchozí obrazovka „Nová konverzace".
- U každého Známého: identicon, mé pojmenování, stav ověření, poslední
  společný Space (jen název — obsah neexistuje, N2).
