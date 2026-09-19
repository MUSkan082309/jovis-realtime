import { useEffect, useRef, useState } from "react";
import type { SystemInfo } from "@/types";

interface Props {
  progress: number;
  system: SystemInfo | null;
  onDone: () => void;
}

const BOOT_LINES = [
  "Establishing secure neural link...",
  "Calibrating voice synthesis matrix...",
  "Probing CPU topology...",
  "Reading memory banks...",
  "Querying graphics pipeline (WebGL)...",
  "Mapping display matrix...",
  "Probing network interface...",
  "Initialising speech recognition core...",
  "Synchronising ambient sensors...",
];

export default function BootSequence({ progress, system, onDone }: Props) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [fading, setFading] = useState(false);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  // Reveal boot lines progressively with progress.
  useEffect(() => {
    const count = Math.min(BOOT_LINES.length, Math.ceil((progress / 100) * BOOT_LINES.length));
    setVisibleLines(count);
  }, [progress]);

  // Trigger the fade-out + completion exactly once when progress is full.
  // Depends ONLY on progress so re-renders (e.g. clock ticks) can't cancel it.
  useEffect(() => {
    if (progress < 100 || doneRef.current) return;
    doneRef.current = true;
    const id = window.setTimeout(() => setFading(true), 700);
    const id2 = window.setTimeout(() => onDoneRef.current(), 1300);
    return () => {
      window.clearTimeout(id);
      window.clearTimeout(id2);
    };
  }, [progress]);

  const specLines = system
    ? [
        `OS ......... ${system.platform}`,
        `CPU ........ ${system.cpuCores} logical cores`,
        system.deviceMemory ? `MEM ........ ${system.deviceMemory} GB` : null,
        `GPU ........ ${system.gpu.renderer}`,
        `DISPLAY .... ${system.screen.width}×${system.screen.height}`,
        `INDEX ...... ${system.jarvisIndex}`,
      ].filter(Boolean) as string[]
    : [];

  const handleSkip = () => {
    doneRef.current = true;
    onDoneRef.current();
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
        handleSkip();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[#02040a] transition-opacity duration-500 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <button
        onClick={handleSkip}
        className="absolute top-4 right-6 z-50 px-3 py-1 rounded border border-cyan-400/30 bg-cyan-950/60 text-[11px] font-mono tracking-widest text-cyan-300 hover:bg-cyan-400/20 transition cursor-pointer"
      >
        SKIP BOOT [ESC] ↵
      </button>
      <div className="hud-grid scanlines absolute inset-0 opacity-60" />
      <div className="relative w-[min(92vw,560px)] px-6">
        {/* Rotating emblem */}
        <div className="mb-8 flex justify-center">
          <div className="relative h-28 w-28">
            <div className="absolute inset-0 animate-spin-slow rounded-full border-2 border-cyan-400/30 border-t-cyan-300" />
            <div className="absolute inset-3 animate-spin-reverse rounded-full border border-cyan-400/20 border-b-cyan-300/70" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-7 w-7 animate-pulse-glow rounded-full bg-cyan-300 shadow-[0_0_28px_8px_rgba(56,225,255,0.6)]" />
            </div>
          </div>
        </div>

        <h1 className="font-display text-center text-2xl font-black tracking-[0.3em] text-cyan-200 text-glow sm:text-3xl">
          J.A.R.V.I.S.
        </h1>
        <p className="mb-6 text-center text-[10px] uppercase tracking-[0.35em] text-cyan-400/60">
          Just A Rather Very Intelligent System
        </p>

        {/* Progress */}
        <div className="mb-2 flex items-center justify-between text-xs text-cyan-300/70">
          <span>SYSTEM ANALYSIS</span>
          <span className="font-display text-glow">{Math.round(progress)}%</span>
        </div>
        <div className="relative h-2 w-full overflow-hidden rounded-full border border-cyan-400/20 bg-cyan-400/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-300 transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
          <div className="absolute inset-y-0 left-0 w-16 animate-sweep bg-gradient-to-r from-transparent via-white/40 to-transparent" />
        </div>

        {/* Terminal lines */}
        <div className="mt-6 h-40 overflow-hidden font-mono text-xs leading-relaxed text-cyan-200/80">
          {BOOT_LINES.slice(0, visibleLines).map((l) => (
            <div key={l} className="animate-float-up">
              <span className="text-emerald-400">» </span>
              {l}
              <span className="ml-1 text-emerald-400">OK</span>
            </div>
          ))}
          {progress >= 100 &&
            specLines.map((l) => (
              <div key={l} className="animate-float-up text-cyan-100/90">
                <span className="text-cyan-400">▸ </span>
                {l}
              </div>
            ))}
          {progress >= 100 && (
            <div className="mt-2 animate-float-up text-emerald-300">
              <span className="text-emerald-400">» </span>J.A.R.V.I.S. ONLINE. WELCOME BACK, SIR.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
