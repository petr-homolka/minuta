# 13 — NOTIFICATIONS (Draft v0.2)

Status: Draft (přepis — doplněn payload model, quiet hours, kolapsování).

## 1. Zásada

Notifikace nikdy nenese obsah — a v Minutě ani **jméno odesílatele**
(zamčená obrazovka je metadata leak). Notifikace říká jen: „máš důvod
otevřít aplikaci".

## 2. Payload model

- **Data-only push** (FCM data message / APNs background + alert bez těla):
  `{type, spaceId}` — nic víc. Text notifikace je generický, lokalizovaný
  klientem: „Nová zpráva" / „Dění ve Space".
- Detail (kdo, co) se uživatel dozví až po odemčení aplikace a stažení
  obálek (08). Trade-off přiznaný: horší UX než jmenovité notifikace,
  konzistentní s produktem.
- Nativní klienti (V2+): zvážit Notification Service Extension (iOS) /
  lokální dekoraci (Android), která po probuzení stáhne obálku a lokálně
  doplní jméno **jen do odemčeného zařízení** — ADR až s nativními klienty.

## 3. Události

| Událost | Push | Pozn. |
|---|---|---|
| Nová zpráva | ✅ kolapsovaná per Space | collapse key = spaceId (jedna notifikace na Space) |
| Přidání do Space | ✅ | |
| Nové zařízení na účtu | ✅ vždy, vysoká priorita | bezpečnostní (37 §2) |
| Revokace zařízení | ✅ na revokované i ostatní | |
| Space brzy vyhoří (placený→free downgrade) | ✅ | 41 §2 |
| Force update | ✅ | 20 §Release |

## 4. Pravidla doručování

- Rate limit: max N pushů na uživatele/hodinu, kolapsování dle §3.
- **Quiet hours:** klientské nastavení (výchozí 22–7 lokálního času) —
  filtruje se na klientu (server čas pásmo nezná a znát nemá).
- Odesílá výhradně Cloud Function po zápisu obálky (event-driven, 19);
  požadavky podepsané, ověření identity příjemce dle FCM tokenů zařízení.
- FCM tokeny: per zařízení, mažou se s revokací (37) a rotují dle SDK.

## 5. Bezpečnost

Push kanál je nedůvěryhodný transport třetí strany (Google/Apple) —
proto v něm nesmí být nic citlivého (§1). Kompromitace push kanálu
vyzradí jen existenci aktivity, ne obsah ani protistrany (26).

## 6. Budoucí kapitoly

- Priorita/kanály notifikací per Space · Šifrované pushe s lokální
  dekorací (§2) · Offline dosync po dlouhém spánku zařízení
