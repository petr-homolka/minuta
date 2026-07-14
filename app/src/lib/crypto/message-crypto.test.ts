// Testy primitiv zpravy (33 §8): externi vektor XChaCha20-Poly1305
// (draft-irtf-cfrg-xchacha-03 A.3.1), wrap/unwrap roundtrip a wipe.
import { describe, expect, it } from "vitest";
import { generateDeviceKeys } from "./keys";
import {
  decryptContent,
  encryptContent,
  generateMessageKey,
  unwrapMessageKey,
  wipe,
  wrapMessageKey,
} from "./message-crypto";
import { getSodium } from "./sodium";

// draft-irtf-cfrg-xchacha-03, Appendix A.3.1 (verejny test vektor).
const XCH_KEY_HEX = "808182838485868788898a8b8c8d8e8f909192939495969798999a9b9c9d9e9f";
const XCH_NONCE_HEX = "404142434445464748494a4b4c4d4e4f5051525354555657";
const XCH_AAD_HEX = "50515253c0c1c2c3c4c5c6c7";
const XCH_PLAINTEXT_HEX =
  "4c616469657320616e642047656e746c656d656e206f662074686520636c6173" +
  "73206f66202739393a204966204920636f756c64206f6666657220796f75206f" +
  "6e6c79206f6e652074697020666f7220746865206675747572652c2073756e73" +
  "637265656e20776f756c642062652069742e";
const XCH_CIPHERTEXT_AND_TAG_HEX =
  "bd6d179d3e83d43b9576579493c0e939572a1700252bfaccbed2902c21396cbb" +
  "731c7f1b0b4aa6440bf3a82f4eda7e39ae64c6708c54c216cb96b72e1213b452" +
  "2f8c9ba40db5d945b11b69b982c1bb9e3f3fac2bc369488f76b2383565d3fff9" +
  "21f9664c97637da9768812f615c68b13b52e" +
  "c0875924c1c7987947deafd8780acf49";

describe("XChaCha20-Poly1305 (33 §2 krok 2)", () => {
  it("odpovida IETF test vektoru", async () => {
    const sodium = await getSodium();
    const out = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
      sodium.from_hex(XCH_PLAINTEXT_HEX),
      sodium.from_hex(XCH_AAD_HEX),
      null,
      sodium.from_hex(XCH_NONCE_HEX),
      sodium.from_hex(XCH_KEY_HEX),
    );
    expect(sodium.to_hex(out)).toBe(XCH_CIPHERTEXT_AND_TAG_HEX);
  });

  it("encrypt/decrypt roundtrip, spatne AD i poskozeny obsah selzou", async () => {
    const mk = await generateMessageKey();
    const plaintext = new TextEncoder().encode("Zprava zije 60 sekund.");
    const ad = new TextEncoder().encode("hlavicka-obalky");

    const blob = await encryptContent(plaintext, mk, ad);
    expect(blob.length).toBeGreaterThan(plaintext.length + 24);
    await expect(decryptContent(blob, mk, ad)).resolves.toEqual(plaintext);

    const wrongAd = new TextEncoder().encode("jina-hlavicka");
    await expect(decryptContent(blob, mk, wrongAd)).rejects.toThrow();

    const corrupted = blob.slice();
    const last = corrupted.length - 1;
    corrupted[last] = (corrupted[last] ?? 0) ^ 0xff;
    await expect(decryptContent(corrupted, mk, ad)).rejects.toThrow();

    await expect(decryptContent(new Uint8Array(10), mk, ad)).rejects.toThrow();
  });

  it("dve sifrovani tehoz obsahu se lisi (nahodna nonce)", async () => {
    const mk = await generateMessageKey();
    const plaintext = new TextEncoder().encode("stejny obsah");
    const ad = new Uint8Array(0);
    const a = await encryptContent(plaintext, mk, ad);
    const b = await encryptContent(plaintext, mk, ad);
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false);
  });
});

describe("wrap/unwrap MK pres crypto_box_seal (33 §2 krok 3)", () => {
  it("roundtrip na SPK zarizeni; cizi klic ani poskozeny wrap neprojde", async () => {
    const device = await generateDeviceKeys();
    const other = await generateDeviceKeys();
    const mk = await generateMessageKey();

    const wrap = await wrapMessageKey(mk, device.publicBundle.signedPrekey.pk);
    const unwrapped = await unwrapMessageKey(
      wrap,
      device.publicBundle.signedPrekey.pk,
      device.privateKeys.signedPrekeySk,
    );
    expect(unwrapped).toEqual(mk);

    await expect(
      unwrapMessageKey(
        wrap,
        other.publicBundle.signedPrekey.pk,
        other.privateKeys.signedPrekeySk,
      ),
    ).rejects.toThrow();

    const sodium = await getSodium();
    const bytes = sodium.from_base64(wrap, sodium.base64_variants.ORIGINAL);
    bytes[0] = (bytes[0] ?? 0) ^ 0xff;
    const corrupted = sodium.to_base64(bytes, sodium.base64_variants.ORIGINAL);
    await expect(
      unwrapMessageKey(
        corrupted,
        device.publicBundle.signedPrekey.pk,
        device.privateKeys.signedPrekeySk,
      ),
    ).rejects.toThrow();
  });
});

describe("wipe (crypto-shredding, 33 §3)", () => {
  it("prepise klic nulami", async () => {
    const mk = await generateMessageKey();
    const hadNonZero = mk.some((b) => b !== 0);
    await wipe(mk);
    expect(hadNonZero).toBe(true);
    expect(mk.every((b) => b === 0)).toBe(true);
  });
});
