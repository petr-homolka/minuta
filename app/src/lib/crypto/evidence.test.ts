// Test pecetenii dukazu (27): roundtrip pres vlastni par, cizi klic
// neotevre, plaintext neprosakuje do blobu.
import { describe, expect, it } from "vitest";
import { openEvidence, sealEvidence, type ReportEvidence } from "./evidence";
import { getSodium } from "./sodium";

const EVIDENCE: ReportEvidence = {
  v: 1,
  spaceId: "s1",
  msgId: "m1",
  senderUid: "uid-utocnik",
  senderDeviceId: "dev-1",
  category: "C2",
  plaintext: "vyhrozna zprava",
};

describe("pecetenii dukazu (27, 29 §1.2)", () => {
  it("roundtrip pres klic moderace; cizi klic neotevre", async () => {
    const sodium = await getSodium();
    const moderation = sodium.crypto_box_keypair();
    const pk = sodium.to_base64(moderation.publicKey, sodium.base64_variants.ORIGINAL);

    const sealed = await sealEvidence(EVIDENCE, pk);
    expect(sealed).not.toContain("vyhrozna");

    const opened = await openEvidence(sealed, pk, moderation.privateKey);
    expect(opened).toEqual(EVIDENCE);

    const other = sodium.crypto_box_keypair();
    const otherPk = sodium.to_base64(other.publicKey, sodium.base64_variants.ORIGINAL);
    await expect(
      openEvidence(sealed, otherPk, other.privateKey),
    ).rejects.toThrow();
  });
});
