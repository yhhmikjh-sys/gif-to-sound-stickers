// Browser-only. Phone: opens the system share sheet with the file (pick WhatsApp or WhatsApp Business, then the chat).
// Computer: Chrome/Edge usually show the system share sheet too. Nothing is ever downloaded.
// Phones (Safari especially) only open the share menu right after a tap, so the file is fetched ahead of time.
const ready = new Map<string, Promise<File>>();
export function prepareShare(url: string, title: string): Promise<File> {
  let p = ready.get(url);
  if (!p) {
    p = fetch(url).then((r) => r.blob()).then((blob) => {
      const ext = blob.type.includes("webm") ? "webm" : "mp4";
      return new File([blob], `${title || "sticker"}.${ext}`, { type: blob.type || "video/mp4" });
    });
    p.catch(() => ready.delete(url));
    ready.set(url, p);
  }
  return p;
}

export async function sendToWhatsApp(url: string, title: string): Promise<"shared" | "web"> {
  const file = await prepareShare(url, title);
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] });
    return "shared";
  }
  // Never download. If the browser can't share files, share the sticker link instead.
  if (navigator.share && /^https?:/.test(url)) {
    await navigator.share({ title: file.name, url });
    return "shared";
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

export function openWhatsAppApp(pkg: string, title: string, link: string) {
  const text = `${title} 🔊 ${link}`;
  window.location.href = phoneOs() === "android" ? whatsappIntentUrl(pkg, text) : `whatsapp://send?text=${encodeURIComponent(text)}`;
}
