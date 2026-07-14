# 36 — FIRESTORE_RULES (Draft v0.1)

Status: Draft — návrh k implementaci a testům (Rules jsou kód: patří do
repozitáře, verzují se a testují emulátorem, 21). Model: 35-DATA_MODEL,
časová logika: 34.

## 1. Principy

- **Default deny.** Vše nepovolené je zakázané.
- Klient smí jen to, co je bezpečné i při plné kompromitaci klienta
  (nikdy nedůvěřovat klientovi — 18, 22).
- Operace s vedlejšími účinky mimo vlastní data (konzumace pozvánky,
  výdej prekey, založení Space, moderace) jdou **přes Cloud Functions**
  (Admin SDK Rules obchází; autorizuje funkce sama).

## 2. Návrh Rules — `ephemeral` databáze

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {

    function signedIn() { return request.auth != null; }
    function isMember(spaceId) {
      return exists(/databases/$(db)/documents/spaces/$(spaceId)/members/$(request.auth.uid));
    }
    function role(spaceId) {
      return get(/databases/$(db)/documents/spaces/$(spaceId)/members/$(request.auth.uid)).data.role;
    }

    match /spaces/{spaceId} {
      allow get: if signedIn() && isMember(spaceId);
      allow list: if false;                    // žádný výpis cizích Spaces
      allow create, update, delete: if false;  // jen Cloud Functions

      match /members/{uid} {
        allow read: if signedIn() && isMember(spaceId);
        allow write: if false;                 // join/leave/kick jen CF
      }

      match /messages/{msgId} {
        allow read: if signedIn() && isMember(spaceId);

        // odeslání: jen člen, jen svým jménem, se serverovým časem
        allow create: if signedIn() && isMember(spaceId)
          && request.resource.data.senderUid == request.auth.uid
          && request.resource.data.createdAt == request.time
          && request.resource.data.readAt == null
          && request.resource.data.expireAt == request.time + duration.value(24, 'h');

        // OTEVŘENÍ (34 §2): jediný povolený update, jednorázový přechod
        allow update: if signedIn() && isMember(spaceId)
          && resource.data.readAt == null
          && request.auth.uid != resource.data.senderUid
          && request.resource.data.diff(resource.data)
               .affectedKeys().hasOnly(['readAt','expireAt'])
          && request.resource.data.readAt == request.time
          && request.resource.data.expireAt == request.time + duration.value(90, 's');

        // unsend/burn: odesílatel maže vlastní zprávu (N7)
        allow delete: if signedIn()
          && request.auth.uid == resource.data.senderUid;

        // OBSAH — gate přes readAt (34): číst jen v okně
        match /payload/{p} {
          allow read: if signedIn() && isMember(spaceId)
            && get(/databases/$(db)/documents/spaces/$(spaceId)/messages/$(msgId)).data.readAt != null
            && request.time < get(/databases/$(db)/documents/spaces/$(spaceId)/messages/$(msgId)).data.readAt + duration.value(90, 's');
          allow create: if signedIn() && isMember(spaceId);  // spolu s obálkou
          allow update: if false;
          allow delete: if signedIn();  // burn; TTL/CF pojistka
        }
      }
    }

    match /invites/{tokenHash} {
      allow read, write: if false;   // výhradně Cloud Functions (12)
    }
  }
}
```

## 3. Návrh Rules — `meta` databáze (výtah)

- `users/{uid}`: read/update jen `request.auth.uid == uid`; `tier` z klienta
  **nezapisovatelný** (mění jen billing webhook, 41).
- `devices`: create jen vlastní, s validním tvarem klíčů; `revoked` mění
  jen vlastník či CF; **update publikovaných klíčů zakázán** (jen nový
  device / rotace SPK přes CF — ochrana proti tiché výměně klíčů, BM-2).
- `contacts`: read/write jen vlastník; server obsah nečte (šifrovaný blob).
- `prekeys`: klient jen create (doplnění dávky); výdej/označení `consumed`
  jen CF (zabraňuje vyčerpání cizích OPK — DoS).
- `aggregates`: write jen CF; read jen interní.

## 4. Co jde výhradně přes Cloud Functions

| Operace | Důvod |
|---|---|
| Konzumace pozvánky (join) | ověření hashe tokenu, maxUses, hesla; atomicita |
| Založení/spálení/expirace Space | limity tarifu (11), memberCount |
| Kick / role změny | pravidla rolí, rotační signál SK (33 §4) |
| Výdej prekey bundle | jednorázovost OPK, rate limit |
| Revokace zařízení, force-update | bezpečnostní operace (37, 20) |
| Nahlášení (report) | zápis do odděleného moderačního projektu (29) |

## 5. Testy Rules (21, povinné)

Emulátorové testy minimálně na: nečlen nečte nic; člen nečte payload před
`readAt`; payload nečitelný po `readAt+90 s`; `readAt` nelze zapsat dvakrát
ani s klientským časem; odesílatel nemůže „otevřít" vlastní zprávu;
`tier` nelze zapsat z klienta; cizí OPK nelze vyčerpat.
