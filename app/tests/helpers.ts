// Sdilene pomucky emulatorovych testu: "party" = prihlaseny uzivatel
// s vlastni instanci app/auth/db/functions a zaregistrovanym zarizenim.
import "fake-indexeddb/auto";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  signInAnonymously,
  type Auth,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";
import {
  connectFunctionsEmulator,
  getFunctions,
  type Functions,
} from "firebase/functions";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ensureDeviceRegistered } from "../src/features/device/registration";

export interface Party {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  functions: Functions;
  uid: string;
  deviceId: string;
}

export const EMULATOR_CONFIG = {
  apiKey: "demo-api-key",
  authDomain: "demo-minuta.firebaseapp.com",
  projectId: "demo-minuta",
};

export async function createParty(name: string): Promise<Party> {
  const app = initializeApp(EMULATOR_CONFIG, name);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const functions = getFunctions(app, "europe-west3");
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  const { user } = await signInAnonymously(auth);
  const deviceId = await ensureDeviceRegistered(db, user.uid);
  return { app, auth, db, functions, uid: user.uid, deviceId };
}

/** Nahraje kombinovane dev Rules (generuje `npm run rules:dev`). */
export async function loadDevRules(): Promise<void> {
  const env = await initializeTestEnvironment({
    projectId: "demo-minuta",
    firestore: {
      rules: readFileSync(
        resolve(__dirname, "../../infra/firestore.dev.rules"),
        "utf8",
      ),
    },
  });
  await env.cleanup();
}
