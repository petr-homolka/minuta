// Mapa: tikajici "ted" pro vykresleni casovych stavu (28 - "Cte se 0:47").
// Jen zobrazovaci pomucka; rozhodne casy zustavaji serverove (ADR-008).
import { useEffect, useState } from "react";

export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
