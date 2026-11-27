// Browser-only bridge to the StikDesi Sender extension (extension/site.js sets the marker and stores stickers).
export const hasExtension = () => typeof document !== "undefined" && document.documentElement.dataset["stikdesiExt"] === "1";

export async function sendToExtension(url: string, title: string): Promise<void> {
  const blob = await (await fetch(url)).blob();
  const dataUrl = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(blob);
  });
  const id = Math.random().toString(36).slice(2);
  await new Promise<void>((res, rej) => {
    const t = setTimeout(() => { window.removeEventListener("message", on); rej(new Error("Extension ne jawab nahi diya. Page reload karke dobara try karo.")); }, 5000);
    function on(e: MessageEvent) {
      if (e.source !== window || e.data?.type !== "STIKDESI_ADDED" || e.data.id !== id) return;
      clearTimeout(t); window.removeEventListener("message", on);
      e.data.ok ? res() : rej(new Error("Extension mein save nahi hua."));
    }
    window.addEventListener("message", on);
    window.postMessage({ type: "STIKDESI_ADD", id, title, dataUrl }, window.location.origin);
  });
}
