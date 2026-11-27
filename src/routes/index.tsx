import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { searchStickers, makeWhatsAppSticker, type Sticker } from "@/lib/stickers.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sticker Search" },
      { name: "description", content: "Search and find stickers instantly." },
      { property: "og:title", content: "Sticker Search" },
      { property: "og:description", content: "Search and find stickers instantly." },
    ],
  }),
  component: Index,
});

function Index() {
  const [input, setInput] = useState("");
  const [q, setQ] = useState("");
  const sentinel = useRef<HTMLDivElement>(null);

  const query = useInfiniteQuery({
    queryKey: ["stickers", q],
    enabled: !!q,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => searchStickers({ data: { q, offset: pageParam } }),
    getNextPageParam: (last) => last.nextOffset ?? undefined,
  });
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (e) => {
        if (e[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: "600px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const seen = new Set<string>();
  const items = (query.data?.pages.flatMap((p) => p.items) ?? []).filter((s) =>
    seen.has(s.id) ? false : (seen.add(s.id), true),
  );

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-center font-display text-5xl text-foreground">Sticker Search</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setQ(input.trim());
          }}
          className="sticky top-3 z-10 mx-auto mt-8 flex max-w-xl gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="cat, love, anime..."
            className="flex-1 rounded-full border-2 border-foreground bg-card px-5 py-3 text-foreground outline-none focus:ring-4 focus:ring-primary/40"
          />
          <button className="rounded-full border-2 border-foreground bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-pop transition active:translate-y-0.5">
            Search
          </button>
        </form>

        {query.isError && <p className="mt-8 text-center text-destructive">Search failed, try again.</p>}
        {query.isSuccess && items.length === 0 && (
          <p className="mt-8 text-center text-muted-foreground">No stickers found.</p>
        )}
        <div className="mt-10 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {items.map((s) => (
            <StickerCard key={s.id} s={s} />
          ))}
        </div>
        <div ref={sentinel} className="py-8 text-center text-muted-foreground">
          {(query.isFetching || isFetchingNextPage) && "Loading..."}
          {query.isSuccess && !hasNextPage && items.length > 0 && "That's all!"}
        </div>
      </div>
    </main>
  );
}

function StickerCard({ s }: { s: Sticker }) {
  const make = useMutation({
    mutationFn: () => makeWhatsAppSticker({ data: { imageUrl: s.original } }),
    onSuccess: (dataUrl) => {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `sticker-${s.id}.webp`;
      a.click();
    },
  });
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-foreground bg-card shadow-pop">
      <img src={s.image} alt={s.title} loading="lazy" className="aspect-square w-full object-contain p-1" />
      <button
        onClick={() => make.mutate()}
        disabled={make.isPending}
        className="w-full border-t-2 border-foreground bg-primary py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
      >
        {make.isPending ? "Making..." : make.isError ? "Failed, retry" : "WhatsApp ⬇"}
      </button>
    </div>
  );
}
