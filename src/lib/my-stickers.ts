import { supabase } from "@/integrations/supabase/client";

export type WaFiles = { webp: Blob; ogg?: Blob | null; seconds?: number | null } | null;

// Saves a finished sticker to the signed-in user's own list (files in user/<uid>/, row in my_stickers).
// wa = WhatsApp native sound sticker files (WebP + Ogg/Opus) used by the extension.
export async function saveToMyStickers(userId: string, blob: Blob, mime: string, title: string, gifUrl: string, wa: WaFiles = null) {
  const base = `user/${userId}/${crypto.randomUUID()}`;
  const path = `${base}.${mime.includes("webm") ? "webm" : "mp4"}`;
  const bucket = supabase.storage.from("sticker-videos");
  const up = await bucket.upload(path, blob, { contentType: mime });
  if (up.error) throw new Error("Sticker account mein save nahi hua");
  let extra = {};
  if (wa) {
    const image = await bucket.upload(`${base}.webp`, wa.webp, { contentType: "image/webp" });
    if (image.error) throw new Error("Sticker image account mein save nahi hua");
    extra = { sticker_path: `${base}.webp` };
    if (wa.ogg) {
      const sound = await bucket.upload(`${base}.ogg`, wa.ogg, { contentType: "audio/ogg" });
      if (!sound.error) extra = { ...extra, sound_path: `${base}.ogg`, sound_seconds: wa.seconds ?? null };
    }
  }
  const { error } = await supabase.from("my_stickers").insert({ title: title.slice(0, 80) || "sticker", gif_url: gifUrl, video_path: path, mime, ...extra });
  if (error) throw new Error("Sticker account mein save nahi hua");
}
