
# 12 — MAGIC_LINKS (Draft v0.1)

Status: Draft

## Cíl

Umožnit rychlé založení soukromé konverzace bez znalosti uživatelského jména.

## Princip

1. Odesílatel vytvoří konverzaci (1:1 i Space, viz 11-SPACES — mechanismus je totožný).
2. Server vygeneruje jednorázový odkaz.
3. Odkaz lze sdílet libovolným kanálem.
4. Příjemce otevře odkaz.
5. Po ověření se připojí do konverzace.

## Parametry

- Platnost odkazu
- Maximální počet použití
- Volitelné heslo
- Jednorázové použití

## Bezpečnost

- Náhodný kryptograficky silný token.
- HTTPS pouze.
- Možnost okamžitého zneplatnění.

## QR pozvánka (grafická podoba magic linku)

QR kód je **druhá vizuální forma téhož magic linku** — žádný nový mechanismus.
Kóduje stejnou URL, dědí všechny parametry (platnost, max. použití, heslo,
jednorázovost) i revokaci: zneplatnění linku okamžitě zneplatní QR.
Funguje shodně pro 1:1 pozvánku i pro vstup do Space (11-SPACES).

### Vizuální specifikace

- **Logo aplikace uprostřed.** Technicky: QR generovat s korekcí chyb
  **úrovně H (~30 % redundance)**; logo smí překrýt **max. ~20 % plochy**
  (bezpečná rezerva pod limitem korekce), na podkladové dlaždici
  s odsazením, aby nerušilo moduly.
- **Klidová zóna** min. 4 moduly kolem kódu; vysoký kontrast (tmavé moduly
  na světlém podkladu; v dark mode invertovat podklad dlaždice, ne moduly).
- Minimální zobrazovaná velikost ~2,5 cm / 150 px pro spolehlivé skenování
  z ruky; u tisku vyšší.
- Pod kódem lidsky čitelný údaj: název pozvánky/Space a **zbývající platnost**.
- Brandové barvy jen pokud projdou testem skenovatelnosti (28-UX, design
  system); default černá/bílá.
- Každá vygenerovaná podoba QR projde automatickým ověřovacím dekódováním
  (test: vygeneruj → dekóduj → shoduje se URL), viz 21-TESTING.

### Použití

1. **Na obrazovce:** „Pozvat" → záložka QR; druhý účastník naskenuje
   fotoaparátem. Ideální tváří v tvář (schůzka, třída, párty).
2. **Obrázek ke sdílení:** export PNG/SVG s logem — pozvánka poslatelná
   jakýmkoli kanálem.
3. **Tisk:** plakát/vizitka — dává smysl hlavně pro **trvalé Spaces
   (placený tarif)**; u 24h Space na to upozornit („QR přestane platit
   za 23 h").

### Bezpečnost QR podoby

- QR nese tentýž kryptograficky silný token — bezpečnost se nemění,
  **mění se expozice**: vytištěný/vyfocený kód se šíří mimo kontrolu.
  Mitigace: platnost a max. počet použití jsou u QR ještě důležitější;
  UI je vyžaduje explicitně nastavit před exportem/tiskem.
- Obrazovkové QR se **obnovuje** (krátkoživotný token s automatickou
  rotací) — vyfocení obrazovky má omezenou hodnotu.
- Owner vidí seznam aktivních pozvánek a může kteroukoli okamžitě
  revokovat (11-SPACES).
- Skenování cizích QR: aplikace před vstupem vždy zobrazí náhled
  („Vstupuješ do Space ,Název' — 5 členů") a vyžádá potvrzení; nikdy
  nevstupuje automaticky.

## Budoucí rozšíření

- NFC
- Bluetooth párování
- Dynamické QR s animací (proti přeposílání fotografie)
