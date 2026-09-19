import { useEffect, useRef, useState } from "react";
import type { PerfSnapshot } from "@/types";

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

const HISTORY = 80;

export function usePerformance() {
  const [snapshot, setSnapshot] = useState<PerfSnapshot>({
    fps: 60,
    msPerFrame: 16.7,
    memoryUsedMB: 0,
    memoryTotalMB: 0,
    jsHeapLimitMB: 0,
    memorySupported: false,
  });
  const [history, setHistory] = useState<number[]>([]);

  const fpsRef = useRef(60);
  const msRef = useRef(16.7);
  const framesRef = useRef(0);
  const lastSampleRef = useRef(performance.now());
  const lastFrameRef = useRef(performance.now());
  const histRef = useRef<number[]>([]);

  useEffect(() => {
    let raf = 0;

    const tick = () => {
      const now = performance.now();
      const delta = now - lastFrameRef.current;
      lastFrameRef.current = now;
      framesRef.current += 1;
      // Exponential smoothing of instantaneous frame time.
      msRef.current = msRef.current * 0.9 + Math.min(delta, 200) * 0.1;

      const mem = (performance as unknown as { memory?: MemoryInfo }).memory;

      if (now - lastSampleRef.current >= 200) {
        const elapsed = (now - lastSampleRef.current) / 1000;
        const fps = framesRef.current / elapsed;
        fpsRef.current = fpsRef.current * 0.4 + fps * 0.6;
        framesRef.current = 0;
        lastSampleRef.current = now;

        const hist = histRef.current;
        hist.push(Math.round(fpsRef.current));
        if (hist.length > HISTORY) hist.shift();

        setSnapshot({
          fps: fpsRef.current,
          msPerFrame: msRef.current,
          memoryUsedMB: mem ? mem.usedJSHeapSize / 1048576 : 0,
          memoryTotalMB: mem ? mem.totalJSHeapSize / 1048576 : 0,
          jsHeapLimitMB: mem ? mem.jsHeapSizeLimit / 1048576 : 0,
          memorySupported: !!mem,
        });
        setHistory([...hist]);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return { snapshot, history };
}
