import { useEffect, useRef, useState } from "react";

const BARS = 80;

// Voice-note style waveform. The cut is a fixed-length window (WhatsApp's 6s GIF limit):
// you slide it anywhere along the sound to pick *which* part plays, not how long it is.
export function WaveTrimmer({ src, duration, start, end, onChange, onDuration, onPlay, lockLen = 6 }: {
  lockLen?: number;
  src: string; duration: number; start: number; end: number;
  onChange: (start: number, end: number) => void;
  onDuration: (d: number) => void;
  onPlay?: () => void;
}) {
  const [peaks, setPeaks] = useState<number[]>([]);
  const [pos, setPos] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const grab = useRef<number | null>(null);
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

  const ready = duration > 0 && Number.isFinite(duration);
  const win = ready ? Math.min(lockLen, duration) : 0;
  const s0 = ready ? Math.min(Math.max(0, start), Math.max(0, duration - win)) : 0;
  const e0 = s0 + win;

  const timeAt = (x: number) => {
    const r = box.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (x - r.left) / r.width)) * duration;
  };

  // Slide the whole locked window so the grabbed point stays under the finger.
  const slide = (x: number) => {
    const off = grab.current ?? 0;
    const ns = Math.min(Math.max(0, timeAt(x) - off), Math.max(0, duration - win));
    onChange(ns, ns + win);
  };

  const down = (ev: React.PointerEvent) => {
    if (!ready) return;
    ev.preventDefault();
    audio.current?.pause(); setPos(null);
    grab.current = timeAt(ev.clientX) - s0;
    const mv = (e: PointerEvent) => slide(e.clientX);
    const up = () => {
      grab.current = null;
      window.removeEventListener("pointermove", mv);
      window.removeEventListener("pointerup", up);
      play();
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", up);
  };

  const nudge = (d: number) => {
    const ns = Math.min(Math.max(0, s0 + d), Math.max(0, duration - win));
    onChange(ns, ns + win);
  };

  if (!ready) return <div className="h-24 animate-pulse rounded-xl bg-muted" />;
  const pct = (t: number) => `${(t / duration) * 100}%`;

  return (
    <div className="select-none">
      <div
        ref={box}
        tabIndex={0}
        role="slider"
        aria-label="Which part of the sound plays"
        aria-valuemin={0}
        aria-valuemax={Math.max(0, duration - win)}
        aria-valuenow={Number(s0.toFixed(1))}
        onPointerDown={down}
        onKeyDown={(e) => {
          const d = e.key === "ArrowLeft" ? -0.1 : e.key === "ArrowRight" ? 0.1 : 0;
          if (!d) return;
          e.preventDefault();
          nudge(d);
        }}
        onKeyUp={(e) => (e.key === "ArrowLeft" || e.key === "ArrowRight") && play()}
        className="relative h-24 cursor-grab touch-none rounded-xl bg-muted px-1 outline-none focus:ring-4 focus:ring-primary/40 active:cursor-grabbing"
        data-testid="wave"
      >
        <div className="flex h-full items-center gap-[2px]">
          {(peaks.length ? peaks : Array.from({ length: BARS }, () => 0.15)).map((p, i) => {
            const t = ((i + 0.5) / BARS) * duration;
            const inside = t >= s0 && t <= e0;
            const played = pos !== null && t <= pos && inside;
            return <span key={i} className={`flex-1 rounded-full ${played ? "bg-foreground" : inside ? "bg-primary" : "bg-foreground/20"}`} style={{ height: `${Math.max(6, p * 90)}%` }} />;
          })}
        </div>
        <div className="pointer-events-none absolute inset-y-0 rounded-lg border-y-4 border-primary" style={{ left: pct(s0), right: `calc(100% - ${pct(e0)})` }} />
        <span className="pointer-events-none absolute top-1 -translate-x-1/2 rounded-full bg-foreground px-2 py-0.5 text-[11px] font-bold text-background" style={{ left: pct((s0 + e0) / 2) }}>
          🔒 {win.toFixed(1)}s
        </span>
        {([s0, e0] as const).map((t, i) => (
          <span key={i} aria-hidden className="pointer-events-none absolute inset-y-0 w-4 -translate-x-1/2 rounded-md bg-primary shadow-pop after:absolute after:inset-y-8 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:bg-primary-foreground" style={{ left: pct(t) }} />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{s0.toFixed(1)}s → {e0.toFixed(1)}s · locked {win.toFixed(1)}s</span>
        <button type="button" onClick={play} className="rounded-full bg-foreground px-4 py-1.5 font-semibold text-background">▶ Play cut</button>
      </div>
    </div>
  );
}
