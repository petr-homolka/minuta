// Testy krypto jadra (33 §8): externi test vektory (RFC 8032, RFC 7748)
// overuji, ze libsodium primitiva pouzivame spravne; property testy
// overuji tvar a konzistenci bundle. Vektory jsou verejne konstanty.
import { describe, expect, it } from "vitest";
import {
  generateDeviceKeys,
  identityPublicFromSecret,
  OPK_BATCH_SIZE,
  verifySignedPrekey,
  x25519PublicFromSecret,
} from "./keys";
import { getSodium } from "./sodium";

// RFC 8032 §7.1 TEST 1 (Ed25519): seed -> verejny klic + podpis prazdne zpravy.
const ED25519_SEED_HEX =
  "9d61b19deffd5a60ba844af492ec2cc44449c5697b326919703bac031cae7f60";
const ED25519_PK_HEX =
  "d75a980182b10ab7d54bfed3c964073a0ee172f3daa62325af021a68f707511a";
const ED25519_SIG_HEX =
  "e5564300c360ac729086e2cc806e828a84877f1eb8e5d974d873e06522490155" +
  "5fb8821590a33bacc61e39701cf9b46bd25bf5f0595bbe24655141438e7a100b";

// RFC 7748 §6.1 (X25519): privatni skalar -> verejny klic (scalarmult base).
const X25519_ALICE_SK_HEX =
  "77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a";
const X25519_ALICE_PK_HEX =
  "8520f0098930a754748b7ddcb43ef75a0dbf3a0d26381af4eba4a98eaa9b4e6a";
const X25519_BOB_SK_HEX =
  "5dab087e624a8a4b79e17f8b83800ee66f3bb1292618b6fd1c2f8b27ff88e0eb";
const X25519_SHARED_HEX =
  "4a5d9d5ba4ce2de1728e3bf480350f25e07e21c947d19e3376f09b3c1e161742";

describe("test vektory libsodium (33 §8)", () => {
  it("Ed25519: RFC 8032 TEST 1 - odvozeni klice a podpis", async () => {
    const sodium = await getSodium();
    const seed = sodium.from_hex(ED25519_SEED_HEX);
    const pair = sodium.crypto_sign_seed_keypair(seed);
    expect(sodium.to_hex(pair.publicKey)).toBe(ED25519_PK_HEX);

    const sig = sodium.crypto_sign_detached(new Uint8Array(0), pair.privateKey);
    expect(sodium.to_hex(sig)).toBe(ED25519_SIG_HEX);
  });

  it("X25519: RFC 7748 - verejny klic a sdilene tajemstvi", async () => {
    const sodium = await getSodium();
    const aliceSk = sodium.from_hex(X25519_ALICE_SK_HEX);
    const alicePk = sodium.crypto_scalarmult_base(aliceSk);
    expect(sodium.to_hex(alicePk)).toBe(X25519_ALICE_PK_HEX);

    const bobSk = sodium.from_hex(X25519_BOB_SK_HEX);
    const bobPk = sodium.crypto_scalarmult_base(bobSk);
    const sharedAlice = sodium.crypto_scalarmult(aliceSk, bobPk);
    const sharedBob = sodium.crypto_scalarmult(bobSk, alicePk);
    expect(sodium.to_hex(sharedAlice)).toBe(X25519_SHARED_HEX);
    expect(sodium.to_hex(sharedBob)).toBe(X25519_SHARED_HEX);
  });
});

describe("generateDeviceKeys (33 §1)", () => {
  it("vytvori kompletni bundle spravnych tvaru", async () => {
    const { publicBundle, privateKeys } = await generateDeviceKeys();

    // base64 ORIGINAL: 32 B klic = 44 znaku, 64 B podpis = 88 znaku (36 §3).
    expect(publicBundle.identityPk).toHaveLength(44);
    expect(publicBundle.kxPk).toHaveLength(44);
    expect(publicBundle.signedPrekey.pk).toHaveLength(44);
    expect(publicBundle.signedPrekey.sig).toHaveLength(88);

    expect(publicBundle.oneTimePrekeys).toHaveLength(OPK_BATCH_SIZE);
    const ids = new Set(publicBundle.oneTimePrekeys.map((p) => p.id));
    const pks = new Set(publicBundle.oneTimePrekeys.map((p) => p.pk));
    expect(ids.size).toBe(OPK_BATCH_SIZE);
    expect(pks.size).toBe(OPK_BATCH_SIZE);

    expect(privateKeys.identitySk).toHaveLength(64); // Ed25519 sk = seed+pk
    expect(privateKeys.kxSk).toHaveLength(32);
    expect(privateKeys.signedPrekeySk).toHaveLength(32);
    expect(Object.keys(privateKeys.oneTimePrekeySks)).toHaveLength(OPK_BATCH_SIZE);
  });

  it("podpis SPK je overitelny proti IK a jinak nikoli", async () => {
    const { publicBundle } = await generateDeviceKeys();
    const other = await generateDeviceKeys();

    await expect(
      verifySignedPrekey(publicBundle.identityPk, publicBundle.signedPrekey),
    ).resolves.toBe(true);

    // Cizi IK, prohozeny klic i poskozeny vstup musi selhat - tise (false).
    await expect(
      verifySignedPrekey(other.publicBundle.identityPk, publicBundle.signedPrekey),
    ).resolves.toBe(false);
    await expect(
      verifySignedPrekey(publicBundle.identityPk, {
        pk: other.publicBundle.signedPrekey.pk,
        sig: publicBundle.signedPrekey.sig,
      }),
    ).resolves.toBe(false);
    await expect(
      verifySignedPrekey("neni-base64!", publicBundle.signedPrekey),
    ).resolves.toBe(false);
  });

  it("verejne klice jdou odvodit z privatnich (multi-sezeni bez ulozenych pk)", async () => {
    const { publicBundle, privateKeys } = await generateDeviceKeys();
    await expect(identityPublicFromSecret(privateKeys.identitySk)).resolves.toBe(
      publicBundle.identityPk,
    );
    await expect(x25519PublicFromSecret(privateKeys.signedPrekeySk)).resolves.toBe(
      publicBundle.signedPrekey.pk,
    );
    await expect(identityPublicFromSecret(new Uint8Array(32))).rejects.toThrow();
  });

  it("kazde volani generuje jine klice", async () => {
    const a = await generateDeviceKeys();
    const b = await generateDeviceKeys();
    expect(a.publicBundle.identityPk).not.toBe(b.publicBundle.identityPk);
    expect(a.publicBundle.kxPk).not.toBe(b.publicBundle.kxPk);
  });
});
