// Mapa: prstenec odpoctu (28, 43 §4) - podpis produktu. SVG kruh
// 60 -> 0 s; poslednich 10 s zhne akcentem #FF4D2E. Pristupnost:
// odpocet NIKDY jen barvou - vzdy i cislo a tvar (28); cislo je
// soucasti kruhu, oznamovani pro AT resi aria-live v ChatScreen.
const EMBER = "#FF4D2E";
const CALM = "#7dd3fc";

export function TimeRing(props: {
  secondsLeft: number;
  totalSeconds?: number;
  /** Prumer v px; S=28 (indikator u zpravy), M=56 (otevrena zprava). */
  size?: number;
}) {
  const total = props.totalSeconds ?? 60;
  const size = props.size ?? 56;
  const stroke = Math.max(3, size / 14);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.max(0, Math.min(1, props.secondsLeft / total));
  const color = props.secondsLeft <= 10 ? EMBER : CALM;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="timer"
      aria-label={`zbývá ${props.secondsLeft} sekund`}
      className="timering"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - fraction)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.25s linear, stroke 0.3s" }}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fill={color}
        fontSize={size / 2.6}
        fontVariant="tabular-nums"
        fontWeight={600}
      >
        {Math.max(0, props.secondsLeft)}
      </text>
    </svg>
  );
}
