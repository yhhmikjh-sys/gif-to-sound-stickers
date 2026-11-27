import { createServerFn } from "@tanstack/react-start";

export type Sticker = { id: string; title: string; image: string; original: string };
export type StickerPage = { items: Sticker[]; nextOffset: number | null };

// GIPHY's public web key (the same one WhatsApp Web uses for sticker search).
const GIPHY_KEY = "3o85xmWDYKgihhIKSA";
const PAGE = 40;

export const searchStickers = createServerFn({ method: "GET" })
  .inputValidator((d: { q: string; offset?: number; kind?: "gifs" | "stickers"; lang?: string | undefined }) => ({
    lang: String(d?.lang ?? "").trim().slice(0, 60),
    kind: d?.kind === "stickers" ? "stickers" : "gifs",
    q: String(d?.q ?? "").trim().slice(0, 100),
    offset: Math.max(0, Math.min(4999, Number(d?.offset) || 0)),
  }))
  .handler(async ({ data }): Promise<StickerPage> => {
    const term = [data.q, data.lang].filter(Boolean).join(" ");
    if (!term) return { items: [], nextOffset: null };
    const url = `https://api.giphy.com/v1/${data.kind}/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(term)}&limit=${PAGE}&offset=${data.offset}&rating=pg-13&lang=en`;
    const res = await fetch(url, { headers: { Accept: "application/json", Origin: "https://web.whatsapp.com" } });
    if (!res.ok) throw new Error("Sticker search failed");
    type G = { id: string; title: string; images: Record<string, { url?: string; webp?: string }> };
    const json = (await res.json()) as { data?: G[]; pagination?: { total_count: number; count: number; offset: number } };
    const items = (json.data ?? []).map((g) => ({
      id: g.id,
      title: g.title,
      image: g.images["fixed_width"]?.webp ?? g.images["fixed_width"]?.url ?? "",
      original: g.images["original"]?.url ?? "",
    })).filter((i) => i.image && i.original);
    const p = json.pagination;
    const next = p ? p.offset + p.count : 0;
    return { items, nextOffset: p && p.count > 0 && next < p.total_count ? next : null };
  });

// Converts a search result into a 512x512 WhatsApp-ready WebP via the Stickify API.
export const makeWhatsAppSticker = createServerFn({ method: "POST" })
  .inputValidator((d: { imageUrl: string }) => {
    const u = new URL(String(d?.imageUrl ?? ""));
    if (u.protocol !== "https:" || !(u.hostname.endsWith(".giphy.com") || u.hostname.endsWith("pinimg.com"))) throw new Error("Invalid image");
    return { imageUrl: u.toString() };
  })
  .handler(async ({ data }): Promise<string> => {
    const img = await fetch(data.imageUrl);
    if (!img.ok) throw new Error("Image download failed");
    const form = new FormData();
    form.append("file", new Blob([await img.arrayBuffer()], { type: img.headers.get("content-type") ?? "image/gif" }), "image.gif");
    form.append("fit", "fit");
    const res = await fetch("https://stickify-api.onrender.com/api/stickers", { method: "POST", body: form });
    if (!res.ok) throw new Error("Sticker conversion failed");
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return `data:image/webp;base64,${btoa(bin)}`;
  });

// One small meme GIF matching a sound's title (thumbnail next to sound packs).
export const memeThumb = createServerFn({ method: "GET" })
  .inputValidator((d: { q: string }) => ({ q: String(d?.q ?? "").replace(/[^\p{L}\p{N} ]/gu, " ").trim().slice(0, 60) }))
  .handler(async ({ data }): Promise<string | null> => {
    if (!data.q) return null;
    // Try the full title, then fewer words, until GIPHY finds a meme.
    const words = data.q.split(/\s+/);
    const tries = [...new Set([data.q, words.slice(0, 3).join(" "), words.slice(0, 2).join(" "), words[0] ?? ""])].filter(Boolean);
    for (const t of tries) {
      const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(t)}&limit=1&rating=pg-13&lang=en`;
      const res = await fetch(url, { headers: { Accept: "application/json", Origin: "https://web.whatsapp.com" } });
      if (!res.ok) return null;
      const json = (await res.json()) as { data?: { images: Record<string, { url?: string; webp?: string }> }[] };
      const img = json.data?.[0]?.images["fixed_height_small"];
      if (img?.webp ?? img?.url) return img.webp ?? img.url ?? null;
    }
    return null;
  });
