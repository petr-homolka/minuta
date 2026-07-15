// Integracni test rezu 1 (42 §3): anonymni prihlaseni -> registrace
// zarizeni -> verejny bundle v `meta` DB. Bezi proti Auth + Firestore
// emulatoru; IndexedDB v Node zajistuje fake-indexeddb.
import "fake-indexeddb/auto";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { deleteApp, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  signInAnonymously,
} from "firebase/auth";
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
} from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { OPK_BATCH_SIZE, verifySignedPrekey } from "../src/lib/crypto/keys";
import { loadDeviceIdentity } from "../src/features/device/key-store";
import { ensureDeviceRegistered } from "../src/features/device/registration";

const app = initializeApp({
  apiKey: "demo-api-key",
  authDomain: "demo-minuta.firebaseapp.com",
  projectId: "demo-minuta",
});
const auth = getAuth(app);
const metaDb = getFirestore(app);

beforeAll(async () => {
  // Testovaci soubory si nahravaji ruzna Rules (meta vs. ephemeral) -
  // nahrajeme si vlastni, at nezalezi na poradi souboru.
  const rulesEnv = await initializeTestEnvironment({
    projectId: "demo-minuta",
    firestore: {
      rules: readFileSync(
        resolve(__dirname, "../../infra/firestore.meta.rules"),
        "utf8",
      ),
    },
  });
  await rulesEnv.cleanup();

  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(metaDb, "127.0.0.1", 8080);
});

afterAll(async () => {
  await deleteApp(app);
});

describe("registrace zarizeni (37 §2)", () => {
  it("po prihlaseni ma zarizeni klice a bundle je publikovany", async () => {
    const { user } = await signInAnonymously(auth);

    const deviceId = await ensureDeviceRegistered(metaDb, user.uid);
    expect(deviceId).toMatch(/^[0-9a-f-]{36}$/);

    // Verejny bundle v meta DB (35 §2) - cteme jako vlastnik (Rules pusti).
    const snapshot = await getDoc(doc(metaDb, "users", user.uid, "devices", deviceId));
    expect(snapshot.exists()).toBe(true);
    const data = snapshot.data();
    if (!data) throw new Error("device dokument bez dat");
    expect(data["platform"]).toBe("pwa");
    expect(data["revoked"]).toBe(false);
    expect(data["createdAt"]).toBeTruthy();

    // Publikovany SPK je podepsany publikovanym IK (33 §2 krok 1).
    const signedPrekey = data["signedPrekey"] as { pk: string; sig: string };
    await expect(
      verifySignedPrekey(data["identityPk"] as string, signedPrekey),
    ).resolves.toBe(true);

    // Cela davka OPK, zadny consumed.
    const prekeys = await getDocs(
      collection(metaDb, "users", user.uid, "devices", deviceId, "prekeys"),
    );
    expect(prekeys.size).toBe(OPK_BATCH_SIZE);
    expect(prekeys.docs.every((d) => d.data()["consumed"] === false)).toBe(true);

    // Privatni klice zustaly jen lokalne - dokument obsahuje PRESNE
    // verejna pole a nic navic (zadne *Sk).
    expect(Object.keys(data).sort()).toEqual(
      ["createdAt", "identityPk", "kxPk", "platform", "revoked", "signedPrekey"],
    );
    expect(Object.keys(signedPrekey).sort()).toEqual(["pk", "rotatedAt", "sig"]);

    // Lokalni identita existuje a odpovida.
    const identity = await loadDeviceIdentity(user.uid);
    expect(identity?.deviceId).toBe(deviceId);
    expect(identity?.privateKeys.identitySk).toBeInstanceOf(Uint8Array);

    // Idempotence: druhe volani nevytvori nove zarizeni.
    await expect(ensureDeviceRegistered(metaDb, user.uid)).resolves.toBe(deviceId);
  });
});
