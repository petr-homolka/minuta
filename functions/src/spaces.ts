// Mapa: zalozeni Space (18 §2 "POST /v1/spaces"; 36 §4 - jen CF).
// Vse je Space (ADR-006): duo = strop 2 clenu, space = strop 16 (free, 11).
// Clenove pribyvaji pozvankou (11 §Vstup, invites.ts); vyjimka dle 40 §2:
// duo se Znamym lze zalozit primo s peerUid (bez noveho magic linku).
// Limity free tarifu: 3 aktivni Spaces na ucet.
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { ephemeralDb, metaDb, REGION } from "./lib/db";
import { blockedBetween, enforceRateLimit, requireFullAccount } from "./lib/guards";

const SPACE_TTL_MS = 24 * 3_600_000; // free Space zije 24 h (11)
const MAX_ACTIVE_SPACES_FREE = 3; // 11 §Limity

export function memberLimit(spaceType: string): number {
  return spaceType === "duo" ? 2 : 16; // 11 §Limity (free)
}

export const createSpace = onCall({ region: REGION }, async (request) => {
  // 27: anonymni ucet nezaklada konverzace - smi jen odpovidat v pozvane.
  const uid = requireFullAccount(request);
  await enforceRateLimit(uid, "createSpace", 10);
  const type: unknown = request.data?.type;
  if (type !== "duo" && type !== "space") {
    throw new HttpsError("invalid-argument", "type musi byt 'duo' nebo 'space'.");
  }
  // Volitelne: duo se Znamym primo (40 §2). Protistrana musi mit aspon
  // jedno aktivni zarizeni; chyba nerozlisuje neexistenci (18 §3).
  const peerUid: unknown = request.data?.peerUid;
  if (peerUid !== undefined) {
    if (
      type !== "duo" ||
      typeof peerUid !== "string" ||
      peerUid.length === 0 ||
      peerUid.length > 128 ||
      peerUid === uid
    ) {
      throw new HttpsError("invalid-argument", "peerUid lze jen u dua a ne sam sobe.");
    }
    const peerDevices = await metaDb
      .collection(`users/${peerUid}/devices`)
      .where("revoked", "==", false)
      .limit(1)
      .get();
    // Blokace v kteremkoli smeru = zadne nove konverzace (27); odpoved
    // nerozlisuje duvod (zadna notifikace blokovanemu).
    if (peerDevices.empty || (await blockedBetween(uid, peerUid))) {
      throw new HttpsError("permission-denied", "Nelze zalozit.");
    }
  }

  // Limit aktivnich Spaces (11): pocitaji se nevyprsele zalozene volajicim.
  const owned = await ephemeralDb
    .collection("spaces")
    .where("ownerId", "==", uid)
    .get();
  const now = Date.now();
  const active = owned.docs.filter((d) => {
    const expireAt = d.get("expireAt") as Timestamp | null;
    return expireAt === null || expireAt.toMillis() > now;
  });
  if (active.length >= MAX_ACTIVE_SPACES_FREE) {
    throw new HttpsError("resource-exhausted", "Limit aktivnich Spaces vycerpan.");
  }

  const withPeer = peerUid !== undefined;
  const spaceRef = ephemeralDb.collection("spaces").doc();
  const batch = ephemeralDb.batch();
  batch.set(spaceRef, {
    type,
    createdAt: FieldValue.serverTimestamp(),
    expireAt: Timestamp.fromMillis(now + SPACE_TTL_MS),
    ownerId: uid,
    memberCount: withPeer ? 2 : 1,
    cryptoVersion: 1,
  });
  // `uid` v dokumentu umoznuje collection-group dotaz "moje Spaces" (35 §5).
  batch.set(spaceRef.collection("members").doc(uid), {
    uid,
    role: "owner",
    joinedAt: FieldValue.serverTimestamp(),
    deviceIds: [],
    skVersion: 0,
  });
  if (withPeer) {
    batch.set(spaceRef.collection("members").doc(peerUid as string), {
      uid: peerUid,
      role: "member",
      joinedAt: FieldValue.serverTimestamp(),
      deviceIds: [],
      skVersion: 0,
    });
  }
  await batch.commit();

  return { spaceId: spaceRef.id };
});
