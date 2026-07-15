// Mapa modulu: Cloud Functions `/v1` (18-API). Region: europe-west3
// (ADR-009, konstanta REGION v lib/db.ts - explicitne u kazde funkce).
// Zadny plaintext ani klice ve vstupech/vystupech/lozich (33 §7).
//   spaces.ts       - createSpace (duo, 36 §4)
//   key-bundles.ts  - getKeyBundles (vydej verejnych bundlu, 36 §4)
// Dalsi (join pozvankou, burn-all, revokace, report): rezy 5+.
export { createSpace } from "./spaces";
export { getKeyBundles } from "./key-bundles";
