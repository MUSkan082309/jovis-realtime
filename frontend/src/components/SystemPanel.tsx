import type { SystemInfo } from "@/types";
import CircularGauge from "@/components/CircularGauge";

interface Props {
  system: SystemInfo | null;
  scanning: boolean;
  onRescan: () => void;
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-cyan-400/10 py-1.5 text-xs">
      <span className="shrink-0 text-cyan-300/50">{label}</span>
      <span
        className={`text-right font-medium ${
          accent ? "text-cyan-200 text-glow" : "text-cyan-100/90"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function tierColor(v: number, thresholds: [number, string][], fallback: string): string {
  for (const [t, c] of thresholds) if (v >= t) return c;
  return fallback;
}

export default function SystemPanel({ system, scanning, onRescan }: Props) {
  const b = system?.battery;
  const batPct = b?.supported ? Math.round((b.level ?? 0) * 100) : null;

  return (
    <section className="panel clip-corner relative overflow-hidden p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xs font-bold uppercase tracking-[0.25em] text-cyan-300">
          ◈ System Analysis
        </h2>
        <button
          onClick={onRescan}
          disabled={scanning}
          className="rounded border border-cyan-400/30 px-2 py-1 text-[10px] uppercase tracking-wider text-cyan-300 transition hover:bg-cyan-400/10 disabled:opacity-40"
        >
          {scanning ? "Scanning…" : "Re-scan"}
        </button>
      </div>

      {!system ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-3 animate-pulse rounded bg-cyan-400/10" style={{ width: `${90 - i * 8}%` }} />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-around">
            <CircularGauge
              value={system.cpuCores}
              max={32}
              display={`${system.cpuCores}`}
              label="CPU Cores"
              color={tierColor(system.cpuCores, [[16, "#62ffbd"], [8, "#38e1ff"]], "#7aa8ff")}
            />
            <CircularGauge
              value={system.deviceMemory}
              max={64}
              display={system.deviceMemory ? `${system.deviceMemory}` : "∞"}
              label="RAM (GB)"
              color={tierColor(system.deviceMemory, [[16, "#62ffbd"], [8, "#38e1ff"]], "#7aa8ff")}
            />
            <CircularGauge
              value={system.jarvisIndex}
              max={1300}
              display={`${system.jarvisIndex}`}
              label="Jarvis Idx"
              color="#5aa8ff"
            />
          </div>

          <div className="space-y-0">
            <Row label="Platform" value={system.platform} accent />
            <Row label="Browser" value={`${system.browser} ${system.browserVersion ?? ""}`.trim()} />
            <Row label="Engine" value={system.engine ?? "—"} />
            <Row label="Processor" value={`${system.cpuCores || "?"} logical cores`} />
            <Row
              label="Memory"
              value={system.deviceMemory ? `${system.deviceMemory} GB` : "Restricted"}
            />
            <Row label="GPU" value={system.gpu.renderer} accent />
            <Row label="GPU Vendor" value={system.gpu.vendor} />
            <Row label="Graphics API" value={system.gpu.webglVersion ?? "—"} />
            <Row
              label="Display"
              value={`${system.screen.width}×${system.screen.height} @ ${system.screen.pixelRatio}x`}
            />
            <Row label="Color Depth" value={`${system.screen.colorDepth}-bit`} />
            <Row
              label="Network"
              value={
                system.connection.available
                  ? `${(system.connection.effectiveType ?? "—").toUpperCase()} · ${
                      system.connection.downlink ?? "—"
                    } Mbps`
                  : "Restricted"
              }
            />
            <Row
              label="Latency"
              value={system.connection.rtt != null ? `${system.connection.rtt} ms` : "—"}
            />
            <Row
              label="Battery"
              value={
                batPct != null
                  ? `${batPct}% ${b?.charging ? "⚡ charging" : "(discharging)"}`
                  : "Restricted"
              }
              accent={batPct != null && batPct <= 20}
            />
            <Row label="Touch" value={system.features.touch ? `Yes (${system.features.maxTouchPoints} pts)` : "No"} />
            <Row label="Timezone" value={system.features.timezone} />
            <Row label="Language" value={system.features.languages[0] ?? "—"} />
            <Row label="Status" value={system.features.online ? "● Online" : "○ Offline"} />
          </div>
        </>
      )}
    </section>
  );
}
