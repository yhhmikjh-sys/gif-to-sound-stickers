import { createFileRoute } from "@tanstack/react-router";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { TopNav } from "@/components/TopNav";
import { SearchBar } from "@/components/SearchBar";
import { listPublicStickers } from "@/lib/public-stickers.functions";
import { SoundGif } from "@/components/SoundGif";
import { sendToWhatsApp, WEB_HINT } from "@/lib/send-to-whatsapp";

// Signed URLs are cross-origin, so fetch to a blob to keep the file name.
async function saveGif(url: string, title: string) {
  const blob = await (await fetch(url)).blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${title || "sticker"}.${blob.type.includes("webm") ? "webm" : "mp4"}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
}

export const Route = createFileRoute("/explore")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s["q"] === "string" ? s["q"] : "" }),
  head: () => ({
    meta: [
      { title: "Public sound stickers — StikDesi" },
      { name: "description", content: "Search sound stickers made and shared by everyone." },
      { property: "og:title", content: "Public sound stickers — StikDesi" },
      { property: "og:description", content: "Search sound stickers made and shared by everyone." },
    ],
  }),
  component: Explore,
});

function Explore() {
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const sentinel = useRef<HTMLDivElement>(null);
  const query = useInfiniteQuery({
    queryKey: ["public", q],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => listPublicStickers({ data: { q, offset: pageParam } }),
    getNextPageParam: (l) => l.nextOffset ?? undefined,
  });
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => {
      if (e[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) void fetchNextPage();
    }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <main className="min-h-screen pb-16">
      <TopNav />
      <div className="mx-auto max-w-5xl px-4">
        <h1 className="mt-10 text-center font-display text-5xl text-foreground">Public stickers</h1>
        <SearchBar key={q} initial={q} placeholder="Search by title..." onSearch={(v) => navigate({ search: { q: v } })} />
        {query.isSuccess && items.length === 0 && <p className="mt-10 text-center text-muted-foreground">No stickers yet{q && ` for "${q}"`}.</p>}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {items.map((s) => (
            <div key={s.id} className="overflow-hidden rounded-2xl border-2 border-foreground bg-card shadow-pop">
              {s.video_url ? (
                <SoundGif url={s.video_url} poster={s.gif_url} startMuted />
              ) : (
                <img src={s.gif_url} alt={s.title} loading="lazy" className="aspect-square w-full object-contain" />
              )}
              <div className="p-2">
                <p className="truncate text-sm font-semibold text-foreground">{s.title}</p>
                <p className="text-xs capitalize text-muted-foreground">{s.language}</p>
                {s.video_url && (
                  <button type="button" onClick={() => void saveGif(s.video_url!, s.title)}
                    className="mt-2 w-full rounded-full border-2 border-foreground bg-primary py-1 text-xs font-semibold text-primary-foreground">
                    ⬇ GIF with sound
                  </button>
                )}
                {s.video_url && (
                  <button type="button" onClick={() => void sendToWhatsApp(s.video_url!, s.title).then((r) => r === "web" && alert(WEB_HINT)).catch(() => {})}
                    className="mt-1 w-full rounded-full border-2 border-foreground bg-[#25D366] py-1 text-xs font-semibold text-white">
                    📤 Send on WhatsApp
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div ref={sentinel} className="py-8 text-center text-muted-foreground">{(query.isFetching || isFetchingNextPage) && "Loading..."}</div>
      </div>
    </main>
  );
}
