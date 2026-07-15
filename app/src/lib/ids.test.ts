import { describe, expect, it } from "vitest";
import { uuidv7 } from "./ids";

describe("uuidv7 (08 §2)", () => {
  it("ma spravny tvar, verzi a varianty bit", () => {
    const id = uuidv7();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("je unikatni a casove neklesajici", () => {
    const ids = Array.from({ length: 200 }, () => uuidv7());
    expect(new Set(ids).size).toBe(200);
    // Casova cast (prvnich 12 hex znaku bez pomlcky) nesmi klesat.
    const times = ids.map((id) => id.slice(0, 13).replace("-", ""));
    const sorted = [...times].sort();
    expect(times).toEqual(sorted);
  });
});
