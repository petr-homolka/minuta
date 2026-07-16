# MINUTA — Aktuální stav projektu

Aktualizováno: 2026-07-15

## Fáze

**VŠECH 10 ŘEZŮ MVP (42 §3) HOTOVO.** Skelet + Auth · Krypto jádro ·
Data model + Rules · 1:1 zpráva E2E · Space + pozvánky + QR · Kontrola
odesílatele · Známí + identita · T&S minimum · UX pass · **Zpevnění**.
Repo: https://github.com/petr-homolka/minuta

**Produktová revize (ADR-013, ADR-014):** anonymní účet smí **zakládat
konverzace i pozvánky** (bez e-mailu — ochrana je App Check + rate
limity, ne e-mailová brána; e-mail je volitelný upgrade). Nepřečtená
zpráva vyprší default za **1 h** (dřív 24 h; konfigurovatelné do 24 h
stropu). **Odchod účastníka = zánik celé místnosti** (`leaveSpace` CF —
smaže zprávy, členy, pozvánky i Space; kdokoli člen může ukončit pro
všechny). Tok „klikni → pošli QR → druhý klikne → píšete si → odchod
zháší místnost" je tím kompletní.

## Co funguje (ověřeno testy i ručně v prohlížeči)

- **Monorepo:** `app/` (PWA React 18 + TS strict + Vite), `functions/`
  (skelet, europe-west3), `infra/` (Rules), `design/` (zatím TODO), `zadani/`.
- **Emulátory:** Auth + Firestore + Functions (`npm run emulators`,
  projekt `demo-minuta` — čistě offline). Vyžaduje Javu — pozor, JDK 21
  na tomto stroji padá, funguje Temurin 11 (viz README).
- **Přihlášení (07):** e-mail magic link (v emulátoru odkaz přes
  Emulator UI / REST `.../oobCodes`) i anonymní účet.
- **Registrace zařízení (37 §2, 33 §1):** po přihlášení libsodium
  vygeneruje IK/KX/SPK + 50 OPK; privátní klíče v IndexedDB, veřejný
  bundle v `meta` DB (`users/{uid}/devices/{deviceId}` + `prekeys/*`).
- **Rules `meta` (36 §3):** jen vlastní data; update publikovaných klíčů
  zakázán (BM-2); revokace jen `revoked:true`; prekeys create-only;
  `tier` z klienta nezapisovatelný.
- **Rules `ephemeral` (řez 3, 36 §2 + 34):** default deny; zprávu odešle
  jen člen svým jménem se serverovým časem; otevření = jediný povolený
  update (null→`request.time`, jen příjemcem, jednorázově); payload
  čitelný VÝHRADNĚ v okně `readAt+90 s` (počítáno v Rules — invariant
  42 §5.3); unsend jen odesílatel; spaces/members/invites jen přes CF.
  `expireAt` (TTL pojistka) přes uvolněný koridor (now, ~24 h] — ADR-011/014.
- **Krypto jádro (řez 2, 33 §2–3):** `app/src/lib/crypto/` — MK + obsah
  XChaCha20-Poly1305 (AD = kanonická hlavička), wrap MK `crypto_box_seal`
  na SPK (ADR-010), obálka v1 podepsaná IK, `sealMessage`/`openMessage`
  mezi zařízeními, wipe (memzero). OPK cílení až s CF výdejem (řez 4).
- **1:1 zpráva end-to-end (řez 4):** klient `features/chat/` — odeslání
  (obálka+payload batch), realtime listener, otevření (zámek `readAt`),
  TOFU známých IK (37 §3, změna = chyba), odpočet 60 s → wipe. Ověřeno
  v prohlížeči: doručeno, otevřeno, „shořelo".
