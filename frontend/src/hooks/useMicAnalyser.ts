import { useEffect, useRef } from "react";

/**
 * Captures microphone audio and exposes a live volume level (0..1) via a ref.
 * Used to drive the reactive arc-reactor visual while listening.
 */
export function useMicAnalyser(active: boolean) {
  const levelRef = useRef(0);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new AudioCtx();
        ctxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) sum += data[i];
          const avg = sum / data.length / 255; // 0..1
          // Emphasise quiet sounds a little for a livelier visual.
          levelRef.current = Math.min(1, avg * 1.6);
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch {
        levelRef.current = 0;
      }
    }

    function stop() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      analyserRef.current = null;
      ctxRef.current?.close().catch(() => undefined);
      ctxRef.current = null;
      levelRef.current = 0;
    }

    if (active) start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [active]);

  return levelRef;
}
