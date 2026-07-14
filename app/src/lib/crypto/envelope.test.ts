// Testy obalky v1 (33 §8 - fuzz obalek): podpis, overeni a mutacni matice -
// zmena KAZDEHO pole hlavicky (vcetne msgId - ochrana proti prehrani
// podpisu na jinou zpravu) musi overeni rozbit.
import { describe, expect, it } from "vitest";
import {
  canonicalHeaderBytes,
  CRYPTO_VERSION,
  signEnvelope,
  verifyEnvelope,
  type EnvelopeHeaderV1,
  type EnvelopeV1,
} from "./envelope";
import { generateDeviceKeys } from "./keys";

function sampleHeader(): EnvelopeHeaderV1 {
  return {
    v: CRYPTO_VERSION,
    msgId: "msg-001",
    spaceId: "space-abc",
    senderUid: "uid-alice",
    senderDeviceId: "dev-a",
    wraps: { "dev-b": "d3JhcEI=", "dev-c": "d3JhcEM=" },
  };
}

describe("kanonicka serializace", () => {
  it("nezavisi na poradi klicu ve wraps", () => {
    const a = sampleHeader();
    const b: EnvelopeHeaderV1 = {
      ...sampleHeader(),
      wraps: { "dev-c": "d3JhcEM=", "dev-b": "d3JhcEI=" },
    };
    expect(canonicalHeaderBytes(a)).toEqual(canonicalHeaderBytes(b));
  });

  it("odmitne poskozeny wrap (ne-retezec)", () => {
    const header = sampleHeader();
    (header.wraps as Record<string, unknown>)["dev-x"] = 42;
    expect(() => canonicalHeaderBytes(header)).toThrow();
  });
});

describe("podpis obalky (33 §2 krok 4)", () => {
  it("podepsana obalka projde overenim proti IK odesilatele", async () => {
    const sender = await generateDeviceKeys();
    const envelope = await signEnvelope(sampleHeader(), sender.privateKeys.identitySk);
    await expect(
      verifyEnvelope(envelope, sender.publicBundle.identityPk),
    ).resolves.toBe(true);
  });

  it("cizi IK ani poskozeny podpis neprojde", async () => {
    const sender = await generateDeviceKeys();
    const attacker = await generateDeviceKeys();
    const envelope = await signEnvelope(sampleHeader(), sender.privateKeys.identitySk);

    await expect(
      verifyEnvelope(envelope, attacker.publicBundle.identityPk),
    ).resolves.toBe(false);
    await expect(verifyEnvelope(envelope, "neni-base64!")).resolves.toBe(false);
    await expect(
      verifyEnvelope({ ...envelope, sig: envelope.sig.slice(0, -4) + "AAAA" },
        sender.publicBundle.identityPk),
    ).resolves.toBe(false);
  });

  it("mutace kazdeho pole hlavicky rozbije overeni (fuzz matice)", async () => {
    const sender = await generateDeviceKeys();
    const envelope = await signEnvelope(sampleHeader(), sender.privateKeys.identitySk);

    const mutations: Partial<EnvelopeV1>[] = [
      { msgId: "msg-002" }, // prehrani podpisu na jinou zpravu
      { spaceId: "space-jiny" },
      { senderUid: "uid-eve" },
      { senderDeviceId: "dev-e" },
      { wraps: { "dev-b": "d3JhcEI=" } }, // odebrany prijemce
      { wraps: { ...sampleHeader().wraps, "dev-e": "d3JhcEU=" } }, // pridany
      { wraps: { "dev-b": "d3JhcEM=", "dev-c": "d3JhcEI=" } }, // prohozene
    ];
    for (const mutation of mutations) {
      const mutated = { ...envelope, ...mutation } as EnvelopeV1;
      await expect(
        verifyEnvelope(mutated, sender.publicBundle.identityPk),
        `mutace ${JSON.stringify(Object.keys(mutation))} mela rozbit podpis`,
      ).resolves.toBe(false);
    }
  });
});
