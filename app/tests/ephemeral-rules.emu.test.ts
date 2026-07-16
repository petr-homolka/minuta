// Testy Firestore Rules pro `ephemeral` DB (36 §2 + §5, cas 34) - bezi
// proti emulatoru pres `npm run test:emu`. Kazdy soubor testu si nahraje
// SVOJE rules (per-DB soubory, viz infra/README.md) - proto bezi seriove.
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;

const SPACE = "space-1";
const ALICE = "uid-alice"; // odesilatelka
const BOB = "uid-bob"; //    prijemce
const EVE = "uid-eve"; //    neclen

const HOUR = 3_600_000;
const spacePath = `spaces/${SPACE}`;
const msgPath = (id: string) => `${spacePath}/messages/${id}`;
const payloadPath = (id: string) => `${msgPath(id)}/payload/v`;

function envelopeStub() {
  return { v: 1, msgId: "m", wraps: { "dev-bob": "d3JhcA==" } };
}

function validMessage() {
  return {
    envelope: envelopeStub(),
    senderUid: ALICE,
    senderDeviceId: "dev-alice",
    createdAt: serverTimestamp(),
    readAt: null,
    expireAt: Timestamp.fromMillis(Date.now() + HOUR), // default 1 h (ADR-014)
  };
}

/** Seed mimo Rules: space + clenove alice/bob a pripadna zprava. */
async function seed(messages: { id: string; readAt: Timestamp | null }[] = []) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, spacePath), { type: "duo", memberCount: 2 });
    await setDoc(doc(db, `${spacePath}/members/${ALICE}`), { uid: ALICE, role: "owner" });
    await setDoc(doc(db, `${spacePath}/members/${BOB}`), { uid: BOB, role: "member" });
    for (const m of messages) {
      await setDoc(doc(db, msgPath(m.id)), {
        envelope: envelopeStub(),
        senderUid: ALICE,
        senderDeviceId: "dev-alice",
        createdAt: Timestamp.now(),
        readAt: m.readAt,
        expireAt: Timestamp.fromMillis(Date.now() + 24 * HOUR),
      });
      await setDoc(doc(db, payloadPath(m.id)), { ciphertext: "c2lmcm92YW5v" });
    }
  });
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-minuta",
    firestore: {
      rules: readFileSync(
        resolve(__dirname, "../../infra/firestore.ephemeral.rules"),
        "utf8",
      ),
    },
  });
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
});

describe("neclen a neprihlaseny (default deny)", () => {
  it("necte space, cleny, zpravy ani payload", async () => {
    await seed([{ id: "m1", readAt: Timestamp.now() }]);
    for (const db of [
      env.authenticatedContext(EVE).firestore(),
      env.unauthenticatedContext().firestore(),
    ]) {
      await assertFails(getDoc(doc(db, spacePath)));
      await assertFails(getDoc(doc(db, `${spacePath}/members/${ALICE}`)));
      await assertFails(getDocs(collection(db, `${spacePath}/messages`)));
      await assertFails(getDoc(doc(db, payloadPath("m1"))));
      await assertFails(setDoc(doc(db, msgPath("mx")), validMessage()));
    }
  });
});

describe("clen: cteni a odeslani (36 §2)", () => {
  it("cte space, cleny i obalky zprav; vypis vsech spaces je zakazan", async () => {
    await seed([{ id: "m1", readAt: null }]);
    const db = env.authenticatedContext(BOB).firestore();
    await assertSucceeds(getDoc(doc(db, spacePath)));
    await assertSucceeds(getDoc(doc(db, `${spacePath}/members/${ALICE}`)));
    await assertSucceeds(getDocs(collection(db, `${spacePath}/messages`)));
    await assertFails(getDocs(collection(db, "spaces")));
  });

  it("odesle zpravu jen svym jmenem, serverovym casem a TTL v koridoru", async () => {
    await seed();
    const db = env.authenticatedContext(ALICE).firestore();
    await assertSucceeds(setDoc(doc(db, msgPath("m-ok")), validMessage()));
    // payload spolu s obalkou
    await assertSucceeds(
      setDoc(doc(db, payloadPath("m-ok")), { ciphertext: "YWJj" }),
    );
    // Kratsi TTL nez default projde (uvolneny koridor, ADR-014) - kratsi
    // je vzdy bezpecne (fail-secure).
    await assertSucceeds(
      setDoc(doc(db, msgPath("m-short")), {
        ...validMessage(),
        expireAt: Timestamp.fromMillis(Date.now() + 60_000),
      }),
    );

    // cizi jmeno
    await assertFails(
      setDoc(doc(db, msgPath("m2")), { ...validMessage(), senderUid: BOB }),
    );
    // klientsky createdAt
    await assertFails(
      setDoc(doc(db, msgPath("m3")), {
        ...validMessage(),
        createdAt: Timestamp.fromMillis(Date.now() - HOUR),
      }),
    );
    // predvyplnene readAt
    await assertFails(
      setDoc(doc(db, msgPath("m4")), { ...validMessage(), readAt: Timestamp.now() }),
    );
    // TTL nad stropem ~24 h neprojde (ADR-014 strop free tarifu)
    await assertFails(
      setDoc(doc(db, msgPath("m5")), {
        ...validMessage(),
        expireAt: Timestamp.fromMillis(Date.now() + 48 * HOUR),
      }),
    );
    // expireAt == request.time (serverTimestamp) neprojde (musi byt > now)
    await assertFails(
      setDoc(doc(db, msgPath("m6")), { ...validMessage(), expireAt: serverTimestamp() }),
    );
    // pole navic
    await assertFails(
      setDoc(doc(db, msgPath("m7")), { ...validMessage(), extra: true }),
    );
  });

  it("spaces/members z klienta nelze zakladat ani menit", async () => {
    await seed();
    const db = env.authenticatedContext(ALICE).firestore();
    await assertFails(setDoc(doc(db, "spaces/novy"), { type: "duo" }));
    await assertFails(updateDoc(doc(db, spacePath), { memberCount: 99 }));
    await assertFails(deleteDoc(doc(db, spacePath)));
    await assertFails(
      setDoc(doc(db, `${spacePath}/members/${EVE}`), { role: "member" }),
    );
  });
});

