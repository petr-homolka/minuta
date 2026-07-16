// E2E rez 8 (42 §3, 27, 29): nahlaseni se zapecetenym dukazem, blokace
// vynucena na serveru, omezeni anonymnich uctu a rate limity.
import { deleteApp } from "firebase/app";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  callCreateInvite,
  callCreateSpace,
  callGetSpaceKeyBundles,
  callJoinSpace,
  callReportMessage,
} from "../src/features/chat/api";
import { blockUser, unblockUser } from "../src/features/chat/blocks";
import { sealEvidence } from "../src/lib/crypto/evidence";
import { createParty, loadDevRules, type Party } from "./helpers";

let alice: Party; //  plny ucet
let bob: Party; //    plny ucet
let anon: Party; //   anonymni prijemce pozvanky (N4)

beforeAll(async () => {
  await loadDevRules();
  alice = await createParty("tns-alice");
  bob = await createParty("tns-bob");
  anon = await createParty("tns-anon", { anonymous: true });
}, 60_000);

afterAll(async () => {
  await deleteApp(alice.app);
  await deleteApp(bob.app);
  await deleteApp(anon.app);
});

describe("T&S minimum (rez 8)", () => {
  it("anonymni ucet zaklada Space i pozvanky (ADR-013) a smi vstoupit/odpovidat", async () => {
    // Anonym muze zalozit vlastni konverzaci i pozvanku (jako plny ucet).
    const anonSpace = await callCreateSpace(anon.functions, "space");
    const anonInvite = await callCreateInvite(anon.functions, {
      spaceId: anonSpace,
      maxUses: 5,
    });
    expect(anonInvite.token).toBeTruthy();

    // A soucasne smi vstoupit do cizi konverzace pozvankou a videt cleny.
    const spaceId = await callCreateSpace(alice.functions, "space");
    const invite = await callCreateInvite(alice.functions, { spaceId, maxUses: 5 });
    await expect(callJoinSpace(anon.functions, invite.token)).resolves.toBe(spaceId);
    const recipients = await callGetSpaceKeyBundles(anon.functions, spaceId);
    expect(recipients.map((r) => r.uid)).toContain(alice.uid);
  }, 60_000);

  it("nahlaseni ulozi zapeceteny dukaz mimo dosah klientu", async () => {
    const spaceId = await callCreateSpace(alice.functions, "duo");
    const invite = await callCreateInvite(alice.functions, { spaceId, maxUses: 1 });
    await callJoinSpace(bob.functions, invite.token);

    const evidence = await sealEvidence({
      v: 1,
      spaceId,
      msgId: "msg-x",
      senderUid: alice.uid,
      senderDeviceId: alice.deviceId,
      category: "C2",
      plaintext: "nahlaseny obsah",
    });
    const reportId = await callReportMessage(bob.functions, {
      spaceId,
      msgId: "msg-x",
      reportedUid: alice.uid,
      category: "C2",
      evidence,
    });
    expect(reportId).toBeTruthy();

    // Klient (ani nahlasujici) report neprecte - default deny.
    await expect(
      getDoc(doc(bob.db, "moderationReports", reportId)),
    ).rejects.toThrow();
    await expect(
      getDocs(collection(alice.db, "moderationReports")),
    ).rejects.toThrow();

    // Neclen nenahlasi; spatna kategorie neprojde.
    const eve = await createParty("tns-eve");
    await expect(
      callReportMessage(eve.functions, {
        spaceId,
        msgId: "m",
        reportedUid: alice.uid,
        category: "C2",
        evidence,
      }),
    ).rejects.toThrow();
    await expect(
      callReportMessage(bob.functions, {
        spaceId,
        msgId: "m",
        reportedUid: alice.uid,
        category: "C9",
        evidence,
      }),
    ).rejects.toThrow();
    await deleteApp(eve.app);
  }, 60_000);

  it("blokace: zadne nove duo, zadny vydej bundlu, pozvanka neplati", async () => {
    // Bob blokuje Alici.
    await blockUser(bob.db, bob.uid, alice.uid);

    // Alice nezalozi duo s Bobem (a naopak); duvod se nerozlisuje.
    await expect(
      callCreateSpace(alice.functions, "duo", bob.uid),
    ).rejects.toThrow();
    await expect(callCreateSpace(bob.functions, "duo", alice.uid)).rejects.toThrow();

    // Ve spolecnem Space Alice nedostane Bobovy bundly (zadne dalsi zpravy).
    const spaceId = await callCreateSpace(alice.functions, "space");
    const invite = await callCreateInvite(alice.functions, { spaceId, maxUses: 5 });
    await expect(callJoinSpace(bob.functions, invite.token)).rejects.toThrow(); // pozvanka od blokovane

    // Po odblokovani vse funguje.
    await unblockUser(bob.db, bob.uid, alice.uid);
    await expect(callJoinSpace(bob.functions, invite.token)).resolves.toBe(spaceId);
    const recipients = await callGetSpaceKeyBundles(alice.functions, spaceId);
    expect(recipients.map((r) => r.uid)).toContain(bob.uid);

    // Znovu zablokovat -> vydej bundlu Boba Alici zmizi.
    await blockUser(bob.db, bob.uid, alice.uid);
    const filtered = await callGetSpaceKeyBundles(alice.functions, spaceId);
    expect(filtered.map((r) => r.uid)).not.toContain(bob.uid);
    await unblockUser(bob.db, bob.uid, alice.uid);
  }, 60_000);

  it("rate limit: 11. pozvanka v hodine neprojde", async () => {
    const frank = await createParty("tns-frank");
    const spaceId = await callCreateSpace(frank.functions, "space");
    for (let i = 0; i < 9; i += 1) {
      await callCreateInvite(frank.functions, { spaceId, maxUses: 1 });
    }
    // 10. projde (limit 10/h), 11. uz ne.
    await callCreateInvite(frank.functions, { spaceId, maxUses: 1 });
    await expect(
      callCreateInvite(frank.functions, { spaceId, maxUses: 1 }),
    ).rejects.toThrow();
    await deleteApp(frank.app);
  }, 120_000);
});
