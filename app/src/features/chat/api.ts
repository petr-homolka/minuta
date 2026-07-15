// Mapa: volani Cloud Functions `/v1` (18 §2). Instance functions/db se
// predavaji parametrem (testovatelnost proti emulatoru s vice ucty).
import { httpsCallable, type Functions } from "firebase/functions";
import type { RecipientDevice } from "../../lib/crypto/message";

export interface KeyBundleDevice extends RecipientDevice {
  kxPk: string;
}

export async function callCreateSpace(
  functions: Functions,
  peerUid: string,
): Promise<string> {
  const call = httpsCallable<{ peerUid: string }, { spaceId: string }>(
    functions,
    "createSpace",
  );
  const result = await call({ peerUid });
  return result.data.spaceId;
}

export async function callGetKeyBundles(
  functions: Functions,
  uid: string,
  spaceId: string,
): Promise<KeyBundleDevice[]> {
  const call = httpsCallable<
    { uid: string; spaceId: string },
    { devices: KeyBundleDevice[] }
  >(functions, "getKeyBundles");
  const result = await call({ uid, spaceId });
  return result.data.devices;
}