describe("collection-group 'moje Spaces' (35 §5)", () => {
  it("vlastni clenstvi lze dotazovat, cizi ne", async () => {
    await seed();
    const db = env.authenticatedContext(BOB).firestore();
    await assertSucceeds(
      getDocs(query(collectionGroup(db, "members"), where("uid", "==", BOB))),
    );
    await assertFails(
      getDocs(query(collectionGroup(db, "members"), where("uid", "==", ALICE))),
    );
    await assertFails(getDocs(query(collectionGroup(db, "members"))));
  });
});

describe("otevreni zpravy (34 §2)", () => {
  it("prijemce otevre jednou; odesilatel a druhy pokus selzou", async () => {
    await seed([{ id: "m1", readAt: null }]);
    const bob = env.authenticatedContext(BOB).firestore();
    const alice = env.authenticatedContext(ALICE).firestore();

    // odesilatel nesmi "otevrit" vlastni zpravu
    await assertFails(
      updateDoc(doc(alice, msgPath("m1")), {
        readAt: serverTimestamp(),
        expireAt: serverTimestamp(),
      }),
    );
    // klientsky cas nesmi projit (ADR-008)
    await assertFails(
      updateDoc(doc(bob, msgPath("m1")), {
        readAt: Timestamp.fromMillis(Date.now() - 10 * HOUR),
        expireAt: serverTimestamp(),
      }),
    );
    // jine pole nez readAt/expireAt nesmi update menit
    await assertFails(
      updateDoc(doc(bob, msgPath("m1")), {
        readAt: serverTimestamp(),
        expireAt: serverTimestamp(),
        senderUid: BOB,
      }),
    );
    // platne otevreni
    await assertSucceeds(
      updateDoc(doc(bob, msgPath("m1")), {
        readAt: serverTimestamp(),
        expireAt: serverTimestamp(),
      }),
    );
    // readAt nelze zapsat podruhe
    await assertFails(
      updateDoc(doc(bob, msgPath("m1")), {
        readAt: serverTimestamp(),
        expireAt: serverTimestamp(),
      }),
    );
  });
});

describe("gate payloadu (34 §2-3, invariant 42 §5.3)", () => {
  it("pred otevrenim necitelny, v okne citelny, po readAt+90 s necitelny", async () => {
    await seed([
      { id: "zavrena", readAt: null },
      { id: "otevrena", readAt: Timestamp.now() },
      { id: "prosla", readAt: Timestamp.fromMillis(Date.now() - 120_000) },
    ]);
    const bob = env.authenticatedContext(BOB).firestore();

    await assertFails(getDoc(doc(bob, payloadPath("zavrena"))));
    await assertSucceeds(getDoc(doc(bob, payloadPath("otevrena"))));
    await assertFails(getDoc(doc(bob, payloadPath("prosla"))));

    // okno plati i pro odesilatele (je clen - smi cist, dokud neproslo)
    const alice = env.authenticatedContext(ALICE).firestore();
    await assertFails(getDoc(doc(alice, payloadPath("prosla"))));
  });

  it("payload nelze menit; smazat (burn) smi jen clen", async () => {
    await seed([{ id: "m1", readAt: Timestamp.now() }]);
    const bob = env.authenticatedContext(BOB).firestore();
    const eve = env.authenticatedContext(EVE).firestore();
    await assertFails(
      updateDoc(doc(bob, payloadPath("m1")), { ciphertext: "x" }),
    );
    await assertFails(deleteDoc(doc(eve, payloadPath("m1"))));
    await assertSucceeds(deleteDoc(doc(bob, payloadPath("m1"))));
  });
});

describe("unsend (N7) a pozvanky (12)", () => {
  it("zpravu smaze jen odesilatel; invites jsou klientovi nedostupne", async () => {
    await seed([{ id: "m1", readAt: null }]);
    const bob = env.authenticatedContext(BOB).firestore();
    const alice = env.authenticatedContext(ALICE).firestore();

    await assertFails(deleteDoc(doc(bob, msgPath("m1"))));
    await assertSucceeds(deleteDoc(doc(alice, msgPath("m1"))));

    await assertFails(getDoc(doc(alice, "invites/hash123")));
    await assertFails(
      setDoc(doc(alice, "invites/hash123"), { spaceId: SPACE, uses: 0 }),
    );
  });
});
