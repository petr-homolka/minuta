
# 15 — CLIENT_ANDROID (Draft v0.1)

Status: Draft

## Cíle

Nativní klient pro Android se zaměřením na bezpečnost a výkon.

## Technologie

- Kotlin
- Jetpack Compose
- Firebase SDK
- Android Keystore

## Bezpečnost

- Ukládání klíčů v Android Keystore
- Biometrické odemykání (volitelné)
- Detekce root zařízení
- Omezení pořizování screenshotů u citlivých obrazovek (FLAG_SECURE)
- Certificate Pinning
- Kontrola integrity aplikace (Play Integrity API)

## Funkce

- Offline fronta
- Push notifikace
- Sdílení souborů
- Fotoaparát
- GPS poloha

## Budoucí kapitoly

- Background synchronizace
- Správa více zařízení
- Optimalizace baterie
- Android Auto (volitelné)
