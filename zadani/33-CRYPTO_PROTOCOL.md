# 33 — CRYPTO_PROTOCOL (Draft v0.1) — ADR-002

Status: Draft; **před spuštěním povinný externí bezpečnostní audit** (03).
Naplňuje N5 z 25-IMPROVEMENTS; nahrazuje obecné odkazy v 04-CRYPTOGRAPHY.

> Zásada: žádný vlastní algoritmus ani primitivum. Pouze hotové, auditované
> konstrukce z **libsodium** (klienti: libsodium.js / nativní vazby).
> Vlastní je jen *skladba* těchto konstrukcí — a ta podléhá auditu.

## 1. Klíčová hierarchie (na zařízení, nikdy na serveru)

| Klíč | Algoritmus | Životnost | Účel |
|---|---|---|---|
| Identity key (IK) | Ed25519 | život zařízení | podpisy obálek, prekeys, identita zařízení |
| Key-exchange key (KX) | X25519 | život zařízení | dlouhodobý DH |
| Signed prekey (SPK) | X25519, podepsaný IK | rotace ~7 dní | střednědobý DH |
| One-time prekeys (OPK) | X25519, dávka ~50 | jedno použití | dopředná bezpečnost prvního kontaktu |
| Message key (MK) | 32 B náhodných | ~minuty | šifrování jedné zprávy |
| Sender key (SK) | 32 B seed + Ed25519 | do změny členstva | zprávy ve Space (§4) |

Server publikuje pouze **veřejné** části (bundle zařízení: IK.pub, KX.pub,
SPK.pub + podpis, 1× OPK.pub). Privátní klíče žijí v Keystore / Secure
Enclave / (PWA: non-extractable, IndexedDB — přiznané riziko, 26 §limit 4).

## 2. Šifrování zprávy (1:1 i malé Spaces)

1. Odesílatel načte bundle každého zařízení příjemců; ověří podpis SPK proti IK.
2. Vygeneruje náhodný **MK**; obsah šifruje `crypto_aead_xchacha20poly1305_ietf`
   (nonce náhodná, AD = hlavička obálky).
3. Pro každé cílové zařízení: efemérní X25519 pár → `crypto_box_seal`-ekvivalent
   přes DH(ef., SPK/OPK) + HKDF → **zabalený MK** (wrap).
4. Obálku podepíše svým IK (Ed25519).

**Obálka (envelope), uložená na serveru:**

```
{ v: 1,                 // cryptoVersion — migrační kotva (N5)
  msgId, spaceId, senderUid, senderDeviceId,
  ephPub,               // efemérní veřejný klíč odesílatele
  wraps: { deviceId: wrappedMK, ... },
  sig,                  // Ed25519 podpis IK odesílatele přes celou obálku
  createdAt (server) }
```

Ciphertext obsahu je oddělený dokument gatovaný přes `readAt` (34, 36).

## 3. Dešifrování a crypto-shredding

1. Příjemce ověří `sig` proti známému IK odesílatele (37-DEVICE_TRUST).
2. Rozbalí MK svým privátním klíčem, dešifruje obsah **jen do RAM** (N2).
3. V `readAt + 60 s` klient **přepíše MK i plaintext v paměti nulami**
   (`sodium_memzero`) a odstraní obsah z UI. Server nezávisle smaže
   ciphertext (34). Zpráva je od té chvíle neobnovitelná — klíč ani obsah
   už nikde neexistují.

## 4. Spaces (sender keys)

- Každé zařízení člena si vytvoří **Sender Key** (seed symetrického řetězce
  + Ed25519 podpisový klíč) a distribuuje ho ostatním členům párovým
  kanálem z §2.
- Zprávy do Space šifruje jednou svým SK (odvozený MK na zprávu přes
  `crypto_kdf`, řetězení vpřed — starší MK nelze dopočítat).
- **Vstup i odchod člena = povinná rotace všech SK** (11-SPACES): odebraný
  člen nedešifruje budoucí zprávy; nový člen nedešifruje nic staršího —
  a historie beztak neexistuje (N2).
- Strop členů (11) je i výkonový strop rotace.

## 5. Bezpečnostní vlastnosti — poctivě

| Vlastnost | Stav v MVP | Poznámka |
|---|---|---|
| Důvěrnost vůči serveru | ✅ | server má jen obálky a ciphertext |
| Integrita/autenticita | ✅ | AEAD + Ed25519 podpisy |
| Dopředná bezpečnost (PFS) | ✅ prakticky | OPK + MK na zprávu + život obsahu ~min. |
| Post-compromise security | ⚠️ omezená | není Double Ratchet; kompromitace IK ⇒ nutná revokace zařízení (37). Vědomý trade-off, viz ADR. |
| Popiratelnost | částečná | podpisy vážou zařízení; vyhodnocení v auditu |

**ADR-002 (shrnutí):** libsodium konstrukce v MVP; `v` v obálce umožňuje
migraci na libsignal (nativní klienti) / MLS (velké Spaces) jako `v: 2+`
bez změny datového modelu. Důvod: pro prohlížeč neexistuje auditovaný
libsignal; hodnota ratchetu je u minutových zpráv nízká; auditovatelnost
jednoduché skladby je vyšší.

## 6. Ověření identity (vazba na 37, 40)

- **Bezpečnostní kód** konverzace = krátký otisk
  (`crypto_generichash` přes seřazené IK.pub obou stran), zobrazený jako
  12 číslic i QR — porovnání jiným kanálem / naskenováním.
- Identicon avatara (40) je odvozen z otisku IK — vizuální kotva identity.

## 7. Zakázáno (rozšiřuje 04)

- Jiná knihovna než libsodium bez nového ADR; WebCrypto jen jako zdroj
  entropie/UUID, ne pro protokol (konzistence napříč platformami).
- Znovupoužití nonce, cache MK, serializace plaintextu na disk, logování
  klíčů v jakékoli podobě (i v crash reportu — 39).

## 8. Testy (21)

- Test vektory pro wrap/unwrap, podpisy, KDF řetězec SK.
- Property test: žádná funkce nevrací plaintext po `readAt+60`.
- Fuzz obálek (poškozené `wraps`, cizí podpis, přehrání `msgId`).
