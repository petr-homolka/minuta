// Mapa: TOFU (trust on first use) uloziste znamych IK protistran (37 §3)
// + stav overeni konverzace (37 §4). Zmena IK vyhazuje KeyChangedError -
// UI zobrazi banner a uzivatel muze novy klic prijmout (acceptNewKey),
// cimz se zaroven resetuje stav "overeno" (vazany na konkretni IK).
import { idbDelete, idbGet, idbSet } from "../../lib/idb";

const tofuKey = (uid: string, deviceId: string): string => `tofu:${uid}:${deviceId}`;

export class KeyChangedError extends Error {
  constructor(uid: string, deviceId: string) {
    super(
      `Klice zarizeni ${deviceId} uzivatele ${uid} se zmenily - overeni vyzadovano (37 §3).`,
    );
    this.name = "KeyChangedError";
  }
}

/** Vrati duveryhodny IK: prvni pouziti si zapamatuje, zmena vyhazuje. */
export async function trustIdentityKey(
  uid: string,
  deviceId: string,
  presentedIdentityPk: string,
): Promise<string> {
  const known = await idbGet<string>(tofuKey(uid, deviceId));
  if (known === undefined) {
    await idbSet(tofuKey(uid, deviceId), presentedIdentityPk);
    return presentedIdentityPk;
  }
  if (known !== presentedIdentityPk) {
    throw new KeyChangedError(uid, deviceId);
  }
  return known;
}

/**
 * Vedome prijeti noveho IK po key-change banneru (37 §3). Resetuje
 * stav "overeno" - ten je vazany na konkretni klic (37 §4).
 */
export async function acceptNewKey(
  uid: string,
  deviceId: string,
  newIdentityPk: string,
): Promise<void> {
  await idbSet(tofuKey(uid, deviceId), newIdentityPk);
  await idbDelete(`verified:${uid}`);
}

/** Oznaci konverzaci s uzivatelem jako overenou pro jeho aktualni IK. */
export async function markVerified(uid: string, identityPk: string): Promise<void> {
  await idbSet(`verified:${uid}`, identityPk);
}

/** Overeno ✓ plati jen dokud IK protistrany odpovida (37 §4). */
export async function isVerified(uid: string, currentIdentityPk: string): Promise<boolean> {
  const stored = await idbGet<string>(`verified:${uid}`);
  return stored === currentIdentityPk;
}
