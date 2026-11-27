CREATE POLICY "Published sticker files are readable"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'sticker-videos'
  AND position('/' in name) = 0
);