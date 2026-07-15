// Mapa modulu: Cloud Functions `/v1` (18-API). Region: europe-west3
// (ADR-009, konstanta REGION v lib/db.ts - explicitne u kazde funkce).
// Zadny plaintext ani klice ve vstupech/vystupech/lozich (33 §7).
//   spaces.ts       - createSpace (duo/space, limity, 36 §4)
//   invites.ts      - createInvite, previewInvite, joinSpace, revokeInvite (12)
//   key-bundles.ts  - getKeyBundles, getSpaceKeyBundles (36 §4, ADR-012)
// Dalsi (burn-all, revokace zarizeni, report): rezy 6+.
export { createSpace } from "./spaces";
export { createInvite, joinSpace, previewInvite, revokeInvite } from "./invites";
export { getKeyBundles, getSpaceKeyBundles } from "./key-bundles";
