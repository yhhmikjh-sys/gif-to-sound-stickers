CREATE TABLE public.public_stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  language text NOT NULL DEFAULT 'all',
  gif_url text NOT NULL,
  video_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.public_stickers TO anon, authenticated;
GRANT ALL ON public.public_stickers TO service_role;
ALTER TABLE public.public_stickers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view public stickers" ON public.public_stickers FOR SELECT TO anon, authenticated USING (true);
CREATE INDEX public_stickers_created_idx ON public.public_stickers (created_at DESC);
CREATE INDEX public_stickers_title_idx ON public.public_stickers USING gin (to_tsvector('simple', title));