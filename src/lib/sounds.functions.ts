import { createServerFn } from "@tanstack/react-start";

export type Sound = { id: string; title: string; path: string };
export type SoundPage = { items: Sound[]; nextPage: number | null };

const BASE = "https://www.myinstants.com";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();

// Search MyInstants sound packs. Empty query = trending sounds in India.
export const searchSounds = createServerFn({ method: "GET" })
  .inputValidator((d: { q?: string; page?: number }) => ({
    q: String(d?.q ?? "").trim().slice(0, 80),
    page: Math.max(1, Math.min(200, Number(d?.page) || 1)),
  }))
  .handler(async ({ data }): Promise<SoundPage> => {
    const url = data.q
      ? `${BASE}/en/search/?name=${encodeURIComponent(data.q)}&page=${data.page}`
      : `${BASE}/en/index/in/?page=${data.page}`;
    const res = await fetch(url, { headers: { "User-Agent": UA, Referer: `${BASE}/en/index/in/` } });
    if (res.status === 404) return { items: [], nextPage: null };
    if (!res.ok) throw new Error("Sound search failed");
    const html = await res.text();
    const re = /play\('(\/media\/sounds\/[^']+)'[^)]*\)[\s\S]*?<a href="\/en\/instant\/([^"/]+)\/" class="instant-link[^"]*">([^<]*)<\/a>/g;
    const items: Sound[] = [];
    for (const m of html.matchAll(re)) {
      items.push({ path: m[1] ?? "", id: m[2] ?? "", title: decode(m[3] ?? "") });
    }
    return { items, nextPage: items.length > 0 ? data.page + 1 : null };
  });
