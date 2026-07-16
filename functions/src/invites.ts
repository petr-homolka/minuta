// Mapa: pozvanky (12, 18 §2) - vytvoreni, nahled, vstup, revokace.
// Ulozeny je VYHRADNE hash tokenu (35 §3 - unik DB nezpristupni pozvanky);
// plaintext token existuje jen v odpovedi createInvite a v magic linku.
// Vsechny chyby o cizich zdrojich jsou zamerne nerozlisitelne (18 §3).
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { ephemeralDb, REGION } from "./lib/db";
import { blockedBetween, enforceRateLimit, requireAuth } from "./lib/guards";
import { memberLimit } from "./spaces";

const MAX_TTL_MIN = 7 * 24 * 60;
const MAX_USES_CAP = 100;
const invalidInvite = () =>
  new HttpsError("failed-precondition", "Pozvanka neni platna.");

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export const createInvite = onCall({ region: REGION }, async (request) => {
  // Anonym smi vytvaret pozvanky (ADR-013); ochrana = rate limit + App Check.
  const uid = requireAuth(request);
  await enforceRateLimit(uid, "createInvite", 10);
  const { spaceId, expiresInMinutes, maxUses, password } = request.data ?? {};
  if (typeof spaceId !== "string" || spaceId.length === 0) {
    throw new HttpsError("invalid-argument", "spaceId chybi.");
  }
  const ttlMin = Math.min(
    Math.max(1, Number.isInteger(expiresInMinutes) ? (expiresInMinutes as number) : 60),
    MAX_TTL_MIN,
  );
  const uses = Math.min(
    Math.max(1, Number.isInteger(maxUses) ? (maxUses as number) : 1),
    MAX_USES_CAP,
  );

  // Pozvanky vytvari owner/admin (11 §Role) a nikdy neprezije Space.
  const [memberSnap, spaceSnap] = await Promise.all([
    ephemeralDb.doc(`spaces/${spaceId}/members/${uid}`).get(),
    ephemeralDb.doc(`spaces/${spaceId}`).get(),
  ]);
  const role = memberSnap.get("role") as string | undefined;
  if (!spaceSnap.exists || (role !== "owner" && role !== "admin")) {
    throw new HttpsError("permission-denied", "Nelze vytvorit.");
  }
  const spaceExpireAt = spaceSnap.get("expireAt") as Timestamp | null;
  let expireAtMillis = Date.now() + ttlMin * 60_000;
  if (spaceExpireAt !== null) {
    expireAtMillis = Math.min(expireAtMillis, spaceExpireAt.toMillis());
  }

  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const invite: Record<string, unknown> = {
    spaceId,
    createdBy: uid,
    createdAt: FieldValue.serverTimestamp(),
    expireAt: Timestamp.fromMillis(expireAtMillis),
    maxUses: uses,
    uses: 0,
    revoked: false,
  };
  if (typeof password === "string" && password.length > 0) {
    const salt = randomBytes(16).toString("hex");
    invite["passwordSalt"] = salt;
    invite["passwordHash"] = scryptSync(password, salt, 32).toString("hex");
  }
  await ephemeralDb.doc(`invites/${tokenHash}`).set(invite);

  return { token, tokenHash, expireAtMillis, maxUses: uses };
});

interface LiveInvite {
  spaceId: string;
  requiresPassword: boolean;
  verifyPassword: (password: unknown) => boolean;
}

function passwordVerifier(
  snap: FirebaseFirestore.DocumentSnapshot,
): (password: unknown) => boolean {
  const passwordHash = snap.get("passwordHash") as string | undefined;
  const passwordSalt = snap.get("passwordSalt") as string | undefined;
  return (password: unknown) => {
    if (passwordHash === undefined || passwordSalt === undefined) return true;
    if (typeof password !== "string") return false;
    const presented = scryptSync(password, passwordSalt, 32);
    return timingSafeEqual(presented, Buffer.from(passwordHash, "hex"));
  };
}

async function inviteSnapForToken(
  token: unknown,
): Promise<FirebaseFirestore.DocumentSnapshot> {
  if (typeof token !== "string" || token.length < 16 || token.length > 128) {
    throw invalidInvite();
  }
  const snap = await ephemeralDb.doc(`invites/${hashToken(token)}`).get();
  if (!snap.exists) throw invalidInvite();
  const expireAt = snap.get("expireAt") as Timestamp;
  if (expireAt.toMillis() <= Date.now()) throw invalidInvite();
  return snap;
}

