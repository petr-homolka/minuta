// Mapa: otisky identity (33 §6, 40 §4) - vse libsodium (ADR-002).
//   ikFingerprint: crypto_generichash(IK.pub) - kotva identiconu
//   safetyCode: 12 cislic z hash pres SERAZENE IK.pub obou stran -
//     symetricky (oba vidi tytez cislice), porovnava se jinym kanalem.
import { getSodium } from "./sodium";

/** Hex otisk verejneho IK (vstup: base64 ORIGINAL). */
export async function ikFingerprint(identityPkB64: string): Promise<string> {
  const sodium = await getSodium();
  const pk = sodium.from_base64(identityPkB64, sodium.base64_variants.ORIGINAL);
  return sodium.to_hex(sodium.crypto_generichash(32, pk));
}

/**
 * Bezpecnostni kod konverzace (33 §6): hash pres lexikograficky serazene
 * IK.pub obou stran -> 12 cislic (zobrazeno po 4). Zmena kterehokoli IK
 * kod zmeni; poradi stran nehraje roli.
 */
export async function safetyCode(
  identityPkA: string,
  identityPkB: string,
): Promise<string> {
  const sodium = await getSodium();
  const [first, second] = [identityPkA, identityPkB].sort();
  const input = new TextEncoder().encode(`${first}|${second}`);
  const hash = sodium.crypto_generichash(16, input);
  // 6 bajtu = 48 bitu > 10^12 - rovnomerne mapovani na 12 cislic.
  let value = 0n;
  for (const byte of hash.subarray(0, 6)) {
    value = (value << 8n) | BigInt(byte);
  }
  return (value % 1_000_000_000_000n).toString().padStart(12, "0");
}

/** Formatovani kodu pro UI: 1234 5678 9012. */
export function formatSafetyCode(code: string): string {
  return code.replace(/(\d{4})(?=\d)/g, "$1 ");
}
