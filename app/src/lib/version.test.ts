import { describe, expect, it } from "vitest";
import { APP_VERSION, isVersionSupported } from "./version";

describe("force update brana (20)", () => {
  it("aktualni verze projde, kill switch blokne", () => {
    expect(isVersionSupported(1)).toBe(true);
    expect(isVersionSupported(APP_VERSION)).toBe(true);
    expect(isVersionSupported(APP_VERSION + 1)).toBe(false);
    expect(isVersionSupported(0)).toBe(true);
  });
});
