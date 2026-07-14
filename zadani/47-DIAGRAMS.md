# 47 — DIAGRAMS (Draft v0.1)

Status: Draft. Sekvenční diagramy klíčových toků (slib z 24). Mermaid —
vykreslí se na GitHubu i v artefaktech. Zdroj pravdy jsou kapitoly,
diagram je ilustrace.

## D1 — Přihlášení a registrace zařízení (07, 37)

```mermaid
sequenceDiagram
  actor U as Uživatel
  participant C as Klient
  participant FA as Firebase Auth
  participant M as Firestore meta
  U->>C: zadá e-mail
  C->>FA: požádá o magic link
  FA-->>U: e-mail s odkazem (auth.minuta.app)
  U->>C: otevře odkaz
  C->>FA: ověření → relace (uid)
  C->>C: generuje klíče zařízení (IK, KX, SPK, OPK) — lokálně
  C->>M: publikuje VEŘEJNÝ bundle zařízení
  Note over C,M: privátní klíče nikdy neopustí zařízení (33)
```

## D2 — Pozvánka a vstup do Space (12, N4)

```mermaid
sequenceDiagram
  actor A as Alice
  participant CF as Cloud Functions
  participant E as Firestore ephemeral
  actor B as Bob (bez účtu)
  A->>CF: vytvořit Space + pozvánku (platnost, maxUses)
  CF->>E: space + invites/{hash(token)}
  CF-->>A: URL / QR
  A-->>B: sdílí libovolným kanálem (SMS, papír…)
  B->>CF: GET preview(token)
  CF-->>B: „Space ,Název', 5 členů, žije 21 h"
  B->>B: potvrdí → anonymní Firebase účet + klíče
  B->>CF: join(token)
  CF->>E: ověří hash+limity, zapíše členství
  Note over A,B: rotace sender keys pro nového člena (33 §4)
```

## D3 — Život zprávy: odeslání → otevření → spálení (33, 34, 36)

```mermaid
sequenceDiagram
  actor S as Odesílatel
  participant E as Firestore ephemeral
  actor R as Příjemce
  S->>S: MK, šifrování, wrap pro zařízení příjemce
  S->>E: batch: obálka + payload (Rules: createdAt=server, expireAt=+24h)
  E-->>R: listener: nová obálka (payload zamčen)
  R->>E: update readAt=server-time (jen jednou, ne odesílatel)
  E-->>R: payload čitelný jen do readAt+90 s (Rules)
  R->>R: dešifruje do RAM, odpočet 60 s
  par nezávislé pojistky
    R->>R: +60 s: memzero klíče i textu (crypto-shredding)
    E->>E: TTL: fyzické smazání dle expireAt
  end
  Note over S,E: odesílatel vidí „Přečteno · Shořelo"
```

## D4 — Revokace zařízení a key change (37)

```mermaid
sequenceDiagram
  actor U as Uživatel
  participant CF as Cloud Functions
  participant M as meta
  actor P as Protistrana
  U->>CF: revoke(deviceId)
  CF->>M: devices/{id}.revoked=true, ruší tokeny
  CF-->>U: potvrzení + push na ostatní zařízení
  P->>M: při dalším psaní čte bundle
  P->>P: TOFU: známý IK zmizel/nový přibyl
  P-->>P: banner „Klíče se změnily — ověř" (C2)
  Note over P: tichá výměna klíčů je tím detekovatelná (BM-2)
```

## D5 — Nahlášení zprávy (27, 29)

```mermaid
sequenceDiagram
  actor R as Příjemce (nahlašující)
  participant C as Klient
  participant MP as Moderační projekt
  participant Q as Fronta (Backstage)
  R->>C: Nahlásit (v okně viditelnosti) + kategorie
  C->>C: se souhlasem dešifruje obsah jako důkaz
  C->>MP: report{důkaz šifrovaně, kategorie, meta}
  MP->>Q: zařazení dle priority (SLA 24)
  Note over Q: důkaz rozostřen; odkrytí i rozhodnutí → audit log,<br/>sankce = čtyři oči (44 §3)
```

## D6 — Expiry canary (20)

```mermaid
flowchart LR
  T[Scheduler 10 min] --> S[Canary pošle + otevře zprávu]
  S --> W[čekej do readAt+95 s]
  W --> A{payload čitelný?}
  A -- ne --> OK[čítač OK → dashboard + status page]
  A -- ano --> SEV[SEV1 + transparenční zpráva]
  OK --> P{po TTL fyzicky smazáno?}
  P -- ano --> OK2[✓ slib doložen]
  P -- ne --> SEV
```

## Budoucí diagramy

- Multi-device wrap (33 §2 pro N zařízení) · Downgrade tarifu (41 §2) ·
  DSR výmaz kaskáda (35) · Force update stavový diagram (20)
