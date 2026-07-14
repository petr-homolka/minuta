
# 16 — CLIENT_IOS (Draft v0.1)

Status: Draft

## Cíle

Nativní klient pro iPhone a iPad.

## Technologie

- Swift
- SwiftUI
- Firebase SDK
- Apple Secure Enclave
- Keychain

## Bezpečnost

- Ukládání klíčů v Secure Enclave / Keychain
- Face ID / Touch ID
- Jailbreak detekce
- Ochrana citlivých obrazovek při přepínání aplikací
- Certificate Pinning

## Omezení platformy

iOS neumožňuje spolehlivě zabránit pořizování screenshotů.
Aplikace může:
- upozornit na pořízení screenshotu (tam, kde to API umožňuje),
- skrýt citlivý obsah při přechodu do pozadí.

## Funkce

- Push notifikace přes APNs
- Share Sheet
- Kamera
- GPS
- Dokumenty

## Budoucí kapitoly

- Widgety
- Live Activities
- Apple Watch
- Optimalizace spotřeby
