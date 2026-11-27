import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
  const [q, setQ] = useState("");
  const search = useMutation({ mutationFn: (q: string) => searchStickers({ data: { q } }) });

  return (
    <main className="min-h-screen px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-center font-display text-5xl text-foreground">Sticker Search</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (q.trim()) search.mutate(q);
          }}
          className="mx-auto mt-8 flex max-w-xl gap-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="cat, love, anime..."
            className="flex-1 rounded-full border-2 border-foreground bg-card px-5 py-3 text-foreground outline-none focus:ring-4 focus:ring-primary/40"
          />
          <button
            disabled={search.isPending}
            className="rounded-full border-2 border-foreground bg-primary px-6 py-3 font-semibold text-primary-foreground shadow-pop transition active:translate-y-0.5 disabled:opacity-60"
          >
            {search.isPending ? "..." : "Search"}
          </button>
        </form>

        {search.isError && (
          <p className="mt-8 text-center text-destructive">Search failed, try again.</p>
        )}
        {search.data && search.data.length === 0 && (
          <p className="mt-8 text-center text-muted-foreground">No stickers found.</p>
        )}
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {search.data?.map((s) => (
            <StickerCard key={s.id} s={s} />
          ))}
        </div>
      </div>
    </main>
  );
}

function StickerCard({ s }: { s: Sticker }) {
  const make = useMutation({
    mutationFn: () => makeWhatsAppSticker({ data: { imageUrl: s.image } }),
    onSuccess: (dataUrl) => {
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `sticker-${s.id.slice(0, 8)}.webp`;
      a.click();
    },
  });
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-foreground bg-card shadow-pop">
      <img src={s.image} alt={s.title} loading="lazy" className="aspect-square w-full object-cover" />
      <button
        onClick={() => make.mutate()}
        disabled={make.isPending}
        className="w-full border-t-2 border-foreground bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {make.isPending ? "Making..." : make.isError ? "Failed, retry" : "WhatsApp sticker ⬇"}
      </button>
    </div>
  );
}
