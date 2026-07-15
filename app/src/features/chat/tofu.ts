// Mapa: TOFU (trust on first use) uloziste znamych IK protistran (37 §3).
// Prvni videny IK zarizeni se zapamatuje; zmena = vyjimka. UI banner
// "klice se zmenily" s moznosti overeni prijde v rezu 7 (37 §3-4);
// do te doby je zmena klice tvrda chyba - bezpecnejsi vychozi stav.
import { idbGet, idbSet } from "../../lib/idb";

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
