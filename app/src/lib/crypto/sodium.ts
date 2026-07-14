// Mapa: jediny vstupni bod k libsodium.js. ADR-002: zadna jina krypto
// knihovna bez noveho ADR; WebCrypto jen jako zdroj entropie/UUID (33 §7).
import _sodium from "libsodium-wrappers";

export type Sodium = typeof _sodium;

export async function getSodium(): Promise<Sodium> {
  await _sodium.ready;
  return _sodium;
}
