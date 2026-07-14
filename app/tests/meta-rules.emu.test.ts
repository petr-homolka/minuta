// Testy Firestore Rules pro `meta` DB (36 §3 + §5) - bezi proti emulatoru
// pres `npm run test:emu` (firebase emulators:exec). Validni bundle se
// generuje skutecnym krypto kodem (keys.ts) - testujeme realne tvary.
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, serverTimestamp, setDoc, updateDoc, getDoc } from "firebase/firestore";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { generateDeviceKeys } from "../src/lib/crypto/keys";

let env: RulesTestEnvironment;
let bundle: Awaited<ReturnType<typeof generateDeviceKeys>>["publicBundle"];

const ALICE = "alice-uid";
const EVE = "eve-uid";

function validDeviceData(b: typeof bundle) {
  return {
    identityPk: b.identityPk,
    kxPk: b.kxPk,
    signedPrekey: { pk: b.signedPrekey.pk, sig: b.signedPrekey.sig, rotatedAt: serverTimestamp() },
    platform: "pwa",
    createdAt: serverTimestamp(),
    revoked: false,
  };
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-minuta",
    firestore: {
      rules: readFileSync(resolve(__dirname, "../../infra/firestore.meta.rules"), "utf8"),
    },
  });
  bundle = (await generateDeviceKeys()).publicBundle;
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

describe("users (36 §3)", () => {
  it("vlastnik si zalozi a precte profil, ale `tier` z klienta nezapise", async () => {
    const db = env.authenticatedContext(ALICE).firestore();
    const profile = doc(db, "users", ALICE);
    await assertSucceeds(setDoc(profile, { displayName: "Alice" }));
    await assertSucceeds(getDoc(profile));
    await assertFails(updateDoc(profile, { tier: "plus" }));
    await assertFails(setDoc(doc(db, "users", ALICE), { displayName: "A", tier: "plus" }));
  });

  it("cizi profil nelze cist ani zapsat", async () => {
    const db = env.authenticatedContext(EVE).firestore();
    await assertFails(getDoc(doc(db, "users", ALICE)));
    await assertFails(setDoc(doc(db, "users", ALICE), { displayName: "Hacked" }));
  });
});

describe("devices (36 §3, 37)", () => {
  it("vlastnik zaregistruje zarizeni s validnim bundle", async () => {
    const db = env.authenticatedContext(ALICE).firestore();
    await assertSucceeds(
      setDoc(doc(db, "users", ALICE, "devices", "dev-1"), validDeviceData(bundle)),
    );
  });

  it("registrace cizim jmenem a nevalidni tvary selzou", async () => {
    const eveDb = env.authenticatedContext(EVE).firestore();
    await assertFails(
      setDoc(doc(eveDb, "users", ALICE, "devices", "dev-x"), validDeviceData(bundle)),
    );

    const db = env.authenticatedContext(ALICE).firestore();
    await assertFails(
      setDoc(doc(db, "users", ALICE, "devices", "dev-2"), {
        ...validDeviceData(bundle),
        identityPk: "kratky-klic",
      }),
    );
    await assertFails(
      setDoc(doc(db, "users", ALICE, "devices", "dev-3"), {
        ...validDeviceData(bundle),
        platform: "toaster",
      }),
    );
    await assertFails(
      setDoc(doc(db, "users", ALICE, "devices", "dev-4"), {
        ...validDeviceData(bundle),
        revoked: true,
      }),
    );
  });

  it("update publikovanych klicu je zakazan (BM-2), revokace povolena", async () => {
    const db = env.authenticatedContext(ALICE).firestore();
    const device = doc(db, "users", ALICE, "devices", "dev-1");
    await assertSucceeds(setDoc(device, validDeviceData(bundle)));

    const other = (await generateDeviceKeys()).publicBundle;
    await assertFails(updateDoc(device, { identityPk: other.identityPk }));
    await assertFails(updateDoc(device, { "signedPrekey.pk": other.signedPrekey.pk }));
    // Revokaci nelze vzit zpet (revoked: false po revokaci) ani nastavit spolu s klici.
    await assertSucceeds(updateDoc(device, { revoked: true, revokedAt: serverTimestamp() }));
    await assertFails(updateDoc(device, { revoked: false }));
  });

  it("cizi zarizeni nelze cist", async () => {
    const aliceDb = env.authenticatedContext(ALICE).firestore();
    await assertSucceeds(
      setDoc(doc(aliceDb, "users", ALICE, "devices", "dev-1"), validDeviceData(bundle)),
    );
    const eveDb = env.authenticatedContext(EVE).firestore();
    await assertFails(getDoc(doc(eveDb, "users", ALICE, "devices", "dev-1")));
  });
});

describe("prekeys (36 §3 - vydej jen Cloud Function)", () => {
  it("vlastnik doplni OPK, ale `consumed` z klienta nezmeni", async () => {
    const db = env.authenticatedContext(ALICE).firestore();
    const prekey = doc(db, "users", ALICE, "devices", "dev-1", "prekeys", "opk-1");
    const opk = bundle.oneTimePrekeys[0];
    if (!opk) throw new Error("bundle bez OPK");

    await assertSucceeds(setDoc(prekey, { pk: opk.pk, consumed: false }));
    await assertFails(updateDoc(prekey, { consumed: true }));

    // Cizi OPK nelze zakladat ani cist (ochrana proti vycerpani - DoS).
    const eveDb = env.authenticatedContext(EVE).firestore();
    await assertFails(
      setDoc(doc(eveDb, "users", ALICE, "devices", "dev-1", "prekeys", "opk-2"), {
        pk: opk.pk,
        consumed: false,
      }),
    );
    await assertFails(
      getDoc(doc(eveDb, "users", ALICE, "devices", "dev-1", "prekeys", "opk-1")),
    );
  });
});

describe("neprihlaseny (default deny)", () => {
  it("nema pristup nikam", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "users", ALICE)));
    await assertFails(setDoc(doc(db, "users", ALICE, "devices", "d"), validDeviceData(bundle)));
    await assertFails(getDoc(doc(db, "aggregates", "dau", "buckets", "2026-07")));
  });
});
