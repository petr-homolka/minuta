// Mapa: uloziste Znamych v `meta` DB (40 §3, zero-knowledge).
//   users/{uid}/roster/key          - wraps: {deviceId: seal(RK, SPK)}
//   users/{uid}/contacts/{randomId} - blob: sifrovany ContactRecord
// ID kontaktu je NAHODNE - server nevidi parove vazby, jen pocet.
// Multi-device: zarizeni bez wrapu RK roster neprecte - re-wrap novym
// zarizenim TODO (37, vyzaduje online zarizeni s RK).
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore";
import {
  decryptContact,
  encryptContact,
  generateRosterKey,
  unwrapRosterKey,
  wrapRosterKey,
  type ContactRecord,
} from "../../lib/crypto/roster";
import { x25519PublicFromSecret } from "../../lib/crypto/keys";
import type { DeviceIdentity } from "../device/key-store";

export interface StoredContact {
  id: string;
  record: ContactRecord;
}

/** Nacte roster key, existuje-li; null = roster jeste nevznikl. */
export async function loadRosterKeyIfExists(
  db: Firestore,
  uid: string,
  identity: DeviceIdentity,
): Promise<Uint8Array | null> {
  const snap = await getDoc(doc(db, "users", uid, "roster", "key"));
  if (!snap.exists()) {
    return null;
  }
  const wraps = (snap.get("wraps") ?? {}) as Record<string, string>;
  const myWrap = wraps[identity.deviceId];
  if (!myWrap) {
    throw new Error(
      "Toto zarizeni nema pristup k rosteru - re-wrap jinym zarizenim (TODO 37).",
    );
  }
  const spkPk = await x25519PublicFromSecret(identity.privateKeys.signedPrekeySk);
  return unwrapRosterKey(myWrap, spkPk, identity.privateKeys.signedPrekeySk);
}

/**
 * Roster key pro zapis - pri prvnim ulozeni Znameho ho zalozi.
 * (Zamerne se NEzaklada pri pouhem cteni - zadna metadata navic.)
 */
export async function ensureRosterKey(
  db: Firestore,
  uid: string,
  identity: DeviceIdentity,
): Promise<Uint8Array> {
  const existing = await loadRosterKeyIfExists(db, uid, identity);
  if (existing) {
    return existing;
  }
  const rosterKey = await generateRosterKey();
  const spkPk = await x25519PublicFromSecret(identity.privateKeys.signedPrekeySk);
  const wrap = await wrapRosterKey(rosterKey, spkPk);
  await setDoc(doc(db, "users", uid, "roster", "key"), {
    wraps: { [identity.deviceId]: wrap },
    updatedAt: serverTimestamp(),
  });
  return rosterKey;
}

export async function addContact(
  db: Firestore,
  uid: string,
  rosterKey: Uint8Array,
  record: ContactRecord,
): Promise<string> {
  const id = crypto.randomUUID();
  await setDoc(doc(db, "users", uid, "contacts", id), {
    blob: await encryptContact(record, rosterKey),
    updatedAt: serverTimestamp(),
  });
  return id;
}

export async function loadContacts(
  db: Firestore,
  uid: string,
  rosterKey: Uint8Array,
): Promise<StoredContact[]> {
  const snapshot = await getDocs(collection(db, "users", uid, "contacts"));
  const contacts: StoredContact[] = [];
  for (const docSnap of snapshot.docs) {
    try {
      contacts.push({
        id: docSnap.id,
        record: await decryptContact(docSnap.get("blob") as string, rosterKey),
      });
    } catch {
      // Poskozeny/cizim klicem sifrovany zaznam tise preskocime -
      // roster je pomucka, ne kriticka cesta.
    }
  }
  return contacts.sort((a, b) => a.record.name.localeCompare(b.record.name));
}

export async function removeContact(
  db: Firestore,
  uid: string,
  contactId: string,
): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "contacts", contactId));
}
