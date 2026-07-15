// Mapa: klicova hierarchie zarizeni (33 §1) - generovani a overeni.
//   IK  Ed25519  - identita zarizeni, podpisy (crypto_sign)
//   KX  X25519   - dlouhodoby DH (crypto_box keypair)
//   SPK X25519   - strednedobbe DH, podepsany IK (rotace ~7 dni)
//   OPK X25519   - davka ~50, jedno pouziti
// Verejne casti se koduji base64 ORIGINAL (s paddingem): 32 B = 44 znaku,
// 64 B podpis = 88 znaku - na to se vazou Firestore Rules (36 §3).
// Privatni klice NIKDY neopousteji zarizeni a NIKDY se neloguji.
import { getSodium } from "./sodium";

export const OPK_BATCH_SIZE = 50;

export interface SignedPrekeyPublic {
  pk: string;
  sig: string;
}

/** Verejny bundle zarizeni - jedina cast, ktera se publikuje na server (35 §2). */
export interface DevicePublicBundle {
  identityPk: string;
  kxPk: string;
  signedPrekey: SignedPrekeyPublic;
  oneTimePrekeys: { id: string; pk: string }[];
}

/** Privatni klice - zustavaji jen v lokalnim ulozisti zarizeni. */
export interface DevicePrivateKeys {
  identitySk: Uint8Array;
  kxSk: Uint8Array;
  signedPrekeySk: Uint8Array;
  oneTimePrekeySks: Record<string, Uint8Array>;
}

export interface GeneratedDeviceKeys {
  publicBundle: DevicePublicBundle;
  privateKeys: DevicePrivateKeys;
}

export async function generateDeviceKeys(): Promise<GeneratedDeviceKeys> {
  const sodium = await getSodium();
  const toB64 = (bytes: Uint8Array): string =>
    sodium.to_base64(bytes, sodium.base64_variants.ORIGINAL);

  const identity = sodium.crypto_sign_keypair();
  const kx = sodium.crypto_box_keypair();
  const signedPrekey = sodium.crypto_box_keypair();
  const spkSig = sodium.crypto_sign_detached(signedPrekey.publicKey, identity.privateKey);

  const oneTimePrekeys: { id: string; pk: string }[] = [];
  const oneTimePrekeySks: Record<string, Uint8Array> = {};
  for (let i = 0; i < OPK_BATCH_SIZE; i += 1) {
    const opk = sodium.crypto_box_keypair();
    const id = sodium.to_hex(sodium.randombytes_buf(8));
    oneTimePrekeys.push({ id, pk: toB64(opk.publicKey) });
    oneTimePrekeySks[id] = opk.privateKey;
  }

  return {
    publicBundle: {
      identityPk: toB64(identity.publicKey),
      kxPk: toB64(kx.publicKey),
      signedPrekey: { pk: toB64(signedPrekey.publicKey), sig: toB64(spkSig) },
      oneTimePrekeys,
    },
    privateKeys: {
      identitySk: identity.privateKey,
      kxSk: kx.privateKey,
      signedPrekeySk: signedPrekey.privateKey,
      oneTimePrekeySks,
    },
  };
}

/**
 * Odvodi verejny Ed25519 IK z privatniho. Libsodium serializuje
 * crypto_sign secret key jako seed(32) || publicKey(32) - verejna cast
 * je dokumentovane poslednich 32 B (zadna kryptografie, jen format).
 */
export async function identityPublicFromSecret(identitySk: Uint8Array): Promise<string> {
  const sodium = await getSodium();
  if (identitySk.length !== 64) {
    throw new Error("Ed25519 privatni klic ma mit 64 B.");
  }
  return sodium.to_base64(identitySk.subarray(32), sodium.base64_variants.ORIGINAL);
}

/** Odvodi verejny X25519 klic z privatniho (crypto_scalarmult_base). */
export async function x25519PublicFromSecret(secretKey: Uint8Array): Promise<string> {
  const sodium = await getSodium();
  return sodium.to_base64(
    sodium.crypto_scalarmult_base(secretKey),
    sodium.base64_variants.ORIGINAL,
  );
}

/**
 * Overeni podpisu SPK proti IK odesilatele - povinny krok pred pouzitim
 * ciziho bundle (33 §2 krok 1). Vraci false i pro poskozeny vstup.
 */
export async function verifySignedPrekey(
  identityPk: string,
  signedPrekey: SignedPrekeyPublic,
): Promise<boolean> {
  const sodium = await getSodium();
  const fromB64 = (value: string): Uint8Array =>
    sodium.from_base64(value, sodium.base64_variants.ORIGINAL);
  try {
    return sodium.crypto_sign_verify_detached(
      fromB64(signedPrekey.sig),
      fromB64(signedPrekey.pk),
      fromB64(identityPk),
    );
  } catch {
    return false;
  }
}
