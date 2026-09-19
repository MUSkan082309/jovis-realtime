interface Props {
  value: number;
  max: number;
  label: string;
  display: string;
  color?: string;
  size?: number;
}

export default function CircularGauge({
  value,
  max,
  label,
  display,
  color = "#38e1ff",
  size = 104,
}: Props) {
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  const offset = c * (1 - pct);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(56,225,255,0.12)"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 0.6s ease",
              filter: `drop-shadow(0 0 5px ${color})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-base font-bold text-glow" style={{ color }}>
            {display}
          </span>
        </div>
      </div>
      <span className="text-center text-[10px] uppercase tracking-widest text-cyan-300/60">
        {label}
      </span>
    </div>
  );
}
