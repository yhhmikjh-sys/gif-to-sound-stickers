import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { TopNav } from "@/components/TopNav";
import { makeSoundSticker } from "@/lib/make-sound-sticker";
import { savePublicSticker } from "@/lib/public-stickers.functions";
import { makeWhatsAppSticker } from "@/lib/stickers.functions";
import { SoundPicker, soundUrl } from "@/components/SoundPicker";
import { WaveTrimmer } from "@/components/WaveTrimmer";

type S = { gif: string; preview: string; title: string; lang: string };
const str = (v: unknown) => (typeof v === "string" ? v : "");

export const Route = createFileRoute("/create")({
  validateSearch: (s: Record<string, unknown>): S => ({ gif: str(s["gif"]), preview: str(s["preview"]), title: str(s["title"]), lang: str(s["lang"]) }),
  head: () => ({
    meta: [
      { title: "Create sound sticker — StikDesi" },
      { name: "description", content: "Add a sound to your GIF and make a 5 or 10 second WhatsApp sound sticker." },
      { property: "og:title", content: "Create sound sticker — StikDesi" },
      { property: "og:description", content: "Add a sound to your GIF and make a 5 or 10 second WhatsApp sound sticker." },
    ],
  }),
  component: CreatePage,
});

const toBase64 = (b: Blob) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1] ?? "");
    r.onerror = rej;
    r.readAsDataURL(b);
  });

function download(href: string, name: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.click();
}

