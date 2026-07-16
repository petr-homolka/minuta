// Mapa modulu: Cloud Functions `/v1` (18-API). Region: europe-west3
// (ADR-009, konstanta REGION v lib/db.ts - explicitne u kazde funkce).
// Zadny plaintext ani klice ve vstupech/vystupech/lozich (33 §7).
//   spaces.ts       - createSpace, leaveSpace (36 §4; ADR-013, ADR-014)
//   invites.ts      - createInvite, previewInvite, joinSpace, revokeInvite (12)
//   key-bundles.ts  - getKeyBundles, getSpaceKeyBundles (36 §4, ADR-012)
//   burn-all.ts     - burnAll (panika, N7 bod 4)
//   moderation.ts   - reportMessage (nahlaseni se zapecetenym dukazem, 27/29)
//   config.ts       - getConfig (force update / kill switch, 20)
//   lib/guards.ts   - autorizace, blokace, rate limity
// Dalsi (revokace zarizeni): post-V1.
export { createSpace, leaveSpace } from "./spaces";
export { createInvite, joinSpace, previewInvite, revokeInvite } from "./invites";
export { getKeyBundles, getSpaceKeyBundles } from "./key-bundles";
export { burnAll } from "./burn-all";
export { reportMessage } from "./moderation";
export { getConfig } from "./config";
