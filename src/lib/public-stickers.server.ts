import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type PublicSticker = {
  id: string;
  title: string;
  language: string;
  gif_url: string;
  video_url: string | null;
  created_at: string;
};

const PAGE = 30;

export async function listPublic(q: string, offset: number) {
  let query = supabaseAdmin
    .from("public_stickers")
    .select("id,title,language,gif_url,video_url,created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE - 1);
  const term = q.replace(/[%_,()]/g, " ").trim();
  if (term) query = query.or(`title.ilike.%${term}%,language.ilike.%${term}%`);
  const { data, error } = await query;
  if (error) throw new Error("Could not load stickers");
  const rows = data ?? [];
  const paths = rows.map((r) => r.video_url).filter((p): p is string => !!p);
  const signed = new Map<string, string>();
  if (paths.length) {
    const { data: urls } = await supabaseAdmin.storage
      .from("sticker-videos")
      .createSignedUrls(paths, 60 * 60 * 24);
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
  }
  const items: PublicSticker[] = rows.map((r) => ({
    ...r,
    video_url: r.video_url ? (signed.get(r.video_url) ?? null) : null,
  }));
  return { items, nextOffset: rows.length === PAGE ? offset + PAGE : null };
}
