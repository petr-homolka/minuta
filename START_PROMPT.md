# První prompt pro realizaci Minuty (zkopíruj do nového vlákna Claude Code)

---

Zahajujeme realizaci projektu **MINUTA** — messenger, kde zpráva žije 60 sekund.

## Kde najdeš zadání

- Pracovní adresář: `C:\_____ClaudeAI\__minuta\`
- **Kompletní zadávací dokumentace: `zadani\` — začni souborem `zadani\00-INDEX.md`**
  (rozcestník, 49 kapitol). Stav projektu: `CURRENT_STATE.md`.
- Pro dnešní práci čti v tomto pořadí: `00-INDEX` → `42-MVP_BLUEPRINT` (postup
  a invarianty) → `22-AI_CODING_CONSTITUTION` + `31-CODING_STANDARDS` (závazná
  pravidla) → `33-CRYPTO_PROTOCOL`, `35-DATA_MODEL`, `36-FIRESTORE_RULES`,
  `07-AUTHENTICATION`, `37-DEVICE_TRUST` (týkají se dnešního řezu).
  Ostatní kapitoly načítej až podle potřeby — šetři kontext (31 §10).

## Úkol: Řez 1 dle `42-MVP_BLUEPRINT.md` §3 — „Skelet + Auth"

1. `git init` v `C:\_____ClaudeAI\__minuta\` (zadani/, CURRENT_STATE.md a kód
   patří do jednoho repa; navrhni .gitignore a strukturu dle 31 §3 —
   feature-based, monorepo: `app/` PWA, `functions/`, `infra/`, `design/`).
2. Skelet PWA: React 18 + TypeScript **strict** + Vite (14).
3. **Firebase Emulator Suite** (Auth, Firestore, Functions) — vývoj běží
   výhradně proti emulátorům, žádný reálný Firebase projekt ani billing teď
   nepotřebujeme (45 §1).
4. Přihlášení: e-mail magic link + anonymní účet (07); po přihlášení
   registrace zařízení — generování klíčů **libsodium.js** (IK/KX/SPK/OPK
   dle 33 §1) a publikace veřejného bundle do `meta` DB (35 §2).
5. Testy: unit pro klíčové utility (test vektory, 33 §8) + emulátorový test
   registrace zařízení. Hotovo = přihlásím se, zařízení má klíče, testy zelené.

## Závazná pravidla (na co si dát pozor)

- **Nikdy vlastní kryptografie** — jen libsodium konstrukce z 33; žádná jiná
  krypto knihovna bez nového ADR.
- **Soubor ≤ 300 řádků, jedna odpovědnost** (31 §2); TypeScript strict, žádné `any`.
- **Server/logy nikdy nevidí plaintext ani klíče** — ani v testech, ani v console.log.
- **Invarianty 42 §5 nesmí padnout nikdy**; cokoli z `30-BLACKMINUTE.md`
  (skenování, vrátka, trvalá metadata) nenavrhuj — je to incident, ne feature.
- Region všeho: **europe-west3** (ADR-009). Dvě Firestore databáze
  `meta`/`ephemeral` (ADR-007) — v emulátoru simuluj oddělením, zapiš TODO do infra.
- Čas jen serverový (ADR-008) — do klienta nikdy nedávej logiku spoléhající
  na lokální hodiny pro expiraci.
- Odchylka od zadání = nejdřív návrh ADR a zeptej se mě, pak kód.

## Kam dokumentovat

- Po dokončení řezu aktualizuj `CURRENT_STATE.md` (stav, co funguje, další krok).
- Architektonická rozhodnutí: nový ADR řádek do `zadani\24-APPENDIX.md`.
- Každý modul: krátká mapa nahoře v souboru / README složky (31 §3).
- Commituj po logických celcích s jasnými zprávami; `zadani\` commitni jako
  první commit („spec v1").

Začni tím, že přečteš uvedené soubory, shrneš mi plán řezu 1 (max 15 řádků)
a po mém odsouhlasení stavíš.

---

*Pozn.: až řez 1 poběží, pokračují řezy 2–10 dle 42 §3; HTML návrhy
(klient, backstage, web) jsou v artefaktech — odkazy v CURRENT_STATE.md —
a patří do `design/`.*
