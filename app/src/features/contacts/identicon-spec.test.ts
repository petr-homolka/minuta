import { describe, expect, it } from "vitest";
import { identiconSpec } from "./identicon-spec";

const FP = "9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60";

describe("identicon (40 §4)", () => {
  it("je deterministicky a zrcadlove symetricky", () => {
    const a = identiconSpec(FP);
    const b = identiconSpec(FP);
    expect(a).toEqual(b);
    expect(a.cells).toHaveLength(25);
    for (let row = 0; row < 5; row += 1) {
      expect(a.cells[row * 5]).toBe(a.cells[row * 5 + 4]);
      expect(a.cells[row * 5 + 1]).toBe(a.cells[row * 5 + 3]);
    }
    expect(a.color).toMatch(/^hsl\(\d+, 65%, \d+%\)$/);
  });

  it("ruzne otisky = ruzne identikony; kratky otisk odmitne", () => {
    const other = identiconSpec("ab".repeat(32));
    expect(other).not.toEqual(identiconSpec(FP));
    expect(() => identiconSpec("abcd")).toThrow();
  });
});
