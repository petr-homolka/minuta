# 07 — AUTHENTICATION (Draft v0.2)

Status: Draft (sloučená verze původních 07-AUTH.md a 07-AUTHENTICATION.md)

## Cíle

- Bezpečné ověření uživatelů, co nejméně invazivní z pohledu soukromí.
- Podpora více zařízení.
- Minimální množství osobních údajů.
- Architektura připravená pro miliony uživatelů.

## Podporované metody

- E-mail + Magic Link (výchozí)
- Google Sign-In
- Apple Sign-In
- Anonymní účet — pro příjemce pozvánky bez registrace (viz N4 v 25-IMPROVEMENTS)
- Budoucí podpora Passkeys (WebAuthn)

## Architektonické zásady

- Firebase Authentication jako primární poskytovatel identity.
- UID z Firebase je jediný interní identifikátor uživatele.
- Žádná hesla neukládat ve vlastní databázi.
- Oddělit identitu uživatele od obsahu komunikace.

## Zařízení

Každé zařízení:

- vlastní Device ID,
- vlastní pár kryptografických klíčů,
- možnost samostatné revokace (vzdálené odvolání).

## Magic Link (přihlášení)

1. Uživatel zadá e-mail.
2. Firebase odešle jednorázový odkaz.
3. Po ověření vznikne relace.
4. Po přihlášení proběhne registrace zařízení.

Pozn.: Magic link pro *vstup do konverzace* řeší samostatně 12-MAGIC_LINKS.

## Anonymní účet (příjemce pozvánky)

- Vzniká automaticky při otevření konverzačního magic linku bez přihlášení.
- Omezená práva: smí pouze odpovídat v konverzaci, do níž byl pozván
  (detaily v 27-TRUST_SAFETY).
- Povýšení na plný účet přidáním e-mailu (Firebase linking, UID se zachová).

## Role e-mailu (rozhodnuto)

E-mail od Minuty je vzácný, protože **pozvánky nikdy neposíláme my** —
magic link/QR do konverzace sdílí uživatel sám libovolným kanálem
(SMS, jiný chat, papír — 12). Systém odesílá e-mail pouze:

1. **Přihlašovací magic link** (Firebase) — jediný kritický e-mail.
2. Výjimečná provozní sdělení; newsletter jen opt-in a z oddělené domény.

Kvůli bodu 1 přesto platí minimum doručitelnosti: vlastní odesílací
subdoména (`auth.minuta.app`), SPF + DKIM + DMARC, sledování bounce rate
jako provozní metrika (20). Pojistky proti nedoručení: přihlášení
Google/Apple jako plnohodnotná alternativa, do budoucna passkeys —
a hlavně: **příjemce pozvánky e-mail vůbec nepotřebuje** (N4).

## Session Management

- Krátkodobé přístupové tokeny.
- Obnovovací token dle doporučení Firebase.
- Okamžitá revokace při kompromitaci.
- Odhlášení ze všech zařízení.

## Bezpečnost

- Ochrana proti brute-force
- Rate limiting
- Detekce podezřelých přihlášení
- Volitelná 2FA pro citlivé operace
- Audit administrativních operací

## Firestore

- /users
- /devices
- /sessions

## AI Coding Rules

- Žádná vlastní autentizace.
- Používat Firebase Auth SDK.
- Veškeré autorizace ověřovat i na serveru.
- Nikdy nedůvěřovat klientovi.

## Budoucí kapitoly

- Passkeys
- Multi-device
- Recovery
- Revocation
- Device Trust
- MFA
- Security Checklist

Předpokládaný rozsah finální verze: 30–50 stran.
