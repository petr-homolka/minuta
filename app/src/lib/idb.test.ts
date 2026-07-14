// Test lokalniho uloziste - bezi v Node nad fake-indexeddb.
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { idbDelete, idbGet, idbSet } from "./idb";

describe("idb key-value", () => {
  it("ulozi, precte a smaze hodnotu vcetne Uint8Array", async () => {
    const value = { deviceId: "d1", secret: new Uint8Array([1, 2, 3]) };
    await idbSet("test:key", value);

    const loaded = await idbGet<typeof value>("test:key");
    expect(loaded?.deviceId).toBe("d1");
    expect(loaded?.secret).toBeInstanceOf(Uint8Array);
    expect(Array.from(loaded?.secret ?? [])).toEqual([1, 2, 3]);

    await idbDelete("test:key");
    await expect(idbGet("test:key")).resolves.toBeUndefined();
  });

  it("vraci undefined pro neexistujici klic", async () => {
    await expect(idbGet("test:missing")).resolves.toBeUndefined();
  });
});
