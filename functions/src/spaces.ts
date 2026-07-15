// Mapa: zalozeni Space (18 §2 "POST /v1/spaces"; 36 §4 - jen CF).
// Vse je Space (ADR-006): duo = strop 2 clenu, space = strop 16 (free, 11).
// Space vznika jen se zakladatelem; clenove pribyvaji VYHRADNE pozvankou
// (11 §Vstup, invites.ts). Limity free tarifu: 3 aktivni Spaces na ucet.
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { ephemeralDb, REGION } from "./lib/db";

const SPACE_TTL_MS = 24 * 3_600_000; // free Space zije 24 h (11)
const MAX_ACTIVE_SPACES_FREE = 3; // 11 §Limity

export function memberLimit(spaceType: string): number {
  return spaceType === "duo" ? 2 : 16; // 11 §Limity (free)
}

export const createSpace = onCall({ region: REGION }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Prihlaseni je povinne.");
  }
  const type: unknown = request.data?.type;
  if (type !== "duo" && type !== "space") {
    throw new HttpsError("invalid-argument", "type musi byt 'duo' nebo 'space'.");
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

  const spaceRef = ephemeralDb.collection("spaces").doc();
  const batch = ephemeralDb.batch();
  batch.set(spaceRef, {
    type,
    createdAt: FieldValue.serverTimestamp(),
    expireAt: Timestamp.fromMillis(now + SPACE_TTL_MS),
    ownerId: uid,
    memberCount: 1,
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
  await batch.commit();

  return { spaceId: spaceRef.id };
});
