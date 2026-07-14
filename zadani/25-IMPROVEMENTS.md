# 25 — IMPROVEMENTS (Návrhy vylepšení, Draft v0.1)

Status: Návrh k diskusi
Autor: AI asistent (Claude), na základě revize dokumentů 00–24

> Tento dokument obsahuje konkrétní návrhy, jak zadání zjednodušit, zpřesnit
> a produktově vyostřit. Každý návrh má označení N1–N10, aby se na něj dalo
> odkazovat při schvalování. Schválené návrhy se propíší do příslušných kapitol.

---

## Shrnutí

Základní myšlenka („zpráva viditelná jen 60 sekund") je silná. Největší
příležitost vidím v tom, vzít ji **doslova a bez kompromisů**: žádná historie,
žádné archivy, jedna minuta jako značka. Tím se paradoxně vyřeší i ty
nejtěžší technické problémy zadání (recovery, multi-device sync, zálohy).

---

## N1 — Jedna minuta jako produkt

**Návrh:** V MVP existuje jediný režim expirace: **60 sekund od otevření**.
Odstranit volby 5 minut / 1 hodina z MVP (dokument 09).

**Proč:**
- Značka se jmenuje Minuta. Produkt = jméno = slib. To je marketingově výjimečné.
- Jedna hodnota = jednodušší UI, jednodušší testování, jednodušší bezpečnostní audit.
- Delší intervaly lze později prodávat jako placenou funkci (viz N10),
  aniž by se měnila architektura.

**Dopad:** 09-MESSAGES (sekce Expirace), 23-ROADMAP (V1).

---

## N2 — Žádná historie: konverzace je místnost, ne archiv

**Návrh:** Aplikace nemá žádnou historii zpráv. Konverzace zobrazuje pouze
„živé" zprávy (doručené a dosud nespálené). Klient drží dešifrovaný obsah
**pouze v paměti**, nikdy na disku.

**Proč — tento jeden princip řeší čtyři těžké problémy zadání najednou:**

1. **Recovery klíčů** (otevřený problém v 04): není co obnovovat. Ztráta
   zařízení = ztráta ničeho, historie neexistuje.
2. **Multi-device synchronizace** (budoucí kapitola v 04 a 08): nesynchronizuje
   se historie, nové zařízení prostě přijímá budoucí zprávy.
3. **Zálohy obsahu** (20-OPERATIONS): zálohují se jen metadata, obsah nikdy.
4. **Vyhledávání, export, archiv**: mimo rozsah navždy — obrovské zjednodušení.

**Důsledky k dokumentaci:**
- Konverzace bez živých zpráv se v UI zobrazuje prázdná („Zprávy tu žijí jen minutu").
- Offline fronta (14, 15) drží pouze *odchozí* zašifrované zprávy, nikdy přijatý obsah.

**Dopad:** 04, 08, 09, 14, 20. Zapsat jako ADR-005 „Proč žádná historie".

---

## N3 — Dvojitá pojistka expirace (crypto-shredding + server TTL)

**Návrh:** Expiraci vynucují **dva nezávislé mechanismy**, každý sám o sobě
dostatečný:

1. **Klient (crypto-shredding):** po 60 s od otevření klient smaže klíčový
   materiál zprávy z paměti a odstraní obsah z UI.
2. **Server (retence):** server smaže šifrovaný objekt v čase
   `readAt + 60 s + grace` (grace ≈ 30 s pro pomalé sítě). Implementace:
   Firestore TTL policy + úklidová Cloud Function jako druhá vrstva.

**Doplňkové pravidlo — TTL nepřečtených zpráv:** zpráva, kterou příjemce
neotevře do **24 hodin** od odeslání, je serverem smazána a odesílateli se
zobrazí „nedoručeno — vypršelo". Odesílatel může poslat znovu.
(Alternativa 72 h — k rozhodnutí; 24 h je konzistentnější s privacy-first pozicí.)

**Proč:** klientovi nelze věřit (kompromitace, upravená aplikace) a server
nesmí být jediný vynucovatel (výpadek funkce = zprávy žijí věčně).

**Dopad:** 04 (Mazání zpráv), 06 (Retence, TTL), 08 (Životní cyklus), 19.

---

## N4 — Bezregistrační příjem: Magic Link + anonymní účet

**Návrh:** Příjemce zprávy **nepotřebuje registraci**. Otevře magic link →
na pozadí vznikne anonymní Firebase účet → vygenerují se klíče zařízení →
je v konverzaci. Registraci (e-mail) nabídnout až po první konverzaci
(„Chceš, aby tě přátelé našli i příště?").

**Proč:**
- Killer onboarding: bariéra vstupu klesá na jedno kliknutí. Virální smyčka —
  každá pozvánka je zároveň instalace.
- Zadání už anonymní účty volitelně připouští (05, 07); tento návrh z nich
  dělá jádro produktu místo okrajové funkce.
- Méně osobních údajů = silnější zero-knowledge příběh.

**Rizika a mitigace:** spam přes anonymní účty → rate limiting na vytvoření
konverzace, limity anonymních účtů (jen odpovídat, nezakládat), viz 27-TRUST_SAFETY.

**Dopad:** 07, 12, 23 (V1 scope).

---

## N5 — Kryptografie pro MVP: rozhodnutí místo odkazu na Signal (návrh ADR-002)

Dokument 04 doporučuje Signal Protocol, ale pro PWA-first MVP je to problém:
oficiální libsignal není určen pro prohlížeč a neoficiální porty porušují
pravidlo „jen auditované knihovny".

**Návrh — tři varianty, doporučuji B:**

- **A) Plný Signal Protocol (libsignal):** nejsilnější vlastnosti (X3DH,
  Double Ratchet, PFS), ale v prohlížeči prakticky nedostupný v auditované
  podobě. Vhodné až pro nativní klienty ve V2.
- **B) Standardní konstrukce z libsodium (doporučeno pro MVP):**
  auditovaná knihovna (libsodium/libsodium.js), pouze hotové konstrukce —
  `crypto_box` (X25519 + XChaCha20-Poly1305) s předpublikovanými klíči
  zařízení a efemérním klíčem odesílatele pro každou zprávu. Žádný vlastní
  protokol, žádné vlastní primitivy. Hodnota Double Ratchetu (samoléčení
  dlouhých session) je u zpráv žijících 60 sekund výrazně nižší — okno
  kompromitace je z principu minutové.
- **C) MLS (RFC 9420):** správná budoucnost pro skupiny, ale ekosystém
  v prohlížeči zatím nezralý. Kandidát pro V3 (skupiny).

