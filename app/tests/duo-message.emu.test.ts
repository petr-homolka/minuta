// E2E rez 4 (42 §3): dva uzivatele -> duo Space (CF) -> vydej bundlu (CF)
// -> odeslani obalky+payloadu -> otevreni (zamek readAt) -> desifrovani.
// "Po minute neobnovitelna" pokryvaji rules testy (okno readAt+90 s)
// a unit test wipe; zde overujeme, ze gate plati i v celem toku.
import "fake-indexeddb/auto";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectAuthEmulator,
  getAuth,
  signInAnonymously,
  type Auth,
} from "firebase/auth";
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
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
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { callCreateSpace, callGetKeyBundles } from "../src/features/chat/api";
import { openReceivedMessage, sendTextMessage } from "../src/features/chat/messages";
import { KeyChangedError, trustIdentityKey } from "../src/features/chat/tofu";
import { loadDeviceIdentity } from "../src/features/device/key-store";
import { ensureDeviceRegistered } from "../src/features/device/registration";
import { x25519PublicFromSecret } from "../src/lib/crypto/keys";

interface Party {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  functions: Functions;
  uid: string;
  deviceId: string;
}

const CONFIG = {
  apiKey: "demo-api-key",
  authDomain: "demo-minuta.firebaseapp.com",
  projectId: "demo-minuta",
};

async function createParty(name: string): Promise<Party> {
  const app = initializeApp(CONFIG, name);
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

let alice: Party;
let bob: Party;

beforeAll(async () => {
  // Kombinovane dev rules (meta + ephemeral v jedne DB) - stejne, jake
  // pouziva emulator runtime; generuje je `npm run rules:dev`.
  const rulesEnv = await initializeTestEnvironment({
    projectId: "demo-minuta",
    firestore: {
      rules: readFileSync(resolve(__dirname, "../../infra/firestore.dev.rules"), "utf8"),
    },
  });
  await rulesEnv.cleanup();

  alice = await createParty("e2e-alice");
  bob = await createParty("e2e-bob");
}, 60_000);

afterAll(async () => {
  await deleteApp(alice.app);
  await deleteApp(bob.app);
});

describe("1:1 zprava end-to-end (rez 4)", () => {
  it("duo -> odeslani -> gate -> otevreni -> plaintext", async () => {
    // 1) Alice zalozi duo pres CF (36 §4).
    const spaceId = await callCreateSpace(alice.functions, bob.uid);
    expect(spaceId).toBeTruthy();

    // 2) Vydej bundlu protistrany pres CF - jen pro cleny Space.
    const recipients = await callGetKeyBundles(alice.functions, bob.uid, spaceId);
    expect(recipients).toHaveLength(1);
    const bobDevice = recipients[0];
    if (!bobDevice) throw new Error("bundle chybi");
    expect(bobDevice.deviceId).toBe(bob.deviceId);
    expect(bobDevice.identityPk).toHaveLength(44);

    // Neclen bundle nedostane (Eve si zalozi ucet, ale neni ve Space).
    const eve = await createParty("e2e-eve");
    await expect(
      callGetKeyBundles(eve.functions, bob.uid, spaceId),
    ).rejects.toThrow();
    await deleteApp(eve.app);

    // 3) Alice odesle zpravu (obalka + payload v jedne batch, Rules 36).
    const aliceIdentity = await loadDeviceIdentity(alice.uid);
    if (!aliceIdentity) throw new Error("alice bez klicu");
    const text = "Tahle zprava zije 60 sekund.";
    const msgId = await sendTextMessage({
      db: alice.db,
      spaceId,
      text,
      sender: {
        uid: alice.uid,
        deviceId: alice.deviceId,
        identitySk: aliceIdentity.privateKeys.identitySk,
      },
      recipients,
    });

    // 4) Bob vidi obalku, ale payload je pred otevrenim NEcitelny (gate).
    const bobMessages = await getDocs(collection(bob.db, "spaces", spaceId, "messages"));
    expect(bobMessages.docs.map((d) => d.id)).toContain(msgId);
    const delivered = bobMessages.docs.find((d) => d.id === msgId);
    expect(delivered?.get("readAt")).toBeNull();
    await expect(
      getDoc(doc(bob.db, "spaces", spaceId, "messages", msgId, "payload", "v")),
    ).rejects.toThrow();

    // 5) Bob otevre (zamek readAt) a desifruje.
    const bobIdentity = await loadDeviceIdentity(bob.uid);
    if (!bobIdentity) throw new Error("bob bez klicu");
    const senderBundles = await callGetKeyBundles(bob.functions, alice.uid, spaceId);
    const senderDevice = senderBundles.find((d) => d.deviceId === alice.deviceId);
    if (!senderDevice) throw new Error("bundle odesilatele chybi");

    const opened = await openReceivedMessage({
      db: bob.db,
      spaceId,
      msgId,
      senderUid: alice.uid,
      senderDeviceId: alice.deviceId,
      presentedSenderIdentityPk: senderDevice.identityPk,
      receiver: {
        deviceId: bob.deviceId,
        wrapPk: await x25519PublicFromSecret(bobIdentity.privateKeys.signedPrekeySk),
        wrapSk: bobIdentity.privateKeys.signedPrekeySk,
      },
    });
    expect(new TextDecoder().decode(opened.plaintext)).toBe(text);
    expect(opened.readAtMillis).toBeGreaterThan(0);

    // 6) Druhe otevreni neexistuje (readAt uz je) - zamek je jednorazovy.
    await expect(
      openReceivedMessage({
        db: bob.db,
        spaceId,
        msgId,
        senderUid: alice.uid,
        senderDeviceId: alice.deviceId,
        presentedSenderIdentityPk: senderDevice.identityPk,
        receiver: {
          deviceId: bob.deviceId,
          wrapPk: await x25519PublicFromSecret(bobIdentity.privateKeys.signedPrekeySk),
          wrapSk: bobIdentity.privateKeys.signedPrekeySk,
        },
      }),
    ).rejects.toThrow();

    // 7) TOFU: zmena IK protistrany = tvrda chyba (37 §3).
    await expect(
      trustIdentityKey(alice.uid, alice.deviceId, bobDevice.identityPk),
    ).rejects.toThrow(KeyChangedError);
  }, 60_000);

  it("createSpace odmitne neexistujici protistranu i duo se sebou", async () => {
    await expect(callCreateSpace(alice.functions, "neexistujici-uid")).rejects.toThrow();
    await expect(callCreateSpace(alice.functions, alice.uid)).rejects.toThrow();
  }, 30_000);
});
