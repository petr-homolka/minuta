// Mapa: primitiva pro jednu zpravu (33 §2-3) - vse libsodium (ADR-002):
//   - MK: 32 B nahodny klic jedne zpravy
//   - obsah: crypto_aead_xchacha20poly1305_ietf (nahodna nonce || ciphertext,
//     AD = kanonicka hlavicka obalky - vaze obsah k obalce)
//   - wrap MK pro zarizeni: crypto_box_seal na SPK/OPK prijemce
//     ("seal-ekvivalent" z 33 §2; efemerni klic je soucasti sealu)
//   - wipe: sodium memzero - crypto-shredding (33 §3)
// Klice ani plaintext se NIKDY neloguji a neserializuji na disk.
import { getSodium } from "./sodium";

export const MESSAGE_KEY_BYTES = 32;

export async function generateMessageKey(): Promise<Uint8Array> {
  const sodium = await getSodium();
  return sodium.randombytes_buf(MESSAGE_KEY_BYTES);
}

/** Zabali MK pro jedno cilove zarizeni (targetPk = SPK/OPK public, base64). */
export async function wrapMessageKey(
  messageKey: Uint8Array,
  targetPkB64: string,
): Promise<string> {
  const sodium = await getSodium();
  const targetPk = sodium.from_base64(targetPkB64, sodium.base64_variants.ORIGINAL);
  const sealed = sodium.crypto_box_seal(messageKey, targetPk);
  return sodium.to_base64(sealed, sodium.base64_variants.ORIGINAL);
}

/** Rozbali MK privatnim klicem zarizeni. Vyhazuje pri poskozenem wrapu. */
export async function unwrapMessageKey(
  wrapB64: string,
  targetPkB64: string,
  targetSk: Uint8Array,
): Promise<Uint8Array> {
  const sodium = await getSodium();
  const sealed = sodium.from_base64(wrapB64, sodium.base64_variants.ORIGINAL);
  const targetPk = sodium.from_base64(targetPkB64, sodium.base64_variants.ORIGINAL);
  return sodium.crypto_box_seal_open(sealed, targetPk, targetSk);
}

/** Zasifruje obsah zpravy: vraci nonce || ciphertext+tag. */
export async function encryptContent(
  plaintext: Uint8Array,
  messageKey: Uint8Array,
  additionalData: Uint8Array,
): Promise<Uint8Array> {
  const sodium = await getSodium();
  const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const ciphertext = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
    plaintext,
    additionalData,
    null,
    nonce,
    messageKey,
  );
  const blob = new Uint8Array(nonce.length + ciphertext.length);
  blob.set(nonce, 0);
  blob.set(ciphertext, nonce.length);
  return blob;
}

/** Desifruje obsah JEN do RAM (33 §3). Vyhazuje pri manipulaci s AD/obsahem. */
export async function decryptContent(
  blob: Uint8Array,
  messageKey: Uint8Array,
  additionalData: Uint8Array,
): Promise<Uint8Array> {
  const sodium = await getSodium();
  const nonceBytes = sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES;
  if (blob.length <= nonceBytes) {
    throw new Error("Poskozeny obsah zpravy.");
  }
  const nonce = blob.subarray(0, nonceBytes);
  const ciphertext = blob.subarray(nonceBytes);
  return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
    null,
    ciphertext,
    additionalData,
    nonce,
    messageKey,
  );
}

/** Crypto-shredding: prepise buffer nulami (33 §3). Volat na MK i plaintext. */
export async function wipe(bytes: Uint8Array): Promise<void> {
  const sodium = await getSodium();
  sodium.memzero(bytes);
}
