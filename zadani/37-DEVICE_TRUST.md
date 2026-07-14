# 37 — DEVICE_TRUST (Draft v0.1)

Status: Draft. Řeší bílá místa: změna klíčů z pohledu protistrany,
ověření identity, multi-device. Vazby: 07, 33, 40.

## 1. Model: zařízení je občan první kategorie

- Účet (uid) = identita u Firebase; **kryptografická identita = zařízení**
  (IK, 33 §1). Uid spojuje zařízení, ale důvěra se váže ke klíčům.
- Každé zařízení je plnohodnotný peer: odesílatel balí MK pro každé
  aktivní zařízení příjemce zvlášť (33 §2). Žádná synchronizace historie
  neexistuje (N2) — multi-device je tím triviální: nové zařízení prostě
  dostává budoucí zprávy.

## 2. Registrace nového zařízení

1. Přihlášení (07) → zařízení vygeneruje klíče lokálně → publikuje bundle.
2. Uživatel vidí seznam svých zařízení (platforma, datum) a může kterékoli
   **revokovat** (okamžitě: CF označí `revoked`, zařízení mizí z `wraps`
   budoucích zpráv a jeho tokeny se ruší).
3. Notifikace „Nové zařízení na tvém účtu" na všechna stávající zařízení
   (13) — pokud nové zařízení nepřidal uživatel, jedno klepnutí = revokace
   + odhlášení všech relací.

## 3. Změna klíčů z pohledu protistrany (key change)

- Klient si lokálně pamatuje známé IK protistran (TOFU — trust on first use).
- Objeví-li se u protistrany **nové zařízení / nový IK**, konverzace zobrazí
  nepřehlédnutelný, ale klidný banner: „Klíče {jméno} se změnily —
  nové zařízení, nebo nový telefon. Ověř, pokud si chceš být jistý."
- Do potvrzení banneru se u zpráv zobrazuje indikátor neověřeného klíče.
  Odesílání se **neblokuje** (UX priorita), ale banner nelze skrýt jinak
  než potvrzením či ověřením.
- Tichá výměna klíčů serverem je tím detekovatelná — obrana BM-2 (30);
  Rules navíc zakazují update publikovaných klíčů (36 §3).

## 4. Ověření (safety code)

- Bezpečnostní kód konverzace (33 §6): 12 číslic + QR. Shoda = ověřeno;
  stav „ověřeno ✓" se ukládá lokálně a resetuje při změně IK.
- Ověření je volitelné; UI ho nabízí kontextově (po key change, u citlivých
  konverzací), nikdy nevnucuje.

## 5. Ztráta zařízení

1. Uživatel se přihlásí jinde (magic link) → revokuje ztracené zařízení.
2. Historie neexistuje → žádná data k obnově (N2); kontakty se obnoví
   z šifrovaného blobu (40).
3. Protistrany dostanou key change banner (§3) — správné a žádoucí chování.
4. Nález zařízení útočníkem: bez odemčení zařízení nic (Keystore/Enclave);
   po revokaci nedostane ani budoucí zprávy.

## 6. Limity a úklid

- Max. aktivních zařízení na účet: 5 (free) / více (placené, 41).
- Zařízení bez aktivity > 90 dní: automatická revokace + informace uživateli.
- Revokovaná zařízení se čistí z `wraps` a členských `deviceIds` (35).
