// Mapa: blokace uzivatelu (27 §Blokovani) - dokumenty v meta DB,
// spravuje vyhradne vlastnik (Rules). Vynucovani je na serveru (CF:
// zadne nove konverzace, zadny vydej bundlu) + klient skryva obalky
// od blokovanych. Blokovany se nic nedozvi.
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  type Firestore,
} from "firebase/firestore";

export async function blockUser(
  db: Firestore,
  myUid: string,
  targetUid: string,
): Promise<void> {
  await setDoc(doc(db, "users", myUid, "blocks", targetUid), {
    createdAt: serverTimestamp(),
  });
}

export async function unblockUser(
  db: Firestore,
  myUid: string,
  targetUid: string,
): Promise<void> {
  await deleteDoc(doc(db, "users", myUid, "blocks", targetUid));
}

export async function listBlockedUids(
  db: Firestore,
  myUid: string,
): Promise<Set<string>> {
  const snapshot = await getDocs(collection(db, "users", myUid, "blocks"));
  return new Set(snapshot.docs.map((d) => d.id));
}
