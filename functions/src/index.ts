// Mapa modulu: Cloud Functions `/v1` (18-API). Region: europe-west3
// (ADR-009, konstanta REGION v lib/db.ts - explicitne u kazde funkce).
// Zadny plaintext ani klice ve vstupech/vystupech/lozich (33 §7).
//   spaces.ts       - createSpace (duo/space, limity, 36 §4)
//   invites.ts      - createInvite, previewInvite, joinSpace, revokeInvite (12)
//   key-bundles.ts  - getKeyBundles, getSpaceKeyBundles (36 §4, ADR-012)
//   burn-all.ts     - burnAll (panika, N7 bod 4)
// Dalsi (revokace zarizeni, report, config): rezy 7+.
export { createSpace } from "./spaces";
export { createInvite, joinSpace, previewInvite, revokeInvite } from "./invites";
export { getKeyBundles, getSpaceKeyBundles } from "./key-bundles";
export { burnAll } from "./burn-all";
