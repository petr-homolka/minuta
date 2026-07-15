// Mapa: nahlaseni zpravy (27 §Nahlaseni, 29 §1; 18 §2 ".../report").
// Dukaz prichazi UZ ZAPECETENY klientem na verejny klic moderacni
// schranky - CF ani DB plaintext nikdy nevidi. Odesilatel se o nahlaseni
// nedozvi. Retence dukazu 90 dni (TTL pojistka; 29 §1.2).
// TODO(provisioning 45): v prod se zapisuje do ODDELENEHO moderacniho
// projektu (minuta-moderation-prod) s vlastnim IAM a auditem pristupu;
// v dev/emulatoru simulovano kolekci moderationReports (klientum
// nedostupna - default deny v Rules).
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { ephemeralDb, REGION } from "./lib/db";
import { enforceRateLimit, requireAuth } from "./lib/guards";

const CATEGORIES: Record<string, string> = {
  C1: "kriticka",
  C2: "vysoka",
  C3: "stredni",
  C4: "stredni",
  C5: "dle typu",
  C6: "nizka",
};
const EVIDENCE_MAX_BYTES = 64 * 1024;
const RETENTION_MS = 90 * 24 * 3_600_000;

export const reportMessage = onCall({ region: REGION }, async (request) => {
  const reporterUid = requireAuth(request);
  await enforceRateLimit(reporterUid, "reports", 20);

  const { spaceId, msgId, reportedUid, category, evidence } = request.data ?? {};
  if (
    typeof spaceId !== "string" || spaceId.length === 0 ||
    typeof msgId !== "string" || msgId.length === 0 ||
    typeof reportedUid !== "string" || reportedUid.length === 0
  ) {
    throw new HttpsError("invalid-argument", "Chybi identifikace zpravy.");
  }
  if (typeof category !== "string" || !(category in CATEGORIES)) {
    throw new HttpsError("invalid-argument", "Neznama kategorie (29 §2).");
  }
  if (
    typeof evidence !== "string" ||
    evidence.length === 0 ||
    evidence.length > EVIDENCE_MAX_BYTES
  ) {
    throw new HttpsError("invalid-argument", "Dukaz chybi nebo je prilis velky.");
  }

  // Nahlasit smi jen clen Space (prijemce); nerozlisovat neexistenci (18 §3).
  const member = await ephemeralDb
    .doc(`spaces/${spaceId}/members/${reporterUid}`)
    .get();
  if (!member.exists) {
    throw new HttpsError("permission-denied", "Nelze nahlasit.");
  }

  const ref = ephemeralDb.collection("moderationReports").doc();
  await ref.set({
    state: "new", // 29 §1.2: Nova -> V reseni -> Rozhodnuto -> Uzavreno
    category,
    priority: CATEGORIES[category],
    reporterUid,
    reportedUid,
    spaceId,
    msgId,
    evidence, // zapeceteno klientem na klic moderace - zde neprulomne
    createdAt: FieldValue.serverTimestamp(),
    expireAt: Timestamp.fromMillis(Date.now() + RETENTION_MS),
  });

  return { reportId: ref.id };
});
