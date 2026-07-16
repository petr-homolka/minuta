// Mapa: zalozeni a opusteni Space (18 §2; 36 §4 - jen CF).
//   createSpace - vse je Space (ADR-006): duo = strop 2, space = strop 16
//     (free, 11). Anonym smi zakladat (ADR-013). Clenove pribyvaji
//     pozvankou (invites.ts); vyjimka 40 §2: duo se Znamym primo peerUid.
//   leaveSpace  - odchod ucastnika = zanik cele mistnosti (ADR-014).
// Limity free tarifu: 3 aktivni Spaces na ucet.
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { ephemeralDb, metaDb, REGION } from "./lib/db";
import { blockedBetween, enforceRateLimit, requireAuth } from "./lib/guards";

const SPACE_TTL_MS = 24 * 3_600_000; // free Space zije 24 h (11)
const MAX_ACTIVE_SPACES_FREE = 3; // 11 §Limity

export function memberLimit(spaceType: string): number {
  return spaceType === "duo" ? 2 : 16; // 11 §Limity (free)
}

export const createSpace = onCall({ region: REGION }, async (request) => {
  // Anonym smi zakladat (ADR-013); ochrana je rate limit + App Check (45).
  const uid = requireAuth(request);
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

// Odchod ucastnika = mistnost prestane existovat (ADR-014). Smaze VSE:
// zpravy + payloady + cleny (recursiveDelete cely podstrom), pozvanky
// i Space. Zadna zbytkova mistnost; ostatni clenove jsou vyhozeni
// (jejich listenery na Space doc uvidi zanik). Kdokoli clen muze ukoncit.
export const leaveSpace = onCall({ region: REGION }, async (request) => {
  const uid = requireAuth(request);
  const spaceId: unknown = request.data?.spaceId;
  if (typeof spaceId !== "string" || spaceId.length === 0 || spaceId.length > 128) {
    throw new HttpsError("invalid-argument", "spaceId chybi nebo ma spatny tvar.");
  }
  const spaceRef = ephemeralDb.doc(`spaces/${spaceId}`);
  const member = await spaceRef.collection("members").doc(uid).get();
  if (!member.exists) {
    throw new HttpsError("permission-denied", "Nelze opustit.");
  }

  // Pozvanky teto mistnosti (link/QR prestanou platit). Pocet je maly
  // (rate limit 10/h), ale radeji chunkovane pod limitem 500 na batch.
  const invites = await ephemeralDb
    .collection("invites")
    .where("spaceId", "==", spaceId)
    .get();
  for (let i = 0; i < invites.docs.length; i += 400) {
    const batch = ephemeralDb.batch();
    for (const invite of invites.docs.slice(i, i + 400)) {
      batch.delete(invite.ref);
    }
    await batch.commit();
  }

  // Cely podstrom Space (members, messages, messages/*/payload) + Space doc.
  await ephemeralDb.recursiveDelete(spaceRef);

  return { burned: true };
});
