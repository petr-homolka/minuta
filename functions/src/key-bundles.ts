// Mapa: vydej verejnych key bundlu zarizeni (18 §2 "GET /v1/users/{uid}/
// key-bundles"; 36 §4). Rules drzi devices citelne jen vlastnikem -
// protistrana je dostava vyhradne tudy, s autorizaci spolecneho Space.
// Vraci JEN verejne casti. TODO(rez 5): jednorazovy vydej OPK v transakci
// (consumed) + rate limit (27); zatim se bali na SPK (ADR-010).
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { ephemeralDb, metaDb, REGION } from "./lib/db";

export const getKeyBundles = onCall({ region: REGION }, async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Prihlaseni je povinne.");
  }
  const targetUid: unknown = request.data?.uid;
  const spaceId: unknown = request.data?.spaceId;
  if (typeof targetUid !== "string" || targetUid.length === 0 || targetUid.length > 128) {
    throw new HttpsError("invalid-argument", "uid chybi nebo ma spatny tvar.");
  }
  if (typeof spaceId !== "string" || spaceId.length === 0 || spaceId.length > 128) {
    throw new HttpsError("invalid-argument", "spaceId chybi nebo ma spatny tvar.");
  }

  // Autorizace: volajici i cil musi byt cleny tehoz Space (18 §4).
  const members = ephemeralDb.collection(`spaces/${spaceId}/members`);
  const [callerDoc, targetDoc] = await Promise.all([
    members.doc(callerUid).get(),
    members.doc(targetUid).get(),
  ]);
  if (!callerDoc.exists || !targetDoc.exists) {
    throw new HttpsError("permission-denied", "Nelze vydat.");
  }

  const devices = await metaDb
    .collection(`users/${targetUid}/devices`)
    .where("revoked", "==", false)
    .get();

  return {
    devices: devices.docs.map((snapshot) => {
      const data = snapshot.data();
      const signedPrekey = data["signedPrekey"] as { pk: string; sig: string };
      return {
        deviceId: snapshot.id,
        identityPk: data["identityPk"] as string,
        kxPk: data["kxPk"] as string,
        signedPrekey: { pk: signedPrekey.pk, sig: signedPrekey.sig },
      };
    }),
  };
});
