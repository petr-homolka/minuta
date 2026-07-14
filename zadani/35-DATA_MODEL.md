# 35 — DATA_MODEL (Draft v0.1)

Status: Draft. Rozpracovává 06-DATABASE do závazných schémat.
Rules k tomuto modelu: [36-FIRESTORE_RULES.md](36-FIRESTORE_RULES.md).

## 1. ADR-007: dvě databáze (kritické rozhodnutí)

Firestore zálohy a PITR (point-in-time recovery) **uchovávají smazaná data
až 7 dní** — to by tiše porušilo slib neobnovitelnosti (spálená zpráva by
šla obnovit ze zálohy = BM-3/BM-2 zadními vrátky přes provoz!). Proto:

| Databáze | Obsah | Zálohy/PITR | Retence |
|---|---|---|---|
| **`meta`** | users, devices, contacts, entitlements, aggregates | ✅ zálohy ANO | dle tabulky §4 |
| **`ephemeral`** | spaces, members, messages, payloads, invites | ❌ **ZAKÁZÁNO** (PITR i backup) | TTL, minuty–dny |

Ztráta `ephemeral` při havárii = ztráta živých zpráv posledních minut —
přijatelné (ephemeral produkt), zatímco obnovitelnost spálených zpráv
přijatelná není. Zapnutí PITR/backupu na `ephemeral` je bezpečnostní
incident (30, varovné signály).

Region obou databází, Storage i Functions: **europe-west3 (Frankfurt)** —
ADR-009 (EU rezidence; jednoregionové sazby jsou navíc nižší než
multi-region v tabulce 32 §8).

## 2. Kolekce — `meta`

```
users/{uid}
  displayName    string (≤ 32 znaků, nejedinečné — 40-CONTACTS)
  avatarSeed     string (otisk IK primárního zařízení, 33 §6)
  tier           'free' | 'plus' | ...   (custom claims jsou zdroj pravdy, 41)
  createdAt      timestamp
  schemaVersion  int

users/{uid}/devices/{deviceId}
  identityPk, kxPk, signedPrekey {pk, sig, rotatedAt}
  platform       'pwa' | 'android' | 'ios'
  createdAt, revoked (bool), revokedAt
  // žádné lastSeen s přesností — jen hrubé (týden) kvůli úklidu

users/{uid}/devices/{deviceId}/prekeys/{prekeyId}
  pk             string
  consumed       bool   (výdej označuje Cloud Function — 36 §4)

users/{uid}/contacts/{contactUid}          // 40-CONTACTS
  blob           bytes  (šifrováno klíčem uživatele — server nečte)
  updatedAt

aggregates/{metric}/{bucket}               // 39-ANALYTICS, jen čítače
  count          int (sharded counters)
```

## 3. Kolekce — `ephemeral`

```
spaces/{spaceId}
  type ('duo'|'space'), createdAt, expireAt (null = trvalý, jen placené)
  ownerId, memberCount, cryptoVersion

spaces/{spaceId}/members/{uid}
  role ('owner'|'admin'|'member'), joinedAt, deviceIds[], skVersion

spaces/{spaceId}/messages/{msgId}
  envelope       map    (obálka z 33 §2 — bez obsahu)
  senderUid, senderDeviceId
  createdAt      timestamp (server)
  readAt         timestamp | null   (přechod jen null→request.time, 34)
  expireAt       timestamp          (TTL pole, 34 §3)
  state          odvozený, nevynucuje se (UI)

spaces/{spaceId}/messages/{msgId}/payload/v
  ciphertext     bytes (≤ 100 KB text; přílohy → Storage, 10)

invites/{tokenHash}                        // token samotný se neukládá!
  spaceId, createdBy, expireAt, maxUses, uses, passwordHash?, revoked
```

Pozn.: ukládá se **hash** pozvánkového tokenu — únik databáze nezpřístupní
živé pozvánky (12).

## 4. Retence (závazná tabulka)

| Data | Retence | Mechanismus |
|---|---|---|
| Ciphertext zprávy | do `readAt+90 s` / max 24 h | Rules + TTL + úklid (34) |
| Obálka zprávy | s ciphertextem | TTL (`expireAt` na dokumentu zprávy) |
| Space + členství | do `expireAt` Space | TTL |
| Pozvánky | do `expireAt` | TTL |
| Účet, zařízení | do smazání účtu / revokace + 30 d | funkce úklidu |
| Contacts blob | do smazání uživatelem/účtu | manuální |
| Aggregates | 13 měsíců, jen čítače | úklid |
| Moderace — důkazy | 90 d / zákonná lhůta (29 §1.2) | oddělený projekt |
| Provozní logy | 30 d, bez obsahu a bez IP kde lze (20) | log retention |

## 5. Indexy

Jen pro reálné dotazy (06): `messages` po `spaceId + createdAt desc`
(výchozí kompozitní), `members` po `uid` (collection group — „moje Spaces"),
`invites` po `spaceId`. **Exemption z indexování**: `envelope`, `payload`,
`contacts.blob` (index nad šifrovanými bajty je jen náklad).

## 6. Migrace schémat

- `schemaVersion` na dokumentech `meta`; změny **pouze aditivní**
  (nové pole s defaultem), lazy-migrace při zápisu + backfill funkcí.
- `ephemeral` se nemigruje — dokumenty žijí minuty; změna = nová verze
  zapisovaná novými klienty (`cryptoVersion`/`v` v obálce, 33).
- Breaking změna vyžaduje force-update okno (20 §Release) a ADR.

## 7. Zálohy

- `meta`: denní zálohy, šifrované, test obnovy čtvrtletně (20).
- `ephemeral`: **nikdy** (ADR-007). Disaster recovery = redeploy prázdné.
