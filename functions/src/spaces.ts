// Mapa: zalozeni Space (18 §2 "POST /v1/spaces"; 36 §4 - jen CF).
// Rez 4: duo Space (ADR-006 - 1:1 je Space typu duo, 11). Vicecelenne
// Spaces, limity tarifu a dedup existujiciho dua: rez 5 (11).
// Zadny vstup se neloguje; chyby neprozrazuji existenci cizich zdroju.
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { ephemeralDb, metaDb, REGION } from "./lib/db";

const DUO_TTL_MS = 24 * 3_600_000; // free Space zije 24 h (42 §1)

export const createSpace = onCall({ region: REGION }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Prihlaseni je povinne.");
  }
  const peerUid: unknown = request.data?.peerUid;
  if (typeof peerUid !== "string" || peerUid.length === 0 || peerUid.length > 128) {
    throw new HttpsError("invalid-argument", "peerUid chybi nebo ma spatny tvar.");
  }
  if (peerUid === uid) {
    throw new HttpsError("invalid-argument", "Duo se sebou samym nelze zalozit.");
  }

  // Protistrana musi mit aspon jedno aktivni zarizeni (jinak by zpravy
  // neslo zabalit). Zaroven overuje, ze ucet existuje - bez leakovani
  // detailu (403/404 nerozlisujeme, 18 §3).
  const peerDevices = await metaDb
    .collection(`users/${peerUid}/devices`)
    .where("revoked", "==", false)
    .limit(1)
    .get();
  if (peerDevices.empty) {
    throw new HttpsError("permission-denied", "Nelze zalozit.");
  }

  const spaceRef = ephemeralDb.collection("spaces").doc();
  const batch = ephemeralDb.batch();
  batch.set(spaceRef, {
    type: "duo",
    createdAt: FieldValue.serverTimestamp(),
    expireAt: Timestamp.fromMillis(Date.now() + DUO_TTL_MS),
    ownerId: uid,
    memberCount: 2,
    cryptoVersion: 1,
  });
  // `uid` v dokumentu clena umoznuje collection-group dotaz "moje Spaces"
  // (35 §5); deviceIds[] se zacne udrzovat se sender keys (rez 5).
  batch.set(spaceRef.collection("members").doc(uid), {
    uid,
    role: "owner",
    joinedAt: FieldValue.serverTimestamp(),
    deviceIds: [],
    skVersion: 0,
  });
  batch.set(spaceRef.collection("members").doc(peerUid), {
    uid: peerUid,
    role: "member",
    joinedAt: FieldValue.serverTimestamp(),
    deviceIds: [],
    skVersion: 0,
  });
  await batch.commit();

  return { spaceId: spaceRef.id };
});
