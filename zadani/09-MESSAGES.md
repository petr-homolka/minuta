
# 09 — MESSAGES (Draft v0.1)

Status: Draft

## Cíle

Definovat jednotný model všech typů zpráv.

## Podporované typy

- Text
- Markdown
- Obrázek
- Video
- Audio
- Dokument
- Kontakt
- GPS poloha
- Odkaz
- Systémová zpráva

## Společné vlastnosti

- messageId
- conversationId
- senderId
- encryptedPayload
- createdAt
- expiresAt
- deliveryState
- readState

## Expirace

Časovač se standardně spouští po prvním otevření zprávy příjemcem.

Konfigurovatelné režimy:

- 60 sekund
- 5 minut
- 1 hodina
- vlastní hodnota (budoucí rozšíření)

## Reakce emotikony (rozhodnuto — V1)

- Sada 6 reakcí: 👍 ❤️ 😂 😮 😢 🔥; max. 1 reakce na zprávu od uživatele
  (změna = přepis). Gestem dlouhého podržení bubliny (43).
- Technicky: reakce je **šifrovaná mini-zpráva** vázaná na `msgId`
  (stejná pipeline jako zpráva, payload = kód emoji) — server nevidí ani
  reakci, jen existenci.
- **Reakce dědí expiraci cílové zprávy** — shoří spolu s ní; na shořelou
  zprávu reagovat nelze.
- Nákladová poznámka (32 §8.3): reakce = 1 zápis + čtení u členů — proto
  limit 1/uživatel/zpráva a žádné vlastní emoji sady.

## Odkazy a jejich otevírání

- Odkaz je běžný text; klient jej zvýrazní. **Žádný server-side preview**
  (fetch náhledu = únik metadat o konverzaci třetí straně i nám — BM-3).
- Klientský „preview" jen z textu samotné URL: zvýrazněná doména,
  varování u punycode/zkracovačů.
- Otevření vždy s mezikrokem: celá URL + doména + potvrzení (stejný
  princip jako Join preview, 12) → systémový prohlížeč.
- **„Bezpečné otevření" (V4+, k rozhodnutí):** volitelný sandboxovaný
  náhled bez cookies, referreru a přihlášení. Velký kus práce s vlastním
  threat modelem — samostatné ADR, není součást V1–V3.

## Rozpracování

Tato kapitola definuje *typy a model* zprávy. Navazující detaily:

- Šifrovaná obálka a payload — [33-CRYPTO_PROTOCOL](33-CRYPTO_PROTOCOL.md) §2
- Stavy, doručení, offline — [08-CHAT_ENGINE](08-CHAT_ENGINE.md)
- Expirace a `readAt` — [34-TIME_AND_EXPIRY](34-TIME_AND_EXPIRY.md)
- Schéma dokumentu — [35-DATA_MODEL](35-DATA_MODEL.md) §3

Pozn.: konfigurovatelné delší okno (5 min / 1 h) je **placená funkce** (41),
default a jediný free režim je 60 s (N1 v 25).

## AI Coding Rules

- Server nikdy nepracuje s otevřeným obsahem.
- Klient je jediným místem dešifrování.
