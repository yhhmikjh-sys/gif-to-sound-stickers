import { useEffect, useRef, useState } from "react";

const BARS = 80;

// Voice-note style bars with left/right handles. Releasing a handle plays the cut.
export function WaveTrimmer({ src, duration, start, end, onChange, onDuration, onPlay, maxLen = 6 }: {
  maxLen?: number;
  src: string; duration: number; start: number; end: number;
  onChange: (start: number, end: number) => void;
  onDuration: (d: number) => void;
  onPlay?: () => void;
}) {
  const [peaks, setPeaks] = useState<number[]>([]);
  const [pos, setPos] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const drag = useRef<"l" | "r" | null>(null);
  const cur = useRef({ start, end });
  cur.current = { start, end };

  useEffect(() => {
    let off = false;
    (async () => {
      const buf = await (await fetch(src)).arrayBuffer();
      const ac = new AudioContext();
      const decoded = await ac.decodeAudioData(buf);
      if (!off) onDuration(decoded.duration);
      const data = decoded.getChannelData(0);
      void ac.close();
      const step = Math.floor(data.length / BARS) || 1;
      const out: number[] = [];
      for (let i = 0; i < BARS; i++) {
        let m = 0;
        for (let j = i * step; j < (i + 1) * step && j < data.length; j += 16) m = Math.max(m, Math.abs(data[j] ?? 0));
        out.push(m);
      }
      const max = Math.max(...out, 0.01);
      if (!off) setPeaks(out.map((v) => v / max));
    })().catch(() => setPeaks(Array.from({ length: BARS }, () => 0.5)));
    return () => { off = true; audio.current?.pause(); };
  }, [src]);

  const play = () => {
    audio.current?.pause();
    const a = new Audio(src);
    audio.current = a;
    const { start: s, end: e } = cur.current;
    a.currentTime = s;
    const tick = () => {
      if (audio.current !== a) return;
      if (a.currentTime >= e || a.ended) { a.pause(); setPos(null); return; }
      setPos(a.currentTime);
      requestAnimationFrame(tick);
    };
    void a.play().then(() => { onPlay?.(); requestAnimationFrame(tick); });
  };

  const timeAt = (x: number) => {
    const r = box.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (x - r.left) / r.width)) * duration;
  };
  const move = (x: number) => {
    const t = timeAt(x);
    const { start: s, end: e } = cur.current;
    if (drag.current === "l") { const ns = Math.min(t, e - 0.5); onChange(Math.max(0, ns, e - maxLen), e); }
    if (drag.current === "r") { const ne = Math.max(t, s + 0.5); onChange(s, Math.min(duration, ne, s + maxLen)); }
  };
  const down = (side: "l" | "r") => (ev: React.PointerEvent) => {
    ev.preventDefault();
    drag.current = side;
    audio.current?.pause(); setPos(null);
    const mv = (e: PointerEvent) => move(e.clientX);
    const up = () => { drag.current = null; window.removeEventListener("pointermove", mv); window.removeEventListener("pointerup", up); play(); };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };

  if (!(duration > 0 && Number.isFinite(duration))) return <div className="h-24 animate-pulse rounded-xl bg-muted" />;
  const pct = (t: number) => `${(t / duration) * 100}%`;
  return (
    <div className="select-none">
      <div ref={box} className="relative h-24 touch-none rounded-xl bg-muted px-1" data-testid="wave">
        <div className="flex h-full items-center gap-[2px]">
          {(peaks.length ? peaks : Array.from({ length: BARS }, () => 0.15)).map((p, i) => {
            const t = ((i + 0.5) / BARS) * duration;
            const inside = t >= start && t <= end;
            const played = pos !== null && t <= pos && inside;
            return <span key={i} className={`flex-1 rounded-full ${played ? "bg-foreground" : inside ? "bg-primary" : "bg-foreground/20"}`} style={{ height: `${Math.max(6, p * 90)}%` }} />;
          })}
        </div>
        <div className="pointer-events-none absolute inset-y-0 rounded-lg border-y-4 border-primary" style={{ left: pct(start), right: `calc(100% - ${pct(end)})` }} />
        {(["l", "r"] as const).map((side) => (
          <button key={side} type="button" aria-label={side === "l" ? "Left handle" : "Right handle"} onPointerDown={down(side)}
            onKeyDown={(e) => {
              const d = e.key === "ArrowLeft" ? -0.1 : e.key === "ArrowRight" ? 0.1 : 0;
              if (!d) return;
              e.preventDefault();
              if (side === "l") onChange(Math.min(Math.max(0, start + d, end - maxLen), end - 0.5), end);
              else onChange(start, Math.max(Math.min(duration, end + d, start + maxLen), start + 0.5));
            }}
            onKeyUp={(e) => (e.key === "ArrowLeft" || e.key === "ArrowRight") && play()}
            className="absolute inset-y-0 w-4 -translate-x-1/2 cursor-ew-resize rounded-md bg-primary shadow-pop after:absolute after:inset-y-8 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:bg-primary-foreground"
            style={{ left: pct(side === "l" ? start : end) }} />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{start.toFixed(1)}s → {end.toFixed(1)}s ({(end - start).toFixed(1)}s)</span>
        <button type="button" onClick={play} className="rounded-full bg-foreground px-4 py-1.5 font-semibold text-background">▶ Play cut</button>
      </div>
    </div>
  );
}
