// E2E rez 5 (42 §3): vicecelenny Space + pozvanky (11, 12).
// "Hotovo = tri lide v mistnosti" - a skupinova zprava, kterou si
// oba prijemci prectou v temze okne (34 §5, ADR-012).
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteApp } from "firebase/app";
import { collection, doc, getDoc, getDocs, Timestamp, updateDoc } from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  callCreateInvite,
  callCreateSpace,
  callGetKeyBundles,
  callGetSpaceKeyBundles,
  callJoinSpace,
  callLeaveSpace,
  callPreviewInvite,
  callRevokeInvite,
} from "../src/features/chat/api";
import { openReceivedMessage, sendTextMessage } from "../src/features/chat/messages";
import { loadDeviceIdentity } from "../src/features/device/key-store";
import { x25519PublicFromSecret } from "../src/lib/crypto/keys";
import { createParty, loadDevRules, type Party } from "./helpers";

let alice: Party;
let bob: Party;
let carol: Party;

async function openAs(
  party: Party,
  spaceId: string,
  msgId: string,
  sender: Party,
): Promise<string> {
  const identity = await loadDeviceIdentity(party.uid);
  if (!identity) throw new Error("chybi klice");
  const senderBundles = await callGetKeyBundles(party.functions, sender.uid, spaceId);
  const senderDevice = senderBundles.find((d) => d.deviceId === sender.deviceId);
  if (!senderDevice) throw new Error("bundle odesilatele chybi");
  const opened = await openReceivedMessage({
    db: party.db,
    spaceId,
    msgId,
    senderUid: sender.uid,
    senderDeviceId: sender.deviceId,
    presentedSenderIdentityPk: senderDevice.identityPk,
    receiver: {
      deviceId: party.deviceId,
      wrapPk: await x25519PublicFromSecret(identity.privateKeys.signedPrekeySk),
      wrapSk: identity.privateKeys.signedPrekeySk,
    },
  });
  return new TextDecoder().decode(opened.plaintext);
}

beforeAll(async () => {
  await loadDevRules();
  alice = await createParty("sp-alice");
  bob = await createParty("sp-bob");
  carol = await createParty("sp-carol");
}, 60_000);

afterAll(async () => {
  await deleteApp(alice.app);
  await deleteApp(bob.app);
  await deleteApp(carol.app);
});

