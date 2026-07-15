// Mapa: 60s zivot otevrene zpravy v UI (33 §3, 34 §2 bod 4).
// Odpocet se kotvi k okamziku POTVRZENI zapisu readAt (lokalni monotonni
// cas), ne k lokalnim hodinam ve vztahu k serveru (34 §5). Po dohoreni
// se plaintext prepise nulami (wipe) a stav prejde na "burned".
// Server nezavisle vynucuje sve okno pres Rules - UI je jen vykresleni.
import { useEffect, useRef, useState } from "react";
import { wipe } from "../../lib/crypto/message-crypto";

export const MESSAGE_LIFETIME_MS = 60_000;

export interface BurningMessage {
  text: string;
  secondsLeft: number;
}

export function useBurnCountdown(): {
  burning: BurningMessage | null;
  burned: boolean;
  ignite: (plaintext: Uint8Array) => void;
} {
  const [burning, setBurning] = useState<BurningMessage | null>(null);
  const [burned, setBurned] = useState(false);
  const bytesRef = useRef<Uint8Array | null>(null);

  function extinguish() {
    const bytes = bytesRef.current;
    bytesRef.current = null;
    if (bytes) {
      void wipe(bytes);
    }
  }

  function ignite(plaintext: Uint8Array) {
    extinguish();
    bytesRef.current = plaintext;
    setBurned(false);
    setBurning({
      text: new TextDecoder().decode(plaintext),
      secondsLeft: MESSAGE_LIFETIME_MS / 1000,
    });
  }

  useEffect(() => {
    if (!burning) {
      return;
    }
    const startedAt = performance.now(); // monotonni kotva potvrzeni
    const timer = setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const left = Math.max(0, MESSAGE_LIFETIME_MS - elapsed);
      if (left === 0) {
        clearInterval(timer);
        extinguish();
        setBurning(null);
        setBurned(true);
      } else {
        setBurning((prev) =>
          prev ? { ...prev, secondsLeft: Math.ceil(left / 1000) } : prev,
        );
      }
    }, 250);
    return () => clearInterval(timer);
    // zamerne zavisi jen na "existuje horici zprava" - restart jen pri ignite
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [burning !== null]);

  // Unmount = okamzity wipe (plaintext nikdy neprezije obrazovku).
  useEffect(() => extinguish, []);

  return { burning, burned, ignite };
}
