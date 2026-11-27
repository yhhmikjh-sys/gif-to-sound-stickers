// Browser-only. Phone: opens the system share sheet with the file (pick WhatsApp or WhatsApp Business, then the chat).
// Computer: Chrome/Edge usually show the system share sheet too (WhatsApp desktop is in it). Otherwise the file is
// saved and the WhatsApp desktop app (or WhatsApp Web) opens so it can be attached.
export async function sendToWhatsApp(url: string, title: string): Promise<"shared" | "web"> {
  const blob = await (await fetch(url)).blob();
  const ext = blob.type.includes("webm") ? "webm" : "mp4";
  const file = new File([blob], `${title || "sticker"}.${ext}`, { type: blob.type || "video/mp4" });
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] });
    return "shared";
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = file.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
  // Opens the installed WhatsApp desktop app; if it isn't installed, fall back to WhatsApp Web.
  const t = setTimeout(() => window.open("https://web.whatsapp.com/", "_blank", "noopener"), 1500);
  window.addEventListener("blur", () => clearTimeout(t), { once: true });
  window.location.href = "whatsapp://";
  return "web";
}

export const WEB_HINT = "Sticker save ho gaya aur WhatsApp khul gaya. Chat kholo → 📎 → Photos & videos → yeh file chuno → GIF switch on → Send.";
