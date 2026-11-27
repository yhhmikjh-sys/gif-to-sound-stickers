import { useState } from "react";

// WhatsApp-style "GIF with sound": loops forever, speaker button toggles sound.
export function SoundGif({ url, poster, startMuted = false }: { url: string; poster?: string; startMuted?: boolean }) {
  const [muted, setMuted] = useState(startMuted);
  return (
    <div className="relative">
      <video src={url} poster={poster} autoPlay loop playsInline muted={muted} preload="metadata" className="aspect-square w-full bg-card object-contain" />
      <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Sound on" : "Sound off"}
        className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-lg text-white">
        {muted ? "🔇" : "🔊"}
      </button>
      <span className="absolute bottom-3 left-3 rounded-md bg-black/50 px-2 py-0.5 text-xs font-bold text-white">GIF</span>
    </div>
  );
}
