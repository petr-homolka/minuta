// Mapa modulu: Cloud Functions `/v1` (18-API). Rez 1 obsahuje jen `ping`
// pro overeni emulator pipeline; realne funkce (join, prekey vydej,
// revokace, burn-all) prijdou v rezech 3+ dle 42 §3.
// Region vseho: europe-west3 (ADR-009). Zadny plaintext/klice v lozich (33 §7).
import { setGlobalOptions } from "firebase-functions/v2";
import { onCall } from "firebase-functions/v2/https";

setGlobalOptions({ region: "europe-west3" });

export const ping = onCall(() => ({ ok: true }));
