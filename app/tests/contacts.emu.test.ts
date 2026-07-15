// E2E rez 7 (42 §3, 40): sifrovany roster Znamych + duo se Znamym primo.
import { deleteApp } from "firebase/app";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { callCreateSpace } from "../src/features/chat/api";
import {
  addContact,
  ensureRosterKey,
  loadContacts,
  loadRosterKeyIfExists,
  removeContact,
} from "../src/features/contacts/store";
import { loadDeviceIdentity } from "../src/features/device/key-store";
import { createParty, loadDevRules, type Party } from "./helpers";

let alice: Party;
let bob: Party;

beforeAll(async () => {
  await loadDevRules();
  alice = await createParty("ct-alice");
  bob = await createParty("ct-bob");
}, 60_000);

afterAll(async () => {
  await deleteApp(alice.app);
  await deleteApp(bob.app);
});

describe("Znami (40)", () => {
  it("roster: zalozeni RK, ulozeni a nacteni kontaktu, mazani", async () => {
    const identity = await loadDeviceIdentity(alice.uid);
    if (!identity) throw new Error("bez klicu");

    // Pred prvnim ulozenim roster neexistuje (zadna metadata navic).
    await expect(
      loadRosterKeyIfExists(alice.db, alice.uid, identity),
    ).resolves.toBeNull();

    const rosterKey = await ensureRosterKey(alice.db, alice.uid, identity);
    const fingerprint = "9d".repeat(32); // testovaci otisk (hex, 32 B)
    const contactId = await addContact(alice.db, alice.uid, rosterKey, {
      uid: bob.uid,
      name: "Bob testovaci",
      ikFingerprint: fingerprint,
      verified: false,
    });

    // Nacteni z druheho "sezeni" (novy unwrap tymz zarizenim).
    const again = await loadRosterKeyIfExists(alice.db, alice.uid, identity);
    if (!again) throw new Error("RK se neobnovil");
    const contacts = await loadContacts(alice.db, alice.uid, again);
    expect(contacts).toHaveLength(1);
    expect(contacts[0]?.record.name).toBe("Bob testovaci");
    expect(contacts[0]?.record.uid).toBe(bob.uid);

    // Server/dokument nesmi obsahovat plaintext jmena ani uid protistrany.
    const raw = await getDoc(doc(alice.db, "users", alice.uid, "contacts", contactId));
    const blob = raw.get("blob") as string;
    expect(blob).not.toContain("Bob");
    expect(blob).not.toContain(bob.uid);
    expect(raw.id).not.toBe(bob.uid); // nahodne ID - zadny parovy graf

    await removeContact(alice.db, alice.uid, contactId);
    await expect(loadContacts(alice.db, alice.uid, again)).resolves.toHaveLength(0);
  }, 60_000);

  it("cizi roster ani kontakty nelze cist (Rules meta)", async () => {
    await expect(
      getDoc(doc(bob.db, "users", alice.uid, "roster", "key")),
    ).rejects.toThrow();
    await expect(
      getDocs(collection(bob.db, "users", alice.uid, "contacts")),
    ).rejects.toThrow();
  }, 30_000);

  it("duo se Znamym primo pres peerUid (40 §2)", async () => {
    const spaceId = await callCreateSpace(alice.functions, "duo", bob.uid);
    const members = await getDocs(collection(alice.db, "spaces", spaceId, "members"));
    expect(members.docs.map((d) => d.id).sort()).toEqual([alice.uid, bob.uid].sort());

    // peerUid plati jen pro duo a ne pro neexistujici protistranu.
    await expect(
      callCreateSpace(alice.functions, "space", bob.uid),
    ).rejects.toThrow();
    await expect(
      callCreateSpace(bob.functions, "duo", "neexistujici-uid"),
    ).rejects.toThrow();
  }, 60_000);
});
