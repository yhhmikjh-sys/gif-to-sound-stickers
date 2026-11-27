import { createFileRoute, Link } from "@tanstack/react-router";
import { findLanguage } from "@/lib/languages";
import { TopNav } from "@/components/TopNav";
import { SearchBar } from "@/components/SearchBar";
import { GifGrid } from "@/components/GifGrid";

export const Route = createFileRoute("/lang/$lang")({
  validateSearch: (s: Record<string, unknown>) => ({ q: typeof s["q"] === "string" ? s["q"] : "" }),
  head: ({ params }) => {
    const name = findLanguage(params.lang)?.name ?? "All";
    return {
      meta: [
        { title: `${name} GIFs & stickers — StikDesi` },
        { name: "description", content: `Trending ${name} GIFs and memes. Pick one and make a sound sticker.` },
        { property: "og:title", content: `${name} GIFs & stickers — StikDesi` },
        { property: "og:description", content: `Trending ${name} GIFs and memes. Pick one and make a sound sticker.` },
      ],
    };
  },
  component: LangPage,
});

function LangPage() {
  const { lang } = Route.useParams();
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const l = findLanguage(lang);
  return (
    <main className="min-h-screen pb-24">
      <TopNav />
      <div className="mx-auto max-w-5xl px-4">
        <Link to="/" className="mt-6 inline-block text-sm font-semibold text-muted-foreground">← All languages</Link>
        <h1 className="mt-2 text-center font-display text-5xl text-foreground">{l ? `${l.native} · ${l.name}` : "Search"}</h1>
        <SearchBar
          key={lang}
          initial={q}
          placeholder={l ? `Search ${l.name} GIFs...` : "Search anything..."}
          onSearch={(v) => navigate({ search: { q: v } })}
        />
        <GifGrid q={q} lang={l?.query} langSlug={l?.slug} />
      </div>
    </main>
  );
}
