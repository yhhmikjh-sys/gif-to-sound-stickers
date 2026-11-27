ALTER TABLE public.public_stickers
  ADD COLUMN sticker_path text,
  ADD COLUMN sound_path text,
  ADD COLUMN sound_seconds real;
ALTER TABLE public.my_stickers
  ADD COLUMN sticker_path text,
  ADD COLUMN sound_path text,
  ADD COLUMN sound_seconds real;