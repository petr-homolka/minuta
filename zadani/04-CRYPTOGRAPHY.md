
# 04 — CRYPTOGRAPHY (Draft v0.2)

> Pracovní návrh kryptografické architektury projektu Minuta.

## Cíl

Cílem projektu není vytvořit novou kryptografii, ale správně použít veřejně
auditované algoritmy a protokoly tak, aby provozovatel služby neměl přístup
k obsahu komunikace.

## Základní principy

- Používat pouze standardizované algoritmy.
- Nikdy nevytvářet vlastní šifrovací algoritmy.
- Oddělit šifrování dat od správy identit.
- Kryptografické klíče nesmí být běžně dostupné serveru.

## Doporučené stavební prvky

### End-to-End šifrování

Preferovaným základem je Signal Protocol nebo jiný stejně kvalitní,
veřejně auditovaný protokol.

### Symetrické šifrování

- AES‑256‑GCM

### Asymetrické operace

- X25519 (výmena klíčů)
- Ed25519 (digitální podpisy)

Architektura musí umožnit budoucí migraci na postkvantové algoritmy.

## Správa klíčů

Každé zařízení má vlastní sadu klíčů.

Server:

- neuchovává dešifrovací klíče,
- nemůže běžně dešifrovat obsah,
- přenáší pouze šifrovaná data.

## Mazání zpráv

Doporučený model:

1. Zpráva je zašifrována na zařízení odesílatele.
2. Server uloží pouze šifrovaný obsah.
3. Po otevření zprávy začne běžet časovač.
4. Po uplynutí nastavené doby je odstraněn šifrovací materiál potřebný pro běžný přístup ke zprávě a server odstraní šifrovaný objekt podle retenčních pravidel.

Poznámka:
Přesná implementace musí být ověřena bezpečnostním auditem.

## Zakázané postupy

- vlastní kryptografie,
- pevně zakódované klíče,
- ukládání privátních klíčů v otevřené podobě,
- používání zastaralých algoritmů.

## Rozpracování

Konkrétní protokol (klíčová hierarchie, obálka, sender keys, crypto-shredding):
**[33-CRYPTO_PROTOCOL.md](33-CRYPTO_PROTOCOL.md) (ADR-002)**. Původně plánované
kapitoly jsou pokryty takto:

- Key Rotation, PFS, kryptografické testy — 33 §1, §5, §8
- Recovery Keys — **bezpředmětné**: historie neexistuje (N2 v 25), není co obnovovat
- Multi-device — 37-DEVICE_TRUST
- Přílohy — 10 §1 · Skupinové konverzace — 33 §4 + 11-SPACES
- Postkvantová migrace — pole `v` v obálce (33 §2), samostatné ADR v budoucnu

---

Předpokládaný rozsah finální verze: 40–60 stran.
