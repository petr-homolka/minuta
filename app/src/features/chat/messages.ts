// Mapa: odeslani a otevreni zpravy (08 §2, 34 §2, 35 §3).
//   sendTextMessage: text -> sealMessage (33) -> batch obalka + payload
//     (Rules 36 vynuti tvar a serverove casy).
//   openReceivedMessage: update readAt (zamek 34 §2) -> cteni payloadu
//     v okne -> openMessage -> plaintext JEN v RAM; volajici zajisti
//     wipe v +60 s (useBurnCountdown).
// TODO(pozdejsi rez): offline outbox s retry (08 §2 bod 3).
import {
  Bytes,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
  type Firestore,
} from "firebase/firestore";
import { sealMessage, openMessage, type RecipientDevice } from "../../lib/crypto/message";
import { uuidv7 } from "../../lib/ids";
import { trustIdentityKey } from "./tofu";

export const MAX_TEXT_LENGTH = 4_000; // 08 §6
const HOUR = 3_600_000;

export interface SenderIdentity {
  uid: string;
  deviceId: string;
  identitySk: Uint8Array;
}

export async function sendTextMessage(input: {
  db: Firestore;
  spaceId: string;
  text: string;
  sender: SenderIdentity;
  recipients: RecipientDevice[];
}): Promise<string> {
  if (input.text.length === 0 || input.text.length > MAX_TEXT_LENGTH) {
    throw new Error(`Text musi mit 1 az ${MAX_TEXT_LENGTH} znaku.`);
  }
  const msgId = uuidv7();
  const { envelope, payload } = await sealMessage({
    plaintext: new TextEncoder().encode(input.text),
    msgId,
    spaceId: input.spaceId,
    senderUid: input.sender.uid,
    senderDeviceId: input.sender.deviceId,
    senderIdentitySk: input.sender.identitySk,
    recipients: input.recipients,
  });

  const messageRef = doc(input.db, "spaces", input.spaceId, "messages", msgId);
  const batch = writeBatch(input.db);
  batch.set(messageRef, {
    envelope,
    senderUid: input.sender.uid,
    senderDeviceId: input.sender.deviceId,
    createdAt: serverTimestamp(),
    readAt: null,
    expireAt: Timestamp.fromMillis(Date.now() + 24 * HOUR), // TTL, ADR-011
  });
  batch.set(doc(collection(messageRef, "payload"), "v"), {
    ciphertext: Bytes.fromUint8Array(payload),
  });
  await batch.commit();
  return msgId;
}

export interface OpenedMessage {
  plaintext: Uint8Array;
  /** Serverove readAt (ms) - kotva odpoctu je ale potvrzeni zapisu (34 §5). */
  readAtMillis: number;
}

export async function openReceivedMessage(input: {
  db: Firestore;
  spaceId: string;
  msgId: string;
  senderUid: string;
  senderDeviceId: string;
  /** IK odesilatele z vydaneho bundle - projde TOFU overenim (37 §3). */
  presentedSenderIdentityPk: string;
  receiver: { deviceId: string; wrapPk: string; wrapSk: Uint8Array };
}): Promise<OpenedMessage> {
  const senderIdentityPk = await trustIdentityKey(
    input.senderUid,
    input.senderDeviceId,
    input.presentedSenderIdentityPk,
  );

  const messageRef = doc(input.db, "spaces", input.spaceId, "messages", input.msgId);
  // Zamek (34 §2): jednorazovy prechod readAt null -> request.time.
  // Soubeh/vice ctenaru (34 §5): prvni update vyhrava; ostatni ctou
  // payload v temze okne - selhani updatu proto neni chyba, brana je
  // vyhradne na cteni payloadu (Rules).
  try {
    await updateDoc(messageRef, {
      readAt: serverTimestamp(),
      expireAt: serverTimestamp(), // TTL pojistka, koridor ADR-011
    });
  } catch {
    // uz otevreno - zkusime cist v bezicim okne
  }

  const [messageSnap, payloadSnap] = await Promise.all([
    getDoc(messageRef),
    getDoc(doc(messageRef, "payload", "v")),
  ]);
  const readAt = messageSnap.get("readAt") as Timestamp | null;
  const envelope = messageSnap.get("envelope");
  const ciphertext = payloadSnap.get("ciphertext") as Bytes | undefined;
  if (!readAt || !envelope || !ciphertext) {
    throw new Error("Zprava uz neni dostupna.");
  }

  const plaintext = await openMessage({
    envelope,
    payload: ciphertext.toUint8Array(),
    senderIdentityPk,
    deviceId: input.receiver.deviceId,
    wrapPk: input.receiver.wrapPk,
    wrapSk: input.receiver.wrapSk,
  });
  return { plaintext, readAtMillis: readAt.toMillis() };
}
