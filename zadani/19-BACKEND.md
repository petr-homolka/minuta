
# 19 — BACKEND (Draft v0.1)

Status: Draft

## Cíl

Vybudovat backend s minimální správou, vysokou dostupností a architekturou
Zero Knowledge.

## Platforma

- Google Cloud
- Firebase Authentication
- Cloud Firestore
- Cloud Storage
- Cloud Functions
- Cloud Run
- Firebase Cloud Messaging

## Odpovědnosti backendu

- Autorizace požadavků
- Správa konverzací
- Správa členství
- Doručování šifrovaných zpráv
- Retenční politika
- Mazání expirovaných objektů

## Backend nesmí

- dešifrovat obsah,
- ukládat privátní klíče,
- zapisovat obsah zpráv do logů.

## Doporučená architektura

- REST API
- Event-driven úlohy
- Fronty pro asynchronní operace
- Horizontální škálování bez výpadků

## Konkrétní rozpad odpovědností

| Oblast | Kde | Pozn. |
|---|---|---|
| API / Cloud Functions endpointy | [18-API](18-API.md) | co Rules nezvládnou (36 §4) |
| Autorizace na datech | [36-FIRESTORE_RULES](36-FIRESTORE_RULES.md) | přímý Firestore přístup |
| Lifecycle zpráv, expirace | [34-TIME_AND_EXPIRY](34-TIME_AND_EXPIRY.md) | server-authoritative čas |
| Úklidové úlohy (druhá vrstva TTL) | 34 §3, 35 §4 | scheduled Function |
| Notifikace (event-driven) | [13-NOTIFICATIONS](13-NOTIFICATIONS.md) | po zápisu obálky |
| Náklady / free tier | [32-COST_MODEL](32-COST_MODEL.md) | Blaze s útratou $0 |

## Budoucí kapitoly

- Cloud Run vs Functions (ADR) · Cron úlohy · Multi-region · Disaster Recovery
  (35 §7: `ephemeral` se neobnovuje záměrně)
