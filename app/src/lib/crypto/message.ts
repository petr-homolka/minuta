// Mapa: orchestrace jedne zpravy (33 §2-3) nad envelope.ts a message-crypto.ts.
//   sealMessage: overi SPK prijemcu -> MK -> wraps -> podepsana obalka
//                + ciphertext (AD = kanonicka hlavicka). MK se hned wipuje.
//   openMessage: overi podpis -> unwrap MK -> desifruje JEN do RAM -> wipe MK.
// Volajici vlastni vraceny plaintext a MUSI ho wipenout v readAt+60 s (34).
// TODO(rez 4): cileni na OPK z vydaneho bundle (Cloud Function, 36 §4);
// zatim se bali na SPK - OPK vyzaduje serverovy vydej.
import {
  canonicalHeaderBytes,
  CRYPTO_VERSION,
  signEnvelope,
  verifyEnvelope,
  type EnvelopeV1,
} from "./envelope";
import { verifySignedPrekey, type SignedPrekeyPublic } from "./keys";
import {
  decryptContent,
  encryptContent,
  generateMessageKey,
  unwrapMessageKey,
  wipe,
  wrapMessageKey,
} from "./message-crypto";

/** Cilove zarizeni prijemce - podmnozina publikovaneho bundle (35 §2). */
export interface RecipientDevice {
  deviceId: string;
  identityPk: string;
  signedPrekey: SignedPrekeyPublic;
}

export interface SealMessageInput {
  plaintext: Uint8Array;
  msgId: string;
  spaceId: string;
  senderUid: string;
  senderDeviceId: string;
  senderIdentitySk: Uint8Array;
  recipients: RecipientDevice[];
}

export interface SealedMessage {
  envelope: EnvelopeV1;
  /** nonce || ciphertext+tag - payload dokument (35 §3) */
  payload: Uint8Array;
}

export async function sealMessage(input: SealMessageInput): Promise<SealedMessage> {
  if (input.recipients.length === 0) {
    throw new Error("Zprava bez prijemcu.");
  }
  // 33 §2 krok 1: podpis SPK kazdeho ciloveho zarizeni se overuje VZDY.
  for (const recipient of input.recipients) {
    const valid = await verifySignedPrekey(recipient.identityPk, recipient.signedPrekey);
    if (!valid) {
      throw new Error(`Neplatny podpis prekey zarizeni ${recipient.deviceId}.`);
    }
  }

  const messageKey = await generateMessageKey();
  try {
    const wraps: Record<string, string> = {};
    for (const recipient of input.recipients) {
      wraps[recipient.deviceId] = await wrapMessageKey(
        messageKey,
        recipient.signedPrekey.pk,
      );
    }
    const header = {
      v: CRYPTO_VERSION,
      msgId: input.msgId,
      spaceId: input.spaceId,
      senderUid: input.senderUid,
      senderDeviceId: input.senderDeviceId,
      wraps,
    };
    const payload = await encryptContent(
      input.plaintext,
      messageKey,
      canonicalHeaderBytes(header),
    );
    const envelope = await signEnvelope(header, input.senderIdentitySk);
    return { envelope, payload };
  } finally {
    await wipe(messageKey);
  }
}

export interface OpenMessageInput {
  envelope: EnvelopeV1;
  payload: Uint8Array;
  /** Znamy IK odesilatele (TOFU, 37 §3) - NE hodnota z obalky. */
  senderIdentityPk: string;
  deviceId: string;
  /** SPK par zarizeni, na ktery byl MK zabalen. */
  wrapPk: string;
  wrapSk: Uint8Array;
}

export async function openMessage(input: OpenMessageInput): Promise<Uint8Array> {
  const verified = await verifyEnvelope(input.envelope, input.senderIdentityPk);
  if (!verified) {
    throw new Error("Podpis obalky neodpovida odesilateli.");
  }
  const wrap = input.envelope.wraps[input.deviceId];
  if (!wrap) {
    throw new Error("Obalka neobsahuje wrap pro toto zarizeni.");
  }
  const messageKey = await unwrapMessageKey(wrap, input.wrapPk, input.wrapSk);
  try {
    const { sig: _sig, ...header } = input.envelope;
    return await decryptContent(input.payload, messageKey, canonicalHeaderBytes(header));
  } finally {
    await wipe(messageKey);
  }
}
