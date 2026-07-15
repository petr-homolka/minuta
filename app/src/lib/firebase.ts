// Mapa: jediny vstupni bod k Firebase. Dva rezimy:
//   1) cloud - kdyz build dostal VITE_FIREBASE_* (viz .env.devcloud),
//      mluvi s realnym projektem (zatim minuta-dev, ADR-009 europe-west3);
//   2) emulatory - jinak v DEV bezi proti Firebase Emulator Suite (45 §1)
//      s demo projektem, ktery nikdy nesahne na realnou infrastrukturu.
// Produkci bez konfigurace build odmitne (pojistka).
// ADR-007: druha databaze `ephemeral` pribude v rezu 3 - viz infra/README.md.
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

const cloudApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
const useCloud = typeof cloudApiKey === "string" && cloudApiKey.length > 0;

if (!useCloud && !import.meta.env.DEV) {
  throw new Error("Build bez Firebase konfigurace (VITE_FIREBASE_*) neni urceny k nasazeni.");
}

const app = initializeApp(
  useCloud
    ? {
        apiKey: cloudApiKey,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      }
    : {
        apiKey: "demo-api-key",
        authDomain: "demo-minuta.firebaseapp.com",
        projectId: "demo-minuta",
      },
);

export const auth = getAuth(app);
export const metaDb = getFirestore(app);
// V emulatoru i minuta-dev zije `ephemeral` v teze DB (infra/README.md);
// oddeleny export drzi hranici ADR-007 v kodu uz ted.
export const ephemeralDb = metaDb;
export const functions = getFunctions(app, "europe-west3");

if (!useCloud) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(metaDb, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
