import { useEffect, useState } from "react";
import { phoneOs, prepareShare, sendToWhatsApp } from "@/lib/send-to-whatsapp";

// Phone only: sends FILES through the phone's share sheet (never a link); the user picks WhatsApp / WhatsApp Business and the chat.
// "Sticker" shares the 512x512 animated WebP, which WhatsApp delivers as a real sticker.
// "GIF with sound" shares the MP4 (the share sheet cannot attach sound to a sticker).
export function WhatsAppAppButtons({ url, stickerUrl, title, small }: { url: string; stickerUrl?: string | null; title: string; small?: boolean }) {
  const [os, setOs] = useState<"android" | "ios" | null>(null);
  const [err, setErr] = useState("");
  const [hint, setHint] = useState("");
  useEffect(() => setOs(phoneOs()), []);
  if (!os) return null;
  const cls = small
    ? "mt-1 block w-full rounded-full border-2 border-foreground bg-card py-1 text-xs font-semibold text-foreground"
    : "rounded-full border-2 border-foreground bg-card px-4 py-2 text-sm font-semibold text-foreground";
  const go = (u: string, kind: "video" | "sticker") => {
    setErr("");
    setHint(kind === "video" ? "WhatsApp mein bhejne se pehle upar 'GIF' dabao — tab yeh loop hoke chalega aur 🔊 sound button aayega." : "");
    sendToWhatsApp(u, title, kind).catch((e: Error) => e.name !== "AbortError" && setErr(e.message));
  };
  return (
    <>
      {stickerUrl && (
        <button type="button" className={cls}
          onPointerDown={() => void prepareShare(stickerUrl, title, "sticker").catch(() => {})}
          onClick={() => go(stickerUrl, "sticker")}>
          🟢 WhatsApp sticker
        </button>
      )}
      <button type="button" className={cls}
        onPointerDown={() => void prepareShare(url, title).catch(() => {})}
        onClick={() => go(url, "video")}>
        🔊 GIF with sound
      </button>
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      {err && <span className="block text-xs text-destructive">{err}</span>}
    </>
  );
}
