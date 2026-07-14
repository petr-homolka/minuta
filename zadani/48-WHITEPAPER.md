# 48 — SECURITY WHITEPAPER (Draft v0.1)

Status: Draft **k publikaci až po externím auditu** (33). Veřejný dokument —
psaný pro poučeného laika i novináře; technické detaily odkazují na
interní kapitoly, které lze později zveřejnit spolu s ním.

---

# Minuta — bezpečnostní bílá kniha

## 1. Slib

Minuta je messenger, kde zpráva žije **60 sekund od otevření**. Náš slib
má dvě části:

1. **Nemůžeme číst, co si píšete.** Ne „nečteme" — *nemůžeme*. Klíče
   existují jen ve vašich zařízeních.
2. **Po minutě je zpráva neobnovitelná.** U vás, u nás, v zálohách —
   nikde. Neexistuje kopie, kterou by šlo vydat, ukrást ani vysoudit.

## 2. Jak zpráva žije

1. Vaše zařízení zprávu zašifruje; k nám dorazí jen nečitelný blob.
2. Příjemce ji vědomě otevře — tím startuje minuta (čas určuje server,
   hodinami zařízení nejde podvádět).
3. Po 60 sekundách zařízení příjemce **přepíše klíč i text v paměti
   nulami** a náš server **smaže šifrovaný blob**. Dvě nezávislé pojistky;
   každá sama stačí.
4. Nepřečtená zpráva zmizí do 24 hodin.

## 3. Co vidíme a co ne

| | Vidíme | Nevidíme |
|---|---|---|
| Obsah zpráv a příloh | | ✗ nikdy (E2EE) |
| Vaše klíče | | ✗ nikdy |
| Kdo s kým má konverzaci | ✓ po dobu její existence | |
| Kontakty („Známé") | | ✗ šifrovaný blob |
| Obsah nahlášené zprávy | ✓ jen když ji příjemce vědomě přiloží | |

Metadata držíme minimální a krátce (dny, ne roky); mnohá „samozřejmá"
data — historie, doručenky per člen, grafy kontaktů — u nás prostě
neexistují, protože neexistuje ani funkce, která by je potřebovala.

## 4. Kryptografie (přehled)

Používáme výhradně veřejně auditovanou knihovnu **libsodium** a její
standardní konstrukce: X25519 pro výměnu klíčů, XChaCha20-Poly1305 pro
šifrování, Ed25519 pro podpisy. Každé zařízení má vlastní klíče; každá
zpráva vlastní jednorázový klíč. Protokol je verzovaný — umožňuje
budoucí migraci (např. MLS) bez „velkého třesku". Detailní specifikace
podléhá externímu auditu před spuštěním a bude zveřejněna.

## 5. Co negarantujeme (a proč to říkáme nahlas)

- **Druhý telefon.** Příjemce může obrazovku vyfotit jiným zařízením.
  To neumí vyřešit nikdo na světě — kdo tvrdí opak, klame. Minuta chrání
  přenos a uložení, ne důvěru, kterou někdo zradí.
- **Snímky obrazovky** umíme blokovat na Androidu; na iOS a webu to
  systémy nedovolují — u citlivých rozhovorů to aplikace připomene.
- **Napadené zařízení** čte vše, co čtete vy.
- **Existenci komunikace** (kdo, kdy) skrýt neumíme — nejsme anonymizační
  síť. Umíme ji ale nevědět dlouho.

## 6. Ověřitelnost — nevěřte nám, ověřte to

- **Expiry canary:** každých 10 minut si systém sám dokazuje, že spálená
  zpráva je nečitelná a smazaná; výsledek je veřejně na status page.
- **Warrant canary:** měsíčně obnovované prohlášení, že jsme nebyli
  donuceni k tajným zadním vrátkům. Jeho zmizení je signál.
- **Transparenční zpráva:** pololetně počty žádostí orgánů a jak dopadly.
- **Ověření klíčů v aplikaci:** bezpečnostní kód konverzace odhalí
  jakoukoli výměnu klíčů — i naši.
- **Externí audit** kryptografie a penetrační testy před spuštěním
  a pravidelně poté; nálezy shrnujeme veřejně.

## 7. Závazky (co nikdy neuděláme)

1. **Žádné skenování obsahu** — na serveru ani ve vaší aplikaci.
2. **Žádná zadní vrátka** — žádný „ghost" příjemce, žádná úschova klíčů,
   žádné oslabené šifrování. Ani na žádost, ani pod tlakem.
3. **Žádný trvalý archiv metadat** — neprodáváme data, neprofilujeme,
   nemáme reklamu.

Tyto závazky máme interně rozpracované jako „BLACKMINUTE" — katalog
toho, jak by vypadalo jejich porušení, s technickými pojistkami, které
je činí zjistitelnými. Bezpečnostní model se nemění potichu.

## 8. Zákonné žádosti

Spolupracujeme v mezích práva. Vydat můžeme jen to, co existuje: minimální
metadata. Obsah zpráv nemáme a spálené zprávy neobnovíme — technicky to
nejde, což je přesně smysl návrhu.

## 9. Nahlášení zranitelnosti

security.txt · VDP se bezpečným přístavem pro výzkumníky · kontakt
security@minuta.app. Děkujeme každému, kdo nás udělá lepšími.

---

*Verze 0.1 (draft). Publikace podmíněna: externí audit (33), DPIA (02),
finální revize textu právníkem a bezpečnostním auditorem.*