describe("Space + pozvanky (rez 5)", () => {
  it("tri lide v mistnosti a skupinova zprava pro oba prijemce", async () => {
    const spaceId = await callCreateSpace(alice.functions, "space");
    const invite = await callCreateInvite(alice.functions, {
      spaceId,
      expiresInMinutes: 60,
      maxUses: 2,
    });

    // Nahled pred vstupem (12 §bezpecnost) - zadny automaticky join.
    const preview = await callPreviewInvite(bob.functions, invite.token);
    expect(preview.type).toBe("space");
    expect(preview.memberCount).toBe(1);
    expect(preview.requiresPassword).toBe(false);

    await expect(callJoinSpace(bob.functions, invite.token)).resolves.toBe(spaceId);
    await expect(callJoinSpace(carol.functions, invite.token)).resolves.toBe(spaceId);

    // maxUses=2 vycerpano - treti clovek s tymz tokenem neprojde.
    const dave = await createParty("sp-dave");
    await expect(callJoinSpace(dave.functions, invite.token)).rejects.toThrow();
    await deleteApp(dave.app);

    // Skupinova zprava: prijemci = vsechna zarizeni obou clenu (ADR-012).
    const recipients = await callGetSpaceKeyBundles(alice.functions, spaceId);
    expect(recipients.map((r) => r.uid).sort()).toEqual([bob.uid, carol.uid].sort());

    const aliceIdentity = await loadDeviceIdentity(alice.uid);
    if (!aliceIdentity) throw new Error("alice bez klicu");
    const text = "Vitejte v mistnosti - zprava dohori vsem naraz.";
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

    // Bob otevre (zamek readAt); Carol cte v temze okne (34 §5).
    await expect(openAs(bob, spaceId, msgId, alice)).resolves.toBe(text);
    await expect(openAs(carol, spaceId, msgId, alice)).resolves.toBe(text);
  }, 60_000);

  it("revokace zneplatni link okamzite (11 §T&S)", async () => {
    const spaceId = await callCreateSpace(alice.functions, "space");
    const invite = await callCreateInvite(alice.functions, { spaceId, maxUses: 5 });
    await callRevokeInvite(alice.functions, invite.tokenHash);

    await expect(callPreviewInvite(bob.functions, invite.token)).rejects.toThrow();
    await expect(callJoinSpace(bob.functions, invite.token)).rejects.toThrow();

    // Revokovat smi jen owner/admin.
    const invite2 = await callCreateInvite(alice.functions, { spaceId, maxUses: 5 });
    await expect(
      callRevokeInvite(bob.functions, invite2.tokenHash),
    ).rejects.toThrow();
  }, 60_000);

  it("prosla pozvanka neplati", async () => {
    const spaceId = await callCreateSpace(alice.functions, "space");
    const invite = await callCreateInvite(alice.functions, { spaceId, maxUses: 5 });

    // Cas neumime posunout - expiraci nasimulujeme primou editaci
    // dokumentu mimo Rules (admin kontext).
    const env = await initializeTestEnvironment({ projectId: "demo-minuta" });
    await env.withSecurityRulesDisabled(async (ctx) => {
      await updateDoc(doc(ctx.firestore(), "invites", invite.tokenHash), {
        expireAt: Timestamp.fromMillis(Date.now() - 1_000),
      });
    });
    await env.cleanup();

    await expect(callJoinSpace(bob.functions, invite.token)).rejects.toThrow();
  }, 60_000);

  it("pozvanka s heslem (12 §Parametry)", async () => {
    const spaceId = await callCreateSpace(carol.functions, "space");
    const invite = await callCreateInvite(carol.functions, {
      spaceId,
      maxUses: 5,
      password: "tajne-heslo",
    });
    const preview = await callPreviewInvite(bob.functions, invite.token);
    expect(preview.requiresPassword).toBe(true);

    await expect(callJoinSpace(bob.functions, invite.token)).rejects.toThrow();
    await expect(
      callJoinSpace(bob.functions, invite.token, "spatne"),
    ).rejects.toThrow();
    await expect(
      callJoinSpace(bob.functions, invite.token, "tajne-heslo"),
    ).resolves.toBe(spaceId);
  }, 60_000);

  it("limit 3 aktivnich Spaces na ucet (11 §Limity)", async () => {
    const frank = await createParty("sp-frank");
    await callCreateSpace(frank.functions, "space");
    await callCreateSpace(frank.functions, "duo");
    await callCreateSpace(frank.functions, "space");
    await expect(callCreateSpace(frank.functions, "space")).rejects.toThrow();
    await deleteApp(frank.app);
  }, 60_000);

  it("odchod ucastnika spali celou mistnost (ADR-014)", async () => {
    // Cerstve ucty - alice ma z predchozich testu vycerpany limit 3 Spaces.
    const host = await createParty("sp-leave-host");
    const guest = await createParty("sp-leave-guest");
    const spaceId = await callCreateSpace(host.functions, "space");
    const invite = await callCreateInvite(host.functions, { spaceId, maxUses: 5 });
    await callJoinSpace(guest.functions, invite.token);

    // Host posle zpravu (aby existoval message + payload ke smazani).
    const identity = await loadDeviceIdentity(host.uid);
    if (!identity) throw new Error("host bez klicu");
    const recipients = await callGetSpaceKeyBundles(host.functions, spaceId);
    const msgId = await sendTextMessage({
      db: host.db,
      spaceId,
      text: "tahle mistnost za chvili zanikne",
      sender: {
        uid: host.uid,
        deviceId: host.deviceId,
        identitySk: identity.privateKeys.identitySk,
      },
      recipients,
    });

    // Guest odejde -> cela mistnost prestane existovat pro vsechny.
    await callLeaveSpace(guest.functions, spaceId);

    // Space, cleny, zpravy i pozvanka jsou pryc (cteme adminem mimo Rules).
    const env = await initializeTestEnvironment({ projectId: "demo-minuta" });
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      expect((await getDoc(doc(db, "spaces", spaceId))).exists()).toBe(false);
      expect(
        (await getDocs(collection(db, "spaces", spaceId, "members"))).empty,
      ).toBe(true);
      expect(
        (await getDoc(doc(db, "spaces", spaceId, "messages", msgId))).exists(),
      ).toBe(false);
      expect((await getDoc(doc(db, "invites", invite.tokenHash))).exists()).toBe(false);
    });
    await env.cleanup();

    // Pozvanka uz neplati; neclen mistnost opustit nemuze.
    await expect(callJoinSpace(carol.functions, invite.token)).rejects.toThrow();
    await expect(callLeaveSpace(carol.functions, spaceId)).rejects.toThrow();

    await deleteApp(host.app);
    await deleteApp(guest.app);
  }, 60_000);
});
