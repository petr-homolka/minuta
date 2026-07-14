# 34 — TIME_AND_EXPIRY (Draft v0.1) — ADR-008

Status: Draft. Řeší bílé místo „autorita času": celý produkt stojí na
60 sekundách, proto **čas nikdy neurčuje klient**.

## 1. Zásada (ADR-008)

Všechny rozhodné časy (`createdAt`, `readAt`, `expireAt`) vznikají
**serverovým časem** (`request.time` ve Firestore Rules / server timestamp).
Hodiny klienta ovlivňují pouze vykreslení odpočtu, nikdy vynucení.
Manipulace hodinami zařízení tedy nemá žádný bezpečnostní účinek.

## 2. Otevření zprávy — mechanismus „zámku"

Obsah (ciphertext) je oddělený dokument, který **nelze přečíst, dokud
neexistuje `readAt`** — a `readAt` lze zapsat jen serverovým časem:

1. Příjemce vidí obálku (metadata) — „zavřená obálka" v UI (28).
2. Klepnutím klient provede update zprávy povolený Rules **výhradně** ve
   tvaru: `readAt: request.time` a `expireAt: request.time + 90 s`,
   a jen pokud `readAt == null` (jednorázový přechod; 36).
3. Od té chvíle Rules povolují číst ciphertext, ale **jen dokud
   `request.time < readAt + 90 s`** (60 s okno + 30 s grace na pomalé sítě).
4. Klient dešifruje (33) a lokálně odpočítává 60 s od potvrzení zápisu.

Důsledek: klient, který „zapomene" nahlásit otevření, obsah prostě
nedostane. Nelze číst bez spuštění časovače.

## 3. Jediné pole `expireAt` (TTL)

Firestore TTL politika maže dokumenty podle `expireAt`:

| Událost | Hodnota `expireAt` |
|---|---|
| Vytvoření zprávy | `createdAt + 24 h` (nepřečtená vyprší — N3) |
| Otevření | přepsáno na `readAt + 90 s` |
| Burn now / unsend (N7) | okamžitá delete operace, TTL jen pojistka |
| Space (11) | `createdAt + 24 h`, placené: `null` = bez expirace |
| Pozvánka (12) | dle parametru platnosti |

TTL maže s prodlevou (minuty až hodiny) — proto Rules **odmítají čtení po
`readAt + 90 s` nezávisle na tom, zda dokument ještě fyzicky existuje**.
Logická expirace (Rules) je okamžitá, fyzická (TTL + úklidová funkce jako
druhá vrstva) následuje. Pojistky se skládají: Rules → klientský wipe (33 §3)
→ TTL → úklidová funkce.

## 4. Stavový automat zprávy

```
ODESLÁNO ──doručení obálky──► DORUČENO ──update readAt──► OTEVŘENO
   │                             │                            │ +60 s
   │ unsend (readAt==null)       │ 24 h bez otevření          ▼
   ▼                             ▼                         SHOŘELO
ODVOLÁNO                      VYPRŠELO              (burn now: kdykoli dřív)
```

Přechody vynucené Rules; klient je pouze vykresluje (28 tabulka stavů).

## 5. Okrajové případy

- **Otevření vyžaduje připojení.** Ciphertext se nikdy nepředstahuje
  offline (N2) — bez sítě zůstává obálka zavřená. Záměr, ne omezení.
- **Výpadek sítě po otevření:** klient už obsah má v RAM; wipe v +60 s
  proběhne lokálně i offline; server smaže dle `expireAt` nezávisle.
- **Souběh otevření na dvou zařízeních příjemce:** první update vyhrává
  (Rules: přechod jen z `readAt == null`); druhé zařízení čte ciphertext
  v témže okně — obě dohoří ve stejný okamžik `readAt + 60`.
- **Posun hodin klienta:** odpočet v UI se kotví k potvrzenému `readAt`
  ze serveru, ne k lokálnímu „teď".
- **Restart aplikace během odpočtu:** obsah byl jen v RAM → je pryč;
  UI ukáže „shořelo". Dřívější konec je vždy bezpečný směr (fail secure, 03).

## 6. Přesnost jako SLO

„Zpráva nežije déle, než slibujeme" je měřitelný závazek:
**SLO: 100 % ciphertextů nečitelných ≤ readAt + 90 s (Rules) a smazaných
≤ readAt + 24 h (fyzicky).** Měření agregovaně (39), reporting v 20.
