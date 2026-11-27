import { useEffect, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { searchStickers, type Sticker } from "@/lib/stickers.functions";

// Infinite-scroll GIPHY grid. Pick one item, then "Next" opens the create page.
export function GifGrid({ q, lang, langSlug }: { q: string; lang?: string | undefined; langSlug?: string | undefined }) {
  const [kind, setKind] = useState<"gifs" | "stickers">("gifs");
  const [picked, setPicked] = useState<Sticker | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const query = useInfiniteQuery({
    queryKey: ["giphy", kind, q, lang ?? ""],
    enabled: !!(q || lang),
    initialPageParam: 0,
    queryFn: ({ pageParam }) => searchStickers({ data: { q, lang, kind, offset: pageParam } }),
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
    <div>
      <div className="mx-auto mt-4 flex max-w-xs overflow-hidden rounded-full border-2 border-foreground">
        {(["gifs", "stickers"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`flex-1 py-2 text-sm font-semibold ${kind === k ? "bg-foreground text-background" : "bg-card text-foreground"}`}
          >
            {k === "gifs" ? "GIF" : "Sticker"}
          </button>
        ))}
      </div>

      {query.isError && <p className="mt-8 text-center text-destructive">Search failed, try again.</p>}
      {query.isSuccess && items.length === 0 && (
        <p className="mt-8 text-center text-muted-foreground">Nothing found.</p>
      )}

      <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {items.map((s) => {
          const on = picked?.id === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setPicked(on ? null : s)}
              className={`relative overflow-hidden rounded-2xl border-2 bg-card shadow-pop transition ${on ? "border-primary ring-4 ring-primary" : "border-foreground"}`}
            >
              <img src={s.image} alt={s.title} loading="lazy" className="aspect-square w-full object-cover" />
              {on && (
                <span className="absolute right-1 top-1 rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div ref={sentinel} className="py-8 text-center text-muted-foreground">
        {(query.isFetching || isFetchingNextPage) && "Loading..."}
        {query.isSuccess && !hasNextPage && items.length > 0 && "That's all!"}
      </div>

      {picked && (
        <div className="fixed inset-x-0 bottom-4 z-20 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-full border-2 border-foreground bg-card p-2 pr-3 shadow-pop">
            <img src={picked.image} alt="" className="h-12 w-12 rounded-full object-cover" />
            <span className="max-w-40 truncate text-sm text-foreground">{picked.title || "Selected"}</span>
            <button
              type="button"
              onClick={() =>
                navigate({
                  to: "/create",
                  search: { gif: picked.original, preview: picked.image, title: picked.title, lang: langSlug ?? "" },
                })
              }
              className="rounded-full border-2 border-foreground bg-primary px-5 py-2 font-semibold text-primary-foreground"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
