// Mapa: zapecetenie dukazu nahlaseni (27 §Nahlaseni, 29 §1.2).
// Klient se SOUHLASEM nahlasujiciho zapeceti desifrovany obsah + kontext
// na verejny klic moderacni schranky (crypto_box_seal) - server ani CF
// plaintext nikdy nevidi, cist umi jen moderacni konzole s tajnym klicem
// (oddeleny projekt, 29 §1.2, audit pristupu).
import { getSodium } from "./sodium";

/** Verejny klic DEV moderacni schranky; prod rotace pres config (20). */
export const MODERATION_PUBLIC_KEY = "1FtXZLagKl0+5PEFbwjzN9qXuORU5FAg//UjfTOH8jE=";

export type ReportCategory = "C1" | "C2" | "C3" | "C4" | "C5" | "C6";

export interface ReportEvidence {
  v: 1;
  spaceId: string;
  msgId: string;
  senderUid: string;
  senderDeviceId: string;
  category: ReportCategory;
  /** Desifrovany text zpravy - priklada se s vedomym souhlasem. */
  plaintext: string;
  note?: string;
}

export async function sealEvidence(
  evidence: ReportEvidence,
  moderationPkB64: string = MODERATION_PUBLIC_KEY,
): Promise<string> {
  const sodium = await getSodium();
  const pk = sodium.from_base64(moderationPkB64, sodium.base64_variants.ORIGINAL);
  const sealed = sodium.crypto_box_seal(
    new TextEncoder().encode(JSON.stringify(evidence)),
    pk,
  );
  return sodium.to_base64(sealed, sodium.base64_variants.ORIGINAL);
}

/** Otevreni dukazu - POUZE pro moderacni konzoli/testy (tajny klic). */
export async function openEvidence(
  sealedB64: string,
  moderationPkB64: string,
  moderationSk: Uint8Array,
): Promise<ReportEvidence> {
  const sodium = await getSodium();
  const opened = sodium.crypto_box_seal_open(
    sodium.from_base64(sealedB64, sodium.base64_variants.ORIGINAL),
    sodium.from_base64(moderationPkB64, sodium.base64_variants.ORIGINAL),
    moderationSk,
  );
  return JSON.parse(new TextDecoder().decode(opened)) as ReportEvidence;
}
