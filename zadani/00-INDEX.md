# MINUTA — Index dokumentace

> **Minuta** je privacy-first messenger, kde **zpráva žije 60 sekund** od
> otevření a provozovatel nemá technickou možnost číst obsah. Kanál (Space)
> může být trvalý, obsah je vždy prchavý.

Tento index je rozcestník. Dokumenty jsou zadávací i provozní specifikace;
draft, dokud u nich není uvedeno jinak. Rozhodnutí jsou shrnuta v ADR indexu
([24-APPENDIX](24-APPENDIX.md)).

## Jak číst

- **Nový v projektu?** 00-VISION → 01-PRINCIPLES → 25-IMPROVEMENTS (co jsme
  zpřesnili a proč) → 05-ARCHITECTURE.
- **Vývojář MVP?** 42-MVP_BLUEPRINT → 33 → 34 → 35 → 36 → 08 → 18 → 31.
- **Bezpečnost/audit?** 03 → 26 → 33 → 36 → 30-BLACKMINUTE → 27/29.
- **Produkt/byznys?** 25 → 11 → 28 → 41 → 32 → 23.

## Mapa kapitol

### Vize a principy
- [00-VISION](00-VISION.md) · [01-PRINCIPLES](01-PRINCIPLES.md)
- [25-IMPROVEMENTS](25-IMPROVEMENTS.md) — návrhy N1–N10 (jádro produktu)

### Právo a bezpečnost
- [02-LEGAL](02-LEGAL.md) (v0.2) · [03-SECURITY](03-SECURITY.md)
- [26-THREAT_MODEL](26-THREAT_MODEL.md) — garance vs. přiznané limity
- [30-BLACKMINUTE](30-BLACKMINUTE.md) — čeho se nikdy nedopustíme (anti-spec)
- [27-TRUST_SAFETY](27-TRUST_SAFETY.md) · [29-MODERATION](29-MODERATION.md)

### Kryptografie a data
- [04-CRYPTOGRAPHY](04-CRYPTOGRAPHY.md) → [33-CRYPTO_PROTOCOL](33-CRYPTO_PROTOCOL.md) (ADR-002)
- [34-TIME_AND_EXPIRY](34-TIME_AND_EXPIRY.md) (ADR-008) — 60s mechanismus
- [06-DATABASE](06-DATABASE.md) → [35-DATA_MODEL](35-DATA_MODEL.md) (ADR-007) · [36-FIRESTORE_RULES](36-FIRESTORE_RULES.md)
- [37-DEVICE_TRUST](37-DEVICE_TRUST.md)

### Architektura a backend
- [05-ARCHITECTURE](05-ARCHITECTURE.md) · [19-BACKEND](19-BACKEND.md) · [18-API](18-API.md) (v0.2)
- [08-CHAT_ENGINE](08-CHAT_ENGINE.md) (v0.2) · [09-MESSAGES](09-MESSAGES.md)

### Funkce
- [11-SPACES](11-SPACES.md) (v0.2) · [12-MAGIC_LINKS](12-MAGIC_LINKS.md) (+QR) · [40-CONTACTS](40-CONTACTS.md)
- [10-ATTACHMENTS](10-ATTACHMENTS.md) (v0.2) · [13-NOTIFICATIONS](13-NOTIFICATIONS.md) (v0.2)

### Identita a účty
- [07-AUTHENTICATION](07-AUTHENTICATION.md) (v0.2) · [41-PAYMENTS](41-PAYMENTS.md)

### Klienti a design
- [14-CLIENT_PWA](14-CLIENT_PWA.md) · [15-CLIENT_ANDROID](15-CLIENT_ANDROID.md) · [16-CLIENT_IOS](16-CLIENT_IOS.md) · [17-WEB](17-WEB.md)
- [28-UX](28-UX.md) · [38-BRAND](38-BRAND.md) · [43-UI_DESIGN](43-UI_DESIGN.md) — „Sklo a čas", obrazovky, workflow

### Správa aplikace
- [44-ADMIN_BACKSTAGE](44-ADMIN_BACKSTAGE.md) — interní konzole (moderace, config, audit)

### Provoz, kvalita, náklady
- [20-OPERATIONS](20-OPERATIONS.md) (v0.2 — SLO, canary, status page) · [21-TESTING](21-TESTING.md) · [39-ANALYTICS](39-ANALYTICS.md)
- [32-COST_MODEL](32-COST_MODEL.md) — provoz zdarma do ~1000 uživatelů
- [31-CODING_STANDARDS](31-CODING_STANDARDS.md) · [22-AI_CODING_CONSTITUTION](22-AI_CODING_CONSTITUTION.md)
- [45-PROVISIONING](45-PROVISIONING.md) — prostředí, IaC, checklisty zřízení

### Veřejná tvář
- [46-WEBSITE](46-WEBSITE.md) — marketingový web · [48-WHITEPAPER](48-WHITEPAPER.md) — veřejná bezpečnostní bílá kniha

### Plán a přílohy
- [23-ROADMAP](23-ROADMAP.md) · [42-MVP_BLUEPRINT](42-MVP_BLUEPRINT.md) · [24-APPENDIX](24-APPENDIX.md) (slovník + ADR index)
- [47-DIAGRAMS](47-DIAGRAMS.md) — sekvenční diagramy (mermaid)

## Deprecated
- 07-AUTH → 07-AUTHENTICATION · 11-GROUPS → 11-SPACES

## Stav a konvence
- Číslování 00–48; nové detailní kapitoly (30+) rozpracovávají osnovy (00–29).
- Každý dokument odkazuje na související (křížové odkazy) — zdroj pravdy je
  vždy nejdetailnější kapitola daného tématu.
- Změny zásadních rozhodnutí procházejí ADR (24).
