import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LANGUAGES } from "@/lib/languages";
import { TopNav } from "@/components/TopNav";
import { SearchBar } from "@/components/SearchBar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StikDesi — Indian GIFs & sound stickers" },
      { name: "description", content: "Pick an Indian language, find GIFs and make WhatsApp sound stickers." },
      { property: "og:title", content: "StikDesi — Indian GIFs & sound stickers" },
      { property: "og:description", content: "Pick an Indian language, find GIFs and make WhatsApp sound stickers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen pb-16">
      <TopNav />
      <div className="mx-auto max-w-5xl px-4">
        <h1 className="mt-10 text-center font-display text-5xl text-foreground">Desi GIFs & Stickers</h1>
        <p className="mt-2 text-center text-muted-foreground">Pick a language, choose a GIF, add a sound.</p>
        <SearchBar placeholder="Search anything... CID, cat, Salman" onSearch={(q) => q && navigate({ to: "/lang/$lang", params: { lang: "all" }, search: { q } })} />

        <h2 className="mt-12 text-xl font-bold text-foreground">Languages</h2>
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {LANGUAGES.map((l, i) => (
            <Link
              key={l.slug}
              to="/lang/$lang"
              params={{ lang: l.slug }}
              search={{ q: "" }}
              className={`flex h-32 flex-col justify-between rounded-3xl border-2 border-foreground p-4 shadow-pop transition hover:-rotate-1 ${i % 3 === 0 ? "bg-primary text-primary-foreground" : i % 3 === 1 ? "bg-card text-foreground" : "bg-accent-warm text-foreground"}`}
            >
              <span className="font-display text-3xl">{l.native}</span>
              <span className="font-semibold">{l.name}</span>
            </Link>
          ))}
        </div>

        <Link to="/explore" search={{ q: "" }} className="mt-10 block rounded-3xl border-2 border-foreground bg-foreground p-6 text-background shadow-pop">
          <span className="font-display text-2xl">Public stickers →</span>
          <p className="mt-1 text-sm opacity-80">Sound stickers made by everyone. Search by title.</p>
        </Link>
      </div>
    </main>
  );
}
