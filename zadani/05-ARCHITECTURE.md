
# 05 — ARCHITECTURE (Draft v0.3)

> Architektonický blueprint projektu Minuta.

## 1. Architektonické cíle

Minuta je navržena jako cloud-native, privacy-first komunikační platforma.

Požadavky:

- škálování od desítek po miliony uživatelů,
- minimální provozní náklady v MVP,
- vysoká dostupnost,
- nulová znalost obsahu zpráv serverem,
- jednoduché nasazování nových verzí.

---

## 2. Hlavní komponenty

### Klienti

- PWA
- Android
- iOS
- (budoucí Desktop)

Veškeré šifrování probíhá na klientovi.

---

## 3. Backend

### Firebase Authentication

Ověření uživatelů.

Podporované metody:

- Google
- Apple
- e-mail + magic link
- anonymní účet (volitelně)

---

### Cloud Firestore

Slouží pouze pro metadata.

Nikdy:

- obsah zpráv
- dešifrovací klíče

Příklady kolekcí:

- users
- conversations
- memberships
- devices
- notifications

---

### Cloud Storage

Pouze šifrované přílohy.

Server nikdy nepracuje s otevřenými daty.

---

### Cloud Functions / Cloud Run

Zajišťují:

- autorizaci
- lifecycle zpráv
- mazání objektů
- správu skupin
- notifikace

Nemají obsah zpráv dešifrovat.

---

### Firebase Cloud Messaging

Pouze doručování oznámení.

Notifikace nesmí obsahovat citlivý obsah.

---

## 4. Datový tok

1. Odesílatel vytvoří zprávu.
2. Klient zprávu zašifruje.
3. Server přijme šifrovaná data.
4. Příjemce stáhne šifrovaná data.
5. Dešifrování proběhne lokálně.
6. Po otevření začne běžet časovač.
7. Po vypršení dojde k odstranění šifrovaného objektu dle retenčních pravidel.

---

## 5. Bezpečnostní hranice

Klient
↓
TLS
↓
Google Cloud
↓
Firestore / Storage
↓
Cloud Functions

Každá hranice musí být jednoznačně definována.

---

## 6. Škálování

MVP:

- stovky uživatelů

Fáze 2:

- desítky tisíc

Fáze 3:

- miliony uživatelů

Architektura se nesmí zásadně měnit mezi jednotlivými etapami.

---

## 7. CI/CD

Doporučení:

- GitHub
- GitHub Actions
- automatické testy
- automatické bezpečnostní kontroly
- automatické nasazení

---

## 8. Monitoring

Používat:

- Cloud Logging
- Cloud Monitoring
- Error Reporting
- Crashlytics

Obsah komunikace se nesmí logovat.

---

## 9. ADR (Architecture Decision Records)

Každé významné rozhodnutí bude dokumentováno.

Příklad:

ADR-001:
Proč Firebase?

ADR-002:
Proč Signal Protocol?

ADR-003:
Proč PWA jako první klient?

ADR-004:
Proč metadata odděleně od obsahu?

---

## 10. Další rozšíření

- Multi-region
- Evropská datová lokalita — **rozhodnuto (ADR-009): europe-west3, Frankfurt**
- Enterprise nasazení
- Vlastní Key Management
- Postkvantová migrace

---

Předpokládaný rozsah finální verze:
50–80 stran včetně diagramů, sekvenčních schémat, datových modelů a ADR.
