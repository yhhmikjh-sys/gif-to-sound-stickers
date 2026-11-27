// Browser-only. Phone: opens the system share sheet with the file (pick WhatsApp or WhatsApp Business, then the chat).
// Computer: Chrome/Edge usually show the system share sheet too. Nothing is ever downloaded.
// Phones (Safari especially) only open the share menu right after a tap, so the file is fetched ahead of time.
const ready = new Map<string, Promise<File>>();
export function prepareShare(url: string, title: string, kind: "video" | "sticker" = "video"): Promise<File> {
  const key = `${kind}:${url}`;
  let p = ready.get(key);
  if (!p) {
    p = fetch(url).then((r) => r.blob()).then((blob) => {
      // A 512x512 .webp shared to WhatsApp arrives as a real sticker; anything else goes as video/GIF.
      // Storage can answer with a generic type, so the type is forced from the kind.
      const type = kind === "sticker" ? "image/webp" : blob.type.startsWith("video/") ? blob.type : "video/mp4";
      const ext = kind === "sticker" ? "webp" : type.includes("webm") ? "webm" : "mp4";
      const name = (title || "sticker").replace(/[^\w\- ]+/g, "").trim().slice(0, 40) || "sticker";
      return new File([blob], `${name}.${ext}`, { type });
    });
    p.catch(() => ready.delete(key));
    ready.set(key, p);
  }
  return p;
}

export async function sendToWhatsApp(url: string, title: string, kind: "video" | "sticker" = "video"): Promise<"shared" | "web"> {
  const file = await prepareShare(url, title, kind);
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] });
    return "shared";
  }
  // Phones must send the sticker file itself, never a link. Some browsers answer canShare=false but still share.
  if (phoneOs()) {
    try {
      if (!navigator.share) throw new Error("no share");
      await navigator.share({ files: [file] });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") throw e;
      // The Lovable editor preview runs the site in a frame where the phone blocks file sharing.
      throw new Error(window.top !== window.self
        ? "Preview ke andar phone file share nahi karne deta. Site ko naye tab mein (ya publish karke) kholo, phir Share dabao."
        : "Is browser se file share nahi ho rahi. Chrome (Android) ya Safari (iPhone) mein kholo.");
    }
  }
  // Computer without a share menu: open WhatsApp Web; the user picks the chat there.
  const link = /^https?:/.test(url) ? `https://web.whatsapp.com/send?text=${encodeURIComponent(`${title} 🔊 ${url}`)}` : "https://web.whatsapp.com/";
  window.open(link, "_blank", "noopener");
  return "web";
}

export const WEB_HINT = "WhatsApp Web khul gaya. Jisko bhejna hai woh chat chuno aur Send dabao.";

// Phone apps by Android package name. A web page cannot hand a file to one specific app (only the share sheet can),
// so these open the chosen app with a text + link; the share sheet stays the way to send the sticker file itself.
export const WA_APPS = [
  { pkg: "com.whatsapp", label: "WhatsApp" },
  { pkg: "com.whatsapp.w4b", label: "WhatsApp Business" },
] as const;

export function phoneOs(): "android" | "ios" | null {
  if (typeof navigator === "undefined") return null;
  if (/Android/i.test(navigator.userAgent)) return "android";
  if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) return "ios";
  return null;
}

/** Android intent URL that opens exactly this WhatsApp package with the text; falls back to the Play Store. */
export function whatsappIntentUrl(pkg: string, text: string) {
  const store = `https://play.google.com/store/apps/details?id=${pkg}`;
  return `intent://send/?text=${encodeURIComponent(text)}#Intent;scheme=whatsapp;package=${pkg};S.browser_fallback_url=${encodeURIComponent(store)};end`;
}

/** On phones, prefer the WhatsApp sticker file (WebP) so it lands as a sticker, not a video. */
export function phoneShareTarget(videoUrl: string, stickerUrl?: string | null): { url: string; kind: "video" | "sticker" } {
  return phoneOs() && stickerUrl ? { url: stickerUrl, kind: "sticker" } : { url: videoUrl, kind: "video" };
}
