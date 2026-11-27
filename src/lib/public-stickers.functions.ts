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
  .inputValidator((d: { title: string; language: string; gifUrl: string; videoBase64: string; mime: string; stickerBase64?: string; soundBase64?: string; soundSeconds?: number }) => {
    const title = String(d?.title ?? "").trim();
    if (title.length < 2 || title.length > 80) throw new Error("Title must be 2–80 characters");
    const gif = new URL(String(d?.gifUrl ?? ""));
    if (gif.protocol !== "https:" || !gif.hostname.endsWith(".giphy.com")) throw new Error("Invalid sticker");
    const mime = d?.mime === "video/mp4" ? "video/mp4" : "video/webm";
    const videoBase64 = String(d?.videoBase64 ?? "");
    if (videoBase64.length > 10_000_000) throw new Error("Video too large");
    const stickerBase64 = String(d?.stickerBase64 ?? "");
    const soundBase64 = String(d?.soundBase64 ?? "");
    if (stickerBase64.length > 1_500_000 || soundBase64.length > 1_500_000) throw new Error("Sticker too large");
    // Magic bytes: "RIFF" -> UklGR, "OggS" -> T2dnU
    const wa = stickerBase64.startsWith("UklGR") && soundBase64.startsWith("T2dnU");
    const soundSeconds = Math.max(0.1, Math.min(10, Number(d?.soundSeconds) || 0));
    return { stickerBase64: wa ? stickerBase64 : "", soundBase64: wa ? soundBase64 : "", soundSeconds, title, language: String(d?.language ?? "all").slice(0, 30), gifUrl: gif.toString(), videoBase64, mime };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bytesOf = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const id = crypto.randomUUID();
    let path: string | null = null;
    if (data.videoBase64) {
      path = `${id}.${data.mime === "video/mp4" ? "mp4" : "webm"}`;
      const { error } = await supabaseAdmin.storage
        .from("sticker-videos")
        .upload(path, bytesOf(data.videoBase64), { contentType: data.mime });
      if (error) throw new Error("Upload failed");
    }
    // WhatsApp native sound sticker files for the extension (optional).
    let wa = {};
    if (data.stickerBase64 && data.soundBase64) {
      const bucket = supabaseAdmin.storage.from("sticker-videos");
      const [a, b] = await Promise.all([
        bucket.upload(`${id}.webp`, bytesOf(data.stickerBase64), { contentType: "image/webp" }),
        bucket.upload(`${id}.ogg`, bytesOf(data.soundBase64), { contentType: "audio/ogg" }),
      ]);
      if (!a.error && !b.error) wa = { sticker_path: `${id}.webp`, sound_path: `${id}.ogg`, sound_seconds: data.soundSeconds };
    }
    const { data: row, error } = await supabaseAdmin
      .from("public_stickers")
      .insert({ title: data.title, language: data.language, gif_url: data.gifUrl, video_url: path, ...wa })
      .select("id")
      .single();
    if (error) throw new Error("Save failed");
    return { id: row.id };
  });
