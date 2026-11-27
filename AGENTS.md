<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

- Server functions live in src/lib/*.functions.ts (src/server is import-protected from client code).
- GIPHY searches go through src/lib/stickers.functions.ts server functions; never call GIPHY from the browser.
- Public stickers are written only by the savePublicSticker server function (admin client, validated input); the table has anon SELECT only, and the bucket is private, so videos are served via signed URLs.
- Sound stickers are recorded in the browser (gifuct-js frame decode + canvas + MediaRecorder) in src/lib/make-sound-sticker.ts; the GIF loops for the cut sound length and the sound plays once. No server-side ffmpeg on the Worker.
- The desktop WhatsApp Web sender is a Chrome MV3 extension in extension/ (packaged to public/stikdesi-extension.zip; re-zip after edits). The site talks to it only via window.postMessage (STIKDESI_ADD/ADDED) and the data-stikdesi-ext marker; it drops the file into the open chat via a synthetic paste — no WhatsApp internals, so it sends a GIF-with-sound, not a native sound sticker. It signs in with the same email/password account via Supabase REST (publishable key, extension/api.js) and lists the user's my_stickers rows (owner-only RLS; files in sticker-videos/user/<uid>/); after the paste it clicks WhatsApp's preview Send button.

- Signed-in users' stickers are saved client-side to my_stickers + storage user/<uid>/ (src/lib/my-stickers.ts); RLS, not server code, enforces ownership.
- Social sign-in (Google) must go through lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin }) from the generated src/integrations/lovable module; never call supabase.auth.signInWithOAuth. The Chrome extension keeps email/password only, since MV3 has no access to the managed OAuth broker.
- extension/api.js and extension/manifest.json hardcode the backend host and publishable key. After a remix, key rotation, or backend change, re-sync both from .env (SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY) and rebuild public/stikdesi-extension.zip — a stale host makes the extension sign in and list stickers from the wrong backend.
- Sound stickers are re-encoded in the browser to progressive H.264 baseline + AAC MP4 via ffmpeg.wasm (src/lib/whatsapp-mp4.ts, core from unpkg) because WhatsApp rejects MediaRecorder VP9/Opus output as "file not supported".

- Extension sticker click converts the sound sticker video to a 512x512 animated WebP (extension/webp-sticker.js, canvas frames muxed into ANIM, <=480 KB) and pastes it, because WhatsApp Web sends pasted WebP as a real sticker while MP4 goes as media/document. Native sound stickers are a new WhatsApp message type only its own apps can create, so the sticker is silent; "GIF 🔊" keeps the MP4-with-sound path.
