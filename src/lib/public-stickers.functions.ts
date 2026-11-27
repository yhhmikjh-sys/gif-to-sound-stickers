import { createServerFn } from "@tanstack/react-start";

export const listPublicStickers = createServerFn({ method: "GET" })
  .inputValidator((d: { q?: string; offset?: number }) => ({
    q: String(d?.q ?? "").slice(0, 100),
    offset: Math.max(0, Math.min(10000, Number(d?.offset) || 0)),
  }))
  .handler(async ({ data }) => {
    const { listPublic } = await import("./public-stickers.server");
    return listPublic(data.q, data.offset);
  });

// Anyone can publish; inputs are tightly validated (title length, GIPHY-only picture, small video).
export const savePublicSticker = createServerFn({ method: "POST" })
  .inputValidator((d: { title: string; language: string; gifUrl: string; videoBase64: string; mime: string }) => {
    const title = String(d?.title ?? "").trim();
    if (title.length < 2 || title.length > 80) throw new Error("Title must be 2–80 characters");
    const gif = new URL(String(d?.gifUrl ?? ""));
    if (gif.protocol !== "https:" || !gif.hostname.endsWith(".giphy.com")) throw new Error("Invalid sticker");
    const mime = d?.mime === "video/mp4" ? "video/mp4" : "video/webm";
    const videoBase64 = String(d?.videoBase64 ?? "");
    if (videoBase64.length > 10_000_000) throw new Error("Video too large");
    return { title, language: String(d?.language ?? "all").slice(0, 30), gifUrl: gif.toString(), videoBase64, mime };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let path: string | null = null;
    if (data.videoBase64) {
      const bin = atob(data.videoBase64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      path = `${crypto.randomUUID()}.${data.mime === "video/mp4" ? "mp4" : "webm"}`;
      const { error } = await supabaseAdmin.storage
        .from("sticker-videos")
        .upload(path, bytes, { contentType: data.mime });
      if (error) throw new Error("Upload failed");
    }
    const { data: row, error } = await supabaseAdmin
      .from("public_stickers")
      .insert({ title: data.title, language: data.language, gif_url: data.gifUrl, video_url: path })
      .select("id")
      .single();
    if (error) throw new Error("Save failed");
    return { id: row.id };
  });
