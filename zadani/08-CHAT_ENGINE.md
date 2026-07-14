# 08 — CHAT_ENGINE (Draft v0.2)

Status: Draft (přepis osnovy v0.1 — doplněn realtime, offline a stavy).
Vazby: 33 (šifrování), 34 (čas/expirace), 35 (model), 36 (Rules).

## 1. Doručovací kanál

- **MVP: Firestore realtime listenery.** Klient poslouchá `messages`
  **jen v právě otevřeném Space**; seznam konverzací poslouchá jen
  metadata Spaces, ne zprávy. Odchod z obrazovky = odpojení listeneru
  (nákladový guardrail 32 §4).
- Push (13) budí klienta, když neposlouchá; obsah nikdy nenese.
- Alternativa WebSocket brány na Cloud Run: až od výkonnostní hranice
  (Fáze 2+, ADR), rozhraní klienta na tom nesmí záviset.

## 2. Odeslání zprávy (pipeline)

1. Klient sestaví obsah → zašifruje (33 §2) → `msgId = UUID v7` (klient,
   idempotence).
2. Zápis obálky + payloadu v jedné batch operaci (Rules 36 vynutí tvar
   a serverové časy).
3. Selhání sítě → **outbox**: zašifrovaná obálka čeká v lokální frontě
   (IndexedDB/úložiště aplikace — plaintext se do outboxu nikdy neukládá),
   retry s exponenciálním backoffem; `msgId` zaručuje, že opakovaný zápis
   nevytvoří duplikát.
4. Outbox se vyprázdní i na pozadí (Background Sync ve 14; WorkManager 15).

## 3. Stavy a potvrzení

Stavový automat je závazně definován v 34 §4; klientská UI tabulka v 28.

- `deliveryState` se neukládá per příjemce (metadata šetříme, 32 §8.3
  bod 3): „doručeno" = obálka zapsána; „otevřeno" = `readAt` existuje.
- Ve Spaces (11) se zobrazuje jen „otevřeno ×N" (počet), ne jmenný seznam
  (metadata minimalizace + jednodušší model).

## 4. Řazení a konzistence

- Pořadí zpráv: `createdAt` (serverový čas, 34) — jediný zdroj pravdy.
- Eventual consistency listenerů je akceptovaná (zprávy se mohou objevit
  s prodlevou stovek ms); UI nikdy nepřeskládává už zobrazené pořadí.

## 5. Offline chování

- **Odchozí:** outbox (§2).
- **Příchozí:** offline se nikdy nestahuje payload (34 §5) — obálky se
  synchronizují při připojení; otevření vyžaduje síť. Záměr (N2).
- Ztráta spojení během čtení: obsah už je v RAM, dohoří lokálně (34 §5).

## 6. Typy zpráv

MVP: text (UTF-8, ≤ 4 000 znaků), systémové události (vstup/odchod člena,
rotace klíčů — generuje server, nešifrují se, neobsahují obsah).
V2+: obrázek, dokument, audio, video, poloha, kontakt (10-ATTACHMENTS);
každý typ jede stejnou pipeline — liší se jen payload a příloha.

## 7. Výkonové cíle (SLO, 20)

- Latence doručení obálky (zápis → listener příjemce): **p95 < 2 s**.
- Otevření zprávy (klepnutí → zobrazený plaintext): **p95 < 1 s** na 4G.
- Měření agregovaně dle 39 §2.

## 8. Co v enginu záměrně není

Typing indikátor, online presence, potvrzení „viděno" per člen, reakce,
odpovědi-vlákna, forward (26: forward u E2EE stejně nevynutitelný — obsah
lze opsat; nepředstírat ochranu). Každé rozšíření = ADR + přepočet 32.
