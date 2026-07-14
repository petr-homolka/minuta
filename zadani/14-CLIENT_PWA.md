
# 14 — CLIENT_PWA (Draft v0.1)

Status: Draft

## Cíl

Vytvořit plnohodnotného webového klienta instalovatelného jako PWA.

## Technologie

- React
- TypeScript
- Vite
- Firebase SDK
- Service Worker

## Požadavky

- Instalace na Windows, macOS, Android
- Offline cache aplikace
- Automatické aktualizace
- Responzivní rozhraní

## Bezpečnost

- CSP
- HTTPS
- Secure Storage
- Žádné ukládání otevřeného obsahu do LocalStorage

## Kompatibilitní matice (minimální podpora)

| Prohlížeč | Min. verze | Pozn. |
|---|---|---|
| Chrome / Edge (desktop, Android) | 110+ | plná podpora vč. instalace |
| Safari (macOS, iOS) | 16.4+ | Web Push a PWA instalace až od 16.4 |
| Firefox | 115+ (ESR) | bez instalace na desktopu (jen záložka) |
| Ostatní / starší | — | zdvořilá stránka „nepodporováno" (níže) |

Povinné API (feature-detect při startu, žádné krypto polyfily):
`crypto.getRandomValues`, WebAssembly (libsodium.js), IndexedDB,
Service Worker, `backdrop-filter` volitelně (bez něj flat mode, 43).

Nepodporovaný prohlížeč: aplikace se **nespustí v degradovaném režimu**
(bezpečnost necouvá) — zobrazí vysvětlení a seznam podporovaných
prohlížečů. Detekci testovat v CI na matici výše (21).

## Budoucí kapitoly

- Offline fronta
- Background Sync
- IndexedDB strategie
- Výkonnostní rozpočty
- Přístupnost (WCAG)
