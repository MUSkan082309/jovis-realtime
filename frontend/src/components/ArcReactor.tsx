import { useEffect, useRef } from "react";

export type ReactorMode = "idle" | "listening" | "speaking" | "thinking";

interface Props {
  mode: ReactorMode;
  levelRef: React.RefObject<number>;
  size?: number;
}

const COLORS: Record<ReactorMode, { core: string; ring: string; glow: string }> = {
  idle: { core: "#38e1ff", ring: "#2f7d9e", glow: "rgba(56,225,255,0.35)" },
  listening: { core: "#62ffbd", ring: "#3fae8a", glow: "rgba(98,255,189,0.4)" },
  speaking: { core: "#5aa8ff", ring: "#3f6fae", glow: "rgba(90,168,255,0.4)" },
  thinking: { core: "#ffc266", ring: "#b07d3f", glow: "rgba(255,194,102,0.4)" },
};

export default function ArcReactor({ mode, levelRef, size = 280 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  const rafRef = useRef<number>(0);
  const tRef = useRef(0);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;

    const draw = () => {
      tRef.current += 0.016;
      const t = tRef.current;
      const m = modeRef.current;
      const col = COLORS[m];

      // Determine input level
      let level: number;
      if (m === "listening") {
        // Blend real mic level with a gentle baseline so the reactor stays
        // alive even if audio capture is unavailable/blocked.
        const breath = 0.08 + (Math.sin(t * 4) * 0.5 + 0.5) * 0.12;
        level = Math.max(levelRef.current ?? 0, breath);
      } else if (m === "speaking") {
        level = 0.35 + (Math.sin(t * 9) * 0.5 + 0.5) * 0.5 + Math.sin(t * 23) * 0.08;
      } else {
        level = 0.18 + Math.sin(t * 1.6) * 0.06; // idle breathing
      }
      level = Math.max(0, Math.min(1, level));

      ctx.clearRect(0, 0, size, size);

      // Outer rotating tick ring
      const tickR = size * 0.47;
      const tickCount = 72;
      const rot = t * 0.25;
      for (let i = 0; i < tickCount; i++) {
        const a = (i / tickCount) * Math.PI * 2 + rot;
        const long = i % 6 === 0;
        const len = long ? 11 : 5;
        const x1 = cx + Math.cos(a) * tickR;
        const y1 = cy + Math.sin(a) * tickR;
        const x2 = cx + Math.cos(a) * (tickR - len);
        const y2 = cy + Math.sin(a) * (tickR - len);
        ctx.strokeStyle = long ? col.ring : `${col.ring}88`;
        ctx.lineWidth = long ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Segmented arcs (two counter-rotating layers)
      const drawArcs = (
        radius: number,
        count: number,
        segLen: number,
        speed: number,
        width: number,
        alpha: number
      ) => {
        const offset = t * speed;
        for (let i = 0; i < count; i++) {
          const start = (i / count) * Math.PI * 2 + offset;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, start, start + segLen);
          ctx.strokeStyle = `${col.core}${Math.round(alpha * 255)
            .toString(16)
            .padStart(2, "0")}`;
          ctx.lineWidth = width;
          ctx.lineCap = "round";
          ctx.stroke();
        }
      };

      drawArcs(size * 0.4, 4, 0.7, 0.5, 3, 0.5 + level * 0.4);
      drawArcs(size * 0.34, 6, 0.4, -0.8, 2, 0.35 + level * 0.3);

      // Static concentric guide rings
      ctx.strokeStyle = `${col.ring}55`;
      ctx.lineWidth = 1;
      [0.44, 0.27].forEach((r) => {
        ctx.beginPath();
        ctx.arc(cx, cy, size * r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Core glow
      const coreBase = size * 0.16;
      const coreR = coreBase + level * size * 0.07;
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR * 1.8);
      grad.addColorStop(0, "#ffffff");
      grad.addColorStop(0.25, col.core);
      grad.addColorStop(0.7, col.glow);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR * 1.8, 0, Math.PI * 2);
      ctx.fill();

      // Inner triangle motif (Jarvis style)
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(t * 0.4);
      ctx.strokeStyle = "#ffffffcc";
      ctx.lineWidth = 2;
      ctx.beginPath();
      const tri = coreBase * 0.62;
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(a) * tri;
        const y = Math.sin(a) * tri;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // Bright center
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = col.core;
      ctx.shadowBlur = 18 + level * 30;
      ctx.beginPath();
      ctx.arc(cx, cy, 4 + level * 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [size, levelRef]);

  return (
    <canvas
      ref={canvasRef}
      className="select-none"
      style={{ filter: "drop-shadow(0 0 22px rgba(56,225,255,0.35))" }}
    />
  );
}