function CreatePage() {
  const s = Route.useSearch();
  const [title, setTitle] = useState(s.title.replace(/ GIF$| Sticker$/i, "").slice(0, 80));
  const [file, setFile] = useState<File | null>(null);
  const [pack, setPack] = useState<{ title: string; path: string } | null>(null);
  const [picker, setPicker] = useState(false);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(5);
  const seconds = Math.max(0.5, end - start);
  const [soundSrc, setSoundSrc] = useState("");
  const [gifKey, setGifKey] = useState(0);

  const [isPublic, setIsPublic] = useState(true);
  const [result, setResult] = useState<{ url: string; mime: string; saved: boolean } | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      let audio: ArrayBuffer;
      if (pack) {
        const r = await fetch(soundSrc || soundUrl(pack.path));
        if (!r.ok) throw new Error("Couldn't load the sound");
        audio = await r.arrayBuffer();
      } else if (file) audio = await file.arrayBuffer();
      else throw new Error("Pick a sound first");
      const { blob, mime } = await makeSoundSticker({ gifUrl: s.gif, audio, start, seconds });
      let saved = false;
      if (isPublic) {
        await savePublicSticker({ data: { title, language: s.lang || "all", gifUrl: s.gif, videoBase64: await toBase64(blob), mime } });
        saved = true;
      }
      return { url: URL.createObjectURL(blob), mime, saved };
    },
    onSuccess: setResult,
  });
  const wa = useMutation({
    mutationFn: () => makeWhatsAppSticker({ data: { imageUrl: s.gif } }),
    onSuccess: (d) => download(d, "sticker.webp"),
  });

  if (!s.gif) {
    return (
      <main className="min-h-screen"><TopNav />
        <p className="mt-20 text-center text-muted-foreground">No GIF selected. <Link to="/" className="font-semibold text-foreground underline">Pick one</Link></p>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-16">
      {picker && (
        <SoundPicker
          initialQuery={title.split(" ").slice(0, 2).join(" ")}
          onClose={() => setPicker(false)}
          onSelect={(snd) => {
            setPack(snd); setFile(null); setSoundSrc(""); setDuration(0); setStart(0); setResult(null); setPicker(false);
            // Download the sound once; the trimmer, preview and Create all reuse this copy.
            void fetch(soundUrl(snd.path)).then((r) => r.blob()).then((b) => setSoundSrc(URL.createObjectURL(b)));
          }}
        />
      )}
      <TopNav />
      <div className="mx-auto grid max-w-5xl gap-8 px-4 pt-8 md:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-3xl border-2 border-foreground bg-card shadow-pop">
            {result ? (
              <SoundGif url={result.url} />
            ) : (
              <img key={gifKey} src={`${s.gif || s.preview}#${gifKey}`} alt={title} className="aspect-square w-full object-contain" />
            )}
          </div>
          <button onClick={() => wa.mutate()} disabled={wa.isPending} className="mt-3 w-full rounded-full border-2 border-foreground bg-card py-2 text-sm font-semibold text-foreground disabled:opacity-60">
            {wa.isPending ? "Making..." : "Download as WhatsApp sticker (no sound)"}
          </button>
        </div>

        <div className="space-y-6">
          <h1 className="font-display text-4xl text-foreground">Create sound sticker</h1>

          <label className="block">
            <span className="text-sm font-semibold text-foreground">Title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="e.g. Daya darwaza tod do"
              className="mt-1 w-full rounded-2xl border-2 border-foreground bg-card px-4 py-3 text-foreground outline-none focus:ring-4 focus:ring-primary/40" />
          </label>

          <div>
            <span className="text-sm font-semibold text-foreground">Sound</span>
            <button type="button" onClick={() => setPicker(true)}
              className="mt-1 flex w-full items-center justify-between rounded-2xl border-2 border-foreground bg-primary px-4 py-3 font-semibold text-primary-foreground shadow-pop">
              <span className="truncate">{pack ? `🔊 ${pack.title}` : "Select sound package"}</span>
              <span>{pack ? "Change" : "→"}</span>
            </button>
            <details className="mt-2 text-sm text-muted-foreground">
              <summary className="cursor-pointer">Or use a sound from your phone</summary>
              <input type="file" accept="audio/*,video/*" onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f); setPack(null); if (f) setSoundSrc(URL.createObjectURL(f)); setStart(0); setResult(null);
                if (f) { const a = new Audio(URL.createObjectURL(f)); a.onloadedmetadata = () => { setDuration(a.duration || 0); setEnd(Math.min(10, a.duration || 5)); }; }
              }} className="mt-2 w-full text-sm text-foreground" />
              {file && !pack && <p className="mt-1 text-foreground">Using: {file.name}</p>}
            </details>
          </div>

          {pack && !soundSrc && <div className="h-24 animate-pulse rounded-2xl border-2 border-foreground bg-muted p-4 text-sm text-muted-foreground">Loading sound…</div>}
          {(file || pack) && soundSrc && (
            <div className="space-y-3 rounded-2xl border-2 border-foreground bg-card p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">✂️ Cut the sound</span>
                <span className="text-sm text-muted-foreground">{start.toFixed(1)}s → {end.toFixed(1)}s ({seconds.toFixed(1)}s)</span>
              </div>
              <WaveTrimmer src={soundSrc} duration={duration} start={start} end={end} onChange={(a, b) => { setStart(a); setEnd(b); }} onPlay={() => setGifKey((k) => k + 1)} onDuration={(d) => { setDuration(d); setStart(0); setEnd(Math.min(10, d)); }} />
              <p className="text-xs text-muted-foreground">Max 10 seconds. Total sound: {Number.isFinite(duration) ? duration.toFixed(1) : "…"}s</p>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="h-4 w-4 accent-primary" />
            Save to public stickers so everyone can find it
          </label>

          <button onClick={() => create.mutate()} disabled={create.isPending || !soundSrc || !(file || pack) || title.trim().length < 2}
            className="w-full rounded-full border-2 border-foreground bg-primary py-3 text-lg font-bold text-primary-foreground shadow-pop disabled:opacity-50">
            {create.isPending ? `Creating... (${seconds.toFixed(1)}s)` : "Create"}
          </button>
          {create.isError && <p className="text-sm text-destructive">{(create.error as Error).message || "Something went wrong"}</p>}

          {result && (
            <div className="rounded-2xl border-2 border-foreground bg-card p-4">
              <p className="font-semibold text-foreground">Done! {result.saved && "Saved to public stickers."}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {result.mime === "video/mp4"
                  ? "In WhatsApp: attach → Gallery → pick this file → tap the GIF switch at the top → Send. It shows as a GIF with a 🔇 sound button."
                  : "This browser can't make MP4. Open the app in Chrome, Edge or Safari to get a WhatsApp GIF with sound."}
              </p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => download(result.url, `${title || "sticker"}.${result.mime === "video/mp4" ? "mp4" : "webm"}`)} className="rounded-full border-2 border-foreground bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Download GIF with sound (MP4)</button>
                {result.saved && <Link to="/explore" search={{ q: "" }} className="rounded-full border-2 border-foreground px-4 py-2 text-sm font-semibold text-foreground">See public stickers</Link>}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// WhatsApp-style "GIF with sound": loops forever, speaker button toggles sound.
function SoundGif({ url }: { url: string }) {
  const [muted, setMuted] = useState(false);
  return (
    <div className="relative">
      <video src={url} autoPlay loop playsInline muted={muted} className="aspect-square w-full bg-card" />
      <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Sound on" : "Sound off"}
        className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-lg text-white">
        {muted ? "🔇" : "🔊"}
      </button>
      <span className="absolute bottom-3 left-3 rounded-md bg-black/50 px-2 py-0.5 text-xs font-bold text-white">GIF</span>
    </div>
  );
}
