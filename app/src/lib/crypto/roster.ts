// Mapa: sifrovani rosteru Znamych (40 §3, zero-knowledge).
//   Roster key (RK): 32 B symetricky klic uzivatele; existuje JEN
//   zabaleny pro jeho zarizeni (crypto_box_seal na SPK - jako MK, 33 §2).
//   Zaznam kontaktu: JSON -> XChaCha20-Poly1305 s RK (AD = "roster:v1").
// Ztrata vsech zarizeni = ztrata rosteru (40 §3 - zadna obnova bez klicu).
import {
  decryptContent,
  encryptContent,
  generateMessageKey,
  unwrapMessageKey,
  wrapMessageKey,
} from "./message-crypto";
import { getSodium } from "./sodium";

const ROSTER_AD = new TextEncoder().encode("roster:v1");

export interface ContactRecord {
  uid: string;
  /** Moje pojmenovani protistrany (40 §4 - jmeno od ni je jen napoveda). */
  name: string;
  ikFingerprint: string;
  verified: boolean;
  note?: string;
}

export async function generateRosterKey(): Promise<Uint8Array> {
  return generateMessageKey(); // 32 B nahodny klic (tataz konstrukce)
}

/** Zabali RK pro jedno zarizeni (SPK.pub base64) - jako wrap MK. */
export async function wrapRosterKey(
  rosterKey: Uint8Array,
  deviceSpkPkB64: string,
): Promise<string> {
  return wrapMessageKey(rosterKey, deviceSpkPkB64);
}

export async function unwrapRosterKey(
  wrapB64: string,
  deviceSpkPkB64: string,
  deviceSpkSk: Uint8Array,
): Promise<Uint8Array> {
  return unwrapMessageKey(wrapB64, deviceSpkPkB64, deviceSpkSk);
}

export async function encryptContact(
  record: ContactRecord,
  rosterKey: Uint8Array,
): Promise<string> {
  const sodium = await getSodium();
  const blob = await encryptContent(
    new TextEncoder().encode(JSON.stringify(record)),
    rosterKey,
    ROSTER_AD,
  );
  return sodium.to_base64(blob, sodium.base64_variants.ORIGINAL);
}

export async function decryptContact(
  blobB64: string,
  rosterKey: Uint8Array,
): Promise<ContactRecord> {
  const sodium = await getSodium();
  const blob = sodium.from_base64(blobB64, sodium.base64_variants.ORIGINAL);
  const plaintext = await decryptContent(blob, rosterKey, ROSTER_AD);
  return JSON.parse(new TextDecoder().decode(plaintext)) as ContactRecord;
}
