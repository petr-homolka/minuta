// E2E rez 4+5 (42 §3): duo pres pozvanku -> vydej bundlu (CF) ->
// odeslani obalky+payloadu -> otevreni (zamek readAt) -> desifrovani.
// "Po minute neobnovitelna" pokryvaji rules testy (okno readAt+90 s)
// a unit test wipe; zde overujeme, ze gate plati i v celem toku.
import { deleteApp } from "firebase/app";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  callCreateInvite,
  callCreateSpace,
  callGetKeyBundles,
  callGetSpaceKeyBundles,
  callJoinSpace,
} from "../src/features/chat/api";
import { openReceivedMessage, sendTextMessage } from "../src/features/chat/messages";
import { KeyChangedError, trustIdentityKey } from "../src/features/chat/tofu";
import { loadDeviceIdentity } from "../src/features/device/key-store";
import { x25519PublicFromSecret } from "../src/lib/crypto/keys";
import { createParty, loadDevRules, type Party } from "./helpers";

let alice: Party;
let bob: Party;

beforeAll(async () => {
  await loadDevRules();
  alice = await createParty("duo-alice");
  bob = await createParty("duo-bob");
}, 60_000);

afterAll(async () => {
  await deleteApp(alice.app);
  await deleteApp(bob.app);
});

describe("1:1 zprava end-to-end", () => {
  it("duo pres pozvanku -> odeslani -> gate -> otevreni -> plaintext", async () => {
    // 1) Alice zalozi duo a pozvanku; Bob vstoupi tokenem (11 §Vstup).
    const spaceId = await callCreateSpace(alice.functions, "duo");
    const invite = await callCreateInvite(alice.functions, { spaceId, maxUses: 1 });
    await expect(callJoinSpace(bob.functions, invite.token)).resolves.toBe(spaceId);
    // opakovany vstup = idempotentni
    await expect(callJoinSpace(bob.functions, invite.token)).resolves.toBe(spaceId);

    // 2) Vydej bundlu clenu Space (ADR-012: prijemci = ostatni clenove).
    const recipients = await callGetSpaceKeyBundles(alice.functions, spaceId);
    expect(recipients).toHaveLength(1);
    const bobDevice = recipients[0];
    if (!bobDevice) throw new Error("bundle chybi");
    expect(bobDevice.uid).toBe(bob.uid);
    expect(bobDevice.deviceId).toBe(bob.deviceId);

    // Neclen bundly nedostane.
    const eve = await createParty("duo-eve");
    await expect(callGetSpaceKeyBundles(eve.functions, spaceId)).rejects.toThrow();
    await deleteApp(eve.app);

    // 3) Alice odesle zpravu.
    const aliceIdentity = await loadDeviceIdentity(alice.uid);
    if (!aliceIdentity) throw new Error("alice bez klicu");
    const text = "Tahle zprava zije 60 sekund.";
    const msgId = await sendTextMessage({
      db: alice.db,
      spaceId,
      text,
      sender: {
        uid: alice.uid,
        deviceId: alice.deviceId,
        identitySk: aliceIdentity.privateKeys.identitySk,
      },
      recipients,
    });

    // 4) Bob vidi obalku, payload pred otevrenim NEcitelny (gate).
    const bobMessages = await getDocs(collection(bob.db, "spaces", spaceId, "messages"));
    expect(bobMessages.docs.map((d) => d.id)).toContain(msgId);
    await expect(
      getDoc(doc(bob.db, "spaces", spaceId, "messages", msgId, "payload", "v")),
    ).rejects.toThrow();

    // 5) Bob otevre a desifruje.
    const bobIdentity = await loadDeviceIdentity(bob.uid);
    if (!bobIdentity) throw new Error("bob bez klicu");
    const senderBundles = await callGetKeyBundles(bob.functions, alice.uid, spaceId);
    const senderDevice = senderBundles.find((d) => d.deviceId === alice.deviceId);
    if (!senderDevice) throw new Error("bundle odesilatele chybi");

    const opened = await openReceivedMessage({
      db: bob.db,
      spaceId,
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
    expect(new TextDecoder().decode(opened.plaintext)).toBe(text);

    // 6) TOFU: zmena IK protistrany = tvrda chyba (37 §3).
    await expect(
      trustIdentityKey(alice.uid, alice.deviceId, bobDevice.identityPk),
    ).rejects.toThrow(KeyChangedError);
  }, 60_000);

  it("duo je stropovane na 2 cleny", async () => {
    const spaceId = await callCreateSpace(alice.functions, "duo");
    const invite = await callCreateInvite(alice.functions, { spaceId, maxUses: 5 });
    await callJoinSpace(bob.functions, invite.token);

    const carol = await createParty("duo-carol");
    await expect(callJoinSpace(carol.functions, invite.token)).rejects.toThrow();
    await deleteApp(carol.app);
  }, 60_000);
});
