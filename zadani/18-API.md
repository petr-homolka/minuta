# 18 — API (Draft v0.2)

Status: Draft (přepis — úplný katalog). Dělba práce: čtení/zápis zpráv jde
**přímo přes Firestore + Rules** (36); API (Cloud Functions, `/v1`) kryje
operace, které Rules bezpečně nezvládnou (36 §4).

## 1. Zásady

HTTPS pouze; JSON; verzování `/v1`; Firebase ID token v `Authorization`;
idempotence přes `Idempotency-Key` hlavičku u všech POST; jednotný formát
chyby `{error: {code, message, retryable}}`; rate limity per uid + IP (27).

## 2. Katalog endpointů

### Spaces a pozvánky

| Endpoint | Účel | Pozn. |
|---|---|---|
| `POST /v1/spaces` | založit Space (duo i vícečlenný) | limity tarifu (11) |
| `POST /v1/spaces/{id}/burn` | spálit Space (owner) | N7 |
| `POST /v1/spaces/{id}/leave` | odejít | rotace SK signál (33 §4) |
| `POST /v1/spaces/{id}/members/{uid}/remove` | kick (admin+) | + rotace SK |
| `POST /v1/spaces/{id}/invites` | vytvořit pozvánku (platnost, maxUses, heslo) | 12 |
| `DELETE /v1/invites/{token}` | revokovat pozvánku | ruší i QR |
| `POST /v1/invites/{token}/join` | vstoupit (ověří hash, heslo, limity) | anonymní vstup N4 |
| `GET /v1/invites/{token}/preview` | náhled před vstupem („Space ,Název‘, 5 členů") | 12 §bezpečnost |

### Zprávy (doplněk k přímému Firestore přístupu)

| Endpoint | Účel |
|---|---|
| `POST /v1/messages/burn-all` | spálit vše (panic, N7) — smaže mé živé zprávy všude |
| `POST /v1/spaces/{id}/messages/{msgId}/report` | nahlásit (29) — zapíše důkaz do moderačního projektu |

### Zařízení a klíče

| Endpoint | Účel |
|---|---|
| `GET /v1/users/{uid}/key-bundles` | výdej prekey bundlů (jednorázovost OPK, 36 §4) |
| `POST /v1/devices/{id}/revoke` | revokace zařízení (37) |
| `POST /v1/devices/{id}/prekeys` | doplnění dávky OPK |

### Účet a tarif

| Endpoint | Účel |
|---|---|
| `POST /v1/account/upgrade-anonymous` | anonymní → plný účet (07) |
| `DELETE /v1/account` | smazání účtu (02 §DSR, kaskáda 35) |
| `GET /v1/account/export` | DSR export metadat (02) |
| `POST /v1/billing/webhook` | webhook platební brány → custom claims (41); podpis ověřen |
| `POST /v1/users/block` / `unblock` | blokace (27) |

### Systém

| Endpoint | Účel |
|---|---|
| `GET /v1/config` | minimální podporovaná verze klienta (force update, 20), feature flags |
| `GET /v1/health` | liveness pro monitoring (20) |

## 3. Chybové stavy

400 validace · 401 chybí/expiroval token · 403 nemáš oprávnění (i „Space
neexistuje" — nerozlišovat, ať neleakuje existence) · 404 jen u vlastních
zdrojů · 409 idempotentní konflikt · 410 pozvánka vypršela/vyčerpána ·
429 rate limit (s `Retry-After`) · 500 interní (bez detailů).

## 4. AI Coding Rules

- Nikdy nedůvěřovat klientovi; každý endpoint autorizuje operaci sám (22).
- Validace všech vstupů (schéma, délky, typy) před logikou.
- Žádný endpoint nikdy nevrací ani neloguje plaintext obsah či klíče.
- Response neprozrazuje existenci cizích zdrojů (viz 403 výše).

## 5. Budoucí kapitoly

- OpenAPI 3.1 specifikace (generovaná ze zdrojů, CI kontrola driftu)
- API testy kontraktů (21) · Telemetrie latencí (39 §2) · Audit (20)