async function loadLiveInvite(token: unknown): Promise<LiveInvite> {
  const snap = await inviteSnapForToken(token);
  if (
    snap.get("revoked") === true ||
    (snap.get("uses") as number) >= (snap.get("maxUses") as number)
  ) {
    throw invalidInvite();
  }
  return {
    spaceId: snap.get("spaceId") as string,
    requiresPassword: (snap.get("passwordHash") as string | undefined) !== undefined,
    verifyPassword: passwordVerifier(snap),
  };
}

export const previewInvite = onCall({ region: REGION }, async (request) => {
  requireAuth(request);
  const invite = await loadLiveInvite(request.data?.token);
  const space = await ephemeralDb.doc(`spaces/${invite.spaceId}`).get();
  if (!space.exists) throw invalidInvite();
  const expireAt = space.get("expireAt") as Timestamp | null;
  return {
    type: space.get("type") as string,
    memberCount: space.get("memberCount") as number,
    spaceExpireAtMillis: expireAt === null ? null : expireAt.toMillis(),
    requiresPassword: invite.requiresPassword,
  };
});

export const joinSpace = onCall({ region: REGION }, async (request) => {
  const uid = requireAuth(request); // anonymni vstup je zadouci (N4)
  await enforceRateLimit(uid, "joinSpace", 30);
  // Zamerne NE loadLiveInvite: uz-clen ma vstup idempotentni i po
  // vycerpani/revokaci pozvanky (nic noveho nezpristupnuje). Prisne
  // kontroly (revoked, uses, heslo, kapacita) plati pro NOVE cleny v tx.
  const inviteSnap = await inviteSnapForToken(request.data?.token);
  const passwordOk = passwordVerifier(inviteSnap)(request.data?.password);
  const tokenHash = inviteSnap.id;
  const targetSpaceId = inviteSnap.get("spaceId") as string;

  // Blokace mezi vstupujicim a tvurcem pozvanky = pozvanka pro nej neplati
  // (27; nerozlisovat duvod - blokovany se nic nedozvi).
  const inviteCreator = inviteSnap.get("createdBy") as string;
  if (uid !== inviteCreator && (await blockedBetween(uid, inviteCreator))) {
    throw invalidInvite();
  }

  const spaceId = await ephemeralDb.runTransaction(async (tx) => {
    const spaceRef = ephemeralDb.doc(`spaces/${targetSpaceId}`);
    const inviteRef = ephemeralDb.doc(`invites/${tokenHash}`);
    const memberRef = spaceRef.collection("members").doc(uid);
    const [space, invite, member] = await Promise.all([
      tx.get(spaceRef),
      tx.get(inviteRef),
      tx.get(memberRef),
    ]);
    if (!space.exists || !invite.exists) throw invalidInvite();
    const spaceExpireAt = space.get("expireAt") as Timestamp | null;
    if (spaceExpireAt !== null && spaceExpireAt.toMillis() <= Date.now()) {
      throw invalidInvite();
    }
    if (member.exists) {
      return targetSpaceId; // idempotentni opakovany vstup
    }
    const uses = invite.get("uses") as number;
    if (
      !passwordOk ||
      invite.get("revoked") === true ||
      uses >= (invite.get("maxUses") as number)
    ) {
      throw invalidInvite();
    }
    const memberCount = space.get("memberCount") as number;
    if (memberCount >= memberLimit(space.get("type") as string)) {
      throw new HttpsError("resource-exhausted", "Space je plny.");
    }
    tx.set(memberRef, {
      uid,
      role: "member",
      joinedAt: FieldValue.serverTimestamp(),
      deviceIds: [],
      skVersion: 0,
    });
    tx.update(spaceRef, { memberCount: memberCount + 1 });
    tx.update(inviteRef, { uses: uses + 1 });
    return targetSpaceId;
  });

  return { spaceId };
});

export const revokeInvite = onCall({ region: REGION }, async (request) => {
  const uid = requireAuth(request);
  const tokenHash: unknown = request.data?.tokenHash;
  if (typeof tokenHash !== "string" || tokenHash.length !== 64) {
    throw new HttpsError("invalid-argument", "tokenHash ma spatny tvar.");
  }
  const inviteSnap = await ephemeralDb.doc(`invites/${tokenHash}`).get();
  if (!inviteSnap.exists) throw invalidInvite();
  const spaceId = inviteSnap.get("spaceId") as string;
  const member = await ephemeralDb.doc(`spaces/${spaceId}/members/${uid}`).get();
  const role = member.get("role") as string | undefined;
  if (role !== "owner" && role !== "admin") {
    throw new HttpsError("permission-denied", "Nelze revokovat.");
  }
  await ephemeralDb.doc(`invites/${tokenHash}`).update({ revoked: true });
  return { revoked: true };
});