- **Space + pozvánky + QR (řez 5):** vícečlenný Space (strop 16 free,
  3 aktivní/účet), skupinová zpráva párovými wraps (ADR-012). Cloud
  Functions `createSpace`, `createInvite`/`previewInvite`/`joinSpace`/
  `revokeInvite` (jen hash tokenu v DB, heslo scrypt, maxUses, TTL),
  `getSpaceKeyBundles`. Klient: link `#join=…` + QR (korekce H),
  **náhled před vstupem s explicitním potvrzením** (12 §bezpečnost),
  hashchange listener, reset navigace při změně účtu. Ověřeno v prohlížeči:
  vytvoření pozvánky, QR, vstup přes náhled, odeslání zprávy.
- **Kontrola odesílatele (řez 6, N7):** unsend (odvolat nepřečtenou),
  burn now (spálit během hoření), stav „přečteno HH:MM · shořelo",
  burn-all — CF `burnAll` smaže všechny mé živé zprávy ve všech Spaces
  (collection-group dotaz, chunkované batche); v UI dvoukrokové potvrzení.
- **Známí + identita (řez 7, 40 + 37):** šifrovaný roster — roster key
  zabalený per zařízení (seal na SPK), záznamy pod NÁHODNÝMI ID (server
  nevidí páry, jen počet); „Napsat Známému" = duo přímo přes `peerUid`
  (40 §2). Identicon 5×5 z otisku IK; bezpečnostní kód 12 číslic + QR
  (33 §6), „ověřeno ✓" vázané na konkrétní IK; key-change už není tvrdá
  chyba, ale banner s volbou „Důvěřovat novým klíčům" (37 §3).
- **T&S minimum (řez 8, 27 + 29):** nahlášení běžící zprávy — klient se
  souhlasem zapečetí dešifrovaný obsah na veřejný klíč moderace
  (crypto_box_seal; CF ani DB plaintext nevidí), CF uloží s kategorií
  C1–C6, prioritou a retencí 90 d; klientům nedostupné (default deny);
  po nahlášení se zpráva u nahlašujícího hned uhasí. Blokace: dokumenty
  `users/{uid}/blocks` (owner-only), vynuceno v CF — žádné nové duo,
  žádný výdej bundlů, pozvánka od/pro blokovaného neplatí; klient skrývá
  obálky. Anonymní účet nezakládá Spaces/pozvánky — jen vstup a odpověď
  (27/N4). Rate limity: hodinová okna v CF (createSpace 10, invites 10,
  join 30, reports 20). Dev klíč moderace: public v kódu, secret v
  `infra/moderation-dev-secret.local` (mimo git).
- **UX pass (řez 9, 28 + 43):** stavy zpráv PŘESNĚ dle tabulky 28
  (✓✓ doručeno · „Čte se… ⏱" se zrcadlovým mini-ringem · „Přečteno
  HH:MM · Shořelo HH:MM" · „⌛ Zpráva shořela"); TimeRing 60→0 s
  (posledních 10 s ember #FF4D2E, číslo vždy — nikdy jen barva);
  empty state „Zprávy tu žijí jen minutu."; aria-live oznámení
  (otevření/30 s/10 s/shořelo) + aria-labels + focus-visible; „Sklo
  a čas" MVP vrstva (dýchající ambient, skleněné bubliny, animace jen
  transform/opacity, flat mode přes prefers-reduced-motion); Service
  Worker (vite-plugin-pwa, autoUpdate, jen app shell — obsah nikdy).
  Ověřeno naživo v prohlížeči. Nasazeno na web.app.
- **Zpevnění (řez 10, 17 + 20):** bezpečnostní hlavičky na Hostingu —
  CSP (script-src 'self' + 'wasm-unsafe-eval' pro libsodium WASM,
  connect-src jen Firebase endpointy, frame-ancestors 'none'), HSTS,
  nosniff, Referrer-Policy no-referrer, Permissions-Policy; VDP:
  `/.well-known/security.txt` (safe harbor); force update / kill switch:
  CF `getConfig` čte `config/client` (klientům nedostupný, změna = čtyři
  oči 29 §1.4), klient s nižší verzí = hard block, síťová chyba =
  fail-open. Ověřeno na web.app včetně WASM pod CSP.
