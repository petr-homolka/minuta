# Minuta

Messenger, kde **zpráva žije 60 sekund** a provozovatel nemá technickou
možnost číst obsah. Kompletní zadání: [zadani/00-INDEX.md](zadani/00-INDEX.md),
stav projektu: [CURRENT_STATE.md](CURRENT_STATE.md).

## Struktura repozitáře (31 §3)

| Složka | Obsah |
|---|---|
| `app/` | PWA klient — React 18 + TypeScript strict + Vite |
| `functions/` | Cloud Functions `/v1` (Node/TS, europe-west3) |
| `infra/` | Firestore Rules + TODO provisioning (Terraform) |
| `design/` | HTML návrhy obrazovek |
| `zadani/` | Zadávací specifikace (kapitoly 00–48) |

## Vývoj (výhradně proti emulátorům, 45 §1)

Prerekvizity: Node 20+, Java (Firestore emulátor). Pozor: JDK 21 na
některých Windows strojích padá na blokovaných AF_UNIX socketech
(`Unable to establish loopback connection`) — funguje **Temurin JRE 11**
(`winget install EclipseAdoptium.Temurin.11.JRE`). firebase-tools 15 bude
vyžadovat JDK 21+, pak nutno vyřešit (sledovat).

```sh
npm install            # celý workspace
npm run emulators      # Firebase Emulator Suite (Auth, Firestore, Functions; UI na :4000)
npm run dev            # Vite dev server (v druhém terminálu)
```

Přihlašovací magic linky v emulátoru nechodí e-mailem — najdeš je
v terminálu emulátoru nebo v Emulator UI (záložka Authentication).

## Kvalita

```sh
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit (strict)
npm test               # unit testy (Vitest; krypto vektory 33 §8)
npm run test:emu       # Rules + integrační testy proti emulátorům
```

## Zásady (výběr, závazné)

- Žádná vlastní kryptografie — jen libsodium dle [33](zadani/33-CRYPTO_PROTOCOL.md) (ADR-002).
- Server nikdy nevidí plaintext ani klíče; nic z toho nesmí do logů.
- Soubor ≤ 300 řádků, jedna odpovědnost ([31](zadani/31-CODING_STANDARDS.md)).
- Invarianty [42 §5](zadani/42-MVP_BLUEPRINT.md) nesmí padnout nikdy.
