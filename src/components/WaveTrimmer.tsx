import { useEffect, useRef, useState } from "react";

const BARS = 80;

// Voice-note style waveform. Drag the edges to resize the cut (up to lockLen, WhatsApp's 6s GIF limit)
// or drag the middle to slide it.
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
  const MIN = 0.5;
  const maxLen = ready ? Math.min(lockLen, duration) : 0;
  const s0 = ready ? Math.min(Math.max(0, start), Math.max(0, duration - MIN)) : 0;
  const e0 = ready ? Math.min(duration, Math.max(s0 + MIN, Math.min(end, s0 + maxLen))) : 0;
  const win = e0 - s0;

  const timeAt = (x: number) => {
    const r = box.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (x - r.left) / r.width)) * duration;
  };

  // Left/right handles change the length (max lockLen); grabbing the middle slides the whole cut.
  const mode = useRef<"l" | "r" | "m">("m");
  const move = (x: number) => {
    const t = timeAt(x);
    const { start: cs, end: ce } = cur.current;
    if (mode.current === "l") onChange(Math.min(Math.max(0, t, ce - lockLen), ce - MIN), ce);
    else if (mode.current === "r") onChange(cs, Math.max(Math.min(duration, t, cs + lockLen), cs + MIN));
    else {
      const len = ce - cs;
      const ns = Math.min(Math.max(0, t - (grab.current ?? 0)), Math.max(0, duration - len));
      onChange(ns, ns + len);
    }
  };

  const down = (ev: React.PointerEvent) => {
    if (!ready) return;
    ev.preventDefault();
    audio.current?.pause(); setPos(null);
    const t = timeAt(ev.clientX);
    const tol = duration * 0.04;
    mode.current = Math.abs(t - s0) < tol ? "l" : Math.abs(t - e0) < tol ? "r" : t < s0 ? "l" : t > e0 ? "r" : "m";
    grab.current = t - s0;
    cur.current = { start: s0, end: e0 };
    if (mode.current !== "m") move(ev.clientX);
    const mv = (e: PointerEvent) => move(e.clientX);
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
          {win.toFixed(1)}s
        </span>
        {([s0, e0] as const).map((t, i) => (
          <span key={i} aria-hidden className="pointer-events-none absolute inset-y-0 w-4 -translate-x-1/2 rounded-md bg-primary shadow-pop after:absolute after:inset-y-8 after:left-1/2 after:w-0.5 after:-translate-x-1/2 after:bg-primary-foreground" style={{ left: pct(t) }} />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{s0.toFixed(1)}s → {e0.toFixed(1)}s · max {maxLen.toFixed(1)}s</span>
        <button type="button" onClick={play} className="rounded-full bg-foreground px-4 py-1.5 font-semibold text-background">▶ Play cut</button>
      </div>
    </div>
  );
}
