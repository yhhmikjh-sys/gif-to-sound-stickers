import { supabase } from "@/integrations/supabase/client";

// Saves a finished sticker to the signed-in user's own list (file in user/<uid>/, row in my_stickers).
export async function saveToMyStickers(userId: string, blob: Blob, mime: string, title: string, gifUrl: string) {
  const path = `user/${userId}/${crypto.randomUUID()}.${mime.includes("webm") ? "webm" : "mp4"}`;
  const up = await supabase.storage.from("sticker-videos").upload(path, blob, { contentType: mime });
  if (up.error) throw new Error("Sticker account mein save nahi hua");
  const { error } = await supabase.from("my_stickers").insert({ title: title.slice(0, 80) || "sticker", gif_url: gifUrl, video_path: path, mime });
  if (error) throw new Error("Sticker account mein save nahi hua");
}
