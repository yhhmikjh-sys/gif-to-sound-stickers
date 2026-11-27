import { createServerFn } from "@tanstack/react-start";

export type Sticker = { id: string; title: string; image: string; source: string };

export const searchStickers = createServerFn({ method: "GET" })
  .inputValidator((d: { q: string }) => ({ q: String(d?.q ?? "").trim().slice(0, 100) }))
  .handler(async ({ data }): Promise<Sticker[]> => {
    if (!data.q) return [];
    const url = `https://api.samu330.com/pinterest/search?q=${encodeURIComponent(data.q + " sticker")}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("Sticker search failed");
    const json = (await res.json()) as { data?: Array<Record<string, unknown>> };
    return (json.data ?? [])
      .filter((i) => typeof i["thumbnail"] === "string")
      .map((i) => ({
        id: String(i["id"]),
        title: String(i["title"] ?? ""),
        image: String(i["thumbnail"]),
        source: String(i["source_url"] ?? ""),
      }));
  });

// Converts a search result into a 512x512 WhatsApp-ready WebP via the Stickify API.
export const makeWhatsAppSticker = createServerFn({ method: "POST" })
  .inputValidator((d: { imageUrl: string }) => {
    const u = new URL(String(d?.imageUrl ?? ""));
    if (u.protocol !== "https:" || !u.hostname.endsWith("pinimg.com")) throw new Error("Invalid image");
    return { imageUrl: u.toString() };
  })
  .handler(async ({ data }): Promise<string> => {
    const img = await fetch(data.imageUrl);
    if (!img.ok) throw new Error("Image download failed");
    const form = new FormData();
    form.append("file", new Blob([await img.arrayBuffer()], { type: img.headers.get("content-type") ?? "image/jpeg" }), "image.jpg");
    form.append("fit", "fit");
    const res = await fetch("https://stickify-api.onrender.com/api/stickers", { method: "POST", body: form });
    if (!res.ok) throw new Error("Sticker conversion failed");
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return `data:image/webp;base64,${btoa(bin)}`;
  });
