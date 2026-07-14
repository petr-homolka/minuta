// Mapa: obalka zpravy v1 (33 §2) - typ, kanonicka serializace a podpis.
// Podpis Ed25519 (IK odesilatele) pokryva celou hlavicku; stejne kanonicke
// bajty slouzi jako AD obsahu - obsah je tim svazany s obalkou (msgId,
// spaceId, odesilatelem i wraps), takze zamena ci prehrani rozbije overeni.
// `createdAt` doplnuje server (serverTimestamp) a soucasti podpisu neni (34).
import { getSodium } from "./sodium";

export const CRYPTO_VERSION = 1 as const;

/** Hlavicka obalky - presne to, co se podepisuje. */
export interface EnvelopeHeaderV1 {
  v: typeof CRYPTO_VERSION;
  msgId: string;
  spaceId: string;
  senderUid: string;
  senderDeviceId: string;
  /** deviceId -> base64(crypto_box_seal(MK, SPK/OPK zarizeni)) */
  wraps: Record<string, string>;
}

export interface EnvelopeV1 extends EnvelopeHeaderV1 {
  /** base64 Ed25519 podpisu kanonickych bajtu hlavicky */
  sig: string;
}

/**
 * Deterministicke bajty hlavicky: JSON se serazenymi klici (rekurzivne).
 * Serializace, ne kryptografie - primitiva zustavaji libsodium.
 */
export function canonicalHeaderBytes(header: EnvelopeHeaderV1): Uint8Array {
  const sortedWraps: Record<string, string> = {};
  for (const key of Object.keys(header.wraps).sort()) {
    const value = header.wraps[key];
    if (typeof value !== "string") {
      throw new Error("Poskozena obalka: wrap neni retezec.");
    }
    sortedWraps[key] = value;
  }
  const canonical = JSON.stringify({
    msgId: header.msgId,
    senderDeviceId: header.senderDeviceId,
    senderUid: header.senderUid,
    spaceId: header.spaceId,
    v: header.v,
    wraps: sortedWraps,
  });
  return new TextEncoder().encode(canonical);
}

export async function signEnvelope(
  header: EnvelopeHeaderV1,
  senderIdentitySk: Uint8Array,
): Promise<EnvelopeV1> {
  const sodium = await getSodium();
  const sig = sodium.crypto_sign_detached(canonicalHeaderBytes(header), senderIdentitySk);
  return { ...header, sig: sodium.to_base64(sig, sodium.base64_variants.ORIGINAL) };
}

/** Overi podpis obalky proti IK odesilatele (33 §3 krok 1). Tise vraci false. */
export async function verifyEnvelope(
  envelope: EnvelopeV1,
  senderIdentityPkB64: string,
): Promise<boolean> {
  const sodium = await getSodium();
  try {
    const { sig, ...header } = envelope;
    return sodium.crypto_sign_verify_detached(
      sodium.from_base64(sig, sodium.base64_variants.ORIGINAL),
      canonicalHeaderBytes(header),
      sodium.from_base64(senderIdentityPkB64, sodium.base64_variants.ORIGINAL),
    );
  } catch {
    return false;
  }
}
