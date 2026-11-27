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
