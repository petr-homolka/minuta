// Mapa: sdilene autorizacni pomucky Cloud Functions (18 §4, 27).
//   requireAuth        - prihlaseny uzivatel (vc. anonymniho); anonym smi
//                        zakladat konverzace i pozvanky (ADR-013 - ochrana
//                        proti zneuziti je App Check + rate limity, ne e-mail)
//   blockedBetween     - existuje blokace v kteremkoli smeru (27 §Blokovani)
//   enforceRateLimit   - pevne okno per uzivatel a operace (27 §Rate limiting;
//                        citace v meta, jen frekvence - zadny obsah, zadny graf)
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { metaDb } from "./db";

export function requireAuth(request: CallableRequest): string {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Prihlaseni je povinne.");
  }
  return uid;
}

export async function blockedBetween(uidA: string, uidB: string): Promise<boolean> {
  const [aBlocksB, bBlocksA] = await Promise.all([
    metaDb.doc(`users/${uidA}/blocks/${uidB}`).get(),
    metaDb.doc(`users/${uidB}/blocks/${uidA}`).get(),
  ]);
  return aBlocksB.exists || bBlocksA.exists;
}

const WINDOW_MS = 3_600_000; // pevne hodinove okno

export async function enforceRateLimit(
  uid: string,
  operation: string,
  maxPerHour: number,
): Promise<void> {
  const ref = metaDb.doc(`users/${uid}/rateLimits/${operation}`);
  const allowed = await metaDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const windowStart = snap.get("windowStart") as Timestamp | undefined;
    const now = Date.now();
    if (!snap.exists || !windowStart || now - windowStart.toMillis() >= WINDOW_MS) {
      tx.set(ref, { windowStart: FieldValue.serverTimestamp(), count: 1 });
      return true;
    }
    const count = (snap.get("count") as number) ?? 0;
    if (count >= maxPerHour) {
      return false;
    }
    tx.update(ref, { count: count + 1 });
    return true;
  });
  if (!allowed) {
    throw new HttpsError("resource-exhausted", "Prekrocen limit operaci - zkus to pozdeji.");
  }
}
