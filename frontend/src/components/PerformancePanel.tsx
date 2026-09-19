import type { PerfSnapshot } from "@/types";

interface Props {
  snapshot: PerfSnapshot;
  history: number[];
}

function fpsColor(fps: number): string {
  if (fps >= 50) return "#62ffbd";
  if (fps >= 30) return "#ffc266";
  return "#ff6b6b";
}

function Sparkline({ data, max = 120 }: { data: number[]; max?: number }) {
  const w = 240;
  const h = 64;
  if (data.length < 2) {
    return <div className="h-16 w-full rounded bg-cyan-400/5" />;
  }
  const step = w / (data.length - 1);
  const points = data
    .map((v, i) => {
      const x = i * step;
      const y = h - (Math.min(v, max) / max) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const lastY = h - (Math.min(data[data.length - 1], max) / max) * h;
  const color = fpsColor(data[data.length - 1]);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="h-16 w-full">
      <defs>
        <linearGradient id="fpsfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* 60 fps reference line */}
      <line x1="0" y1={h - (60 / max) * h} x2={w} y2={h - (60 / max) * h} stroke="rgba(56,225,255,0.2)" strokeDasharray="3 3" />
      <polygon points={`0,${h} ${points} ${w},${h}`} fill="url(#fpsfill)" />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.8" vectorEffect="non-scaling-stroke" style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
      <circle cx={w} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}

export default function PerformancePanel({ snapshot, history }: Props) {
  const fps = Math.round(snapshot.fps);
  const color = fpsColor(fps);
  const memPct =
    snapshot.memorySupported && snapshot.jsHeapLimitMB > 0
      ? (snapshot.memoryUsedMB / snapshot.jsHeapLimitMB) * 100
      : 0;

  return (
    <section className="panel clip-corner relative overflow-hidden p-4">
      <h2 className="mb-3 font-display text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
        ◈ Live Performance
      </h2>

      <div className="flex items-end justify-between">
        <div>
          <div className="font-display text-4xl font-black text-glow" style={{ color }}>
            {fps}
          </div>
          <div className="text-[10px] uppercase tracking-widest text-cyan-300/50">FPS</div>
        </div>
        <div className="text-right">
          <div className="font-display text-lg text-cyan-100">{snapshot.msPerFrame.toFixed(1)}</div>
          <div className="text-[10px] uppercase tracking-widest text-cyan-300/50">ms / frame</div>
        </div>
      </div>

      <div className="mt-2">
        <Sparkline data={history} />
      </div>

      {snapshot.memorySupported ? (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-[10px] uppercase tracking-widest text-cyan-300/50">
            <span>JS Heap</span>
            <span className="text-cyan-200">
              {Math.round(snapshot.memoryUsedMB)} / {Math.round(snapshot.jsHeapLimitMB)} MB
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full border border-cyan-400/20 bg-cyan-400/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-300 transition-[width] duration-200"
              style={{ width: `${Math.min(100, memPct)}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[10px] text-cyan-300/40">
          Heap telemetry unavailable in this browser (best in Chromium).
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 text-center">
        <div className="rounded border border-cyan-400/10 bg-cyan-400/5 py-1.5">
          <div className="font-display text-sm text-cyan-100">{fps >= 50 ? "SMOOTH" : fps >= 30 ? "FAIR" : "LAGGY"}</div>
          <div className="text-[9px] uppercase tracking-widest text-cyan-300/40">Render</div>
        </div>
        <div className="rounded border border-cyan-400/10 bg-cyan-400/5 py-1.5">
          <div className="font-display text-sm" style={{ color }}>
            {fps >= 50 ? "OPTIMAL" : "CHECK"}
          </div>
          <div className="text-[9px] uppercase tracking-widest text-cyan-300/40">Status</div>
        </div>
      </div>
    </section>
  );
}
