// Browser-only. Phone: opens the system share sheet with the file (pick WhatsApp or WhatsApp Business, then the chat).
// Computer: no share sheet with files, so the file downloads and WhatsApp Web opens to attach it.
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
  window.open("https://web.whatsapp.com/", "_blank", "noopener");
  return "web";
}

export const WEB_HINT = "File download ho gayi aur WhatsApp Web khul gaya. Chat kholo → 📎 → Photos & videos → yeh file chuno → GIF switch on → Send.";
