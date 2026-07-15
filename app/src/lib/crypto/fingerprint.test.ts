// Testy otisku identity a bezpecnostniho kodu (33 §6, 37 §4).
import { describe, expect, it } from "vitest";
import { formatSafetyCode, ikFingerprint, safetyCode } from "./fingerprint";
import { generateDeviceKeys } from "./keys";

describe("ikFingerprint", () => {
  it("je deterministicky a rozlisuje klice", async () => {
    const a = await generateDeviceKeys();
    const b = await generateDeviceKeys();
    const fp1 = await ikFingerprint(a.publicBundle.identityPk);
    const fp2 = await ikFingerprint(a.publicBundle.identityPk);
    expect(fp1).toBe(fp2);
    expect(fp1).toHaveLength(64);
    await expect(ikFingerprint(b.publicBundle.identityPk)).resolves.not.toBe(fp1);
  });
});

describe("safetyCode (33 §6)", () => {
  it("je symetricky, deterministicky, 12 cislic", async () => {
    const a = await generateDeviceKeys();
    const b = await generateDeviceKeys();
    const codeAB = await safetyCode(a.publicBundle.identityPk, b.publicBundle.identityPk);
    const codeBA = await safetyCode(b.publicBundle.identityPk, a.publicBundle.identityPk);
    expect(codeAB).toBe(codeBA);
    expect(codeAB).toMatch(/^\d{12}$/);
  });

  it("zmena ktrehokoli IK kod zmeni; format po ctyrech", async () => {
    const a = await generateDeviceKeys();
    const b = await generateDeviceKeys();
    const c = await generateDeviceKeys();
    const ab = await safetyCode(a.publicBundle.identityPk, b.publicBundle.identityPk);
    const ac = await safetyCode(a.publicBundle.identityPk, c.publicBundle.identityPk);
    expect(ab).not.toBe(ac);
    expect(formatSafetyCode("123456789012")).toBe("1234 5678 9012");
  });
});
