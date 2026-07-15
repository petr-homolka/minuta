// Mapa: SVG vykresleni identiconu (identicon.ts) - vizualni kotva
// identity (40 §4). Velikost v px, mrizka 5x5.
import { identiconSpec } from "./identicon-spec";

export function Identicon(props: { fingerprint: string; size?: number }) {
  const size = props.size ?? 32;
  let spec;
  try {
    spec = identiconSpec(props.fingerprint);
  } catch {
    return null;
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 5 5"
      role="img"
      aria-label="identicon"
      style={{ borderRadius: "20%", background: "rgba(255,255,255,0.08)" }}
    >
      {spec.cells.map((on, i) =>
        on ? (
          <rect
            key={i}
            x={i % 5}
            y={Math.floor(i / 5)}
            width={1}
            height={1}
            fill={spec.color}
          />
        ) : null,
      )}
    </svg>
  );
}
