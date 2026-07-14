# 42 — MVP_BLUEPRINT (Draft v0.1)

Status: Draft — vstupní bod pro vývoj V1. Slepuje ostatní kapitoly do
jednoho postupu. Zdroj pravdy detailů je vždy odkazovaná kapitola.

## 1. Rozsah V1 (co stavíme)

PWA (React+TS+Vite, 14) · přihlášení e-mail+magic link, příjemce anonymně
(07, N4) · 1:1 i vícečlenný Space (11) · vstup magic linkem + QR (12) ·
textové zprávy E2EE (33) · expirace 60 s server-authoritative (34) ·
unsend/burn/burn-all (18, N7) · Známí (40) · nahlásit/blokovat minimálně
(27) · žádná historie (N2).

**Mimo V1:** přílohy (10/V2), nativní klienti (15,16/V2), push (13/V2 —
v PWA V1 jen in-app), placené tarify (41/V4), typing/presence (nikdy, 08 §8).

## 2. Architektura V1 (jedním pohledem)

```
PWA (Web Crypto entropie + libsodium.js)
  │  Firebase Auth (ID token)
  ├── Firestore `ephemeral`  ← přímé čtení/zápis zpráv, gate přes Rules (36)
  ├── Firestore `meta`       ← users, devices, contacts, aggregates
  ├── Cloud Functions `/v1`  ← join, spaces, key-bundles, burn-all, report (18)
  └── (Storage/FCM až V2)
```

Dvě databáze kvůli ADR-007 (35 §1). Vše šifrování na klientu (33).

## 3. Pořadí implementace (vertikální řezy, každý testovatelný)

1. **Skelet + Auth:** projekt (31), Firebase, magic link login, anonymní
   účet, registrace zařízení + klíče (07, 37). *Hotovo = přihlásím se, mám klíče.*
2. **Krypto jádro:** libsodium wrap/unwrap, obálka, podpisy, testy s vektory
   (33 §8). *Hotovo = zašifruju a rozšifruju mezi dvěma zařízeními (unit).*
3. **Data model + Rules + emulátorové testy** (35, 36). *Hotovo = Rules testy zelené.*
4. **1:1 zpráva end-to-end:** odeslání → obálka+payload → listener →
   otevření (readAt) → dešifrování → **odpočet 60 s → wipe** (08, 34).
   *Hotovo = zpráva doručena a po minutě neobnovitelná (E2E test 21).*
5. **Space + pozvánky + QR:** vícečlenný Space, sender keys, rotace,
   join přes token/QR (11, 12, 33 §4). *Hotovo = tři lidé v místnosti.*
6. **Kontrola odesílatele:** unsend, burn now, burn-all (18, N7).
7. **Známí + identita:** roster blob, identicon, safety code (40, 37 §4).
8. **T&S minimum:** report → moderační projekt, block, rate limity (27, 29).
9. **UX pass:** stavy, prstenec odpočtu, empty states, přístupnost (28).
10. **Zpevnění:** budget cap+alerty (32 §3), CSP/HSTS (17), VDP (20),
    force-update config (20), DPIA + audit krypto (02, 33).

## 4. Definition of Done pro V1 (exit kritéria, vazba na 23)

- [ ] Externí **audit kryptografie** (33) — bez blokujících nálezů.
- [ ] **DPIA** dokončena (02 §1).
- [ ] Penetrační test (20) — bez blokujících nálezů.
- [ ] E2E testy scénářů (21): registrace, konverzace, expirace, Space, QR join,
      revokace zařízení, burn-all.
- [ ] Rules testy (36 §5) zelené; žádný přístup k payloadu mimo okno.
- [ ] SLO měřená a plněná (20); náklad v rámci free tieru (32).
- [ ] Žádný obsah/klíče v logu (ověřeno); warrant canary + transparency
      report připraveny publikovat (20).
- [ ] Prohlášení o přístupnosti vč. výjimky 2.2.1 (28).

## 5. Klíčové invarianty (nesmí padnout nikdy)

1. Server nikdy nevidí plaintext ani klíče (33, 36).
2. `readAt` a expirace jen serverovým časem (34).
3. Payload nečitelný mimo `readAt+90 s` — vynuceno Rules (36), ne UI.
4. Plaintext jen v RAM, wipe v +60 s (33 §3).
5. Žádné skenování, vrátka, trvalá metadata (30) · žádné přidání zařízení
   serverem bez viditelnosti (37 §3).
6. Každá změna dotýkající se 1–5 = security review + čtvero očí (31 §9, 29).

## 6. Tech stack (souhrn)

Frontend PWA: React 18+, TypeScript strict, Vite, libsodium.js, Firebase JS SDK,
Service Worker. Backend: Firebase Auth, Firestore (×2), Cloud Functions
(Node/TS), FCM (V2). CI/CD: GitHub Actions — lint, typecheck, unit, Rules
emulator, E2E, security scan, staged deploy (20). Vše ≤ 300 řádků/soubor (31).
