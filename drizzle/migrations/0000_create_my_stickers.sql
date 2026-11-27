CREATE TABLE public.my_stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  gif_url text NOT NULL DEFAULT '',
  video_path text NOT NULL,
  mime text NOT NULL DEFAULT 'video/mp4',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.my_stickers TO authenticated;
GRANT ALL ON public.my_stickers TO service_role;
ALTER TABLE public.my_stickers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own stickers select" ON public.my_stickers FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Own stickers insert" ON public.my_stickers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Own stickers delete" ON public.my_stickers FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX my_stickers_user_idx ON public.my_stickers (user_id, created_at DESC);

CREATE POLICY "Own sticker files read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'sticker-videos' AND (storage.foldername(name))[1] = 'user' AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "Own sticker files upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'sticker-videos' AND (storage.foldername(name))[1] = 'user' AND (storage.foldername(name))[2] = auth.uid()::text);
CREATE POLICY "Own sticker files delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'sticker-videos' AND (storage.foldername(name))[1] = 'user' AND (storage.foldername(name))[2] = auth.uid()::text);