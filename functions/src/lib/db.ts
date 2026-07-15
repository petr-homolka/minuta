// Mapa: pristup Admin SDK k obema logickym databazim (ADR-007).
// V emulatoru ziji obe v `(default)` (emulator neumi multi-DB,
// viz infra/README.md); v realnem prostredi je `ephemeral` pojmenovana.
// Admin SDK obchazi Rules - KAZDA funkce autorizuje operaci sama (18 §4).
import { initializeApp } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

/** Region vseho: europe-west3 (ADR-009) - predava se kazde onCall. */
export const REGION = "europe-west3";

const app = initializeApp();
const isEmulated = process.env.FUNCTIONS_EMULATOR === "true";

export const metaDb: Firestore = getFirestore(app);
export const ephemeralDb: Firestore = isEmulated
  ? getFirestore(app)
  : getFirestore(app, "ephemeral");
