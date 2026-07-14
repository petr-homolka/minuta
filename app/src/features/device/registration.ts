// Mapa: registrace zarizeni po prihlaseni (37 §2, 35 §2).
//   1) existuje lokalni identita pro uid? -> hotovo (idempotentni)
//   2) vygeneruj klicovou hierarchii (33 §1)
//   3) publikuj verejny bundle do `meta`: users/{uid}/devices/{deviceId}
//      + davku OPK do .../prekeys (jedna atomicka batch)
//   4) az po uspesnem zapisu uloz privatni klice lokalne
// Poradi 3->4 zarucuje, ze lokalne ulozena identita je vzdy i na serveru;
// selhani mezi kroky nanejvys osiri serverovy dokument (uklidi 37 §6).
import {
  doc,
  serverTimestamp,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { generateDeviceKeys } from "../../lib/crypto/keys";
import { loadDeviceIdentity, saveDeviceIdentity } from "./key-store";

export async function ensureDeviceRegistered(
  metaDb: Firestore,
  uid: string,
): Promise<string> {
  const existing = await loadDeviceIdentity(uid);
  if (existing) {
    return existing.deviceId;
  }

  // WebCrypto jen jako zdroj entropie/UUID (33 §7).
  const deviceId = crypto.randomUUID();
  const { publicBundle, privateKeys } = await generateDeviceKeys();

  const batch = writeBatch(metaDb);
  const deviceRef = doc(metaDb, "users", uid, "devices", deviceId);
  batch.set(deviceRef, {
    identityPk: publicBundle.identityPk,
    kxPk: publicBundle.kxPk,
    signedPrekey: {
      pk: publicBundle.signedPrekey.pk,
      sig: publicBundle.signedPrekey.sig,
      rotatedAt: serverTimestamp(),
    },
    platform: "pwa",
    createdAt: serverTimestamp(),
    revoked: false,
  });
  for (const prekey of publicBundle.oneTimePrekeys) {
    batch.set(doc(deviceRef, "prekeys", prekey.id), {
      pk: prekey.pk,
      consumed: false,
    });
  }
  await batch.commit();

  await saveDeviceIdentity(uid, { deviceId, privateKeys });
  return deviceId;
}