**Podmínky varianty B:** návrh schémat (prekeys, rotace) musí projít
bezpečnostním auditem před spuštěním; architektura musí umožnit výměnu
vrstvy za libsignal/MLS bez změny datového modelu (obálka zprávy verzovaná
polem `cryptoVersion`).

**Dopad:** 04 (celá kapitola), 24 (knihovny), nový ADR-002.

---

## N6 — Poctivý threat model a poctivý marketing

**Návrh:** Přijmout zásadu: **nikdy neslibovat, co technika neumí zaručit.**
Konkrétně: „analogovou díru" (vyfocení obrazovky druhým telefonem) nelze
odstranit na žádné platformě; screenshoty nelze spolehlivě blokovat na iOS
a ve webovém prohlížeči vůbec.

Formulace slibu produktu:
- ❌ „Zpráva zmizí beze stopy a nikdo si ji nemůže uložit."
- ✅ „Zpráva se po minutě stane neobnovitelnou u nás i v aplikaci.
  Ochrana před člověkem s druhým telefonem neexistuje — Minuta je pro
  soukromí, ne proti zradě důvěry."

Detailní model hrozeb: nový dokument [26-THREAT_MODEL.md](26-THREAT_MODEL.md).

**Dopad:** 00, 02 (podmínky použití), 03, 16, nový 26.

---

## N7 — Kontrola odesílatele nad zprávou

**Návrh:** Odesílatel má tyto pravomoci:

1. **Odvolat (unsend):** dokud příjemce zprávu neotevřel, lze ji smazat.
2. **Spálit hned (burn now):** odesílatel může běžící zprávu spálit
   i před vypršením minuty.
3. **Potvrzení o spálení:** stav zprávy „Přečteno 14:31 · Shořelo 14:32".
4. **Spálit vše (panic):** jedno gesto/tlačítko okamžitě spálí všechny živé
   zprávy ve všech konverzacích uživatele (lokálně i požadavkem na server).

