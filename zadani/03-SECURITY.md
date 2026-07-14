# 03 — SECURITY (Draft v0.2)

> Tento dokument je určen jako základ bezpečnostní architektury projektu **Minuta**.

## Filosofie

Nejvyšší prioritou projektu není pouze šifrování komunikace, ale návrh systému tak, aby provozovatel služby neměl běžnou technickou možnost získat obsah komunikace.

Principy:

- Privacy by Design
- Security by Design
- Zero-Knowledge Architecture
- Least Privilege
- Defense in Depth
- Fail Secure

## Cíle

- Zajistit důvěrnost komunikace.
- Chránit integritu dat.
- Minimalizovat metadata.
- Odolat běžným i pokročilým útokům.
- Navrhnout architekturu škálovatelnou od desítek po miliony uživatelů.

## Hlavní bezpečnostní oblasti

### 1. Threat Model

Dokument bude obsahovat kompletní model hrozeb podle metodiky STRIDE.

Budou analyzovány zejména:

- kompromitace zařízení
- MITM útoky
- malware
- phishing
- insider threat
- kompromitace cloudové infrastruktury
- útok na autentizaci
- zneužití API
- spam a botnety

### 2. Kryptografie

Používat pouze veřejně auditované algoritmy.

Zakázáno:

- vlastní šifrovací algoritmy
- vlastní výměna klíčů
- vlastní generátor náhodných čísel

### 3. Mobilní bezpečnost

Budou definována pravidla pro:

- Android Keystore
- Apple Secure Enclave
- detekci root/jailbreak
- certificate pinning
- ochranu proti reverse engineeringu
- anti-tamper mechanismy

### 4. Serverová bezpečnost

- minimální oprávnění
- oddělené služby
- audit administrace
- ochrana API
- rate limiting
- DDoS ochrana

### 5. Metadata

Minimalizovat ukládaná metadata.

Preferovat:

- krátkou dobu uchování
- pseudonymizaci
- automatické mazání

## Standardy

Při návrhu budou respektovány zejména:

- OWASP ASVS
- OWASP MASVS
- OWASP Mobile Top 10
- NIST Cybersecurity Framework

## Další kapitoly

Finální verze bude rozšířena o:

1. Security Requirements
2. Security Architecture
3. Key Management
4. Identity Management
5. Session Management
6. Push Notification Security
7. Incident Response
8. Disaster Recovery
9. Penetrační testování
10. Security Checklist
11. Bug Bounty
12. Security Review Process

---

Tento dokument je pracovní základ. Předpokládaný rozsah finální verze: přibližně 30–50 stran.
