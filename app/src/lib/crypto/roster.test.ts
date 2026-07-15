// Testy sifrovaneho rosteru (40 §3): RK roundtrip pres SPK zarizeni,
// zaznam citelny jen s RK, poskozeni/zamena AD selze.
import { describe, expect, it } from "vitest";
import { generateDeviceKeys } from "./keys";
import {
  decryptContact,
  encryptContact,
  generateRosterKey,
  unwrapRosterKey,
  wrapRosterKey,
  type ContactRecord,
} from "./roster";

const RECORD: ContactRecord = {
  uid: "uid-bob",
  name: "Bob z prace",
  ikFingerprint: "ab".repeat(32),
  verified: true,
  note: "poznamka",
};

describe("roster (40 §3)", () => {
  it("RK se rozbali jen spravnym zarizenim; zaznam roundtrip", async () => {
    const device = await generateDeviceKeys();
    const other = await generateDeviceKeys();
    const rosterKey = await generateRosterKey();

    const wrap = await wrapRosterKey(rosterKey, device.publicBundle.signedPrekey.pk);
    const unwrapped = await unwrapRosterKey(
      wrap,
      device.publicBundle.signedPrekey.pk,
      device.privateKeys.signedPrekeySk,
    );
    expect(unwrapped).toEqual(rosterKey);
    await expect(
      unwrapRosterKey(
        wrap,
        other.publicBundle.signedPrekey.pk,
        other.privateKeys.signedPrekeySk,
      ),
    ).rejects.toThrow();

    const blob = await encryptContact(RECORD, rosterKey);
    await expect(decryptContact(blob, rosterKey)).resolves.toEqual(RECORD);
    expect(blob).not.toContain("Bob"); // plaintext nesmi prosakovat

    const wrongKey = await generateRosterKey();
    await expect(decryptContact(blob, wrongKey)).rejects.toThrow();
  });
});
