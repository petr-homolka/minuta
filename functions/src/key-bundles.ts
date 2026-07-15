// Mapa: vydej verejnych key bundlu zarizeni (18 §2 "GET /v1/users/{uid}/
// key-bundles"; 36 §4). Rules drzi devices citelne jen vlastnikem -
// protistrana je dostava vyhradne tudy, s autorizaci spolecneho Space.
//   getKeyBundles      - bundly jednoho uzivatele (overeni odesilatele)
//   getSpaceKeyBundles - bundly vsech ostatnich clenu (odeslani, ADR-012)
// Vraci JEN verejne casti. TODO(rez 6+): jednorazovy vydej OPK v transakci
// (consumed) + rate limit (27); zatim se bali na SPK (ADR-010).
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { ephemeralDb, metaDb, REGION } from "./lib/db";
import { blockedBetween } from "./lib/guards";

interface PublicBundle {
  deviceId: string;
  identityPk: string;
  kxPk: string;
  signedPrekey: { pk: string; sig: string };
}

async function activeDeviceBundles(uid: string): Promise<PublicBundle[]> {
  const devices = await metaDb
    .collection(`users/${uid}/devices`)
    .where("revoked", "==", false)
    .get();
  return devices.docs.map((snapshot) => {
    const signedPrekey = snapshot.get("signedPrekey") as { pk: string; sig: string };
    return {
      deviceId: snapshot.id,
      identityPk: snapshot.get("identityPk") as string,
      kxPk: snapshot.get("kxPk") as string,
      signedPrekey: { pk: signedPrekey.pk, sig: signedPrekey.sig },
    };
  });
}

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
  // Blokace = zadny vydej bundlu v zadnem smeru (27); duvod nerozlisovat.
  if (
    !callerDoc.exists ||
    !targetDoc.exists ||
    (callerUid !== targetUid && (await blockedBetween(callerUid, targetUid)))
  ) {
    throw new HttpsError("permission-denied", "Nelze vydat.");
  }

  return { devices: await activeDeviceBundles(targetUid) };
});

export const getSpaceKeyBundles = onCall({ region: REGION }, async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new HttpsError("unauthenticated", "Prihlaseni je povinne.");
  }
  const spaceId: unknown = request.data?.spaceId;
  if (typeof spaceId !== "string" || spaceId.length === 0 || spaceId.length > 128) {
    throw new HttpsError("invalid-argument", "spaceId chybi nebo ma spatny tvar.");
  }

  const members = await ephemeralDb.collection(`spaces/${spaceId}/members`).get();
  const memberUids = members.docs.map((d) => d.id);
  if (!memberUids.includes(callerUid)) {
    throw new HttpsError("permission-denied", "Nelze vydat.");
  }

  // Blokovani clenove (v kteremkoli smeru) se z vydeje vynechaji -
  // odesilatel pro ne nezabali MK, zadne dalsi zpravy nedostanou (27).
  const others = memberUids.filter((uid) => uid !== callerUid);
  const blockFlags = await Promise.all(
    others.map((uid) => blockedBetween(callerUid, uid)),
  );
  const reachable = others.filter((_, i) => !blockFlags[i]);
  const bundles = await Promise.all(reachable.map(activeDeviceBundles));
  return {
    devices: reachable.flatMap((uid, i) =>
      (bundles[i] ?? []).map((bundle) => ({ uid, ...bundle })),
    ),
  };
});
