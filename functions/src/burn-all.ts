// Mapa: "Spalit vse" (N7 bod 4; 18 §2 "POST /v1/messages/burn-all").
// Panicke gesto: okamzite smaze VSECHNY zive zpravy volajiciho ve vsech
// Spaces (obalku i payload). Klientska cast (wipe RAM) probiha lokalne.
// TTL a uklidova funkce zustavaji pojistkou (34 §3).
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { ephemeralDb, REGION } from "./lib/db";

const BATCH_LIMIT = 400; // pod limitem 500 zapisu na batch

export const burnAll = onCall({ region: REGION }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Prihlaseni je povinne.");
  }

  // Collection-group pres vsechny Spaces (index: messages.senderUid,
  // scope collection group - poznamka v infra/README.md).
  const messages = await ephemeralDb
    .collectionGroup("messages")
    .where("senderUid", "==", uid)
    .get();

  let deleted = 0;
  for (let i = 0; i < messages.docs.length; i += BATCH_LIMIT / 2) {
    const chunk = messages.docs.slice(i, i + BATCH_LIMIT / 2);
    const batch = ephemeralDb.batch();
    for (const message of chunk) {
      batch.delete(message.ref.collection("payload").doc("v"));
      batch.delete(message.ref);
      deleted += 1;
    }
    await batch.commit();
  }

  return { deleted };
});