- **Testy:** `npm test` — 32 unit; `npm run test:emu` — 37 integračních.
  Lint i typecheck zelené.

## Reálný Firebase projekt (dev)

- `minuta-dev-fb2e6` (alias `dev`), Firestore `(default)` v **europe-west3**,
  Auth: e-mail magic link + anonymní. Plán Spark, žádný billing.
- **Nasazeno na https://minuta-dev-fb2e6.web.app** (`npm run deploy:dev`) —
  ověřeno: anonymní přihlášení + registrace zařízení proti reálné DB.
- Cloud build: `app/.env.devcloud` (veřejné identifikátory, commitnuto);
  bez env vars běží build v DEV proti emulátorům jako dřív.
- Vlastní doména (dev.minuta.cz / minuta.cz) zatím odložena.

## Známé odchylky / TODO

- Firestore emulátor neumí dvě databáze → jednodatabázová prostředí
  (emulátor, minuta-dev) používají **generované kombinované Rules**
  (`npm run rules:dev` → `infra/firestore.dev.rules`); zdroj pravdy jsou
  per-DB soubory. Produkce = vždy dvě pojmenované DB (ADR-007).
- **Cloud Functions nejsou nasazené na minuta-dev** (Spark neumožňuje
  deploy CF; potřeba Blaze) → chat na web.app zatím nefunguje, jen
  lokálně proti emulátorům. Auth + registrace zařízení na webu fungují.
- OPK cílení (jednorázový výdej s `consumed`) zatím není — balí se na SPK
  (ADR-010); s CF výdejem později (rate limit 27).
- Rotace klíčů při odchodu/kicku (11 §Krypto): u párových wraps je rotace
  inherentní (odebraný člen prostě není ve wraps), ale kick/leave CF
  a systémové zprávy o změně členství přijdou v pozdějším řezu.
- Offline outbox (08 §2) zatím není; UI banner key change (37 §3) — teď
  tvrdá chyba; multi-device otevření „otevřeno jinde" jen hrubě.
- QR: logo uprostřed + auto-ověřovací dekódování (12 §QR) až UX pass.
- Service Worker / instalovatelnost PWA: až UX pass (řez 9).
- `design/` čeká na zkopírování HTML artefaktů (odkazy níže).
- Bundle ~1,4 MB (Firebase SDK + libsodium) — code-split až při UX passu.

## Interaktivní dema (artefakty ze specifikace)

- Klient „Sklo a čas": https://claude.ai/code/artifact/9fa96812-653b-4917-ae7c-ed45b5b44b9d
- Backstage konzole: https://claude.ai/code/artifact/c332b37b-3ed0-4595-a88f-1246520effb3
- Marketingový web (46): https://claude.ai/code/artifact/77c44b41-0f8a-4da6-85eb-9f2c7e631ca5

## Další krok — cesta k V1 (exit kritéria 42 §4)

Kód MVP je kompletní. Zbývá (většina mimo kód):

1. **Provisioning (45):** Blaze na minuta-dev (nasazení CF → chat na
   webu), poté Terraform: staging/prod, dvě pojmenované DB (`ephemeral`
   PITR/backup OFF — ověřit!), TTL politiky, collection-group indexy,
   budget 5 €/měs + alerty (32 §3), oddělený moderační projekt,
   App Check, doména + odesílací e-mail.
2. **Externí:** audit kryptografie (33), penetrační test, DPIA (02),
   prohlášení o přístupnosti (28), warrant canary + transparency report
   (20), status page + expiry canary.
3. **Kódové dluhy před V1:** i18n katalog (28 — texty natvrdo česky),
   OPK jednorázový výdej, offline outbox (08 §2), kick/leave + rotace
   signál, code-split bundle (~1,4 MB), CI pipeline (GitHub Actions, 20),
   plné 3D efekty ze 43, zpráv/min limit (App Check / CF-send).
