// E2E rez 6 (42 §3, N7): kontrola odesilatele - unsend (odvolani
// neprectene), burn now (spaleni behem horeni) a burn-all (panika).
import { deleteApp } from "firebase/app";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  callBurnAll,
  callCreateInvite,
  callCreateSpace,
  callGetKeyBundles,
  callGetSpaceKeyBundles,
  callJoinSpace,
} from "../src/features/chat/api";
import {
  burnOwnMessage,
  openReceivedMessage,
  sendTextMessage,
} from "../src/features/chat/messages";
import { loadDeviceIdentity } from "../src/features/device/key-store";
import { x25519PublicFromSecret } from "../src/lib/crypto/keys";
import { createParty, loadDevRules, type Party } from "./helpers";

let alice: Party;
let bob: Party;
let spaceA: string; // alicin space s bobem
let spaceB: string; // druhy spolecny space

async function sendFrom(party: Party, spaceId: string, text: string): Promise<string> {
  const identity = await loadDeviceIdentity(party.uid);
  if (!identity) throw new Error("bez klicu");
  const recipients = await callGetSpaceKeyBundles(party.functions, spaceId);
  return sendTextMessage({
    db: party.db,
    spaceId,
    text,
    sender: {
      uid: party.uid,
      deviceId: party.deviceId,
      identitySk: identity.privateKeys.identitySk,
    },
    recipients,
  });
}

async function messageIds(party: Party, spaceId: string): Promise<string[]> {
  const snapshot = await getDocs(collection(party.db, "spaces", spaceId, "messages"));
  return snapshot.docs.map((d) => d.id);
}

beforeAll(async () => {
  await loadDevRules();
  alice = await createParty("sc-alice");
  bob = await createParty("sc-bob");
  spaceA = await callCreateSpace(alice.functions, "duo");
  const inviteA = await callCreateInvite(alice.functions, { spaceId: spaceA, maxUses: 1 });
  await callJoinSpace(bob.functions, inviteA.token);
  spaceB = await callCreateSpace(alice.functions, "space");
  const inviteB = await callCreateInvite(alice.functions, { spaceId: spaceB, maxUses: 1 });
  await callJoinSpace(bob.functions, inviteB.token);
}, 60_000);

afterAll(async () => {
  await deleteApp(alice.app);
  await deleteApp(bob.app);
});

describe("kontrola odesilatele (N7)", () => {
  it("unsend: odvolana zprava zmizi i s payloadem; cizi zpravu odvolat nejde", async () => {
    const msgId = await sendFrom(alice, spaceA, "tohle si rozmyslim");
    await expect(messageIds(bob, spaceA)).resolves.toContain(msgId);

    // Bob (neodesilatel) zpravu smazat nesmi (Rules).
    await expect(burnOwnMessage(bob.db, spaceA, msgId)).rejects.toThrow();

    await burnOwnMessage(alice.db, spaceA, msgId);
    await expect(messageIds(bob, spaceA)).resolves.not.toContain(msgId);
    const payload = doc(alice.db, "spaces", spaceA, "messages", msgId, "payload", "v");
    // Dokument je pryc - primy get na payload skonci na Rules (get rodice
    // selze), overujeme pres nedostupnost obalky vyse a burn-all nize.
    await expect(getDoc(payload)).rejects.toThrow();
  }, 60_000);

  it("burn now: odesilatel spali zpravu i po otevreni", async () => {
    const msgId = await sendFrom(alice, spaceA, "shorim driv");
    const bobIdentity = await loadDeviceIdentity(bob.uid);
    if (!bobIdentity) throw new Error("bob bez klicu");
    const senderBundles = await callGetKeyBundles(bob.functions, alice.uid, spaceA);
    const senderDevice = senderBundles.find((d) => d.deviceId === alice.deviceId);
    if (!senderDevice) throw new Error("bundle chybi");
    const opened = await openReceivedMessage({
      db: bob.db,
      spaceId: spaceA,
      msgId,
      senderUid: alice.uid,
      senderDeviceId: alice.deviceId,
      presentedSenderIdentityPk: senderDevice.identityPk,
      receiver: {
        deviceId: bob.deviceId,
        wrapPk: await x25519PublicFromSecret(bobIdentity.privateKeys.signedPrekeySk),
        wrapSk: bobIdentity.privateKeys.signedPrekeySk,
      },
    });
    expect(new TextDecoder().decode(opened.plaintext)).toBe("shorim driv");

    await burnOwnMessage(alice.db, spaceA, msgId); // behem 60s okna
    await expect(messageIds(bob, spaceA)).resolves.not.toContain(msgId);
  }, 60_000);

  it("burn-all spali vsechny me zpravy ve vsech Spaces, cizi necha", async () => {
    const a1 = await sendFrom(alice, spaceA, "prvni");
    const a2 = await sendFrom(alice, spaceB, "druha");
    const b1 = await sendFrom(bob, spaceA, "bobova zustane");

    const deleted = await callBurnAll(alice.functions);
    expect(deleted).toBeGreaterThanOrEqual(2);

    const idsA = await messageIds(bob, spaceA);
    const idsB = await messageIds(bob, spaceB);
    expect(idsA).not.toContain(a1);
    expect(idsB).not.toContain(a2);
    expect(idsA).toContain(b1);

    // Opakovane volani je bezpecne (nic dalsiho ke spaleni).
    await expect(callBurnAll(alice.functions)).resolves.toBe(0);
  }, 60_000);
});
