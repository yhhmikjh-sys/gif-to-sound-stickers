import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { searchSounds, type Sound } from "@/lib/sounds.functions";

export const soundUrl = (path: string) => `/api/sound?path=${encodeURIComponent(path)}`;

// Full-screen sound pack picker: search + infinite scroll + preview + select.
export function SoundPicker({ initialQuery, onClose, onSelect }: { initialQuery: string; onClose: () => void; onSelect: (s: Sound) => void }) {
  const [input, setInput] = useState(initialQuery);
  const [q, setQ] = useState(initialQuery);
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);

  const query = useInfiniteQuery({
    queryKey: ["sounds", q],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => searchSounds({ data: { q, page: pageParam } }),
    getNextPageParam: (l) => l.nextPage ?? undefined,
  });
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => {
      if (e[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    }, { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  useEffect(() => () => audio.current?.pause(), []);

  // Search as you type (debounced).
  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 400);
    return () => clearTimeout(t);
  }, [input]);

  const toggle = (s: Sound) => {
    audio.current?.pause();
    if (playing === s.id) return setPlaying(null);
    audio.current = new Audio(soundUrl(s.path));
    audio.current.onended = () => setPlaying(null);
    void audio.current.play();
    setPlaying(s.id);
  };

  const seen = new Set<string>();
  const items = (query.data?.pages.flatMap((p) => p.items) ?? []).filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)));

  return (
    <div className="fixed inset-0 z-30 overflow-y-auto bg-background">
      <div className="mx-auto max-w-2xl px-4 pb-16">
        <div className="sticky top-0 z-10 bg-background pb-3 pt-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-3xl text-foreground">Sound packages</h2>
            <button onClick={onClose} className="rounded-full border-2 border-foreground px-4 py-1.5 text-sm font-semibold text-foreground">Close</button>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); setQ(input.trim()); }} className="mt-4 flex gap-2">
            <input autoFocus value={input} onChange={(e) => setInput(e.target.value)} placeholder="Search sounds... CID, bruh, moye moye"
              className="flex-1 rounded-full border-2 border-foreground bg-card px-5 py-3 text-foreground outline-none focus:ring-4 focus:ring-primary/40" />
            <button className="rounded-full border-2 border-foreground bg-primary px-5 py-3 font-semibold text-primary-foreground">Search</button>
          </form>
          {!q && <p className="mt-2 text-xs text-muted-foreground">Trending in India</p>}
        </div>

        {query.isError && <p className="mt-6 text-center text-destructive">Couldn't load sounds, try again.</p>}
        {query.isSuccess && items.length === 0 && <p className="mt-6 text-center text-muted-foreground">No sounds found.</p>}
        <ul className="space-y-2">
          {items.map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-2xl border-2 border-foreground bg-card p-2 shadow-pop">
              <button onClick={() => toggle(s)} aria-label={playing === s.id ? "Stop" : "Play"}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-lg text-primary-foreground">
                {playing === s.id ? "■" : "▶"}
              </button>
              <button onClick={() => toggle(s)} className="min-w-0 flex-1 truncate text-left font-semibold text-foreground">{s.title}</button>
              <button onClick={() => { audio.current?.pause(); onSelect(s); }}
                className="rounded-full border-2 border-foreground bg-foreground px-4 py-1.5 text-sm font-semibold text-background">Select</button>
            </li>
          ))}
        </ul>
        <div ref={sentinel} className="py-6 text-center text-muted-foreground">{(query.isFetching || isFetchingNextPage) && "Loading..."}</div>
      </div>
    </div>
  );
}
