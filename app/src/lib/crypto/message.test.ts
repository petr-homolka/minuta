// Test cele cesty zpravy mezi zarizenimi (42 §3 rez 2: "zasifruju
// a rozsifruju mezi dvema zarizenimi") + utocne scenare (33 §8).
import { describe, expect, it } from "vitest";
import { generateDeviceKeys, type GeneratedDeviceKeys } from "./keys";
import { openMessage, sealMessage, type RecipientDevice } from "./message";
import { wipe } from "./message-crypto";

function asRecipient(deviceId: string, keys: GeneratedDeviceKeys): RecipientDevice {
  return {
    deviceId,
    identityPk: keys.publicBundle.identityPk,
    signedPrekey: keys.publicBundle.signedPrekey,
  };
}

async function makeParties() {
  const alice = await generateDeviceKeys();
  const bob = await generateDeviceKeys();
  const carol = await generateDeviceKeys();
  const plaintext = new TextEncoder().encode("Ahoj, tahle zprava zije minutu.");
  const sealed = await sealMessage({
    plaintext,
    msgId: "msg-1",
    spaceId: "space-1",
    senderUid: "uid-alice",
    senderDeviceId: "dev-alice",
    senderIdentitySk: alice.privateKeys.identitySk,
    recipients: [asRecipient("dev-bob", bob), asRecipient("dev-carol", carol)],
  });
  return { alice, bob, carol, plaintext, sealed };
}

describe("sealMessage -> openMessage (33 §2-3)", () => {
  it("oba prijemci desifruji, obalka nenese plaintext ani MK", async () => {
    const { alice, bob, carol, plaintext, sealed } = await makeParties();

    for (const [deviceId, keys] of [
      ["dev-bob", bob],
      ["dev-carol", carol],
    ] as const) {
      const opened = await openMessage({
        envelope: sealed.envelope,
        payload: sealed.payload,
        senderIdentityPk: alice.publicBundle.identityPk,
        deviceId,
        wrapPk: keys.publicBundle.signedPrekey.pk,
        wrapSk: keys.privateKeys.signedPrekeySk,
      });
      expect(new TextDecoder().decode(opened)).toBe(
        "Ahoj, tahle zprava zije minutu.",
      );
      await wipe(opened);
      expect(opened.every((b) => b === 0)).toBe(true);
    }

    expect(Object.keys(sealed.envelope.wraps).sort()).toEqual(["dev-bob", "dev-carol"]);
    const envelopeJson = JSON.stringify(sealed.envelope);
    expect(envelopeJson).not.toContain("Ahoj");
    expect(sealed.payload.length).toBeGreaterThan(plaintext.length);
  });

  it("prijemce nerozbali cizi wrap a bez wrapu neotevre nic", async () => {
    const { alice, bob, carol, sealed } = await makeParties();

    // Bob se pokusi pouzit Caroliin wrap se svym klicem.
    await expect(
      openMessage({
        envelope: sealed.envelope,
        payload: sealed.payload,
        senderIdentityPk: alice.publicBundle.identityPk,
        deviceId: "dev-carol",
        wrapPk: bob.publicBundle.signedPrekey.pk,
        wrapSk: bob.privateKeys.signedPrekeySk,
      }),
    ).rejects.toThrow();

    // Zarizeni mimo wraps.
    await expect(
      openMessage({
        envelope: sealed.envelope,
        payload: sealed.payload,
        senderIdentityPk: alice.publicBundle.identityPk,
        deviceId: "dev-mallory",
        wrapPk: carol.publicBundle.signedPrekey.pk,
        wrapSk: carol.privateKeys.signedPrekeySk,
      }),
    ).rejects.toThrow(/wrap pro toto zarizeni/);
  });

  it("podvrzeny odesilatel a manipulace s payloadem selzou", async () => {
    const { alice, bob, sealed } = await makeParties();
    const eve = await generateDeviceKeys();

    // Overeni proti jinemu (udajne znamemu) IK - TOFU chrani pred podvrhem.
    await expect(
      openMessage({
        envelope: sealed.envelope,
        payload: sealed.payload,
        senderIdentityPk: eve.publicBundle.identityPk,
        deviceId: "dev-bob",
        wrapPk: bob.publicBundle.signedPrekey.pk,
        wrapSk: bob.privateKeys.signedPrekeySk,
      }),
    ).rejects.toThrow(/Podpis obalky/);

    // Zmena payloadu (AD/AEAD integrita).
    const tampered = sealed.payload.slice();
    const mid = Math.floor(tampered.length / 2);
    tampered[mid] = (tampered[mid] ?? 0) ^ 0x01;
    await expect(
      openMessage({
        envelope: sealed.envelope,
        payload: tampered,
        senderIdentityPk: alice.publicBundle.identityPk,
        deviceId: "dev-bob",
        wrapPk: bob.publicBundle.signedPrekey.pk,
        wrapSk: bob.privateKeys.signedPrekeySk,
      }),
    ).rejects.toThrow();

    // Payload prehrany pod jinou obalkou (jine msgId) neprojde diky AD.
    const other = await sealMessage({
      plaintext: new TextEncoder().encode("jina zprava"),
      msgId: "msg-2",
      spaceId: "space-1",
      senderUid: "uid-alice",
      senderDeviceId: "dev-alice",
      senderIdentitySk: alice.privateKeys.identitySk,
      recipients: [asRecipient("dev-bob", bob)],
    });
    await expect(
      openMessage({
        envelope: other.envelope,
        payload: sealed.payload,
        senderIdentityPk: alice.publicBundle.identityPk,
        deviceId: "dev-bob",
        wrapPk: bob.publicBundle.signedPrekey.pk,
        wrapSk: bob.privateKeys.signedPrekeySk,
      }),
    ).rejects.toThrow();
  });

  it("odmitne prijemce s neplatnym podpisem SPK (33 §2 krok 1)", async () => {
    const alice = await generateDeviceKeys();
    const bob = await generateDeviceKeys();
    const eve = await generateDeviceKeys();

    await expect(
      sealMessage({
        plaintext: new TextEncoder().encode("x"),
        msgId: "m",
        spaceId: "s",
        senderUid: "u",
        senderDeviceId: "d",
        senderIdentitySk: alice.privateKeys.identitySk,
        recipients: [
          {
            deviceId: "dev-bob",
            identityPk: bob.publicBundle.identityPk,
            // SPK podvrzeny utocnikem - podpis nesedi k Bobovu IK.
            signedPrekey: eve.publicBundle.signedPrekey,
          },
        ],
      }),
    ).rejects.toThrow(/Neplatny podpis prekey/);

    await expect(
      sealMessage({
        plaintext: new TextEncoder().encode("x"),
        msgId: "m",
        spaceId: "s",
        senderUid: "u",
        senderDeviceId: "d",
        senderIdentitySk: alice.privateKeys.identitySk,
        recipients: [],
      }),
    ).rejects.toThrow(/bez prijemcu/);
  });
});
