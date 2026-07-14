// Mapa: jediny vstupni bod k Firebase. Vyvoj bezi VYHRADNE proti
// Firebase Emulator Suite (45 §1) - `demo-` projekt nikdy nesahne na
// realnou infrastrukturu. ADR-007: dve databaze `meta` a `ephemeral`;
// v emulatoru je `meta` mapovana na `(default)` - viz infra/README.md.
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

// TODO(rez 10 / provisioning): realna konfigurace pro staging/prod pres env.
const app = initializeApp({
  apiKey: "demo-api-key",
  authDomain: "demo-minuta.firebaseapp.com",
  projectId: "demo-minuta",
});

export const auth = getAuth(app);
export const metaDb = getFirestore(app);
// TODO(rez 3, ADR-007): pridat `ephemeralDb` - emulator zatim neumi
// vice databazi, reseni oddeleni viz infra/README.md.

if (import.meta.env.DEV) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(metaDb, "127.0.0.1", 8080);
} else {
  // Bezpecnostni pojistka: produkci zatim nestavime (42 §3, rez 1).
  throw new Error("Produkcni konfigurace Firebase zatim neexistuje (rez 1).");
}