**Proč:** posiluje pocit kontroly, který je jádrem hodnoty produktu.
Body 1–3 jsou levné (změna stavu + smazání blobu). Bod 4 je silný
bezpečnostní i marketingový prvek.

**Dopad:** 08, 09, 18 (endpointy), 28-UX.

---

## N8 — Trust & Safety jako samostatná kapitola

**Návrh:** Mizející zprávy přitahují zneužití (obtěžování, nelegální obsah)
a „důkaz zmizí za minutu" je past pro oběti i pro provozovatele (DSA!).
Proto nový dokument [27-TRUST_SAFETY.md](27-TRUST_SAFETY.md) s principy:

- **Nahlášení v okně viditelnosti:** příjemce může běžící zprávu nahlásit;
  se souhlasem nahlašujícího klient přiloží dešifrovaný obsah jako důkaz
  (jediná legitimní cesta, jak se obsah dostane k provozovateli — vědomé
  rozhodnutí příjemce, nikoli prolomení E2EE).
- Blokování uživatele a konverzace.
- Rate limiting a omezení anonymních účtů (viz N4).
- Kontaktní místo a procesy dle DSA.

**Dopad:** 02, 03, nový 27.

---

## N9 — UX koncept: odpočet jako podpis produktu

**Návrh:** Vizuální jazyk celé aplikace se točí kolem odpočtu. Nový dokument
[28-UX.md](28-UX.md) definuje životní cyklus zprávy v UI (odesláno → doručeno →
otevřeno + odpočet → shořelo), prstenec odpočtu kolem zprávy, placeholder
po spálení a bezregistrační onboarding flow z N4.

**Dopad:** nový 28, 14–17.

---

## N10 — Obchodní model postavený na čase

**Návrh (V4):** Zpoplatnit **čas a kapacitu, nikdy soukromí**:

- Zdarma: 60 s, text + malé obrázky, Spaces na 24 hodin.
- Placené: volitelné delší okno (5 min / 1 h — návrat funkcí vyřazených v N1),
  větší přílohy, **trvalé Spaces** (neomezená životnost místnosti, 11-SPACES),
  více členů a správců.
- Zpráva žije 60 s vždy a všude — platí se stálost *kanálu*, nikdy delší
  život *obsahu* bez vědomé volby obou stran.
- Nikdy neprodávat: reklamu, data, „vyšší soukromí" (soukromí mají všichni stejné).

**Dopad:** 23 (V4), budoucí PRICING dokument.

---

## Strukturální úpravy dokumentace

| Úprava | Stav |
|---|---|
| Sloučení duplicitních 07-AUTH.md a 07-AUTHENTICATION.md | ✅ provedeno (07-AUTHENTICATION.md je sloučená verze, 07-AUTH.md ponechán jako odkaz) |
| Nové kapitoly 26 (Threat Model), 27 (Trust & Safety), 28 (UX) | ✅ vytvořeny jako draft |
| Zavést ADR index: ADR-001 Firebase, ADR-002 Kryptografie MVP (N5), ADR-003 PWA první, ADR-004 Metadata odděleně, ADR-005 Žádná historie (N2) | navrženo |
| V 09-MESSAGES zúžit MVP expiraci na 60 s (N1) | čeká na schválení |

---

## Upravený rozsah V1 MVP (návrh, nahrazuje sekci V1 v 23-ROADMAP)

- PWA (React + TypeScript + Vite)
- Přihlášení e-mail + magic link; **příjemce bez registrace** (N4)
- 1:1 konverzace přes magic link
- Textové zprávy, E2EE dle ADR-002 (N5)
- Expirace: 60 s od otevření, crypto-shredding + server TTL (N1, N3)
- Odvolání a spálení zprávy odesílatelem (N7, body 1–3)
- Nahlášení a blokování (N8, minimální verze)
- Žádná historie (N2)

Mimo V1: přílohy, skupiny, nativní klienti, push notifikace, „spálit vše",
placené funkce.

---

*Každý návrh N1–N10 lze přijmout, upravit nebo zamítnout nezávisle;
dokument poté aktualizuji a schválené změny propíšu do kapitol 00–24.*
