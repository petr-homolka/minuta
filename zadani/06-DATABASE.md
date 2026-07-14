# RFC-0006 — DATABASE (Draft v0.1)

Status: Draft

# Cíl

Navrhnout databázovou architekturu aplikace Minuta s důrazem na:

- Privacy by Design
- Zero Knowledge
- Horizontální škálování
- Minimální metadata

# Technologie

- Firebase Authentication
- Cloud Firestore
- Cloud Storage
- Cloud Functions
- Firebase Cloud Messaging

# Firestore kolekce

/users
- uid
- displayName
- createdAt
- lastSeen
- status
- publicKeys

/devices
- deviceId
- uid
- platform
- publicKey
- createdAt
- revoked

/conversations
- conversationId
- type
- createdAt
- createdBy

/members
- conversationId
- uid
- role

/messages
- messageId
- conversationId
- senderId
- encryptedPayload
- attachmentReference
- createdAt
- expiresAt
- deliveryState

Poznámka:
Server nikdy neukládá otevřený obsah zprávy.

/attachments
- attachmentId
- encryptedBlob
- mimeType
- size
- expiresAt

# Indexy

Budou definovány pouze pro často používané dotazy.

# Retence

- metadata pouze po nezbytnou dobu
- automatické mazání expirací
- přílohy odstraněny po vypršení životního cyklu

# Firestore Security Rules

Budou definovány podle principu Least Privilege.

# Rozpracování

Tato osnova je rozpracována v detailních kapitolách:

- Schémata kolekcí, indexy, retence, migrace, zálohy, **ADR-007 (dvě
  databáze — `ephemeral` bez PITR/backupů)** — [35-DATA_MODEL.md](35-DATA_MODEL.md)
- Firestore Security Rules vč. testů — [36-FIRESTORE_RULES.md](36-FIRESTORE_RULES.md)
- TTL a časová logika — [34-TIME_AND_EXPIRY.md](34-TIME_AND_EXPIRY.md)
- Cost Optimization — [32-COST_MODEL.md](32-COST_MODEL.md)
- Offline Sync — [08-CHAT_ENGINE.md](08-CHAT_ENGINE.md) §5
