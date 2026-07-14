# 10 — ATTACHMENTS (Draft v0.2)

Status: Draft (přepis — technický model; funkce až V2 dle 23).
Vazby: 33 (klíče), 34 (expirace), 32 (náklady — egress se stane dominantou).

## 1. Model

Příloha je samostatný šifrovaný objekt v Cloud Storage; zpráva nese jen
referenci a klíč:

1. Klient vygeneruje náhodný **file key**; soubor šifruje streamovaně
   `crypto_secretstream_xchacha20poly1305` (chunky ~64 KB → podpora
   velkých souborů bez načtení do RAM, resume upload).
2. Upload přes krátkodobou signed URL vydanou Cloud Function (kontrola
   limitu tarifu, typu, velikosti).
3. File key putuje **uvnitř šifrovaného payloadu zprávy** (33) — server
   ho nikdy nevidí; reference = `attachmentId` + hash.
4. Náhled (obrázek/video): klient vygeneruje malý thumbnail, zašifruje
   týmž mechanismem; zobrazuje se v okně zprávy jako obsah.
5. Stažení: signed URL (Rules/CF ověří členství + okno `readAt+90 s`, 34);
   dešifrování lokálně, jen do RAM / dočasného šifrovaného souboru.
6. Expirace: objekt ve Storage má lifecycle pravidlo dle `expireAt`
   zprávy (úklidová funkce maže spolu s obálkou; TTL pojistka).

## 2. Formáty a limity

| | Free (V2) | Placené |
|---|---|---|
| Obrázky (JPEG/PNG/HEIC→JPEG) | ≤ 5 MB, komprese na klientu | ≤ 25 MB |
| Dokumenty (PDF) | — | ≤ 25 MB |
| Video/audio (MP4/M4A) | — | ≤ 100 MB, bez streamování v první verzi |
| Ostatní (ZIP…) | — | dle tarifu |

Komprese/downscale vždy na klientu (nákladový i privacy důvod — EXIF
a metadata souboru se **odstraňují před šifrováním**; poloha ve fotce
je metadata leak).

## 3. Bezpečnost

- Server nikdy nepracuje s otevřeným souborem; žádné serverové náhledy,
  žádná konverze, žádný antivirus nad plaintextem (nelze — E2EE).
  Ochrana příjemce: typ/velikost deklarované v šifrovaném payloadu,
  klient varuje před spustitelnými typy a neotevírá je inline.
- Moderace: nahlášení přikládá dešifrovaný soubor se souhlasem
  nahlašujícího (29 §1.1) — jediná cesta.

## 4. Náklady (32 doplněk)

Egress je dominanta: 1M uživatelů × 5 fotek/den × 1 MB ≈ jednotky TB/měs.
Mitigace: agresivní klientská komprese, thumbnaily (plný soubor se stahuje
až na klepnutí), limity tarifů, CDN cache nedává smysl (unikátní šifrované
objekty s minutovým životem). Přepočet tabulky 32 §8 před spuštěním V2.

## 5. Budoucí kapitoly

- Streamované přehrávání videa (range requests nad šifrovanými chunky)
- Resume upload UX · Vícenásobné přílohy · Hlasové zprávy (V3, 23)
