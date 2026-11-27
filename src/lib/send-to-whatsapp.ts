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
  const blob = file;
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] });
    return "shared";
  }
  // Never download. If the browser can't share files, share the sticker link instead.
  if (navigator.share && /^https?:/.test(url)) {
    await navigator.share({ title: file.name, url });
    return "shared";
  }
  return "web";
}

export const WEB_HINT = "Is browser mein share menu nahi hai. Phone par Chrome ya Safari mein kholo.";
